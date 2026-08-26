# RexiAI — Landing + Booking

React 19 + Vite + TypeScript SPA on Vercel with serverless booking APIs.

## Env setup

1. Copy `.env.example` to `.env` and fill values.
2. Required vars:
   - `STRIPE_SECRET_KEY` — Stripe test/live secret
   - `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard → Developers → Webhooks → endpoint `https://<your-domain>/api/stripe-webhook`
   - `GOOGLE_CALENDAR_ID` — target calendar (share with service account email)
   - `GOOGLE_SERVICE_ACCOUNT_JSON` — JSON string of service account key
   - `RESEND_API_KEY` — Resend API key for operator emails
   - `EMAIL_FROM` — sender address
   - `EMAIL_TO` — operator inbox (danielbueno76@gmail.com)

3. Add same vars to Vercel project env (Dashboard → Settings → Environment Variables).

## Availability

Edit `config/availability.yaml` — weekly windows + per-date exceptions. Redeploy after edits. Timezone must remain `Europe/Madrid`.

## Local dev

```
npm install
npm run dev
```

APIs run as Vercel functions under `api/` (GET /api/availability, POST /api/bookings, POST /api/stripe-webhook).
