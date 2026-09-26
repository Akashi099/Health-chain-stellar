#![no_std]
#![deny(deprecated)]

/// Cross-contract coordinator for the HealthDonor workflow.
///
/// Canonical workflow sequence enforced here:
///   1. allocate_units  – Request must be Pending; reserves inventory units
///   2. confirm_delivery – Workflow must be Allocated; marks units Delivered
///   3. settle_payment   – Workflow must be Delivered; releases escrowed payment
///
/// Any step that finds the prerequisite state missing returns an error and makes
/// no state changes, providing safe rollback semantics within a single transaction.
mod error;
mod types;

#[cfg(test)]
mod test;

pub use error::CoordinatorError;
pub use types::{DataKey, ExcursionSummary, WorkflowRecord, WorkflowStatus};

use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, String, Vec};

/// Default workflow expiry window: 6 hours expressed in seconds.
/// After `allocate_units` is called, if `confirm_delivery` is never invoked
/// within this window, anyone may call `expire_workflow` to roll back the
/// allocation and free the reserved units and escrowed payment.
const WORKFLOW_TIMEOUT_SECS: u64 = 6 * 60 * 60;

const CONTRACT_VERSION: u32 = 1;

// ── Minimal interface types mirroring the domain contracts ────────────────────
// These allow the coordinator to inspect cross-contract return values without
// importing compiled WASMs. The domain contracts must keep these in sync.

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BloodType {
    APositive,
    ANegative,
    BPositive,
    BNegative,
    ABPositive,
    ABNegative,
    OPositive,
    ONegative,
}

