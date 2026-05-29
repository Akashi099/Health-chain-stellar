/**
 * Fee Policy Bounds & Constants
 * HealthChain-Stellar payment layer
 *
 * All monetary values are in stroops (1 XLM = 10_000_000 stroops)
 * unless suffixed with _PERCENT (basis points: 100 bp = 1%).
 */

// ─── Stellar Network ──────────────────────────────────────────────────────────
export const STELLAR_BASE_FEE_STROOPS = 100; // minimum network fee per operation
export const STELLAR_MAX_FEE_STROOPS = 10_000_000; // 1 XLM hard ceiling

// ─── Payment Amount Bounds ────────────────────────────────────────────────────
/** 0.01 XLM – smallest clinically meaningful payment */
export const PAYMENT_AMOUNT_MIN_STROOPS = 100_000;
/** 100 000 XLM – catastrophic-loss guard */
export const PAYMENT_AMOUNT_MAX_STROOPS = 1_000_000_000_000_000;

// ─── Platform Fee (basis points) ─────────────────────────────────────────────
/** 0 % – free-tier providers may have 0 platform fee */
export const PLATFORM_FEE_MIN_BP = 0;
/** 5 % – no provider should pay more than 5 % platform cut */
export const PLATFORM_FEE_MAX_BP = 500;

// ─── Insurance Processing Fee (basis points) ─────────────────────────────────
export const INSURANCE_FEE_MIN_BP = 0;
export const INSURANCE_FEE_MAX_BP = 300; // 3 %

// ─── Flat Fees (stroops) ─────────────────────────────────────────────────────
export const FLAT_FEE_MIN_STROOPS = 0;
/** 10 XLM maximum flat fee per transaction */
export const FLAT_FEE_MAX_STROOPS = 100_000_000;

// ─── Aggregate Cap ────────────────────────────────────────────────────────────
/**
 * Total fees (platform + insurance + network) must never exceed this fraction
 * of the gross payment amount (expressed in basis points).
 * Prevents pathological configs that consume the entire payment.
 */
export const TOTAL_FEE_CAP_BP = 1500; // 15 %

/**
 * Minimum net amount that must reach the recipient after all fees.
 * Guards against fee stacking that results in zero or negative payout.
 */
export const MIN_NET_AMOUNT_STROOPS = 100_000; // 0.01 XLM

// ─── Precision ────────────────────────────────────────────────────────────────
export const BASIS_POINTS_DENOMINATOR = 10_000;

export const FEE_POLICY_ERRORS = {
  AMOUNT_BELOW_MIN: 'Payment amount is below the minimum allowed threshold.',
  AMOUNT_ABOVE_MAX: 'Payment amount exceeds the maximum allowed threshold.',
  PLATFORM_FEE_BELOW_MIN: 'Platform fee rate is below the allowed minimum.',
  PLATFORM_FEE_ABOVE_MAX: 'Platform fee rate exceeds the allowed maximum.',
  INSURANCE_FEE_ABOVE_MAX: 'Insurance fee rate exceeds the allowed maximum.',
  FLAT_FEE_ABOVE_MAX: 'Flat fee exceeds the maximum allowed value.',
  STELLAR_FEE_BELOW_BASE: 'Stellar network fee is below the required base fee.',
  STELLAR_FEE_ABOVE_MAX: 'Stellar network fee exceeds the hard ceiling.',
  TOTAL_FEE_CAP_EXCEEDED:
    'Aggregate fees exceed the 15 % cap of the payment amount.',
  NET_AMOUNT_TOO_LOW:
    'Net amount after fees falls below the minimum recipient threshold.',
  NEGATIVE_NET_AMOUNT: 'Fee configuration results in a negative net amount.',
  PATHOLOGICAL_ZERO_NET:
    'Fee configuration would leave zero value for the recipient.',
} as const;
