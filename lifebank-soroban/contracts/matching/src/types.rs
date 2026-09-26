use soroban_sdk::{contracttype, Address, Vec};

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

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

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BloodComponent {
    WholeBlood,
    RedCells,
    Plasma,
    Platelets,
    Cryoprecipitate,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Urgency {
    Low,
    Medium,
    High,
    Critical,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RequestStatus {
    Pending,
    Approved,
    Fulfilled,
    Cancelled,
    Expired,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BloodStatus {
    Available,
    Reserved,
    InTransit,
    Delivered,
    Expired,
    Discarded,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MatchKind {
    Exact,
    Compatible,
}

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

/// Mirrors `request_contract::types::BloodRequest` exactly.
///
/// Soroban's generated struct decoder (`map_unpack_to_slice`) requires the
/// decoded map's length to equal the number of locally-declared fields, so
/// this struct must declare every field the requests contract returns.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BloodRequest {
    pub id: u64,
    pub hospital_id: Address,
    pub blood_type: BloodType,
    pub component: BloodComponent,
    pub quantity_ml: u32,
    pub urgency: Urgency,
    pub created_timestamp: u64,
    pub required_by_timestamp: u64,
    pub status: RequestStatus,
    pub assigned_units: Vec<u64>,
    pub fulfilled_quantity_ml: u32,
    pub reservation_id: Option<u64>,
    pub fulfilled_by: Option<Address>,
    pub history: Vec<RequestHistoryEntry>,
}

/// Mirrors `request_contract::types::RequestHistoryEntry`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RequestHistoryEntry {
    pub timestamp: u64,
    pub action: RequestStatus,
    pub actor: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BloodUnit {
    pub id: u64,
    pub blood_type: BloodType,
    pub component: BloodComponent,
    pub quantity_ml: u32,
    pub status: BloodStatus,
    pub expiration_timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MatchedUnit {
    pub unit_id: u64,
    pub score: u32,
    pub kind: MatchKind,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MatchResult {
    pub request_id: u64,
    pub matched_units: Vec<MatchedUnit>,
    pub total_matched_ml: u32,
    pub partial: bool,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    InventoryContract,
    RequestsContract,
    Initialized,
    Paused,
}
