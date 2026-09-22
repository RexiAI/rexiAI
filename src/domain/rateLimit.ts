/**
 * Per-process sliding-window rate limiter.
 *
 * HONEST LIMITATION — this is NOT a distributed limiter. Vercel gives every
 * cold start and every concurrent invocation a fresh process, so the window
 * below is per-lambda-instance. An attacker with enough parallelism (or one
 * who simply waits for a cold start) gets N requests per instance, not N
 * globally. It raises the cost of casual spam from a single client; it does
 * not bound total traffic. A real bound needs a shared store (Upstash/Redis)
 * or an edge WAF rule, neither of which this project has.
 *
 * Memory is bounded by pruning expired buckets on every check, so a spray of
 * spoofed x-forwarded-for values cannot grow the map without limit beyond the
 * window duration.
 */

const DEFAULT_LIMIT = 10
const DEFAULT_WINDOW_MINUTES = 10

/** Hit timestamps (ms) per key, oldest first. */
const buckets = new Map<string, number[]>()

export interface RateLimitOptions {
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the oldest hit leaves the window. Only meaningful when blocked. */
  retryAfterSeconds: number
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

export function getRateLimitOptions(): RateLimitOptions {
  const limit = parsePositiveInt(process.env['BOOKING_RATE_LIMIT'], DEFAULT_LIMIT)
  const minutes = parsePositiveInt(process.env['BOOKING_RATE_WINDOW_MIN'], DEFAULT_WINDOW_MINUTES)
  return { limit, windowMs: minutes * 60_000 }
}

/**
 * First x-forwarded-for hop is the client as seen by the edge. It is
 * client-controlled and therefore spoofable — another reason this limiter is
 * best-effort only. Falls back to a single shared bucket when absent, which
 * deliberately fails *closed-ish*: unknown callers share one budget.
 */
export function getClientIp(req: { headers?: Record<string, unknown> }): string {
  const raw = req.headers?.['x-forwarded-for']
  const header = Array.isArray(raw) ? raw[0] : raw
  if (typeof header !== 'string' || !header.trim()) return 'unknown'
  const first = header.split(',')[0]
  return first ? first.trim() : 'unknown'
}

function pruneExpired(now: number, windowMs: number): void {
  for (const [key, hits] of buckets) {
    const live = hits.filter((t) => now - t < windowMs)
    if (live.length === 0) buckets.delete(key)
    else buckets.set(key, live)
  }
}

function blockedResult(oldest: number, now: number, windowMs: number): RateLimitResult {
  const waitMs = windowMs - (now - oldest)
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)) }
}

/** Records a hit and reports whether it is within budget. */
export function checkRateLimit(key: string, options?: RateLimitOptions): RateLimitResult {
  const { limit, windowMs } = options ?? getRateLimitOptions()
  const now = Date.now()
  pruneExpired(now, windowMs)
  const hits = buckets.get(key) ?? []
  if (hits.length >= limit) return blockedResult(hits[0] as number, now, windowMs)
  hits.push(now)
  buckets.set(key, hits)
  return { allowed: true, retryAfterSeconds: 0 }
}

/** Test seam: the module-level map would otherwise leak between test cases. */
export function _resetRateLimit(): void {
  buckets.clear()
}
