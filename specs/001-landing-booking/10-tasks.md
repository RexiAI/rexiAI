# 001 — RexiAI landing page with paid booking: task list

Source: `specs/001-landing-booking/00-informal.md` (all open questions resolved in its
"Resolved decisions" section, 2026-08-26). This file and `20-acceptance/` are the only
inputs the Coder may reason from.

## Architecture (decided here — minimal, solo-operator scale)

**Frontend.** Existing React 19 + Vite + TypeScript SPA (`src/`). Deployed on Vercel;
the SPA rewrite in `vercel.json` stays as is.

**Backend.** Vercel serverless functions (TypeScript, Node runtime), under `api/` at
the repo root (Vercel convention mounts each handler as an HTTPS function):

| File | Route | Purpose |
|---|---|---|
| `api/availability.ts` | `GET /api/availability?date=YYYY-MM-DD` | Bookable slots for one day |
| `api/bookings.ts` | `POST /api/bookings` | Validate booking, compute price, create Stripe Checkout session |
| `api/stripe-webhook.ts` | `POST /api/stripe-webhook` | On payment completion: burn free hour, create GCal event, email operator |

Shared pure logic (slot computation, pricing, validation, types) lives in `src/domain/`
and is imported by both the SPA and the api functions. No database, no framework, no DI.

**System-of-record decisions (no database):**

- Payments and client identity: **Stripe (test mode)**. The free-hour-used flag lives on
  the Stripe Customer as `metadata["rexi_free_hour_used"] = "1"`.
- Bookings: **Google Calendar events**. Each event carries
  `extendedProperties.private.rexi_booking_id = <checkout session id>`; that id doubles
  as the webhook idempotency key.
- Availability schedule: **`config/availability.yaml`** in the repo. Changing hours =
  edit YAML + redeploy (acceptable for a solo operator; this is what "config-driven"
  means here).

**Integrations:** official `stripe` npm SDK (test keys via env); `googleapis` with a
Google Cloud service account (the target calendar is shared with the service-account
email); Resend HTTP API for email; `yaml` npm package for config parsing.

**Environment variables** (read at function invocation; live Stripe keys later are an
env swap, zero code change): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `RESEND_API_KEY`, `EMAIL_FROM`,
`EMAIL_TO` (operator inbox).

**Booking flow.** Visitor picks date → UI fetches slots → picks start time + duration
(1–4 whole hours) + enters email → `POST /api/bookings` validates, computes price,
creates a Stripe Checkout Session (EUR, mode `payment`; €0 allowed) → visitor is
redirected to Stripe → on `checkout.session.completed` webhook: mark free hour used,
create the Google Calendar event, email the operator.

## Conventions

- **Money:** integer euro cents everywhere in domain/API code (3000 = €30). UI formats
  for display.
- **Times/dates:** `"HH:mm"` and `"YYYY-MM-DD"`, always interpreted in **Europe/Madrid**
  regardless of viewer timezone. The timezone is a fixed constant; `availability.yaml`
  must declare `timezone: Europe/Madrid` and the loader rejects any other value.
- **Durations:** whole hours only, min 1, max 4.
- **Pricing rule:** `price(hours, freeHourAvailable) = freeHourAvailable ? (hours − 1) × 3000 : hours × 3000`
  cents. Any completed booking consumes the client's free hour (once per client ever).
  Examples match the informal spec: first-timer 1h=€0, 2h=€30, 3h=€60, 4h=€90.
- **Errors:** endpoints return `{ "error": { "code": "...", "message": "..." } }`;
  400 caller mistakes, 409 conflicts, 5xx upstream failures only (Stripe retries
  webhooks on 5xx). Expected failures are values, not thrown exceptions.
- **Design:** visual direction comes from `15-design.md` (UX stage, OpenAI-storytelling
  patterns per `design-refs/`). Scenarios here test behavior and structure, not
  aesthetics.

## Tasks

### Task 001 — i18n dictionary + language switcher

Scope: i18n provider with Spanish/English dictionaries covering all user-facing copy.
Spanish is the default. A visible language switcher toggles ES↔EN. The choice persists
in `localStorage`. Components render strings only from the dictionaries (typed so both
locales stay complete).

Acceptance criteria:
- Fresh visit renders Spanish copy.
- Switcher click swaps every rendered string to the other language.
- Selection survives page reload via `localStorage`.
- No user-facing literal strings hardcoded in components.

Scenarios: `20-acceptance/AC-001-i18n.md`

### Task 002 — Landing page content sections

