# RexiAI — Landing + Booking

React 19 + Vite + TypeScript SPA on Vercel with serverless booking APIs.

## Env setup

1. Copy `.env.example` to `.env` and fill values.
2. Required vars:
   - `STRIPE_SECRET_KEY` — Stripe test/live secret
   - `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard → Developers → Webhooks → endpoint `https://<your-domain>/api/stripe-webhook`
   - `MICROSOFT_CLIENT_ID` — Entra app registration (personal-accounts enabled)
   - `MICROSOFT_CLIENT_SECRET` — required: the app is a confidential (Web) client
   - `MICROSOFT_REFRESH_TOKEN` — from the one-time consent flow (see `.env.example`)
   - `RESEND_API_KEY` — Resend API key for operator emails
   - `EMAIL_FROM` — sender address (Godaddy mailbox, e.g. `info@rexi-ai.com`)
   - `EMAIL_TO` — operator inbox
   - `MEETING_BASE_URL` — optional; Jitsi base for meeting links (default `https://meet.jit.si`)

   Calendar + meetings run on Microsoft Graph (delegated) against the personal
   hotmail account (`buenopachecodani@hotmail.es`); email runs on Resend against
   the Godaddy mailbox. They are deliberately separate.

3. Add same vars to Vercel project env (Dashboard → Settings → Environment Variables).

## Availability

Edit `config/availability.yaml` — weekly windows + per-date exceptions. Redeploy after edits. Timezone must remain `Europe/Madrid`.

## Local dev

```
npm install
npm run dev
```

APIs run as Vercel functions under `api/` (GET /api/availability, POST /api/bookings, POST /api/stripe-webhook).
