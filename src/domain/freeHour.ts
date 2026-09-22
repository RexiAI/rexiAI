import Stripe from 'stripe'

import { getStripe } from './stripeClient.js'

const FREE_HOUR_KEY = 'rexi_free_hour_used'

// Stripe does not guarantee email uniqueness on Customer objects, so a single
// address can map to several records. Reading only the first match let a
// duplicate customer hide an already-burned free hour, which made the free hour
// repeat forever. Scan every match instead.
const EMAIL_MATCH_LIMIT = 100

type StripeCustomerRecord = Stripe.Customer & { created?: number }

async function listCustomersByEmail(
  stripe: Stripe,
  email: string
): Promise<StripeCustomerRecord[]> {
  const res = await stripe.customers.list({ email, limit: EMAIL_MATCH_LIMIT })
  return res.data as StripeCustomerRecord[]
}

function customerMetadata(customer: StripeCustomerRecord): Record<string, string> {
  return (customer.metadata as Record<string, string> | undefined) ?? {}
}

/**
 * The oldest customer is the canonical record for a given email: it is stable
 * across time, so repeated writes from different requests converge on one
 * object instead of scattering flags across duplicates.
 */
function pickCanonicalCustomer(
  customers: StripeCustomerRecord[]
): StripeCustomerRecord | undefined {
  let best: StripeCustomerRecord | undefined
  for (const c of customers) {
    if (!best || (c.created ?? 0) < (best.created ?? 0)) best = c
  }
  return best
}

function hasFreeHourFlag(customer: StripeCustomerRecord): boolean {
  return customerMetadata(customer)[FREE_HOUR_KEY] === '1'
}

export async function isFreeHourAvailable(email: string, client?: Stripe): Promise<boolean> {
  const stripe = client ?? getStripe()
  try {
    const customers = await listCustomersByEmail(stripe, email)
    return !customers.some(hasFreeHourFlag)
  } catch (e) {
    throw new Error(`Stripe lookup failed: ${e instanceof Error ? e.message : String(e)}`, {
      cause: e,
    })
  }
}

/**
 * Burn the free hour, compare-and-set style.
 *
 * Returns `{ burned: true }` only when this call performed the transition. If
 * any customer sharing the email already carries the flag, the burn is skipped
 * and `{ burned: false }` is returned so the caller can detect that someone
 * else consumed it first.
 *
 * Honest limitation: Stripe offers no atomic compare-and-set, so re-reading
 * immediately before the update only *narrows* the window between the
 * availability check and the burn — it does not eliminate it. Two writers that
 * both read "unused" within the same round trip can still both burn.
 */
export async function markFreeHourUsed(
  email: string,
  client?: Stripe
): Promise<{ burned: boolean }> {
  const stripe = client ?? getStripe()
  try {
    const customers = await listCustomersByEmail(stripe, email)
    if (customers.some(hasFreeHourFlag)) return { burned: false }
    const canonical = pickCanonicalCustomer(customers)
    if (!canonical) {
      await stripe.customers.create({ email, metadata: { [FREE_HOUR_KEY]: '1' } })
      return { burned: true }
    }
    await stripe.customers.update(canonical.id, {
      metadata: { ...customerMetadata(canonical), [FREE_HOUR_KEY]: '1' },
    })
    return { burned: true }
  } catch (e) {
    throw new Error(`Stripe mark failed: ${e instanceof Error ? e.message : String(e)}`, {
      cause: e,
    })
  }
}
