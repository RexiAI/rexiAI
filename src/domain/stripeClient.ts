import Stripe from 'stripe'

export function getStripe(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  // Pin the account's Stripe API version for stable behavior. '2024-04-10'
  // predates the installed SDK's ApiVersion union, so the cast is unavoidable —
  // this is the single intentional `any` in the Stripe client. Bumping the
  // version is a deliberate behavior change (see the runtime "outdated API
  // version" advisory), not a lint cleanup, so it stays pinned + disabled here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Stripe(key, { apiVersion: '2024-04-10' as any })
}
