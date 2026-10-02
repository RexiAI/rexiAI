// Billing kill-switch.
//
// BILLING_ENABLED=false turns OFF all charging: bookings stay €0 reservations
// (they already are) and recorded-billing returns "free" instead of creating a
// Stripe charge. The frontend reads the same flag (via GET /api/config) to show
// the "talks & analysis are free" promo.
//
// Fail-safe default: ENABLED. Only the exact string 'false' (any case) disables
// charging, so a missing/typo'd env var never accidentally gives everything away
// for free. Flip it back by unsetting the var or setting it to anything but
// 'false'.
export function isBillingEnabled(): boolean {
  return process.env['BILLING_ENABLED']?.trim().toLowerCase() !== 'false'
}
