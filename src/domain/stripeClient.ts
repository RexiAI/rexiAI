import Stripe from 'stripe'

export function getStripe(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(key, { apiVersion: '2024-04-10' as any })
}
