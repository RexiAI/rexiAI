# 002 — Do not launch Stripe when billing is disabled (+ env docs cleanup)

## Problem

`BILLING_ENABLED=false` is the billing kill-switch (`src/domain/billing.ts`). The
recorded-billing endpoint already honors it ("a disabled deployment never reaches
Stripe", `api/bookings/recorded-billing.ts` preflight). The **booking path does
not**: with billing disabled, `POST /api/bookings` still

1. calls `isFreeHourAvailable(email)` — a Stripe customer lookup
   (`api/bookings/checkout.ts` → `src/domain/freeHour.ts`), and
2. creates a €0 Stripe Checkout session (`createSession`), and
3. the SPA redirects the customer to that Stripe-hosted page
   (`src/components/booking/hooks/useBookingSubmit.ts`: `if (url) window.location.href = url`).

A deployment that has switched charging off must not depend on Stripe at all for
taking reservations. Today it does: no `STRIPE_SECRET_KEY` → booking 500s; and
every reservation drags the customer through a pointless €0 Stripe page.

Also note: today **all booking side effects live in the Stripe webhook**
(`api/stripe-webhook.ts` on checkout completion: Google/Microsoft calendar event,
operator email, client confirmation email, overlap backstop). A booking that
never creates a Stripe session never fires that webhook — so the direct path must
perform those side effects itself.

## Ask

### A. Direct booking when billing is disabled

When `isBillingEnabled()` is false, `POST /api/bookings` must:

- Make **zero Stripe calls** — no free-hour lookup, no session creation. The
  duration validation currently piggybacking on `priceCents(hours, freeAvailable)`
  must still work without a free-hour answer (treat `freeAvailable` as `false` or
  validate duration directly — Refactorer/Coder's call, keep cyclomatic ≤6).
- Keep the existing preflight order and guarantees: rate limit → validation →
  slot conflict check → meeting link creation (Jitsi/`MEETING_BASE_URL`, already
  Stripe-free) → second conflict check.
- Perform the booking side effects synchronously in the handler, mirroring what
  the webhook does for a reservation: create the calendar event (via the existing
  `CalendarAdapter` facade), send the operator email (`sendOperatorEmail`,
  `kind: 'reservation'`), send the client confirmation email (`sendClientEmail`,
  best-effort — its failure must not fail the booking, same policy as the
  webhook), and keep the overlap backstop behavior (if the calendar already holds
  an overlapping event with a different bookingId, still complete but flag
  `slotConflictWith` in the operator email, as the webhook does).
- Respond `200` with `{ checkoutUrl: null, joinUrl, billingDisabled: true }`
  (shape may be refined by the Specifier; `joinUrl` must be included so the
  client can join without an email).
- Failures of calendar/email side effects must not silently vanish: follow the
  webhook's existing error policy (calendar failure = visible error; client email
  failure = logged, swallowed).

When billing is enabled (default, flag absent, anything but exactly `false`),
behavior must be **byte-for-byte unchanged**: €0 reservation session, redirect,
webhook-driven side effects. The kill-switch semantics in `src/domain/billing.ts`
(fail-safe default ENABLED) are not up for change.

### B. Frontend confirmation state

`useBookingSubmit.ts` currently only handles "redirect to checkoutUrl" or error.
With `checkoutUrl: null` + `billingDisabled: true` the SPA must show a
confirmation state (booking confirmed, date/time, join link) instead of doing
nothing. i18n copy must go through the existing dictionary
(`src/i18n/dictionary`), both languages, no hardcoded strings. No redirect to
`/booking/success` (that page assumes a Stripe return) unless the Specifier finds
reusing it cleaner — their call, but the customer must see explicit confirmation.

### C. Repo env cleanup (align with prod, already cleaned on Vercel)

Vercel production no longer has `EMAIL_PROVIDER`, `CALENDAR_PROVIDER`,
`GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `STRIPE_PUBLISHABLE_KEY` —
nothing in code reads them (`src/domain/providers.ts` hardcodes both providers;
the frontend uses `VITE_STRIPE_PUBLISHABLE_KEY`). Mirror that in the repo:

- `.env.example`: drop `EMAIL_PROVIDER` and any other dead entries; keep every
  variable AC-013-02 requires (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `MICROSOFT_CLIENT_ID`, `MICROSOFT_REFRESH_TOKEN`, `RESEND_API_KEY`,
  `EMAIL_FROM`, `EMAIL_TO`). Update the `EMAIL_FROM` guidance comment: the target
  sender is `info@rexi-ai.com` (verified Resend domain, GoDaddy mailbox), not
  `hola@`.
- `docs/microsoft-cutover.md`: drop/annotate the `EMAIL_PROVIDER=gmail` and
  `CALENDAR_PROVIDER` references so docs stop documenting dead config.
- Local `.env` is gitignored — the pipeline must not touch it.
- Tests that manipulate `EMAIL_PROVIDER` (AC-014/016/018) assert tolerance of a
  stale value — keep them green; do not change test intent to suit the cleanup.

## Constraints

- No new dependencies. Existing layers only (controller → service → repository
  discipline per docs/ARCHITECTURE.md; the calendar facade is the repository
  boundary here).
- The Stripe webhook path must keep working unchanged for billing-enabled
  deployments, including idempotency (`emailSentForBooking`, webhook dedup).
- Security: client email is attacker-controlled → keep the existing escaping
  discipline (`escapeHtml`, `src/domain/email.ts`); no upstream error bodies to
  the client.
- This repo's prod incident context (for realism in scenarios, not for scope):
  emails failed in prod because the webhook 500'd on missing Microsoft Graph
  config before reaching the mail step, and `EMAIL_FROM` was the Resend sandbox
  sender. Both are already fixed in the Vercel env — this spec is only the code
  behavior + repo docs.
