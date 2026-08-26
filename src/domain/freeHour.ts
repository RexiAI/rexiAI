import Stripe from 'stripe'
import { getStripe } from './stripeClient.js'

export async function isFreeHourAvailable(
  email: string,
  client?: Stripe,
): Promise<boolean> {
  const stripe = client ?? getStripe()
  try {
    // Use list with email filter; works in test mode
    const res = await stripe.customers.list({ email, limit: 1 })
    const customer = res.data[0]
    if (!customer) return true
    const flag = (customer.metadata as Record<string, string> | undefined)?.['rexi_free_hour_used']
    return flag !== '1'
  } catch (e) {
    throw new Error(`Stripe lookup failed: ${e instanceof Error ? e.message : String(e)}`)
  }
}

export async function markFreeHourUsed(
  email: string,
  client?: Stripe,
): Promise<void> {
  const stripe = client ?? getStripe()
  try {
    const res = await stripe.customers.list({ email, limit: 1 })
    const customer = res.data[0]
    if (!customer) {
      await stripe.customers.create({
        email,
        metadata: { rexi_free_hour_used: '1' },
      })
      return
    }
    await stripe.customers.update(customer.id, {
      metadata: { ...customer.metadata, rexi_free_hour_used: '1' },
    })
  } catch (e) {
    throw new Error(`Stripe mark failed: ${e instanceof Error ? e.message : String(e)}`)
  }
}
