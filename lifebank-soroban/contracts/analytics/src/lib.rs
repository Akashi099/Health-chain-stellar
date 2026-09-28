#![no_std]
#![deny(deprecated)]

mod error;
mod types;

#[cfg(test)]
mod test;

pub use error::AnalyticsError;
pub use types::{AnalyticsConfig, DataKey, MetricsSnapshot, PeriodType, ReportingPeriod};

use soroban_sdk::{contract, contractevent, contractimpl, Address, Env};

#[contractevent(topics = ["anlytcs", "init"], data_format = "single-value")]
pub struct AnalyticsInitialized {
    pub admin: Address,
}

#[contractevent(topics = ["anlytcs", "donation"], data_format = "single-value")]
pub struct DonationRecorded {
    pub total_donations: u64,
}

#[contractevent(topics = ["anlytcs", "request"], data_format = "single-value")]
pub struct RequestRecorded {
    pub total_requests: u64,
}

#[contractevent(topics = ["anlytcs", "delivery"], data_format = "single-value")]
pub struct DeliveryRecorded {
    pub total_deliveries: u64,
}

#[contractevent(topics = ["anlytcs", "payment"], data_format = "vec")]
pub struct PaymentReleaseRecorded {
    pub amount: i128,
    pub total_payments_released: u64,
    pub total_volume: i128,
}

