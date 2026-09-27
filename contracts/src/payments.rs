use soroban_sdk::{contracttype, Address, Bytes, String, Symbol, Vec};

pub const DEFAULT_DISPUTE_TIMEOUT_SECS: u64 = 72 * 60 * 60;
pub const MAX_DISPUTE_TIMEOUT_SECS: u64 = 30 * 24 * 60 * 60;
pub const HIGH_VALUE_THRESHOLD: i128 = 10_000;

/// Maximum total fees expressed in basis points (1 bp = 0.01%).
///
/// Caps the sum of service_fee + network_fee + performance_bonus + fixed_fee at
/// 50% of the gross amount (5000 bp). This closes the fee-structuring attack
/// described in issue #1400: without this cap an attacker could inflate fees so
/// that the stored net `payment.amount` falls under `HIGH_VALUE_THRESHOLD` while
/// the real locked amount is far above it, bypassing the M-of-N multisig guard.
pub const MAX_FEE_BPS: i128 = 5_000; // 50 %

/// **Dispute evidence (beyond `Symbol` limits).**
///
/// Soroban `Symbol` values are capped (~32 characters) and cannot carry full IPFS CIDs,
/// long URLs, or rich text. Disputes therefore store:
/// - [`Dispute::reason`]: human-readable explanation as Soroban [`String`].
/// - [`Dispute::evidence_digest`]: a fixed-size fingerprint (typically 32 bytes, e.g. SHA-256)
///   over the canonical evidence payload agreed off-chain.
/// - [`Dispute::evidence_ref_chunks`]: optional ordered segments. If a single `String` is not
///   enough for a CID/URL, split off-chain, submit each piece in order, and reassemble off-chain
///   for display. Verifiers must check the reconstructed reference against `evidence_digest`.

/// Represents the current state of a payment in its lifecycle
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PaymentStatus {
    /// Payment created but not yet funded
    Pending,
    /// Payment funds locked in escrow
    Escrowed,
    /// Payment is under dispute
    Disputed,
    /// Payment dispute has been resolved
    Resolved,
    /// Payment successfully completed and funds transferred
    Completed,
    /// Payment refunded to payer
    Refunded,
    /// Payment cancelled before escrow
    Cancelled,
}

/// Represents the status of a dispute
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DisputeStatus {
    /// Dispute initiated by a party
    Open,
    /// Dispute resolved in favor of the payer (refund)
    ResolvedInFavorOfPayer,
    /// Dispute resolved in favor of the payee (payout)
    ResolvedInFavorOfPayee,
    /// Dispute dismissed without change
    Dismissed,
}

/// Dispute record for delivery issues
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Dispute {
    /// Unique dispute identifier
    pub id: u64,
    /// Associated payment ID
    pub payment_id: u64,
    /// Party who raised the dispute
    pub raised_by: Address,
    /// Current status of the dispute
    pub status: DisputeStatus,
    /// Reason for the dispute (Soroban [`String`], not `Symbol`)
    pub reason: String,
    /// 32-byte (or shorter, left-padded) digest of canonical evidence; primary on-chain anchor
    pub evidence_digest: Bytes,
    /// Optional URI/CID fragments; concatenate off-chain in order (see module docs)
    pub evidence_ref_chunks: Vec<String>,
    /// Timestamp when dispute was raised
    pub raised_at: u64,
    /// Timestamp when dispute was resolved
    pub resolved_at: Option<u64>,
}

/// Additional dispute metadata that can evolve independently of the dispute record.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DisputeMetadata {
    pub dispute_id: u64,
    pub dispute_deadline: u64,
}

/// Aggregated refund stats for dispute timeout processing.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PaymentStats {
    pub count_auto_refunded: u64,
    pub total_auto_refunded: i128,
}

/// Conditions that must be met before escrow funds can be released
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReleaseConditions {
    /// Whether medical records have been verified
    pub medical_records_verified: bool,
    /// Minimum timestamp before release is allowed
    pub min_timestamp: u64,
    /// Optional address authorized to approve release
    pub authorized_approver: Option<Address>,
}