Scope: replace the current one-pager (`src/App.tsx`) with the new landing structure:
hero (with catchphrase), services grid (SaaS products, websites, apps, consulting),
booking section shell (widget lands in task 011), contact section. Visual/layout
follows `15-design.md` directives when it exists.

Acceptance criteria:
- Hero displays the catchphrase from the active locale's dictionary.
- Services section lists exactly the four services, each with localized title and description.
- Contact CTA is a prominent `mailto:danielbueno76@gmail.com` link with localized label.
- Page contains hero, services, booking, contact sections with stable anchors.

Scenarios: `20-acceptance/AC-002-landing-content.md`

### Task 003 — Availability config loader + slot computation

Scope: pure module parsing `config/availability.yaml` (weekly recurring windows +
per-date exceptions) and computing hourly bookable slot start times for a given date,
in Europe/Madrid. Schema:

```yaml
timezone: Europe/Madrid
weekly:
  monday: [{start: "09:00", end: "13:00"}]   # list of windows, or omit day
exceptions:
  "2027-03-25": []                            # blackout: replaces weekly entirely
  "2027-03-26": [{start: "16:00", end: "19:00"}]  # override window(s)
```

A slot is a start time `t` where `t + 1h ≤ window end`. Slots align to whole hours.

Acceptance criteria:
- Weekly windows produce correct hourly starts; last slot starts ≥1h before window end.
- Weekday with no entry yields no slots.
- Blackout exception yields an empty day even when weekly has slots; override exception
  yields override slots only.
- Window shorter than 1 hour yields no slots.
- Malformed YAML, `end ≤ start`, non-`HH:mm` times, missing/mismatched `timezone` each
  fail the load with a descriptive error naming the problem.

Scenarios: `20-acceptance/AC-003-availability-config.md`

### Task 004 — Pricing calculator

Scope: pure function `priceCents(hours: number, freeHourAvailable: boolean)` implementing
the pricing rule above; rejects invalid durations with a typed error value.

Acceptance criteria:
- First-time table: 1h→0, 2h→3000, 3h→6000, 4h→9000 cents.
- Returning-client table: 1h→3000 … 4h→12000 cents.
- Hours outside [1,4], negative, or fractional are rejected.

Scenarios: `20-acceptance/AC-004-pricing.md`

### Task 005 — Free-hour eligibility via Stripe

Scope: two operations over the official Stripe SDK (test mode — same code path as live):
`isFreeHourAvailable(email)` (find customer by email, check
`metadata.rexi_free_hour_used`) and `markFreeHourUsed(email)` (set the flag, creating the
customer if none exists).

Acceptance criteria:
- Unknown email → eligible.
- Customer without flag → eligible; customer with flag → not eligible.
- After `markFreeHourUsed`, lookup returns not eligible.
- Stripe failure surfaces as an error — never silently treated as eligible.

Scenarios: `20-acceptance/AC-005-free-hour-eligibility.md`

### Task 006 — Availability API endpoint

Scope: `GET /api/availability?date=YYYY-MM-DD`. Computes YAML slots for the date, then
subtracts busy intervals from Google Calendar free/busy for that Madrid-local day. Any
overlap blocks a slot. Returns `{ "date": "...", "slots": ["HH:mm", ...] }`.

Acceptance criteria:
- Open day returns exactly the YAML slots.
- Busy intervals remove every overlapped slot (including partial-hour overlaps).
- Exception days respected (blackout → empty).
- Past dates, malformed dates, missing param → 400 error body, never 200.

Scenarios: `20-acceptance/AC-006-availability-api.md`

### Task 007 — Booking creation API + Stripe Checkout session

Scope: `POST /api/bookings` with `{ email, date, startTime, hours }`. Validates format,
grid alignment, availability membership, existing-booking conflict (free/busy), then
computes price (task 004) using eligibility (task 005) and creates a Stripe Checkout
Session (EUR, mode `payment`, metadata carrying email/date/startTime/hours/
free_hour_applied, success/cancel URLs pointing at the result views of task 012).
Responds `{ "checkoutUrl": "..." }`. €0 sessions go through the same Checkout flow.

Acceptance criteria:
- First-timer 1h creates a €0 EUR checkout session and returns a URL.
- First-timer 2h → amount 3000 cents; returning client 2h → 6000 cents with
  `free_hour_applied=false`.
- Invalid email, hours outside 1–4 or fractional, off-grid start, out-of-window start →
  400 with no Stripe call made.
- Conflicting existing booking → 409 with no Stripe session created.

Scenarios: `20-acceptance/AC-007-create-booking-api.md`

### Task 008 — Stripe webhook orchestration (idempotent)