#[contractevent(topics = ["anlytcs", "period"], data_format = "vec")]
pub struct ReportingPeriodUpdated {
    pub period_type: PeriodType,
    pub duration_secs: u64,
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTRACT_VERSION: u32 = 1;
const DAILY_SECS: u64 = 86_400;
const WEEKLY_SECS: u64 = 604_800;
// Calendar months are 28-31 days, so this is a fixed 30-day rolling window,
// not a calendar month. It does not align with month boundaries and drifts
// by up to ~5 days per year. See PeriodType::Monthly.
const THIRTY_DAY_WINDOW_SECS: u64 = 2_592_000; // 30 days

// TTL bounds for snapshot persistent entries (~17 days min, ~365 days max in ledgers at ~5s/ledger)
const SNAPSHOT_TTL_MIN: u32 = 290_000;
const SNAPSHOT_TTL_MAX: u32 = 6_307_200;

// ── Storage helpers ───────────────────────────────────────────────────────────

fn require_initialized(env: &Env) -> Result<AnalyticsConfig, AnalyticsError> {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .ok_or(AnalyticsError::NotInitialized)
}

fn require_admin(env: &Env) -> Result<AnalyticsConfig, AnalyticsError> {
    let cfg = require_initialized(env)?;
    cfg.admin.require_auth();
    Ok(cfg)
}

fn require_authorized_caller(env: &Env) -> Result<AnalyticsConfig, AnalyticsError> {
    // No longer calls the nonexistent env.invoker() (soroban-sdk 23 removed it);
    // delegates to require_admin so there's a single source of truth for auth.
    require_admin(env)
}

fn current_period_index(env: &Env, duration_secs: u64) -> u64 {
    env.ledger().timestamp() / duration_secs
}

fn load_snapshot(env: &Env, period_type: PeriodType, period_index: u64) -> MetricsSnapshot {
    env.storage()
        .persistent()
        .get(&DataKey::Snapshot(period_type, period_index))
        .unwrap_or(MetricsSnapshot {
            period_index,
            total_donations: 0,
            total_requests: 0,
            total_deliveries: 0,
            total_payments_released: 0,
            total_volume: 0,
            last_updated: 0,
        })
}

fn save_snapshot(env: &Env, period_type: PeriodType, snapshot: &MetricsSnapshot) {
    let key = DataKey::Snapshot(period_type, snapshot.period_index);
    env.storage().persistent().set(&key, snapshot);
    env.storage()
        .persistent()
        .extend_ttl(&key, SNAPSHOT_TTL_MIN, SNAPSHOT_TTL_MAX);
}

fn get_counter_u64(env: &Env, key: &DataKey) -> u64 {
    env.storage().persistent().get(key).unwrap_or(0u64)
}

fn get_counter_i128(env: &Env, key: &DataKey) -> i128 {
    env.storage().persistent().get(key).unwrap_or(0i128)
}

fn set_counter_u64(env: &Env, key: &DataKey, value: u64) {
    env.storage().persistent().set(key, &value);
    env.storage()
        .persistent()
        .extend_ttl(key, SNAPSHOT_TTL_MIN, SNAPSHOT_TTL_MAX);
}

fn set_counter_i128(env: &Env, key: &DataKey, value: i128) {
    env.storage().persistent().set(key, &value);
    env.storage()
        .persistent()
        .extend_ttl(key, SNAPSHOT_TTL_MIN, SNAPSHOT_TTL_MAX);
}

/// Read the timestamp of the last actual metric write.
///
/// Returns 0 when no metric has ever been recorded, so callers can
/// distinguish "never updated" from a genuine ingestion timestamp.
fn get_last_updated(env: &Env) -> u64 {
    env.storage()
        .persistent()
        .get(&DataKey::LastUpdated)
        .unwrap_or(0u64)
}

/// Persist the timestamp of the last actual metric write.
fn set_last_updated(env: &Env, timestamp: u64) {
    env.storage()
        .persistent()
        .set(&DataKey::LastUpdated, &timestamp);
    env.storage().persistent().extend_ttl(
        &DataKey::LastUpdated,
        SNAPSHOT_TTL_MIN,
        SNAPSHOT_TTL_MAX,
    );
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct AnalyticsContract;

#[contractimpl]
impl AnalyticsContract {
    /// Initialize the analytics contract.
    ///
    /// Links all domain contracts, sets the default reporting period (daily),
    /// and zeroes all lifetime counters. Can only be called once.
    pub fn initialize(
        env: Env,
        admin: Address,
        inventory_contract: Address,
        requests_contract: Address,
        payments_contract: Address,
        reputation_contract: Address,
    ) -> Result<(), AnalyticsError> {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::Config) {
            return Err(AnalyticsError::AlreadyInitialized);
        }

        let now = env.ledger().timestamp();

        let config = AnalyticsConfig {
            admin: admin.clone(),
            inventory_contract,
            requests_contract,
            payments_contract,
            reputation_contract,
            reporting_period: ReportingPeriod {
                period_type: PeriodType::Daily,
                duration_secs: DAILY_SECS,
                configured_at: now,
            },
            initialized_at: now,
        };

        env.storage().instance().set(&DataKey::Config, &config);

        // Initialize lifetime counters to zero in persistent storage.
        set_counter_u64(&env, &DataKey::TotalDonations, 0u64);
        set_counter_u64(&env, &DataKey::TotalRequests, 0u64);
        set_counter_u64(&env, &DataKey::TotalDeliveries, 0u64);
        set_counter_u64(&env, &DataKey::TotalPaymentsReleased, 0u64);
        set_counter_i128(&env, &DataKey::TotalVolume, 0i128);

        // No metric has been recorded yet; last_updated starts at 0.
        set_last_updated(&env, 0u64);

        AnalyticsInitialized { admin }.publish(&env);

        Ok(())
    }

    /// Get contract version
    pub fn version(_env: Env) -> u32 {
        CONTRACT_VERSION
    }

    // ── Configuration ─────────────────────────────────────────────────────────

    /// Update the reporting period. Admin only.
    pub fn set_reporting_period(env: Env, period_type: PeriodType) -> Result<(), AnalyticsError> {
        let mut cfg = require_admin(&env)?;

        let duration_secs = match period_type {
            PeriodType::Daily => DAILY_SECS,
            PeriodType::Weekly => WEEKLY_SECS,
            PeriodType::Monthly => THIRTY_DAY_WINDOW_SECS,
        };

        cfg.reporting_period = ReportingPeriod {
            period_type,
            duration_secs,
            configured_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&DataKey::Config, &cfg);

        ReportingPeriodUpdated {
            period_type,
            duration_secs,
        }
        .publish(&env);

        Ok(())
    }

    // ── Metric ingestion ──────────────────────────────────────────────────────

    /// Record a new donation. Authorized callers only (admin or domain contracts).
    pub fn record_donation(env: Env) -> Result<(), AnalyticsError> {
        let cfg = require_authorized_caller(&env)?;
        let idx = current_period_index(&env, cfg.reporting_period.duration_secs);
        let mut snap = load_snapshot(&env, cfg.reporting_period.period_type, idx);
        snap.total_donations += 1;
        snap.last_updated = env.ledger().timestamp();
        save_snapshot(&env, cfg.reporting_period.period_type, &snap);

        let total = get_counter_u64(&env, &DataKey::TotalDonations) + 1;
        set_counter_u64(&env, &DataKey::TotalDonations, total);
        set_last_updated(&env, snap.last_updated);

        DonationRecorded {
            total_donations: total,
        }
        .publish(&env);

        Ok(())
    }

    /// Record a new blood request. Authorized callers only (admin or domain contracts).
    pub fn record_request(env: Env) -> Result<(), AnalyticsError> {
        let cfg = require_authorized_caller(&env)?;
        let idx = current_period_index(&env, cfg.reporting_period.duratio

/* … truncated 4421 chars — edit only what you need near the top … */
