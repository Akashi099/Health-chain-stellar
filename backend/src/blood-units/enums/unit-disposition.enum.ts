export enum UnitDisposition {
  IN_STOCK = 'in_stock',
  ALLOCATED = 'allocated',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
  QUARANTINED = 'quarantined',
  DISCARDED = 'discarded',
}

export enum DispositionReason {
  DELIVERY_FAILED = 'delivery_failed',
  COLD_CHAIN_BREACH = 'cold_chain_breach',
  EXPIRED = 'expired',
  DAMAGED = 'damaged',
  REJECTED_BY_RECIPIENT = 'rejected_by_recipient',
  TEMPERATURE_EXCURSION = 'temperature_excursion',
  TIME_EXCEEDED = 'time_exceeded',
  QUALITY_CONCERN = 'quality_concern',
}