impl BloodType {
    pub fn can_donate_to(&self, recipient: &BloodType) -> bool {
        use BloodType::*;
        matches!(
            (self, recipient),
            (ONegative, _)
                | (OPositive, APositive | BPositive | ABPositive | OPositive)
                | (ANegative, APositive | ANegative | ABPositive | ABNegative)
                | (APositive, APositive | ABPositive)
                | (BNegative, BPositive | BNegative | ABPositive | ABNegative)
                | (BPositive, BPositive | ABPositive)
                | (ABNegative, ABPositive | ABNegative)
                | (ABPositive, ABPositive)
        )
    }
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RequestStatus {
    Pending,
    Approved,
    Fulfilled,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct BloodRequest {
    pub id: u64,
    pub status: RequestStatus,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BloodStatus {
    Available,
    Reserved,
    InTransit,
    Delivered,
    Expired,
    Compromised,
    Disposed,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct BloodUnit {
    pub id: u64,
    pub status: BloodStatus,
    pub blood_type: BloodType,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PaymentStatus {
    Pending,
    Locked,
    Released,
    Refunded,
    Disputed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Payment {
    pub id: u64,
    pub request_id: u64,
    pub status: PaymentStatus,
}

// ── Cross-contract client traits ──────────────────────────────────────────────

mod request_client {
    use super::BloodRequest;
    use soroban_sdk::{contractclient, Env};

    #[contractclient(name = "RequestContractClient")]
    #[allow(dead_code)]
    pub trait RequestContractInterface {
        fn get_request(env: Env, request_id: u64) -> BloodRequest;
    }
}

mod inventory_client {
    use super::{BloodStatus, BloodUnit};
    use soroban_sdk::{contractclient, Address, Env, String};

    #[contractclient(name = "InventoryContractClient")]
    #[allow(dead_code)]
    pub trait InventoryContractInterface {
        fn get_blood_unit(env: Env, blood_unit_id: u64) -> BloodUnit;
        fn update_status(
            env: Env,
            unit_id: u64,
            new_status: BloodStatus,
            authorized_by: Address,
            reason: Option<String>,
        ) -> BloodUnit;
        fn mark_delivered(
            env: Env,
            unit_id: u64,
            authorized_by: Address,
            delivery_location: String,
        ) -> BloodUnit;
        fn get_admin(env: Env) -> Address;
    }
}

mod payment_client {
    use super::{Payment, PaymentStatus};
    use soroban_sdk::{contractclient, contracttype, Address, Env, String};

    #[contracttype]
    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    pub enum DisputeReason {
        FailedDelivery,
        TemperatureExcursion,
        PaymentContested,
        WrongItem,
        DamagedGoods,
        LateDelivery,
        Other,
    }

    #[contractclient(name = "PaymentContractClient")]
    #[allow(dead_code)]
    pub trait PaymentContractInterface {
        fn get_payment(env: Env, payment_id: u64) -> Payment;
        fn update_status(
            env: Env,
            payment_id: u64,
            status: PaymentStatus,
            caller: Address,
        );
        fn record_dispute(
            env: Env,
            payment_id: u64,
            reason: DisputeReason,
            case_id: String,
            caller: Address,
        );
    }
}

use inventory_client::InventoryContractClient;
use payment_client::PaymentContractClient;
use request_client::RequestContractClient;

// ── Contract events ───────────────────────────────────────────────────────────

#[contractevent(topics = ["coord", "init"], data_format = "single-value")]
pub struct CoordInitialized {
    pub admin: Address,
}

#[contractevent(topics = ["coord", "emrghlt"], data_format = "single-value")]
pub struct CoordEmergencyHalt {
    pub admin: Address,
}

#[contractevent(topics = ["coord", "alloc"], data_format = "vec")]
pub struct CoordAllocated {
    pub request_id: u64,
    pub unit_ids: Vec<u64>,
    pub unit_count: u32,
}

#[contractevent(topics = ["coord", "dlvrd"], data_format = "vec")]
pub struct CoordDelivered {
    pub request_id: u64,
    pub location: String,
}

#[contractevent(topics = ["coord", "settld"], data_format = "vec")]
pub struct CoordSettled {
    pub request_id: u64,
    pub payment_id: u64,
}

#[contractevent(topics = ["coord", "rollbk"], data_format = "single-value")]
pub struct CoordRolledBack {
    pub request_id: u64,
}

#[contractevent(topics = ["coord", "expired"], data_format = "single-value")]
pub struct CoordExpired {
    pub request_id: u64,
}

#[contractevent(topics = ["coord", "tmp_brch"], data_format = "vec")]
pub struct CoordTemperatureBreach {
    pub payment_id: u64,
    pub unit_id: u64,
    pub timestamp: u64,
}

// ── Storage helpers ────────────────────────────────────────────────────────────

fn get_admin(env: &Env) -> Result<Address, CoordinatorError> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(CoordinatorError::NotInitialized)
}

fn get_contract_address(env: &Env, key: &DataKey) -> Result<Address, CoordinatorError> {
    env.storage()
        .instance()
        .get(key)
        .ok_or(CoordinatorError::NotInitialized)
}

fn is_terminal(status: WorkflowStatus) -> bool {
    matches!(status, WorkflowStatus::Settled | WorkflowStatus::RolledBack)
}

fn load_workflow(env: &Env, request_id: u64) -> Option<WorkflowRecord> {
    const WORKFLOW_TTL_LEDGERS: u32 = 535_680; // ~30 days at 5s/ledger
    let key = DataKey::Workflow(request_id);

    let workflow: Option<WorkflowRecord> = env.storage().persistent().get(&key);
    if let Some(wf) = &workflow {
        // Terminal workflows are archived with a fixed short TTL at write time
        // (see save_workflow) and must be allowed to lapse naturally — do not
        // keep extending TTL on every read or storage grows unbounded forever.
        if !is_terminal(wf.status) {
            env.storage()
                .persistent()
                .extend_ttl(&key, WORKFLOW_TTL_LEDGERS, WORKFLOW_TTL_LEDGERS);
        }
    }

    workflow
}

fn save_workflow(env: &Env, wf: &WorkflowRecord) {
    const WORKFLOW_TTL_LEDGERS: u32 = 535_680; // ~30 days at 5s/ledger
    const TERMINAL_TTL_LEDGERS: u32 = 17_280; // ~1 day at 5s/ledger

    let key = DataKey::Workflow(wf.request_id);
    env.storage().persistent().set(&key, wf);

    let ttl = if is_terminal(wf.status) {
        TERMINAL_TTL_LEDGERS
    } else {
        WORKFLOW_TTL_LEDGERS
    };
    env.storage().persistent().extend_ttl(&key, ttl, ttl);
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct CoordinatorContract;

#[contractimpl]
impl CoordinatorContract {
    /// One-time initialization. Stores the admin and the addresses of the
    /// request, inventory, and payment contracts this coordinator drives.
    pub fn initialize(
        env: Env,
        admin: Address,
        request_contract: Address,
        inventory_contract: Address,
        payment_contract: Address,
    ) -> Result<(), CoordinatorError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(CoordinatorError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::RequestContract, &request_contract);
        env.storage()
            .instance()
            .set(&DataKey::InventoryContract, &inventory_contract);
        env.storage()
            .instance()
            .set(&DataKey::PaymentContract, &payment_contract);
        env.storage()
            .instance()
            .set(&DataKey::EmergencyHalt, &false);
        env.storage()
            .instance()
            .set(&DataKey::Version, &CONTRACT_VERSION);

        CoordInitialized { admin }.publish(&env);
        Ok(())
    }

    /// Emergency halt: blocks all state-mutating workflow operations.
    pub fn emergency_halt(env: Env) -> Result<(), CoordinatorError> {
        let admin = get_admin(&env)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::EmergencyHalt, &true);
        CoordEmergencyHalt { admin }.publish(&env);
        Ok(())
    }

    /// Clears the emergency halt, re-enabling workflow operations.
    pub fn resume(env: Env) -> Result<(), CoordinatorError> {
        let admin = get_admin(&env)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::EmergencyHalt, &false);
        Ok(())
    }

    fn require_not_halted(env: &Env) -> Result<(), CoordinatorError> {
        let halted: bool = env
            .storage()
            .instance()
            .get(&DataKey::EmergencyHalt)
            .unwrap_or(false);
        if halted {
            return Err(CoordinatorError::EmergencyHalted);
        }
        Ok(())
    }

    /// Step 1: reserve inventory units for an approved request.
    ///
    /// The request must be `Pending`. Units are reserved in the inventory
    /// contract and a workflow record is created in `Allocated` state.
    pub fn allocate_units(
        env: Env,
        request_id: u64,
        unit_ids: Vec<u64>,
    ) -> Result<(), CoordinatorError> {
        Self::require_not_halted(&env)?;

        let admin = get_admin(&env)?;
        admin.require_auth();

        if unit_ids.is_empty() {
            return Err(CoordinatorError::NoUnitsProvided);
        }

        // A request_id may only be allocated once while its workflow is live.
        // Once the prior workflow is terminal (Settled/RolledBack) the id may
        // be reused for a brand-new workflow.
        if let Some(existing) = load_workflow(&env, request_id) {
            if !is_terminal(existing.status) {
                return Err(CoordinatorError::WorkflowAlreadyExists);
            }
        }

        let req_addr: Address = get_contract_address(&env, &DataKey::RequestContract)?;
        let req_client = RequestContractClient::new(&env, &req_addr);
        let request = req_client.get_request(&request_id);

        if request.status != RequestStatus::Pending {
            return Err(CoordinatorError::RequestNotPending);
        }

        let inv_addr: Address = get_contract_address(&env, &DataKey::InventoryContract)?;
        let inv_client = InventoryContractClient::new(&env, &inv_addr);
        let inv_admin = inv_client.get_admin();

        for i in 0..unit_ids.len() {
            let uid = unit_ids.get(i).unwrap();
            inv_client
                .try_update_status(&uid, &BloodStatus::Reserved, &inv_admin, &None)
                .map_err(|_| CoordinatorError::InventoryUpdateFailed)?
                .map_err(|_| CoordinatorError::InventoryUpdateFailed)?;
        }

        let wf = WorkflowRecord {
            request_id,
            status: WorkflowStatus::Allocated,
            unit_ids: unit_ids.clone(),
            payment_id: 0,
            allocated_at: env.ledger().timestamp(),
            delivered_at: 0,
        };
        save_workflow(&env, &wf);

        CoordAllocated {
            request_id,
            unit_ids,
            unit_count: wf.unit_ids.len(),
        }
        .publish(&env);

        Ok(())
    }

    /// Step 2: mark all reserved units as delivered.
    ///
    /// The workflow must be `Allocated`.
    pub fn confirm_delivery(
        env: Env,
        request_id: u64,
        location: String,
    ) -> Result<(), CoordinatorError> {
        Self::require_not_halted(&env)?;

        let admin = get_admin(&env)?;
        admin.require_auth();

        let mut wf = load_workflow(&env, request_id).ok_or(CoordinatorError::WorkflowNotFound)?;

        if wf.status != WorkflowStatus::Allocated {
            return Err(CoordinatorError::InvalidWorkflowState);
        }

        let inv_addr: Address = get_contract_address(&env, &DataKey::InventoryContract)?;
        let inv_client = InventoryContractClient::new(&env, &inv_addr);
        let inv_admin = inv_client.get_admin();

        for i in 0..wf.unit_ids.len() {
            let uid = wf.unit_ids.get(i).unwrap();
            inv_client
                .try_mark_delivered(&uid, &inv_admin, &location)
                .map_err(|_| CoordinatorError::InventoryUpdateFailed)?
                .map_err(|_| CoordinatorError::InventoryUpdateFailed)?;
        }

        wf.status = WorkflowStatus::Delivered;
        wf.delivered_at = env.ledger().timestamp();
        save_workflow(&env, &wf);

        CoordDelivered {
            request_id,
            location,
        }
        .publish(&env);

        Ok(())
    }

    /// Step 3: release escrowed payment for a delivered workflow.
    ///
    /// The workflow must be `Delivered`.
    pub fn settle_payment(
        env: Env,
        request_id: u64,
        payment_id: u64,
    ) -> Result<(), CoordinatorError> {
        Self::require_not_halted(&env)?;

        let admin = get_admin(&env)?;
        admin.require_auth();

        let mut wf = load_workflow(&env, request_id).ok_or(CoordinatorError::WorkflowNotFound)?;

        if wf.status != WorkflowStatus::Delivered {
            return Err(CoordinatorError::InvalidWorkflowState);
        }

        let pay_addr: Address = get_contract_address(&env, &DataKey::PaymentContract)?;
        let pay_client = PaymentContractClient::new(&env, &pay_addr);

        pay_client.update_status(&payment_id, &PaymentStatus::Released, &admin);

        wf.status = WorkflowStatus::Settled;
        wf.payment_id = payment_id;
        save_workflow(&env, &wf);

        CoordSettled {
            request_id,
            payment_id,
        }
        .publish(&env);

        Ok(())
    }

    /// Rolls back an in-flight allocation, returning reserved units to the
    /// available pool.
    ///
    /// Only an `Allocated` workflow may be rolled back. Terminal states
    /// (`Settled`, `RolledBack`) and post-delivery states (`Delivered`) are
    /// rejected: unit IDs are a global, reusable pool, so replaying a rollback
    /// against an already-terminal workflow could release units that have since
    /// been reserved by a different, active workflow.
    pub fn rollback(env: Env, request_id: u64) -> Result<(), CoordinatorError> {
        Self::require_not_halted(&env)?;

        let admin = get_admin(&env)?;
        admin.require_auth();

        let mut wf = load_workflow(&env, request_id).ok_or(CoordinatorError::WorkflowNotFound)?;

        // Whitelist guard: only an Allocated workflow may be rolled back.
        // This rejects Settled, Delivered, and RolledBack (already terminal),
        // preventing a replayed rollback from mutating units now held by a
        // different, active workflow.
        if wf.status != WorkflowStatus::Allocated {
            return Err(CoordinatorError::InvalidWorkflowState);
        }

        let inv_addr: Address = get_contract_address(&env, &DataKey::InventoryContract)?;
        let inv_client = InventoryContractClient::new(&env, &inv_addr);
        let inv_admin = inv_client.get_admin();

        for i in 0..wf.unit_ids.len() {
            let uid = wf.unit_ids.get(i).unwrap();
            inv_client
                .try_update_status(&uid, &BloodStatus::Available, &inv_admin, &None)
                .map_err(|_| CoordinatorError::InventoryUpdateFailed)?
                .map_err(|_| CoordinatorError::InventoryUpdateFailed)?;
        }

        wf.status = WorkflowStatus::RolledBack;
        save_workflow(&env, &wf);

        CoordRolledBack { request_id }.publish(&env);

        Ok(())
    }

    /// Expires a stale allocation after `WORKFLOW_TIMEOUT_SECS`.
    ///
    /// Only an `Allocated` workflow may be expired.
    pub fn expire_workflow(env: Env, request_id: u64) -> Result<(), CoordinatorError> {
        Self::require_not_halted(&env)?;

        let mut wf = load_workflow(&env, request_id).ok_or(CoordinatorError::WorkflowNotFound)?;

        if wf.status != WorkflowStatus::Allocated {
            return Err(CoordinatorError::InvalidWorkflowState);
        }

        let now = env.ledger().timestamp();
        if now < wf.allocated_at + WORKFLOW_TIMEOUT_SECS {
            return Err(CoordinatorError::WorkflowNotExpired);
        }

        let inv_addr: Address = get_contract_address(&env, &DataKey::InventoryContract)?;
        let inv_client = InventoryContractClient::new(&env, &inv_addr);
        let inv_admin = inv_client.get_admin();

        for i in 0..wf.unit_ids.len() {
            let uid = wf.unit_ids.get(i).unwrap();
            inv_client
                .try_update_status(&uid, &BloodStatus::Available, &inv_admin, &None)
                .map_err(|_| CoordinatorError::InventoryUpdateFailed)?
                .map_err(|_| CoordinatorError::InventoryUpdateFailed)?;
        }

        wf.status = WorkflowStatus::RolledBack;
        save_workflow(&env, &wf);

        CoordExpired { request_id }.publish(&env);

        Ok(())
    }

    /// Records a temperature excursion against a payment and unit.
    pub fn report_temperature_breach(
        env: Env,
        payment_id: u64,
        unit_id: u64,
    ) -> Result<(), CoordinatorError> {
        Self::require_not_halted(&env)?;

        let admin = get_admin(&env)?;
        admin.require_auth();

        let pay_addr: Address = get_contract_address(&env, &DataKey::PaymentContract)?;
        let pay_client = PaymentContractClient::new(&env, &pay_addr);

        pay_client.record_dispute(
            &payment_id,
            &payment_client::DisputeReason::TemperatureExcursion,
            &String::from_str(&env, "temp-breach"),
            &admin,
        );

        CoordTemperatureBreach {
            payment_id,
            unit_id,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);

        Ok(())
    }

    /// Read-only accessor for a workflow record.
    pub fn get_workflow(env: Env, request_id: u64) -> Result<WorkflowRecord, CoordinatorError> {
        load_workflow(&env, request_id).ok_or(CoordinatorError::WorkflowNotFound)
    }
}
