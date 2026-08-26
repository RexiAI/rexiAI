# AC-013: Deployment wiring & configuration

## AC-013-01 — Committed availability config parses
Given `config/availability.yaml` committed to the repo with placeholder weekly hours
When the task-003 loader parses it
Then it loads without error and produces slots for at least one weekday

## AC-013-02 — Environment template lists every backend variable with no secrets
Given `.env.example` at the repo root
When its contents are examined
Then STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, GOOGLE_CALENDAR_ID,
GOOGLE_SERVICE_ACCOUNT_JSON, RESEND_API_KEY, EMAIL_FROM, and EMAIL_TO are each present,
and no value is a real credential

## AC-013-03 — Serverless functions mounted alongside the SPA rewrite
Given the repo layout after implementation
When vercel.json and the api directory are inspected
Then handlers live under `api/` per Vercel convention, the existing SPA rewrite for all
non-API routes remains intact, and README documents the env setup steps
