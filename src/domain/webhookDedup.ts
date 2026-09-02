import Stripe from 'stripe'

import { getStripe } from './stripeClient.js'

const EVENT_KEY_PREFIX = 'rexi_evt_'

// Stripe allows 50 metadata keys per object. Cap our event markers well below
// that so the free-hour flag (and any future key) always has room; prune the
// oldest markers before writing a new one.
const MAX_EVENT_KEYS = 40

// Email is not unique on Stripe Customer objects, so a marker may live on any
// of several records sharing the address. Scan them all.
const EMAIL_MATCH_LIMIT = 100

type CustomerRecord = Stripe.Customer & { created?: number }

async function fetchCustomers(stripe: Stripe, email: string): Promise<CustomerRecord[]> {
  const res = await stripe.customers.list({ email, limit: EMAIL_MATCH_LIMIT })
  // A shape without `data` means "nothing to read", not "already processed":
  // treating it as an empty list keeps the caller on the process-anyway path.
  return (res?.data as CustomerRecord[] | undefined) ?? []
}

function metaOf(customer: CustomerRecord): Record<string, string> {
  return (customer.metadata as Record<string, string> | undefined) ?? {}
}

/** Oldest customer wins, so repeated writes converge on one object. */
function canonicalOf(customers: CustomerRecord[]): CustomerRecord | undefined {
  let best: CustomerRecord | undefined
  for (const c of customers) {
    if (!best || (c.created ?? 0) < (best.created ?? 0)) best = c
  }
  return best
}

/**
 * Durable webhook idempotency marker, stored on the Stripe Customer object.
 *
 * Vercel lambdas share no memory: every cold start and every concurrent
 * invocation gets fresh process state, so an in-memory Set cannot deduplicate
 * Stripe's webhook retries. Stripe itself is the only store this project has,
 * so the marker lives in customer metadata.
 *
 * Key is the last 12 characters of the event id (metadata keys are
 * length-bounded); value is the unix second it was written, which is what makes
 * pruning ordered — metadata keys themselves carry no order.
 */
export function eventKey(eventId: string): string {
  return `${EVENT_KEY_PREFIX}${eventId.slice(-12)}`
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

function eventEntries(meta: Record<string, string>): Array<[string, number]> {
  const out: Array<[string, number]> = []
  for (const [k, v] of Object.entries(meta)) {
    if (k.startsWith(EVENT_KEY_PREFIX)) out.push([k, Number.parseInt(v, 10) || 0])
  }
  return out
}

/**
 * Metadata patch removing the oldest markers so that adding one more keeps the
 * total at or below MAX_EVENT_KEYS. Stripe deletes a metadata key set to null.
 */
function prunePatch(meta: Record<string, string>): Record<string, null> {
  const entries = eventEntries(meta)
  const excess = entries.length - (MAX_EVENT_KEYS - 1)
  if (excess <= 0) return {}
  entries.sort((a, b) => a[1] - b[1])
  const patch: Record<string, null> = {}
  for (const [key] of entries.slice(0, excess)) patch[key] = null
  return patch
}

function wrapError(verb: string, e: unknown): Error {
  return new Error(`Stripe ${verb} failed: ${e instanceof Error ? e.message : String(e)}`, {
    cause: e,
  })
}

/**
 * True when this Stripe event id was already processed for this email.
 *
 * Stripe failures are never swallowed: the caller must surface them so a lookup
 * outage becomes a retryable 5xx rather than a silently skipped booking.
 */
export async function wasProcessed(
  email: string,
  eventId: string,
  client?: Stripe
): Promise<boolean> {
  const stripe = client ?? getStripe()
  const key = eventKey(eventId)
  try {
    const customers = await fetchCustomers(stripe, email)
    return customers.some((c) => metaOf(c)[key] !== undefined)
  } catch (e) {
    throw wrapError('dedup lookup', e)
  }
}

export async function markProcessed(
  email: string,
  eventId: string,
  client?: Stripe
): Promise<void> {
  const stripe = client ?? getStripe()
  const key = eventKey(eventId)
  try {
    const customers = await fetchCustomers(stripe, email)
    const canonical = canonicalOf(customers)
    if (!canonical) {
      await stripe.customers.create({ email, metadata: { [key]: String(nowSeconds()) } })
      return
    }
    const meta = metaOf(canonical)
    await stripe.customers.update(canonical.id, {
      metadata: { ...meta, ...prunePatch(meta), [key]: String(nowSeconds()) },
    })
  } catch (e) {
    throw wrapError('dedup mark', e)
  }
}