/// Core payment transaction structure
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Payment {
    /// Unique payment identifier
    pub id: u64,
    /// Associated request ID
    pub request_id: u64,
    /// Address sending the payment
    pub payer: Address,
    /// Address receiving the payment
    pub payee: Address,
    /// Payment amount in smallest unit (net after fees)
    pub amount: i128,
    /// Asset contract address
    pub asset: Address,
    /// Fee structure applied (for audit)
    pub fee_structure: FeeStructure,
    /// Current payment status
    pub status: PaymentStatus,
    /// Timestamp when escrow was released (if applicable)
    pub escrow_released_at: Option<u64>,
}

/// Escrow account holding locked funds
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
/// Bookkeeping record only — `locked_amount` is not backed by any token
/// transfer. This contract never calls a token contract, so no funds are
/// ever actually pulled from the payer or paid to the payee; every
/// status/amount here is cosmetic state until real token custody is wired
/// in. See the on-chain entrypoints in `lib.rs` (create_payment,
/// propose_release, resolve_dispute, process_expired_disputes).
pub struct EscrowAccount {
    /// Associated payment ID
    pub payment_id: u64,
    /// Amount recorded as locked in escrow bookkeeping (no real fund custody — see struct docs)
    pub locked_amount: i128,
    /// Conditions for releasing funds
    pub release_conditions: ReleaseConditions,
}

/// M-of-N multisig release configuration for high-value escrow.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MultiSigConfig {
    pub signers: Vec<Address>,
    pub threshold: u32,
}

/// Votes accumulated for a payment release proposal.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PendingApproval {
    pub payment_id: u64,
    pub approvals: Vec<Address>,
    pub executed: bool,
}

impl PendingApproval {
    /// Creates an empty approval record for `payment_id`.
    pub fn new(env: &soroban_sdk::Env, payment_id: u64) -> Self {
        Self {
            payment_id,
            approvals: Vec::new(env),
            executed: false,
        }
    }

    /// Records `approver`'s vote. Returns `Err(())` if the approver has
    /// already voted, so callers can surface `Error::DuplicateApproval`.
    pub fn register_vote(&mut self, approver: Address) -> Result<(), ()> {
        if self.approvals.contains(&approver) {
            return Err(());
        }
        self.approvals.push_back(approver);
        Ok(())
    }

    /// Returns `true` once the number of distinct approvals meets `threshold`.
    pub fn has_reached_threshold(&self, threshold: u32) -> bool {
        self.approvals.len() >= threshold
    }
}

/// Fee breakdown for a transaction
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FeeStructure {
    /// Policy ID for audit
    pub policy_id: Symbol,
    /// Platform service fee
    pub service_fee: i128,
    /// Network transaction fee
    pub network_fee: i128,
    /// Optional performance-based bonus
    pub performance_bonus: i128,
    /// Fixed fee
    pub fixed_fee: i128,
}

/// Additional metadata for transaction tracking
///
/// Note: Soroban Symbols have strict constraints:
/// - Only a-z, A-Z, 0-9, and underscore allowed
/// - No spaces, hyphens, dots, or special characters
/// - Maximum 32 characters for regular Symbol, 9 for symbol_short!
///
/// For complex strings like URLs or multi-word descriptions,
/// consider using String type or storing a hash/reference ID
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TransactionMetadata {
    /// Short identifier or category (use underscores for spaces)
    pub description: Symbol,
    /// Categorization tags (short identifiers only)
    pub tags: Vec<Symbol>,
    /// Reference identifier (not a full URL - use hash or ID)
    pub reference_url: Symbol,
}

impl PaymentStats {
    pub fn new() -> Self {
        Self {
            count_auto_refunded: 0,
            total_auto_refunded: 0,
        }
    }
}

impl Payment {
    pub fn validate(&self) -> Result<(), PaymentError> {
        // Amount must be positive
        if self.amount <= 0 {
            return Err(PaymentError::InvalidAmount);
        }

        // Payer and payee must be different
        if self.payer == self.payee {
            return Err(PaymentError::SamePayerPayee);
        }

        // Asset must not be payer or payee
        if self.asset == self.payer || self.asset == self.payee {
            return Err(PaymentError::InvalidAsset);
        }

        Ok(())
    }
    /// Checks if payment can tra

/* … truncated 7221 chars — edit only what you need near the top … */
