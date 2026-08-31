export type PriceSuccess = { ok: true; cents: number }
export type PriceError = { ok: false; error: { code: string; message: string } }
export type PriceResult = PriceSuccess | PriceError

const PRICE_PER_HOUR = 3000

function invalidDuration(message: string): PriceError {
  return { ok: false, error: { code: 'INVALID_DURATION', message } }
}

function getDurationError(hours: number): string | null {
  if (!Number.isFinite(hours)) return 'durations must be whole hours'
  if (!Number.isInteger(hours)) return 'durations must be whole hours'
  if (hours < 1) return 'duration must be at least 1 hour'
  if (hours > 4) return 'duration may be at most 4 hours'
  if (hours < 0) return 'duration must be at least 1 hour'
  return null
}

export function priceCents(hours: number, freeHourAvailable: boolean): PriceResult {
  const msg = getDurationError(hours)
  if (msg) return invalidDuration(msg)
  const cents = freeHourAvailable ? (hours - 1) * PRICE_PER_HOUR : hours * PRICE_PER_HOUR
  return { ok: true, cents }
}

// Pro-rata per minute: €30/h = €0.50/min = 50 cents/min
const CENTS_PER_MINUTE = 50

export function recordedBillingCents(totalMinutes: number, freeHourAvailable: boolean): number {
  const freeMinutes = freeHourAvailable ? 60 : 0
  const billableMinutes = Math.max(0, totalMinutes - freeMinutes)
  return Math.ceil(billableMinutes * CENTS_PER_MINUTE)
}

export function validateActualMinutes(v: unknown): string | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v))
    return 'actualMinutes must be an integer'
  if (v <= 0) return 'actualMinutes must be > 0'
  if (v > 600) return 'actualMinutes too large'
  return null
}
