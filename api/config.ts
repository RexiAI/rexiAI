// Public site config for the SPA. Exposes only non-secret flags the frontend
// needs to render — currently whether charging is enabled, which drives the
// "talks & analysis are free" promo banner + struck-through pricing.
//
// The SPA can't read server env (BILLING_ENABLED lives in the Vercel function
// env), so it fetches this on load. Keep this endpoint secret-free.
import { isBillingEnabled } from '../src/domain/billing.js'

import type { ApiRequest, ApiResponse } from './httpTypes.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
    return
  }
  res.status(200).json({ billingEnabled: isBillingEnabled() })
}
