// The two request guards every api/ handler runs before any work, in one place
// (spec 007 Task 5).
//
// The 405 and 429 bodies ARE part of the endpoint contract: the SPA and the
// reschedule page branch on `error.code`, not on the status alone. Six handlers
// used to spell both envelopes out themselves, so one code could have come to
// mean two different things in two files; here it has one reason to change.
import { checkRateLimit, getClientIp } from '../src/domain/rateLimit.js'

import type { ApiRequest, ApiResponse } from './httpTypes.js'

/** 405 in this API's one envelope shape. */
export function methodNotAllowed(res: ApiResponse): void {
  res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
}

/**
 * True when the request's method is one this endpoint serves. Sends the 405
 * itself, so a caller only ever writes `if (!requireMethod(...)) return`.
 */
export function requireMethod(
  req: ApiRequest,
  res: ApiResponse,
  methods: readonly string[]
): boolean {
  if (methods.includes(req.method)) return true
  methodNotAllowed(res)
  return false
}

/**
 * True when the caller is still inside its budget. `bucket` separates endpoint
 * budgets: a client hammering one route must not spend another's allowance.
 * Best-effort like the limiter itself — see src/domain/rateLimit.ts.
 */
export function enforceRateLimit(req: ApiRequest, res: ApiResponse, bucket: string): boolean {
  const result = checkRateLimit(`${bucket}:${getClientIp(req)}`)
  if (result.allowed) return true
  res.setHeader?.('Retry-After', String(result.retryAfterSeconds))
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } })
  return false
}