Scope: `POST /api/stripe-webhook`. Verifies the signature against
`STRIPE_WEBHOOK_SECRET`. On `checkout.session.completed`: mark free hour used (task 005),
create the GCal event (task 009), send the operator email (task 010); respond 200.
Idempotency: if a GCal event with the same `rexi_booking_id` already exists, skip event
and email. Upstream failure → respond 5xx so Stripe retries. Unrelated event types →
200, no side effects.

Acceptance criteria:
- Valid completion triggers all three side effects exactly once and responds 200.
- Replayed event causes no duplicate side effects and still responds 200.
- Invalid signature → 400, zero side effects.
- Unrelated event type ignored.
- GCal or email failure → retryable 5xx response (no silent success).

Scenarios: `20-acceptance/AC-008-stripe-webhook.md`

### Task 009 — Google Calendar event creation

Scope: create an event on the configured calendar (`GOOGLE_CALENDAR_ID`) authenticated
as the service account (`GOOGLE_SERVICE_ACCOUNT_JSON`). Event spans the booked Madrid
local start/end instants (correct UTC conversion incl. CET/CEST DST), carries
`extendedProperties.private.rexi_booking_id`, and suppresses duplicates by querying that
property before insert.

Acceptance criteria:
- Summer date (CEST, UTC+2): Madrid 10:00–11:00 → 08:00Z–09:00Z.
- Winter date (CET, UTC+1): Madrid 10:00–11:00 → 09:00Z–10:00Z.
- Event carries the booking id property; duplicate insert attempt is a no-op.
- Calendar id and credentials come from env configuration.

Scenarios: `20-acceptance/AC-009-gcal-event.md`

### Task 010 — Operator email notification

Scope: on completed booking, send one email to `EMAIL_TO` via the Resend HTTP API
(`RESEND_API_KEY`, `EMAIL_FROM`), containing client email, booked date + Madrid time,
duration, and amount paid.

Acceptance criteria:
- Email goes to the operator address with all four data points present.
- Exactly one send per completed booking.
- Provider failure propagates as a retryable error (feeds task 008's 5xx rule).

Scenarios: `20-acceptance/AC-010-email-notification.md`

### Task 011 — Booking widget UI

Scope: booking section widget: date picker → fetch `/api/availability` → slot list →
duration control (whole hours 1–4 only) → email field → submit posts to `/api/bookings`
and redirects to the returned `checkoutUrl`. Shows localized pricing-rules text ("first
hour free for new clients, then €30/hour"); the authoritative amount appears on the
Stripe page, so no client-side price computation is required.

Acceptance criteria:
- Selecting a date loads and displays available slots from the API.
- Duration offers exactly integer hours 1–4.
- Localized pricing-rules text is displayed.
- Valid submit sends `{email, date, startTime, hours}` and redirects to `checkoutUrl`.
- Invalid email or missing fields block submission with inline feedback and no request.

Scenarios: `20-acceptance/AC-011-booking-ui.md`

### Task 012 — Post-payment result views

Scope: `/booking/success` and `/booking/cancel` views (plain pathname checks in the SPA —
no router dependency). Success shows localized confirmation; cancel shows localized
cancellation message plus a way back to the booking section. These paths are the
success/cancel URLs handed to Stripe Checkout.

Acceptance criteria:
- Success view renders localized confirmation copy.
- Cancel view renders localized cancellation copy with a return-to-booking action.

Scenarios: `20-acceptance/AC-012-result-views.md`

### Task 013 — Deployment wiring & configuration

Scope: commit `config/availability.yaml` with placeholder weekly hours (real hours come
from Daniel later); add `.env.example` listing every backend variable with empty/example
values; keep `vercel.json` SPA rewrite intact alongside the `api/` functions; document
env setup in the README.

Acceptance criteria:
- Committed YAML parses through the task-003 loader.
- `.env.example` enumerates all seven backend vars, contains no real secret values.
- API handlers live under `api/` per Vercel convention; SPA rewrite untouched.

Scenarios: `20-acceptance/AC-013-deployment-config.md`

## Open questions

None blocking. All informal-spec ambiguities were resolved in its §Resolved decisions;
remaining choices above (serverless architecture, Resend, service-account GCal, no
database, localStorage persistence, no router dependency) are Specifier decisions stated
here for review.

Known accepted limitation (documented, not a requirement): there is no distributed lock
against two visitors grabbing the same slot between conflict-check and payment — the
conflict check runs at creation time and the webhook dedup key covers replays only.
Accepted for a solo-operator site; revisit if volume ever justifies it.
