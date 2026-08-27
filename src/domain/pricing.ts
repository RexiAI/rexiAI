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
