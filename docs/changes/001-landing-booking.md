# 001-landing-booking

> Spec pipeline archive. Original source: `specs/001-landing-booking/` (deleted by this script).
> Archived: 2026-08-26

## Original ask

# 001 — RexiAI landing page with paid booking (informal spec)

Written by Daniel. Informal prose, my words. Specifier: turn into tasks + scenarios.

## What this is

Replace the current RexiAI one-page site with a main landing page that advertises
my company. The company is just me (solo operator) for now.

## Services to advertise

- Building SaaS products
- Building websites
- Building apps
- Consulting

## Catchphrase

Something like: **"Forget your Excel — let's automate, with or without AI!"**
Exact wording flexible; keep the spirit.

## Contact

- Email: danielbueno76@gmail.com
- "If you are interested, contact me" CTA somewhere prominent.

## Languages (i18n)

- Site must exist in **Spanish (default) and English**.
- All user-facing copy in both languages, language switcher on the page.

## Booking + payments feature

Visitors can book my time directly from the site:

1. A calendar shows when I am available.
2. My available hours must be **configurable through YAML** (or similar config file)
   so I can change them without touching code.
3. To book me, the visitor pays in advance through **Stripe**, in **test mode** for
   now (no live Stripe account yet — live keys plug in via config/env later).
4. Pricing (currency **EUR**): **first hour free — once per client ever** (identified
   by email; a returning client never gets another free hour), every additional hour
   **flat €30**. Examples: 1h = €0, 2h = €30, 3h = €60, 4h = €90.
5. Booking duration: **min 1 hour, max 4 hours** per booking.
6. Calendar timezone: **Europe/Madrid**.
7. On completed booking: record it, **email notification to me**, and **create the
   event in my Google Calendar**.
8. Payment amount depends on booked hours, charged in advance at booking time.

I will supply my actual availability hours later — that is why it must be config-driven.

## Design direction

OpenAI-style storytelling (user decision, 2026-08-26). Reference screenshots captured
from openai.com live on 2026-08-26, stored in `design-refs/`:

| File                             | What it shows                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `openai-00-full-page.png`        | Whole openai.com homepage scroll                                                 |
| `openai-01-hero.png`             | Hero: product-as-hero ("What can I help with?" prompt box), quick links under it |
| `openai-02-story-cards.png`      | Featured story-card grid — editorial storytelling layout                         |
| `openai-03-business-stories.png` | "OpenAI for business" customer-stories section                                   |

Steal the _patterns_ (hero with a real interactive element, story cards as narrative,
customer-proof section), not the branding.

## Out of scope / notes

- inglesmiami references already removed from the site (separate change, done).
- Old content (capabilities/repos sections) gets replaced by the new landing page;
  keep or drop the Open Source section at designer's discretion.

## Resolved decisions (2026-08-26, answered by Daniel)

1. Price after free first hour: flat €30/hour — yes.
2. Free first hour: once per client ever (email-keyed).
3. Timezone: Madrid/Spain (Europe/Madrid).
4. Stripe account: not ready — integrate test-mode now, live keys via config later.
5. Booking delivery: email notification + Google Calendar event creation.
6. Duration bounds: min 1h, max 4h.

## Tasks

# 001 — RexiAI landing page with paid booking: task list

Source: `specs/001-landing-booking/00-informal.md` (all open questions resolved in its
"Resolved decisions" section, 2026-08-26). This file and `20-acceptance/` are the only
inputs the Coder may reason from.

## Architecture (decided here — minimal, solo-operator scale)

**Frontend.** Existing React 19 + Vite + TypeScript SPA (`src/`). Deployed on Vercel;
the SPA rewrite in `vercel.json` stays as is.

**Backend.** Vercel serverless functions (TypeScript, Node runtime), under `api/` at
the repo root (Vercel convention mounts each handler as an HTTPS function):

| File                    | Route                                   | Purpose                                                                  |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| `api/availability.ts`   | `GET /api/availability?date=YYYY-MM-DD` | Bookable slots for one day                                               |
| `api/bookings.ts`       | `POST /api/bookings`                    | Validate booking, compute price, create Stripe Checkout session          |
| `api/stripe-webhook.ts` | `POST /api/stripe-webhook`              | On payment completion: burn free hour, create GCal event, email operator |

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
  monday: [{ start: '09:00', end: '13:00' }] # list of windows, or omit day
exceptions:
  '2027-03-25': [] # blackout: replaces weekly entirely
  '2027-03-26': [{ start: '16:00', end: '19:00' }] # override window(s)
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

## Acceptance scenarios

## AC-001-01 — Default language is Spanish

## AC-001-02 — Switching to English

## AC-001-03 — Switching back to Spanish

## AC-001-04 — Language choice persists across reload

## AC-001-05 — No hardcoded user-facing strings in components

## AC-002-01 — Hero displays localized catchphrase

## AC-002-02 — Services section lists exactly four services

## AC-002-03 — Contact CTA is a mailto link

## AC-002-04 — Page structure has the four main sections

## AC-003-01 — Slots from weekly schedule

## AC-003-02 — Weekday without an entry yields no slots

## AC-003-03 — Blackout exception empties the day

## AC-003-04 — Override exception replaces weekly slots

## AC-003-05 — Window shorter than one hour yields no slots

## AC-003-06 — Malformed YAML fails the load

## AC-003-07 — Window with end not after start fails the load

## AC-003-08 — Missing or mismatched timezone fails the load

## AC-003-09 — Malformed time value fails the load

## AC-004-01 — First-time client pricing table

## AC-004-02 — Returning client pricing table

## AC-004-03 — Zero hours rejected

## AC-004-04 — Hours above maximum rejected

## AC-004-05 — Negative hours rejected

## AC-004-06 — Fractional hours rejected

## AC-005-01 — Unknown email is eligible

## AC-005-02 — Customer without the flag is eligible

## AC-005-03 — Customer with the flag is not eligible

## AC-005-04 — Marking usage persists the flag

## AC-005-05 — Stripe failure is never treated as eligible

## AC-006-01 — Open day returns YAML slots

## AC-006-02 — Exact busy interval removes its slots

## AC-006-03 — Partial-hour busy overlap blocks both touched slots

## AC-006-04 — Blackout exception day returns empty

## AC-006-05 — Past dates rejected

## AC-006-06 — Malformed date rejected

## AC-006-07 — Missing date parameter rejected

## AC-007-01 — First-timer one-hour booking creates a zero-euro checkout session

## AC-007-02 — First-timer two-hour booking charges €30

## AC-007-03 — Returning client pays full price

## AC-007-04 — Invalid email rejected without calling Stripe

## AC-007-05 — Invalid durations rejected without calling Stripe

## AC-007-06 — Off-grid start time rejected

## AC-007-07 — Start outside availability rejected

## AC-007-08 — Conflicting existing booking rejected

## AC-008-01 — Completed payment triggers all three side effects once

## AC-008-02 — Replayed event causes no duplicate side effects

## AC-008-03 — Invalid signature rejected with zero side effects

## AC-008-04 — Unrelated event types ignored

## AC-008-05 — Calendar failure yields retryable response without email

## AC-008-06 — Email failure after calendar success yields retryable response

## AC-009-01 — Summer times convert through CEST correctly

## AC-009-02 — Winter times convert through CET correctly

## AC-009-03 — Event carries the booking id property

## AC-009-04 — Duplicate suppression

## AC-009-05 — Calendar id and service-account credentials come from configuration

## AC-010-01 — Operator receives a complete booking summary

## AC-010-02 — Exactly one send per completed booking

## AC-010-03 — Provider failure propagates as retryable error

## AC-011-01 — Selecting a date loads available slots

## AC-011-02 — Duration control offers whole hours 1 to 4 only

## AC-011-03 — Localized pricing rules are displayed

## AC-011-04 — Valid submit posts to the API and redirects to Stripe

## AC-011-05 — Invalid email blocks submission without a request

## AC-011-06 — Missing required fields block submission

## AC-012-01 — Success view shows localized confirmation

## AC-012-02 — Cancel view shows localized cancellation with a way back

## AC-013-01 — Committed availability config parses

## AC-013-02 — Environment template lists every backend variable with no secrets

## AC-013-03 — Serverless functions mounted alongside the SPA rewrite

## Verification

# 25 — Verification Report — 001-landing-booking

**Verifier:** spec-verifier (stage 4)
**Attempt:** 1, phase 1
**Date:** 2026-08-26
**Scope:** specs/001-landing-booking/10-tasks.md (13 tasks) + 20-acceptance/ (69 scenarios) vs implemented code under src/, api/, config/

> Verifier did NOT read specs/001-landing-booking/00-informal.md.

## Verdict: PASS

All five runnable gates PASS. WARNs are review hints, no FAILs.

| Gate                               | Result                |
| ---------------------------------- | --------------------- |
| 1. Scenario traceability           | PASS                  |
| 2. Full test suite                 | PASS                  |
| 3. Complexity gate                 | PASS (0 FAIL, 3 WARN) |
| 3.5 Design-principles gate         | PASS (0 FAIL, 3 WARN) |
| 4. Scenario-to-behavior spot check | PASS                  |
| 5. No unaccounted behavior         | PASS (no findings)    |

---

## Evidence: scenario traceability

command: bash .standards/scripts/check-scenario-traceability.sh
exit: 0
at: 2026-08-26T15:58:38Z

Scenario IDs found: 69

PASS AC-001-01 — traced to a test
PASS AC-001-02 — traced to a test
PASS AC-001-03 — traced to a test
PASS AC-001-04 — traced to a test
PASS AC-001-05 — traced to a test
PASS AC-002-01 — traced to a test
PASS AC-002-02 — traced to a test
PASS AC-002-03 — traced to a test
PASS AC-002-04 — traced to a test
PASS AC-003-01 — traced to a test
PASS AC-003-02 — traced to a test
PASS AC-003-03 — traced to a test
PASS AC-003-04 — traced to a test
PASS AC-003-05 — traced to a test
PASS AC-003-06 — traced to a test
PASS AC-003-07 — traced to a test
PASS AC-003-08 — traced to a test
PASS AC-003-09 — traced to a test
PASS AC-004-01 — traced to a test
PASS AC-004-02 — traced to a test
PASS AC-004-03 — traced to a test
PASS AC-004-04 — traced to a test
PASS AC-004-05 — traced to a test
PASS AC-004-06 — traced to a test
PASS AC-005-01 — traced to a test
PASS AC-005-02 — traced to a test
PASS AC-005-03 — traced to a test
PASS AC-005-04 — traced to a test
PASS AC-005-05 — traced to a test
PASS AC-006-01 — traced to a test
PASS AC-006-02 — traced to a test
PASS AC-006-03 — traced to a test
PASS AC-006-04 — traced to a test
PASS AC-006-05 — traced to a test
PASS AC-006-06 — traced to a test
PASS AC-006-07 — traced to a test
PASS AC-007-01 — traced to a test
PASS AC-007-02 — traced to a test
PASS AC-007-03 — traced to a test
PASS AC-007-04 — traced to a test
PASS AC-007-05 — traced to a test
PASS AC-007-06 — traced to a test
PASS AC-007-07 — traced to a test
PASS AC-007-08 — traced to a test
PASS AC-008-01 — traced to a test
PASS AC-008-02 — traced to a test
PASS AC-008-03 — traced to a test
PASS AC-008-04 — traced to a test
PASS AC-008-05 — traced to a test
PASS AC-008-06 — traced to a test
PASS AC-009-01 — traced to a test
PASS AC-009-02 — traced to a test
PASS AC-009-03 — traced to a test
PASS AC-009-04 — traced to a test
PASS AC-009-05 — traced to a test
PASS AC-010-01 — traced to a test
PASS AC-010-02 — traced to a test
PASS AC-010-03 — traced to a test
PASS AC-011-01 — traced to a test
PASS AC-011-02 — traced to a test
PASS AC-011-03 — traced to a test
PASS AC-011-04 — traced to a test
PASS AC-011-05 — traced to a test
PASS AC-011-06 — traced to a test
PASS AC-012-01 — traced to a test
PASS AC-012-02 — traced to a test
PASS AC-013-01 — traced to a test
PASS AC-013-02 — traced to a test
PASS AC-013-03 — traced to a test

✔ Scenario traceability check: every scenario traced, every reference resolves.

JSON transcript (bash .standards/scripts/check-scenario-traceability.sh --json) also returned 0 fails, 69 passes — verbatim JSON contains "fails": [].

---

## Evidence: full test suite

command: npx vitest run --reporter=verbose
exit: 0
at: 2026-08-26T15:58:45Z

RUN v4.1.11 /home/dbueno/projects/rexiAI

✓ src/**tests**/AC-010-email.test.ts > AC-010 > AC-010-01: Operator receives a complete booking summary 4ms
✓ src/**tests**/AC-010-email.test.ts > AC-010 > AC-010-02: Exactly one send per completed booking 1ms
✓ src/**tests**/AC-010-email.test.ts > AC-010 > AC-010-03: Provider failure propagates as retryable error 2ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-01: Completed payment triggers all three side effects once 6ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-02: Replayed event causes no duplicate side effects 1ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-03: Invalid signature rejected with zero side effects 1ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-04: Unrelated event types ignored 1ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-05: Calendar failure yields retryable response without email 1ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-06: Email failure after calendar success yields retryable response 2ms
✓ src/**tests**/AC-013-deployment-config.test.ts > AC-013 > AC-013-01: Committed availability config parses 43ms
✓ src/**tests**/AC-013-deployment-config.test.ts > AC-013 > AC-013-02: Environment template lists every backend variable with no secrets 1ms
✓ src/**tests**/AC-013-deployment-config.test.ts > AC-013 > AC-013-03: Serverless functions mounted alongside the SPA rewrite 1ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-01: Slots from weekly schedule 38ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-02: Weekday without an entry yields no slots 2ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-03: Blackout exception empties the day 2ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-04: Override exception replaces weekly slots 3ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-05: Window shorter than one hour yields no slots 2ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-06: Malformed YAML fails the load 2ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-07: Window with end not after start fails the load 2ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-08: Missing or mismatched timezone fails the load 2ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-09: Malformed time value fails the load 3ms
✓ src/**tests**/AC-005-free-hour.test.ts > AC-005 > AC-005-01: Unknown email is eligible 4ms
✓ src/**tests**/AC-005-free-hour.test.ts > AC-005 > AC-005-02: Customer without the flag is eligible 1ms
✓ src/**tests**/AC-005-free-hour.test.ts > AC-005 > AC-005-03: Customer with the flag is not eligible 1ms
✓ src/**tests**/AC-005-free-hour.test.ts > AC-005 > AC-005-04: Marking usage persists the flag 1ms
✓ src/**tests**/AC-005-free-hour.test.ts > AC-005 > AC-005-05: Stripe failure is never treated as eligible 1ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-01: First-timer one-hour booking creates a zero-euro checkout session 48ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-02: First-timer two-hour booking charges 30 EUR 3ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-03: Returning client pays full price 3ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-04: Invalid email rejected without calling Stripe 1ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-05: Invalid durations rejected without calling Stripe 3ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-06: Off-grid start time rejected 2ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-07: Start outside availability rejected 2ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-08: Conflicting existing booking rejected 3ms
✓ src/**tests**/AC-012-result-views.test.tsx > AC-012 > AC-012-01: Success view shows localized confirmation 95ms
✓ src/**tests**/AC-012-result-views.test.tsx > AC-012 > AC-012-02: Cancel view shows localized cancellation with a way back 138ms
✓ src/**tests**/AC-002-landing-content.test.tsx > AC-002 > AC-002-01: Hero displays localized catchphrase 256ms
✓ src/**tests**/AC-001-i18n.test.tsx > AC-001 > AC-001-01: Default language is Spanish 273ms
✓ src/**tests**/AC-002-landing-content.test.tsx > AC-002 > AC-002-02: Services section lists exactly four services 107ms
✓ src/**tests**/AC-002-landing-content.test.tsx > AC-002 > AC-002-03: Contact CTA is a mailto link 235ms
✓ src/**tests**/AC-002-landing-content.test.tsx > AC-002 > AC-002-04: Page structure has the four main sections 65ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-01: Selecting a date loads available slots 291ms
✓ src/**tests**/AC-001-i18n.test.tsx > AC-001 > AC-001-02: Switching to English 315ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-02: Duration control offers whole hours 1 to 4 only 386ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-03: Localized pricing rules are displayed 50ms
✓ src/**tests**/AC-001-i18n.test.tsx > AC-001 > AC-001-03: Switching back to Spanish 198ms
✓ src/**tests**/AC-001-i18n.test.tsx > AC-001 > AC-001-04: Language choice persists across reload 126ms
✓ src/**tests**/AC-001-i18n.test.tsx > AC-001 > AC-001-05: No hardcoded user-facing strings in components 36ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-01: Open day returns YAML slots (filter with no busy) 3ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-02: Exact busy interval removes its slots 1ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-03: Partial-hour busy overlap blocks both touched slots 1ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-04: Blackout exception day returns empty 14ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-05: Past dates rejected 20ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-06: Malformed date rejected 21ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-07: Missing date parameter rejected 1ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-04: Valid submit posts to the API and redirects to Stripe 152ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-01: First-time client pricing table 2ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-02: Returning client pricing table 0ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-03: Zero hours rejected 0ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-04: Hours above maximum rejected 0ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-05: Negative hours rejected 0ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-06: Fractional hours rejected 0ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-05: Invalid email blocks submission without a request 162ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-06: Missing required fields block submission 109ms
✓ src/**tests**/AC-009-gcal-event.test.ts > AC-009 > AC-009-01: Summer times convert through CEST correctly 2ms
✓ src/**tests**/AC-009-gcal-event.test.ts > AC-009 > AC-009-02: Winter times convert through CET correctly 0ms
✓ src/**tests**/AC-009-gcal-event.test.ts > AC-009 > AC-009-03: Event carries the booking id property 1ms
✓ src/**tests**/AC-009-gcal-event.test.ts > AC-009 > AC-009-04: Duplicate suppression 1ms
✓ src/**tests**/AC-009-gcal-event.test.ts > AC-009 > AC-009-05: Calendar id and service-account credentials come from configuration 1ms

Test Files 13 passed (13)
Tests 69 passed (69)
Start at 17:58:42
Duration 3.48s (transform 1.46s, setup 1.57s, import 4.05s, tests 3.29s, environment 14.72s)

Build verification also PASS:

command: npm run build
exit: 0
at: 2026-08-26T15:59:06Z

> rexiai-website@0.0.0 build
> tsc -b && vite build

vite v8.2.2 building client environment for production...
transforming...
✓ 20 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html 0.45 kB │ gzip: 0.29 kB
dist/assets/index-DUVvrM7X.css 0.27 kB │ gzip: 0.22 kB
dist/assets/index-CMsKek45.js 209.94 kB │ gzip: 65.74 kB
✓ built in 128ms

---

## Evidence: complexity gate

command: bash .standards/scripts/check-code-principles.sh -BaseRef HEAD --json
exit: 0
at: 2026-08-26T15:58:52Z

{
"tier": "mvp",
"gates": ["complexity", "dry", "yagni", "solid", "property-tests"],
"fails": [],
"warns": [{ "message": "Possible duplication (2x identical 4-line block, first at ./api/availability.ts:79): try { /return loadConfig() /} catch (e) { /function loadConfigOrError(res: any) {", "file": "./api/availability.ts", "line": "79" }, { "message": "Possible duplication (2x identical 4-line block, first at ./src/domain/freeHour.ts:25): try { /const res = await stripe.customers.list({ email, limit: 1 }) /const customer = res.data[0] /const stripe = client ?? getStripe()", "file": "./src/domain/freeHour.ts", "line": "25" }, { "message": "Possible duplication (2x identical 4-line block, first at ./src/i18n/dictionary.ts:8): switcher: { /es: 'ES', /en: 'EN', /},", "file": "./src/i18n/dictionary.ts", "line": "8" }]
}

Human output (same invocation without --json):

Checking design principles in: . (tier: mvp)

PASS Complexity/KISS (java): no violations found

--- DRY ---
WARN Possible duplication (2x identical 4-line block, first at ./api/availability.ts:79): try { /return loadConfig() /} catch (e) { /function loadConfigOrError(res: any) {
WARN Possible duplication (2x identical 4-line block, first at ./src/domain/freeHour.ts:25): try { /const res = await stripe.customers.list({ email, limit: 1 }) /const customer = res.data[0] /const stripe = client ?? getStripe()
WARN Possible duplication (2x identical 4-line block, first at ./src/i18n/dictionary.ts:8): switcher: { /es: 'ES', /en: 'EN', /},

--- YAGNI ---
PASS YAGNI (go): no premature abstractions detected
PASS YAGNI (node): no premature abstractions detected

--- SOLID ---
PASS SOLID-SRP (java): no oversized files
PASS SOLID-SRP (go): no oversized files
PASS SOLID-SRP (node): no oversized files
PASS SOLID-OCP (java): no large type-dispatch chains
PASS SOLID-OCP (go): no large type-dispatch chains
PASS SOLID-OCP (node): no large type-dispatch chains
PASS SOLID-LSP (java): no heavy instanceof dispatch
PASS SOLID-LSP (node): no heavy instanceof dispatch
PASS SOLID-ISP (java): no fat interfaces
PASS SOLID-ISP (node): no fat interfaces
PASS SOLID-DIP (java): no domain→infrastructure imports
PASS SOLID-DIP (go): no domain→infrastructure imports
PASS SOLID-DIP (node): no domain→infrastructure imports

--- Property tests ---
Property tests: skipped (project tier is mvp — production+ required)
Property tests: skipped (project tier is mvp — production+ required)
Property tests: skipped (project tier is mvp — production+ required)

---

✔ Design-principles check: 0 FAIL(s), 3 WARN(s).
WARNs are review hints — verify each before merging.

Scoped to diff vs HEAD (-BaseRef HEAD). Global run (without --BaseRef) emits 5 FAILs all in .standards/ templates (go-saga-lint.go, eslint-saga-rules), not project code — scoped run correctly filters them. FAILs are zero on changed files.

---

## Evidence: design-principles gate

command: bash .standards/scripts/check-code-principles.sh -BaseRef HEAD
exit: 0
at: 2026-08-26T15:58:52Z

Checking design principles in: . (tier: mvp)

PASS Complexity/KISS (java): no violations found

--- DRY ---
WARN Possible duplication (2x identical 4-line block, first at ./api/availability.ts:79): try { /return loadConfig() /} catch (e) { /function loadConfigOrError(res: any) {
WARN Possible duplication (2x identical 4-line block, first at ./src/domain/freeHour.ts:25): try { /const res = await stripe.customers.list({ email, limit: 1 }) /const customer = res.data[0] /const stripe = client ?? getStripe()
WARN Possible duplication (2x identical 4-line block, first at ./src/i18n/dictionary.ts:8): switcher: { /es: 'ES', /en: 'EN', /},

--- YAGNI ---
PASS YAGNI (go): no premature abstractions detected
PASS YAGNI (node): no premature abstractions detected

--- SOLID ---
PASS SOLID-SRP (java): no oversized files
PASS SOLID-SRP (go): no oversized files
PASS SOLID-SRP (node): no oversized files
PASS SOLID-OCP (java): no large type-dispatch chains
PASS SOLID-OCP (go): no large type-dispatch chains
PASS SOLID-OCP (node): no large type-dispatch chains
PASS SOLID-LSP (java): no heavy instanceof dispatch
PASS SOLID-LSP (node): no heavy instanceof dispatch
PASS SOLID-ISP (java): no fat interfaces
PASS SOLID-ISP (node): no fat interfaces
PASS SOLID-DIP (java): no domain→infrastructure imports
PASS SOLID-DIP (go): no domain→infrastructure imports
PASS SOLID-DIP (node): no domain→infrastructure imports

--- Property tests ---
Property tests: skipped (project tier is mvp — production+ required)
Property tests: skipped (project tier is mvp — production+ required)
Property tests: skipped (project tier is mvp — production+ required)

---

✔ Design-principles check: 0 FAIL(s), 3 WARN(s).
WARNs are review hints — verify each before merging.

JSON transcript identical to complexity gate (same invocation, same file:line entries). No FAILs, so no pipeline stop. WARNs recorded verbatim above.

---

## Evidence: scenario-to-behavior spot check

command: manual inspection of 2 acceptance scenarios vs their tests
exit: 0
at: 2026-08-26T15:59:10Z

### Spot check 1: AC-004 Pricing calculator

Acceptance file: specs/001-landing-booking/20-acceptance/AC-004-pricing.md — headings AC-004-01 through AC-004-06
Rule under test: priceCents(hours, freeHourAvailable) = freeHourAvailable ? (hours − 1) × 3000 : hours × 3000

Test file: src/**tests**/AC-004-pricing.test.ts

| Scenario  | Heading                                                    | Test ID   | Assertion match                                                                        |
| --------- | ---------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------- |
| AC-004-01 | First-time client pricing table (1→0,2→3000,3→6000,4→9000) | AC-004-01 | expect(priceCents(1,true)).toEqual({ok:true,cents:0}) etc. — exact table — PASS        |
| AC-004-02 | Returning client pricing table (1→3000…4→12000)            | AC-004-02 | expect(priceCents(1,false))→3000 … 12000 — exact table — PASS                          |
| AC-004-03 | Zero hours rejected "at least 1 hour"                      | AC-004-03 | r=priceCents(0,true); ok false, message /at least 1 hour/i — PASS                      |
| AC-004-04 | Hours above max "at most 4 hours"                          | AC-004-04 | r=priceCents(5,true); message /at most 4 hours/i — PASS                                |
| AC-004-05 | Negative hours rejected                                    | AC-004-05 | priceCents(-1) ok false — PASS (scenario says rejection, no specific message required) |
| AC-004-06 | Fractional hours rejected "whole hours"                    | AC-004-06 | priceCents(1.5) ok false, message /whole hours/i — PASS                                |

Verdict: assertions exactly encode the Given/When/Then — not just name match. Spot check PASS.

### Spot check 2: AC-008 Stripe webhook orchestration

Acceptance file: specs/001-landing-booking/20-acceptance/AC-008-stripe-webhook.md — headings AC-008-01 through AC-008-06

Test file: src/**tests**/AC-008-webhook.test.ts

| Scenario  | Heading                                                          | Test ID   | Assertion match                                                                          |
| --------- | ---------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| AC-008-01 | Completed payment triggers all three side effects once, 200      | AC-008-01 | mockMark×1 + mockCreateEvent×1 + mockSendEmail×1 + status 200 — PASS                     |
| AC-008-02 | Replayed event causes no duplicate side effects, 200             | AC-008-02 | second call with find=>true, createEvent still ×1, sendEmail ×1, status 200 — PASS       |
| AC-008-03 | Invalid signature → 400 zero side effects                        | AC-008-03 | constructEvent throws, status 400, none of three mocks called — PASS                     |
| AC-008-04 | Unrelated event type ignored, 200 no side effects                | AC-008-04 | type invoice.paid, status 200, mockMark not called — PASS                                |
| AC-008-05 | Calendar failure → 5xx without email                             | AC-008-05 | mockCreateEvent rejected, status 500, mockSendEmail not called — PASS                    |
| AC-008-06 | Email failure after calendar success → retry sends missing email | AC-008-06 | first call 500, second call with find=>true sends email, final 200, CalledTimes 2 — PASS |

All 6 scenarios in the file have corresponding tests. Test bodies assert exactly what the Then clause requires (side-effect counts, HTTP codes, idempotency). No false green — a test named AC-008-01 that asserted wrong values would fail.

Verdict: PASS.

Overall spot-check: 2/2 files PASS.

---

## Finding: no unaccounted behavior

Skim of git diff vs HEAD (tracked) + untracked files (api/, src/domain/, src/i18n/, src/components/, config/availability.yaml, .env.example, tests):

- Tracked changes: .gitignore, README, opencode.json, package files, src/App.tsx, vite config — all scaffolding / dependency bumps for the spec's stack (yaml, stripe, googleapis, React 19).
- Untracked/added: src/domain/availability.ts → AC-003; src/domain/pricing.ts → AC-004; src/domain/freeHour.ts + stripeClient.ts → AC-005; src/domain/validation.ts + time.ts reused; api/availability.ts → AC-006; api/bookings.ts → AC-007; api/stripe-webhook.ts → AC-008; src/domain/gcal.ts + googleAuth.ts → AC-009; src/domain/email.ts → AC-010; src/components/BookingWidget.tsx → AC-011; src/App.tsx result views + 15-design directives → AC-002/AC-012; LanguageSwitcher + I18nContext + dictionary → AC-001; config/availability.yaml + .env.example + vercel.json retention → AC-013.
- No helper, util, or route implements behavior outside a task's acceptance criteria. No analytics, logging, feature-flag, or extra endpoint introduced. Shared helpers (time.ts Madrid conversion, validation.ts email checks) are traced to AC-006/AC-007/AC-009.
- No production code withholds a scenario ID (traceability already 69/69).

Finding: **No unaccounted behavior.**

---

## Telemetry

Recorded via scripts/record-gate-run.sh (if present) — gatesFailed: [], warnings: 3 DRY WARNs (api/availability.ts:79, src/domain/freeHour.ts:25, src/i18n/dictionary.ts:8), outcome: pass

## Quality gates

# 30 — Mutation Runner Report — 001-landing-booking

**Mutation Runner:** spec-mutation-runner (stage 5a)
**Date:** 2026-08-26
**Spec:** 001-landing-booking
**Tier:** mvp (fallback, per .standards/docs/CONFORMANCE_TIERS.md)
**Verifier verdict:** PASS (carried forward from 25-verification.md, attempt 1 phase 1, all five gates PASS)

## Verdict: SKIP (mvp tier — mutation testing not required)

Mutation testing is a `production`-tier gate per `docs/SPEC_PIPELINE.md §Conformance tiers` and `.standards/docs/CONFORMANCE_TIERS.md`. This repo declares `mvp` tier (fallback default); mutation testing is skipped. The Architect role still runs at mvp to open the PR, but the mutation-testing gate does not run.

## Mutation score

**skipped — `mvp` tier**

No Stryker/PiTest run attempted. At `mvp`, mutation testing is out of scope until the project graduates to `production` (see `.standards/docs/CONFORMANCE_TIERS.md` — "Mutation testing (PiTest / Gremlins / Stryker)" is `production` tier). No mutants generated, no score to report.

### Equivalent mutants

None — mutation testing skipped at `mvp` tier, so no mutants were generated to classify. No equivalent mutants to name.

## Complexity summary (carried from Verifier / Refactorer)

**0 FAIL, 3 WARN — worst methods ≤6 (PASS)**

- Source: `25-verification.md` Evidence: complexity gate + design-principles gate, both `exit: 0` at `2026-08-26T15:58:52Z`
- Tool: `.standards/scripts/check-code-principles.sh -BaseRef HEAD` (tier: mvp, gates: complexity, dry, yagni, solid, property-tests)
- FAILs: 0 (Complexity/KISS, YAGNI, SOLID all PASS; 5 FAILs in global run are in `.standards/` templates only, filtered by `-BaseRef HEAD`)
- WARNs: 3 DRY WARNs (review hints, not FAILs):
  - `./api/availability.ts:79` — 2x identical 4-line block (`try { return loadConfig() } catch (e) { function loadConfigOrError`)
  - `./src/domain/freeHour.ts:25` — 2x identical 4-line block (`try { const res = await stripe.customers.list ...`)
  - `./src/i18n/dictionary.ts:8` — 2x identical 4-line block (`switcher: { es: 'ES', en: 'EN' }`)
- Worst cyclomatic/cognitive complexity: ≤6 per method (gate PASS, no violations)
- Property tests: skipped (mvp tier — production+ required, per gate output)

## Final test status

**GREEN — 69/69 tests passed (13 test files)**

Full suite re-run after mutation-kill work (no mutation-killing tests added at mvp, so suite unchanged from Verifier). Every acceptance test, unit test green.

## Evidence: mutation score

command: npx stryker run (skipped — mvp tier, per .standards/docs/CONFORMANCE_TIERS.md)
exit: 0
at: 2026-08-26T16:02:28Z

skipped — mvp tier
Mutation testing is production-tier per docs/SPEC_PIPELINE.md §Conformance tiers and .standards/docs/CONFORMANCE_TIERS.md. No Stryker run attempted. No mutants generated.

## Evidence: final test status

command: npx vitest run --reporter=verbose
exit: 0
at: 2026-08-26T16:02:28Z

RUN v4.1.11 /home/dbueno/projects/rexiAI

✓ src/**tests**/AC-010-email.test.ts > AC-010 > AC-010-01: Operator receives a complete booking summary 5ms
✓ src/**tests**/AC-010-email.test.ts > AC-010 > AC-010-02: Exactly one send per completed booking 1ms
✓ src/**tests**/AC-010-email.test.ts > AC-010 > AC-010-03: Provider failure propagates as retryable error 2ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-01: Completed payment triggers all three side effects once 6ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-02: Replayed event causes no duplicate side effects 2ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-03: Invalid signature rejected with zero side effects 2ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-04: Unrelated event types ignored 1ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-05: Calendar failure yields retryable response without email 1ms
✓ src/**tests**/AC-008-webhook.test.ts > AC-008 > AC-008-06: Email failure after calendar success yields retryable response 2ms
✓ src/**tests**/AC-013-deployment-config.test.ts > AC-013 > AC-013-01: Committed availability config parses 36ms
✓ src/**tests**/AC-013-deployment-config.test.ts > AC-013 > AC-013-02: Environment template lists every backend variable with no secrets 1ms
✓ src/**tests**/AC-013-deployment-config.test.ts > AC-013 > AC-013-03: Serverless functions mounted alongside the SPA rewrite 1ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-01: Slots from weekly schedule 38ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-02: Weekday without an entry yields no slots 1ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-03: Blackout exception empties the day 1ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-04: Override exception replaces weekly slots 1ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-05: Window shorter than one hour yields no slots 1ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-06: Malformed YAML fails the load 2ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-07: Window with end not after start fails the load 1ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-08: Missing or mismatched timezone fails the load 2ms
✓ src/**tests**/AC-003-availability-config.test.ts > AC-003 > AC-003-09: Malformed time value fails the load 2ms
✓ src/**tests**/AC-005-free-hour.test.ts > AC-005 > AC-005-01: Unknown email is eligible 4ms
✓ src/**tests**/AC-005-free-hour.test.ts > AC-005 > AC-005-02: Customer without the flag is eligible 1ms
✓ src/**tests**/AC-005-free-hour.test.ts > AC-005 > AC-005-03: Customer with the flag is not eligible 0ms
✓ src/**tests**/AC-005-free-hour.test.ts > AC-005 > AC-005-04: Marking usage persists the flag 1ms
✓ src/**tests**/AC-005-free-hour.test.ts > AC-005 > AC-005-05: Stripe failure is never treated as eligible 3ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-01: First-timer one-hour booking creates a zero-euro checkout session 44ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-02: First-timer two-hour booking charges 30 EUR 3ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-03: Returning client pays full price 2ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-04: Invalid email rejected without calling Stripe 1ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-05: Invalid durations rejected without calling Stripe 1ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-06: Off-grid start time rejected 3ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-07: Start outside availability rejected 2ms
✓ src/**tests**/AC-007-bookings.test.ts > AC-007 > AC-007-08: Conflicting existing booking rejected 2ms
✓ src/**tests**/AC-012-result-views.test.tsx > AC-012 > AC-012-01: Success view shows localized confirmation 109ms
✓ src/**tests**/AC-012-result-views.test.tsx > AC-012 > AC-012-02: Cancel view shows localized cancellation with a way back 128ms
✓ src/**tests**/AC-002-landing-content.test.tsx > AC-002 > AC-002-01: Hero displays localized catchphrase 246ms
✓ src/**tests**/AC-002-landing-content.test.tsx > AC-002 > AC-002-02: Services section lists exactly four services 91ms
✓ src/**tests**/AC-001-i18n.test.tsx > AC-001 > AC-001-01: Default language is Spanish 249ms
✓ src/**tests**/AC-002-landing-content.test.tsx > AC-002 > AC-002-03: Contact CTA is a mailto link 197ms
✓ src/**tests**/AC-002-landing-content.test.tsx > AC-002 > AC-002-04: Page structure has the four main sections 68ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-01: Selecting a date loads available slots 277ms
✓ src/**tests**/AC-001-i18n.test.tsx > AC-001 > AC-001-02: Switching to English 285ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-02: Duration control offers whole hours 1 to 4 only 410ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-03: Localized pricing rules are displayed 56ms
✓ src/**tests**/AC-001-i18n.test.tsx > AC-001 > AC-001-03: Switching back to Spanish 184ms
✓ src/**tests**/AC-001-i18n.test.tsx > AC-001 > AC-001-04: Language choice persists across reload 150ms
✓ src/**tests**/AC-001-i18n.test.tsx > AC-001 > AC-001-05: No hardcoded user-facing strings in components 30ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-01: Open day returns YAML slots (filter with no busy) 2ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-02: Exact busy interval removes its slots 0ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-03: Partial-hour busy overlap blocks both touched slots 0ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-04: Blackout exception day returns empty 8ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-05: Past dates rejected 17ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-06: Malformed date rejected 1ms
✓ src/**tests**/AC-006-availability-api.test.ts > AC-006 > AC-006-07: Missing date parameter rejected 1ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-04: Valid submit posts to the API and redirects to Stripe 103ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-01: First-time client pricing table 2ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-02: Returning client pricing table 0ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-03: Zero hours rejected 1ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-04: Hours above maximum rejected 0ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-05: Negative hours rejected 0ms
✓ src/**tests**/AC-004-pricing.test.ts > AC-004 > AC-004-06: Fractional hours rejected 0ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-05: Invalid email blocks submission without a request 172ms
✓ src/**tests**/AC-011-booking-ui.test.tsx > AC-011 > AC-011-06: Missing required fields block submission 106ms
✓ src/**tests**/AC-009-gcal-event.test.ts > AC-009 > AC-009-01: Summer times convert through CEST correctly 2ms
✓ src/**tests**/AC-009-gcal-event.test.ts > AC-009 > AC-009-02: Winter times convert through CET correctly 0ms
✓ src/**tests**/AC-009-gcal-event.test.ts > AC-009 > AC-009-03: Event carries the booking id property 1ms
✓ src/**tests**/AC-009-gcal-event.test.ts > AC-009 > AC-009-04: Duplicate suppression 0ms
✓ src/**tests**/AC-009-gcal-event.test.ts > AC-009 > AC-009-05: Calendar id and service-account credentials come from configuration 0ms

Test Files 13 passed (13)
Tests 69 passed (69)
Start at 18:02:29
Duration 3.54s (transform 1.60s, setup 1.67s, import 4.20s, tests 3.11s, environment 15.18s)

## Remediation record

No BLOCK occurred during the run.

- Phase 1 (pre-PR loop): 0 BLOCKs — Verifier attempt 1, phase 1, verdict PASS (25-verification.md: Attempt 1, phase 1, gatesFailed: [], warnings: 3 DRY WARNs). No remediation needed, no re-delegation.
- Phase 2 (post-PR loop): not yet entered — PR not yet opened (PR Opener is stage 5b, runs after this report).
- Overall: remediation budget 3/3 remaining in both phases; no attempt count consumed.

Carried forward from 25-verification.md attempt entry and Verifier's telemetry record (gatesFailed: [], outcome: pass).

## Telemetry

Recorded via .standards/scripts/record-gate-run.sh if present — see command below.

PR: https://github.com/RexiAI/rexiAI/pull/16
Commits: 3

---

## Post-PR CI check — Round 1 (phase 2, attempt 1)

**Date:** 2026-08-26
**PR:** https://github.com/RexiAI/rexiAI/pull/16
**Branch:** spec/001-landing-booking
**Head SHA:** f2ffcc4c33c7f1295ff397b1a7bc6e06c05a0bd0
**Mode:** post-PR CI check per .standards/docs/SPEC_PIPELINE.md §Post-PR CI check-and-remediate loop
**Loop budget:** SPEC_LOOP_COUNT=1, SPEC_PHASE1_RETRIES=0, SPEC_PHASE2_RETRIES=0 — first post-PR round, attempt 1 phase 2

### Verdict: PASS — all reported checks passed (no FAIL, no pending)

All checks reported by `gh pr checks` are in `pass` bucket. No GitHub Actions `CI` run present for this head SHA (Vercel-only PR, `ci.yml` triggers on `pull_request` to `main` — at query time no `check-runs`/`workflow_runs` for this SHA were created; only Vercel suites reported). Per the spec gate rule — `bucket` is the PASS/FAIL parse rule and `pending` is neither — with all reported buckets `pass`, verdict is PASS.

### Per-check table

| Check                   | Bucket | State   | Workflow | Link                                                                                 |
| ----------------------- | ------ | ------- | -------- | ------------------------------------------------------------------------------------ |
| Vercel Preview Comments | pass   | SUCCESS | —        | https://vercel.com/github                                                            |
| Vercel                  | pass   | SUCCESS | —        | https://vercel.com/danielbueno76-4270s-projects/rexi-ai/3gLqsbGKFE1yHGfsftV3DvJJKhxc |

### Failing check IDs

None — no check reported `bucket: fail` / `conclusion: failure`.

### Failing job logs (tail -c 6000)

None — no failing checks, no logs to capture. `gh api repos/RexiAI/rexiAI/commits/f2ffcc4c33c7f1295ff397b1a7bc6e06c05a0bd0/check-runs` returned only `Vercel Preview Comments` with `conclusion: success`; `gh api .../actions/runs?head_sha=...` returned empty `workflow_runs`; `gh pr checks --watch` terminal at pass.

### Evidence: Post-PR CI — initial pending then pass (poll)

## Evidence: post-PR CI check (poll — pending → pass)

command: gh pr checks 16 --json name,state,bucket,workflow,link
exit: 0
at: 2026-08-26T16:11:48Z

[{"bucket":"pass","link":"https://vercel.com/github","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},{"bucket":"pending","link":"https://vercel.com/danielbueno76-4270s-projects/rexi-ai/3gLqsbGKFE1yHGfsftV3DvJJKhxc","name":"Vercel","state":"PENDING","workflow":""}]

command: gh pr checks 16 --json name,state,bucket,workflow,link
exit: 0
at: 2026-08-26T16:13:47Z

[{"bucket":"pass","link":"https://vercel.com/github","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},{"bucket":"pass","link":"https://vercel.com/danielbueno76-4270s-projects/rexi-ai/3gLqsbGKFE1yHGfsftV3DvJJKhxc","name":"Vercel","state":"SUCCESS","workflow":""}]

command: gh pr view 16 --json isDraft,createdAt,updatedAt,state,mergeable
exit: 0
at: 2026-08-26T16:13:57Z

{"createdAt":"2026-08-26T16:09:53Z","isDraft":true,"mergeable":"UNKNOWN","state":"OPEN","updatedAt":"2026-08-26T16:13:35Z"}

command: gh api repos/RexiAI/rexiAI/commits/f2ffcc4c33c7f1295ff397b1a7bc6e06c05a0bd0/check-runs
exit: 0
at: 2026-08-26T16:13:57Z

[{"conclusion":"success","id":98235931138,"name":"Vercel Preview Comments","status":"completed"}]

command: gh api repos/RexiAI/rexiAI/actions/runs?head_sha=f2ffcc4c33c7f1295ff397b1a7bc6e06c05a0bd0
exit: 0
at: 2026-08-26T16:14:09Z

{"workflow_runs":[]}

command: gh pr checks 16 --json name,state,bucket,workflow,link (poll round — 4 consecutive terminals)
exit: 0
at: 2026-08-26T16:14:33Z

[{"bucket":"pass","link":"https://vercel.com/github","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},{"bucket":"pass","link":"https://vercel.com/danielbueno76-4270s-projects/rexi-ai/3gLqsbGKFE1yHGfsftV3DvJJKhxc","name":"Vercel","state":"SUCCESS","workflow":""}]

Notes: No GitHub Actions `CI` check-runs or workflow_runs were returned for this head SHA during the entire poll window (16:11–16:14 UTC). `gh api repos/RexiAI/rexiAI/commits/<sha>/check-runs` and `gh api .../actions/runs?head_sha=<sha>` both returned empty/only-Vercel. `gh pr checks --watch` behavior was emulated via bounded re-query (4 polls, 10s interval) until both buckets terminal `pass`. `gh run list --branch spec/001-landing-booking` also returned `[]` — no `Self CI` (`.github/workflows/ci.yml`) run created for this PR at query time. If branch protection later requires a `CI` check, it would appear as `absent-unknown`, not `fail`, per triage taxonomy — but at this instant `gh pr checks` reports only Vercel, both pass.

---

## Post-PR CI check — Round 2 (phase 2, attempt 2)

**Date:** 2026-08-27
**PR:** https://github.com/RexiAI/rexiAI/pull/16
**Branch:** spec/001-landing-booking
**Head SHA:** 50c83af500bea4693b5bde838387aa7fe3c40f65
**Run:** https://github.com/RexiAI/rexiAI/actions/runs/33070831632
**Mode:** post-PR CI re-check per .standards/docs/SPEC_PIPELINE.md §Post-PR CI check-and-remediate loop
**Loop budget:** SPEC_LOOP_COUNT=2, SPEC_PHASE1_RETRIES=0, SPEC_PHASE2_RETRIES=1 — phase-2 round 1 re-check after fix push (previous run 32988911776 failed Lint & Format 14 errors, new run 33070831632)
**Trigger:** fix commit for Lint & Format (previous 14 Prettier errors)
**Verdict:** FAIL — 1 check in `fail` bucket

Bounded poll: 10s interval, up to ~5 min. Initial poll showed Vercel `pending`; polled until terminal (all buckets `pass`/`fail`/`skipping`, no `pending`). Terminal at 2026-08-27T12:14:51Z (Vercel flipped pending→pass on 2nd poll, CI already terminal `fail`).

### Per-check table (terminal, bucket is parse rule)

| Check                             | Bucket   | State   | Workflow | Link                                                                                 |
| --------------------------------- | -------- | ------- | -------- | ------------------------------------------------------------------------------------ |
| Vercel Preview Comments           | pass     | SUCCESS | —        | https://vercel.com/github                                                            |
| frontend-ci / Build               | skipping | SKIPPED | CI       | https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512452221            |
| frontend-ci / Docker Build & Push | skipping | SKIPPED | CI       | https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512451904            |
| frontend-ci / Unit Tests          | pass     | SUCCESS | CI       | https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339173            |
| frontend-ci / Lint & Format       | **fail** | FAILURE | CI       | https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339290            |
| Vercel                            | pass     | SUCCESS | —        | https://vercel.com/danielbueno76-4270s-projects/rexi-ai/3zrwH4GfLnFh44e4uvUH7pgLNPaa |

`skipping` is not `fail` (conditional workflow jobs skipped). Only `fail` bucket counts as FAIL. One FAIL → overall FAIL.

### Failing check IDs

| Check                       | ID          | Conclusion |
| --------------------------- | ----------- | ---------- |
| frontend-ci / Lint & Format | 98512339290 | failure    |

Source: `gh api repos/RexiAI/rexiAI/commits/50c83af500bea4693b5bde838387aa7fe3c40f65/check-runs` (conclusion == failure)

### Failing job logs (tail -c 6000, verbatim)

Source: `gh run view 33070831632 --log-failed` (run 33070831632, job 98512339290)

```
Format	UNKNOWN STEP	2026-08-27T12:13:22.5573846Z [^[[33mwarn^[[39m] api/stripe-webhook.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.5686638Z [^[[33mwarn^[[39m] config/availability.yaml
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.7769818Z [^[[33mwarn^[[39m] docs/changes/001-landing-booking.md
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.8462242Z [^[[33mwarn^[[39m] src/__tests__/AC-001-i18n.test.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.8590566Z [^[[33mwarn^[[39m] src/__tests__/AC-002-landing-content.test.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.9034304Z [^[[33mwarn^[[39m] src/__tests__/AC-005-free-hour.test.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.9493414Z [^[[33mwarn^[[39m] src/__tests__/AC-007-bookings.test.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.9841173Z [^[[33mwarn^[[39m] src/__tests__/AC-008-webhook.test.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.9955288Z [^[[33mwarn^[[39m] src/__tests__/AC-009-gcal-event.test.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.0043942Z [^[[33mwarn^[[39m] src/__tests__/AC-010-email.test.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.0218775Z [^[[33mwarn^[[39m] src/__tests__/AC-011-booking-ui.test.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.0301648Z [^[[33mwarn^[[39m] src/__tests__/AC-012-result-views.test.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.0957111Z [^[[33mwarn^[[39m] src/App.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1296937Z [^[[33mwarn^[[39m] src/components/BookingWidget.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1371520Z [^[[33mwarn^[[39m] src/components/LanguageSwitcher.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1537867Z [^[[33mwarn^[[39m] src/domain/availability.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1615228Z [^[[33mwarn^[[39m] src/domain/email.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1702926Z [^[[33mwarn^[[39m] src/domain/freeHour.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1833144Z [^[[33mwarn^[[39m] src/domain/gcal.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1962196Z [^[[33mwarn^[[39m] src/domain/pricing.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2121496Z [^[[33mwarn^[[39m] src/domain/time.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2264345Z [^[[33mwarn^[[39m] src/i18n/dictionary.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2566248Z [^[[33mwarn^[[39m] Code style issues found in 24 files. Run Prettier with --write to fix.
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2803717Z ##[error]Process completed with exit code 1.
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2902861Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2903947Z Post job cleanup.
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3592423Z [command]/usr/bin/git version
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3635474Z git version 2.55.0
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3663469Z Temporarily overriding HOME='/home/runner/work/_temp/9e8ef0c9-9d17-4897-8576-7c4aa80da6f1' before making global git config changes
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3664672Z Adding repository directory to the temporary git global config as a safe directory
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3667388Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/rexiAI/rexiAI
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3697790Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3727274Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3962761Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3985485Z http.https://github.com/.extraheader
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3993983Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.4026373Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.4231517Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.4264246Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.4588466Z Cleaning up orphan processes
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.4817863Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/

```

### Root cause (diagnosis for orchestrator routing)

Job `frontend-ci / Lint & Format` (id 98512339290) fails at `npm run format:check` (`prettier --check .`) — exit code 1 — with:

```
Code style issues found in 24 files. Run Prettier with --write to fix.
```

Pre-fix run 32988911776 had 14 files; fix commit claimed to fix but new run still has 24 files with style issues (regression: more, not fewer). Files flagged (from log `[warn]` lines):

- `api/availability.ts`, `api/bookings.ts`, `api/stripe-webhook.ts`
- `config/availability.yaml`
- `docs/changes/001-landing-booking.md` (the archive doc itself)
- `src/__tests__/AC-001-i18n.test.tsx`, `AC-002-landing-content.test.tsx`, `AC-005-free-hour.test.ts`, `AC-007-bookings.test.ts`, `AC-008-webhook.test.ts`, `AC-009-gcal-event.test.ts`, `AC-010-email.test.ts`, `AC-011-booking-ui.test.tsx`, `AC-012-result-views.test.tsx`
- `src/App.tsx`, `src/components/BookingWidget.tsx`, `src/components/LanguageSwitcher.tsx`
- `src/domain/availability.ts`, `src/domain/email.ts`, `src/domain/freeHour.ts`, `src/domain/gcal.ts`, `src/domain/pricing.ts`, `src/domain/time.ts`
- `src/i18n/dictionary.ts`

Note: `npm run lint` (`eslint .`) in same job emitted 136 warnings (`@typescript-eslint/no-explicit-any`) but **0 errors** — those warnings are not the failure; the job fails on the subsequent `format:check` step.

**Route to:** Refactorer (formatting/style) or Coder — run `npx prettier --write .` (or `npm run format`) and commit, ensure `docs/changes/001-landing-booking.md` is also formatted or excluded via `.prettierignore` if intended.

### Evidence: Post-PR CI — Round 2 poll to terminal

## Evidence: post-PR CI check Round 2 — poll 1 (pending)

command: gh pr checks 16 --json name,state,bucket,workflow,link
exit: 0
at: 2026-08-27T12:14:40Z

[{"bucket":"skipping","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512452221","name":"frontend-ci / Build","state":"SKIPPED","workflow":"CI"},{"bucket":"skipping","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512451904","name":"frontend-ci / Docker Build & Push","state":"SKIPPED","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339173","name":"frontend-ci / Unit Tests","state":"SUCCESS","workflow":"CI"},{"bucket":"fail","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339290","name":"frontend-ci / Lint & Format","state":"FAILURE","workflow":"CI"},{"bucket":"pass","link":"https://vercel.com/github","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},{"bucket":"pending","link":"https://vercel.com/danielbueno76-4270s-projects/rexi-ai/3zrwH4GfLnFh44e4uvUH7pgLNPaa","name":"Vercel","state":"PENDING","workflow":""}]

## Evidence: post-PR CI check Round 2 — poll 2 terminal (Vercel pass, CI fail remains)

command: gh pr checks 16 --json name,state,bucket,workflow,link
exit: 0
at: 2026-08-27T12:14:51Z

[{"bucket":"pass","link":"https://vercel.com/github","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},{"bucket":"skipping","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512452221","name":"frontend-ci / Build","state":"SKIPPED","workflow":"CI"},{"bucket":"skipping","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512451904","name":"frontend-ci / Docker Build & Push","state":"SKIPPED","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339173","name":"frontend-ci / Unit Tests","state":"SUCCESS","workflow":"CI"},{"bucket":"fail","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339290","name":"frontend-ci / Lint & Format","state":"FAILURE","workflow":"CI"},{"bucket":"pass","link":"https://vercel.com/danielbueno76-4270s-projects/rexi-ai/3zrwH4GfLnFh44e4uvUH7pgLNPaa","name":"Vercel","state":"SUCCESS","workflow":""}]

## Evidence: post-PR CI check Round 2 — final terminal snapshot

command: gh pr checks 16 --json name,state,bucket,workflow,link
exit: 0
at: 2026-08-27T12:15:54Z

[{"bucket":"pass","link":"https://vercel.com/github","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},{"bucket":"skipping","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512452221","name":"frontend-ci / Build","state":"SKIPPED","workflow":"CI"},{"bucket":"skipping","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512451904","name":"frontend-ci / Docker Build & Push","state":"SKIPPED","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339173","name":"frontend-ci / Unit Tests","state":"SUCCESS","workflow":"CI"},{"bucket":"fail","link":"https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339290","name":"frontend-ci / Lint & Format","state":"FAILURE","workflow":"CI"},{"bucket":"pass","link":"https://vercel.com/danielbueno76-4270s-projects/rexi-ai/3zrwH4GfLnFh44e4uvUH7pgLNPaa","name":"Vercel","state":"SUCCESS","workflow":""}]

## Evidence: check-runs for head SHA 50c83af500bea4693b5bde838387aa7fe3c40f65

command: gh api repos/RexiAI/rexiAI/commits/50c83af500bea4693b5bde838387aa7fe3c40f65/check-runs
exit: 0
at: 2026-08-27T12:16:00Z

{
"total_count": 5,
"check_runs": [
{
"id": 98512785439,
"name": "Vercel Preview Comments",
"node_id": "CR_kwDOUCrJBM8AAAAW79HQHw",
"head_sha": "50c83af500bea4693b5bde838387aa7fe3c40f65",
"external_id": "",
"url": "https://api.github.com/repos/RexiAI/rexiAI/check-runs/98512785439",
"html_url": "https://github.com/RexiAI/rexiAI/runs/98512785439",
"details_url": "https://vercel.com/github",
"status": "completed",
"conclusion": "success",
"started_at": "2026-08-27T12:14:48Z",
"completed_at": "2026-08-27T12:14:48Z",
"output": {
"title": "\u2705 No unresolved feedback",
"summary": "\ud83d\udcac 0 unresolved, 0 resolved. [Go to feedback](https://vercel.live/open-feedback/rexi-ai-git-spec-001-landin-3151fe-danielbueno76-4270s-projects.vercel.app?via=pr-comment-feedback-link)",
"text": null,
"annotations_count": 0,
"annotations_url": "https://api.github.com/repos/RexiAI/rexiAI/check-runs/98512785439/annotations"
},
"check_suite": {
"id": 89601942040
},
"app": {
"id": 8329,
"client_id": "Iv1.9d7d662ea00b8481",
"slug": "vercel",
"node_id": "MDM6QXBwODMyOQ==",
"owner": {
"login": "vercel",
"id": 14985020,
"node_id": "MDEyOk9yZ2FuaXphdGlvbjE0OTg1MDIw",
"avatar_url": "https://avatars.githubusercontent.com/u/14985020?v=4",
"gravatar_id": "",
"url": "https://api.github.com/users/vercel",
"html_url": "https://github.com/vercel",
"followers_url": "https://api.github.com/users/vercel/followers",
"following_url": "https://api.github.com/users/vercel/following{/other_user}",
"gists_url": "https://api.github.com/users/vercel/gists{/gist_id}",
"starred_url": "https://api.github.com/users/vercel/starred{/owner}{/repo}",
"subscriptions_url": "https://api.github.com/users/vercel/subscriptions",
"organizations_url": "https://api.github.com/users/vercel/orgs",
"repos_url": "https://api.github.com/users/vercel/repos",
"events_url": "https://api.github.com/users/vercel/events{/privacy}",
"received_events_url": "https://api.github.com/users/vercel/received_events",
"type": "Organization",
"user_view_type": "public",
"site_admin": false
},
"name": "Vercel",
"description": "Vercel for GitHub automatically deploys your PRs to Vercel.\r\nPreview every PR live, without any configuration required.\r\n\r\nFor more information, see our [documentation](https://vercel.com/docs/github?utm_source=github&utm_medium=marketplace&utm_campaign=vercel-app).\r\n\r\n![](https://assets.vercel.com/image/upload/v1597943727/front/github/github-comment-monorepo.png)",
"external_url": "https://vercel.com/github",
"html_url": "https://github.com/apps/vercel",
"created_at": "2018-01-19T21:51:06Z",
"updated_at": "2026-08-20T01:39:01Z",
"permissions": {
"actions": "read",
"administration": "write",
"checks": "write",
"contents": "write",
"deployments": "write",
"emails": "read",
"issues": "write",
"members": "read",
"metadata": "read",
"pull_requests": "write",
"repository_hooks": "write",
"statuses": "write",
"workflows": "write"
},
"events": [
"branch_protection_rule",
"check_run",
"delete",
"deployment",
"issue_comment",
"membership",
"pull_request",
"pull_request_review",
"pull_request_review_comment",
"pull_request_review_thread",
"push",
"repository",
"status",
"team"
]
},
"pull_requests": [
{
"url": "https://api.github.com/repos/RexiAI/rexiAI/pulls/16",
"id": 4368798504,
"number": 16,
"head": {
"ref": "spec/001-landing-booking",
"sha": "50c83af500bea4693b5bde838387aa7fe3c40f65",
"repo": {
"id": 1344981252,
"url": "https://api.github.com/repos/RexiAI/rexiAI",
"name": "rexiAI"
}
},
"base": {
"ref": "main",
"sha": "2a312b2a6651a13bc8faf7bb21dd3f4633f072e4",
"repo": {
"id": 1344981252,
"url": "https://api.github.com/repos/RexiAI/rexiAI",
"name": "rexiAI"
}
}
}
]
},
{
"id": 98512452221,
"name": "frontend-ci / Build",
"node_id": "CR_kwDOUCrJBM8AAAAW78y6fQ",
"head_sha": "50c83af500bea4693b5bde838387aa7fe3c40f65",
"external_id": "2959e442-3998-5efe-be4f-f71bcbe63e97",
"url": "https://api.github.com/repos/RexiAI/rexiAI/check-runs/98512452221",
"html_url": "https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512452221",
"details_url": "https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512452221",
"status": "completed",
"conclusion": "skipped",
"started_at": "2026-08-27T12:13:31Z",
"completed_at": "2026-08-27T12:13:30Z",
"output": {
"title": null,
"summary": null,
"text": null,
"annotations_count": 0,
"annotations_url": "https://api.github.com/repos/RexiAI/rexiAI/check-runs/98512452221/annotations"
},
"check_suite": {
"id": 89601957468
},
"app": {
"id": 15368,
"client_id": "Iv1.05c79e9ad1f6bdfa",
"slug": "github-actions",
"node_id": "MDM6QXBwMTUzNjg=",
"owner": {
"login": "github",
"id": 9919,
"node_id": "MDEyOk9yZ2FuaXphdGlvbjk5MTk=",
"avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4",
"gravatar_id": "",
"url": "https://api.github.com/users/github",
"html_url": "https://github.com/github",
"followers_url": "https://api.github.com/users/github/followers",
"following_url": "https://api.github.com/users/github/following{/other_user}",
"gists_url": "https://api.github.com/users/github/gists{/gist_id}",
"starred_url": "https://api.github.com/users/github/starred{/owner}{/repo}",
"subscriptions_url": "https://api.github.com/users/github/subscriptions",
"organizations_url": "https://api.github.com/users/github/orgs",
"repos_url": "https://api.github.com/users/github/repos",
"events_url": "https://api.github.com/users/github/events{/privacy}",
"received_events_url": "https://api.github.com/users/github/received_events",
"type": "Organization",
"user_view_type": "public",
"site_admin": false
},
"name": "GitHub Actions",
"description": "Automate your workflow from idea to production",
"external_url": "https://help.github.com/en/actions",
"html_url": "https://github.com/apps/github-actions",
"created_at": "2018-07-30T09:30:17Z",
"updated_at": "2026-06-18T16:17:48Z",
"permissions": {
"actions": "write",
"administration": "read",
"artifact_metadata": "write",
"attestations": "write",
"checks": "write",
"code_quality": "write",
"contents": "write",
"copilot_requests": "write",
"deployments": "write",
"discussions": "write",
"drives": "write",
"issues": "write",
"merge_queues": "write",
"metadata": "read",
"models": "read",
"packages": "write",
"pages": "write",
"pull_requests": "write",
"repository_hooks": "write",
"repository_projects": "write",
"security_events": "write",
"statuses": "write",
"vulnerability_alerts": "read"
},
"events": [
"branch_protection_rule",
"check_run",
"check_suite",
"create",
"delete",
"deployment",
"deployment_status",
"discussion",
"discussion_comment",
"fork",
"gollum",
"issues",
"issue_comment",
"label",
"merge_group",
"milestone",
"page_build",
"public",
"pull_request",
"pull_request_review",
"pull_request_review_comment",
"push",
"registry_package",
"release",
"repository",
"repository_dispatch",
"status",
"watch",
"workflow_dispatch",
"workflow_run"
]
},
"pull_requests": [
{
"url": "https://api.github.com/repos/RexiAI/rexiAI/pulls/16",
"id": 4368798504,
"number": 16,
"head": {
"ref": "spec/001-landing-booking",
"sha": "50c83af500bea4693b5bde838387aa7fe3c40f65",
"repo": {
"id": 1344981252,
"url": "https://api.github.com/repos/RexiAI/rexiAI",
"name": "rexiAI"
}
},
"base": {
"ref": "main",
"sha": "2a312b2a6651a13bc8faf7bb21dd3f4633f072e4",
"repo": {
"id": 1344981252,
"url": "https://api.github.com/repos/RexiAI/rexiAI",
"name": "rexiAI"
}
}
}
]
},
{
"id": 98512451904,
"name": "frontend-ci / Docker Build & Push",
"node_id": "CR_kwDOUCrJBM8AAAAW78y5QA",
"head_sha": "50c83af500bea4693b5bde838387aa7fe3c40f65",
"external_id": "8cf3fb58-2f02-5e39-91b5-599e15bd6305",
"url": "https://api.github.com/repos/RexiAI/rexiAI/check-runs/98512451904",
"html_url": "https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512451904",
"details_url": "https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512451904",
"status": "completed",
"conclusion": "skipped",
"started_at": "2026-08-27T12:13:31Z",
"completed_at": "2026-08-27T12:13:30Z",
"output": {
"title": null,
"summary": null,
"text": null,
"annotations_count": 0,
"annotations_url": "https://api.github.com/repos/RexiAI/rexiAI/check-runs/98512451904/annotations"
},
"check_suite": {
"id": 89601957468
},
"app": {
"id": 15368,
"client_id": "Iv1.05c79e9ad1f6bdfa",
"slug": "github-actions",
"node_id": "MDM6QXBwMTUzNjg=",
"owner": {
"login": "github",
"id": 9919,
"node_id": "MDEyOk9yZ2FuaXphdGlvbjk5MTk=",
"avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4",
"gravatar_id": "",
"url": "https://api.github.com/users/github",
"html_url": "https://github.com/github",
"followers_url": "https://api.github.com/users/github/followers",
"following_url": "https://api.github.com/users/github/following{/other_user}",
"gists_url": "https://api.github.com/users/github/gists{/gist_id}",
"starred_url": "https://api.github.com/users/github/starred{/owner}{/repo}",
"subscriptions_url": "https://api.github.com/users/github/subscriptions",
"organizations_url": "https://api.github.com/users/github/orgs",
"repos_url": "https://api.github.com/users/github/repos",
"events_url": "https://api.github.com/users/github/events{/privacy}",
"received_events_url": "https://api.github.com/users/github/received_events",
"type": "Organization",
"user_view_type": "public",
"site_admin": false
},
"name": "GitHub Actions",
"description": "Automate your workflow from idea to production",
"external_url": "https://help.github.com/en/actions",
"html_url": "https://github.com/apps/github-actions",
"created_at": "2018-07-30T09:30:17Z",
"updated_at": "2026-06-18T16:17:48Z",
"permissions": {
"actions": "write",
"administration": "read",
"artifact_metadata": "write",
"attestations": "write",
"checks": "write",
"code_quality": "write",
"contents": "write",
"copilot_requests": "write",
"deployments": "write",
"discussions": "write",
"drives": "write",
"issues": "write",
"merge_queues": "write",
"metadata": "read",
"models": "read",
"packages": "write",
"pages": "write",
"pull_requests": "write",
"repository_hooks": "write",
"repository_projects": "write",
"security_events": "write",
"statuses": "write",
"vulnerability_alerts": "read"
},
"events": [
"branch_protection_rule",
"check_run",
"check_suite",
"create",
"delete",
"deployment",
"deployment_status",
"discussion",
"discussion_comment",
"fork",
"gollum",
"issues",
"issue_comment",
"label",
"merge_group",
"milestone",
"page_build",
"public",
"pull_request",
"pull_request_review",
"pull_request_review_comment",
"push",
"registry_package",
"release",
"repository",
"repository_dispatch",
"status",
"watch",
"workflow_dispatch",
"workflow_run"
]
},
"pull_requests": [
{
"url": "https://api.github.com/repos/RexiAI/rexiAI/pulls/16",
"id": 4368798504,
"number": 16,
"head": {
"ref": "spec/001-landing-booking",
"sha": "50c83af500bea4693b5bde838387aa7fe3c40f65",
"repo": {
"id": 1344981252,
"url": "https://api.github.com/repos/RexiAI/rexiAI",
"name": "rexiAI"
}
},
"base": {
"ref": "main",
"sha": "2a312b2a6651a13bc8faf7bb21dd3f4633f072e4",
"repo": {
"id": 1344981252,
"url": "https://api.github.com/repos/RexiAI/rexiAI",
"name": "rexiAI"
}
}
}
]
},
{
"id": 98512339290,
"name": "frontend-ci / Lint & Format",
"node_id": "CR_kwDOUCrJBM8AAAAW78sBWg",
"head_sha": "50c83af500bea4693b5bde838387aa7fe3c40f65",
"external_id": "dd121d78-998c-55e6-869d-76890007fcdf",
"url": "https://api.github.com/repos/RexiAI/rexiAI/check-runs/98512339290",
"html_url": "https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339290",
"details_url": "https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339290",
"status": "completed",
"conclusion": "failure",
"started_at": "2026-08-27T12:13:07Z",
"completed_at": "2026-08-27T12:13:25Z",
"output": {
"title": null,
"summary": null,
"text": null,
"annotations_count": 12,
"annotations_url": "https://api.github.com/repos/RexiAI/rexiAI/check-runs/98512339290/annotations"
},
"check_suite": {
"id": 89601957468
},
"app": {
"id": 15368,
"client_id": "Iv1.05c79e9ad1f6bdfa",
"slug": "github-actions",
"node_id": "MDM6QXBwMTUzNjg=",
"owner": {
"login": "github",
"id": 9919,
"node_id": "MDEyOk9yZ2FuaXphdGlvbjk5MTk=",
"avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4",
"gravatar_id": "",
"url": "https://api.github.com/users/github",
"html_url": "https://github.com/github",
"followers_url": "https://api.github.com/users/github/followers",
"following_url": "https://api.github.com/users/github/following{/other_user}",
"gists_url": "https://api.github.com/users/github/gists{/gist_id}",
"starred_url": "https://api.github.com/users/github/starred{/owner}{/repo}",
"subscriptions_url": "https://api.github.com/users/github/subscriptions",
"organizations_url": "https://api.github.com/users/github/orgs",
"repos_url": "https://api.github.com/users/github/repos",
"events_url": "https://api.github.com/users/github/events{/privacy}",
"received_events_url": "https://api.github.com/users/github/received_events",
"type": "Organization",
"user_view_type": "public",
"site_admin": false
},
"name": "GitHub Actions",
"description": "Automate your workflow from idea to production",
"external_url": "https://help.github.com/en/actions",
"html_url": "https://github.com/apps/github-actions",
"created_at": "2018-07-30T09:30:17Z",
"updated_at": "2026-06-18T16:17:48Z",
"permissions": {
"actions": "write",
"administration": "read",
"artifact_metadata": "write",
"attestations": "write",
"checks": "write",
"code_quality": "write",
"contents": "write",
"copilot_requests": "write",
"deployments": "write",
"discussions": "write",
"drives": "write",
"issues": "write",
"merge_queues": "write",
"metadata": "read",
"models": "read",
"packages": "write",
"pages": "write",
"pull_requests": "write",
"repository_hooks": "write",
"repository_projects": "write",
"security_events": "write",
"statuses": "write",
"vulnerability_alerts": "read"
},
"events": [
"branch_protection_rule",
"check_run",
"check_suite",
"create",
"delete",
"deployment",
"deployment_status",
"discussion",
"discussion_comment",
"fork",
"gollum",
"issues",
"issue_comment",
"label",
"merge_group",
"milestone",
"page_build",
"public",
"pull_request",
"pull_request_review",
"pull_request_review_comment",
"push",
"registry_package",
"release",
"repository",
"repository_dispatch",
"status",
"watch",
"workflow_dispatch",
"workflow_run"
]
},
"pull_requests": [
{
"url": "https://api.github.com/repos/RexiAI/rexiAI/pulls/16",
"id": 4368798504,
"number": 16,
"head": {
"ref": "spec/001-landing-booking",
"sha": "50c83af500bea4693b5bde838387aa7fe3c40f65",
"repo": {
"id": 1344981252,
"url": "https://api.github.com/repos/RexiAI/rexiAI",
"name": "rexiAI"
}
},
"base": {
"ref": "main",
"sha": "2a312b2a6651a13bc8faf7bb21dd3f4633f072e4",
"repo": {
"id": 1344981252,
"url": "https://api.github.com/repos/RexiAI/rexiAI",
"name": "rexiAI"
}
}
}
]
},
{
"id": 98512339173,
"name": "frontend-ci / Unit Tests",
"node_id": "CR_kwDOUCrJBM8AAAAW78sA5Q",
"head_sha": "50c83af500bea4693b5bde838387aa7fe3c40f65",
"external_id": "1385f93f-90d2-50bf-983f-4cb4ebf31e7a",
"url": "https://api.github.com/repos/RexiAI/rexiAI/check-runs/98512339173",
"html_url": "https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339173",
"details_url": "https://github.com/RexiAI/rexiAI/actions/runs/33070831632/job/98512339173",
"status": "completed",
"conclusion": "success",
"started_at": "2026-08-27T12:13:07Z",
"completed_at": "2026-08-27T12:13:30Z",
"output": {
"title": null,
"summary": null,
"text": null,
"annotations_count": 1,
"annotations_url": "https://api.github.com/repos/RexiAI/rexiAI/check-runs/98512339173/annotations"
},
"check_suite": {
"id": 89601957468
},
"app": {
"id": 15368,
"client_id": "Iv1.05c79e9ad1f6bdfa",
"slug": "github-actions",
"node_id": "MDM6QXBwMTUzNjg=",
"owner": {
"login": "github",
"id": 9919,
"node_id": "MDEyOk9yZ2FuaXphdGlvbjk5MTk=",
"avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4",
"gravatar_id": "",
"url": "https://api.github.com/users/github",
"html_url": "https://github.com/github",
"followers_url": "https://api.github.com/users/github/followers",
"following_url": "https://api.github.com/users/github/following{/other_user}",
"gists_url": "https://api.github.com/users/github/gists{/gist_id}",
"starred_url": "https://api.github.com/users/github/starred{/owner}{/repo}",
"subscriptions_url": "https://api.github.com/users/github/subscriptions",
"organizations_url": "https://api.github.com/users/github/orgs",
"repos_url": "https://api.github.com/users/github/repos",
"events_url": "https://api.github.com/users/github/events{/privacy}",
"received_events_url": "https://api.github.com/users/github/received_events",
"type": "Organization",
"user_view_type": "public",
"site_admin": false
},
"name": "GitHub Actions",
"description": "Automate your workflow from idea to production",
"external_url": "https://help.github.com/en/actions",
"html_url": "https://github.com/apps/github-actions",
"created_at": "2018-07-30T09:30:17Z",
"updated_at": "2026-06-18T16:17:48Z",
"permissions": {
"actions": "write",
"administration": "read",
"artifact_metadata": "write",
"attestations": "write",
"checks": "write",
"code_quality": "write",
"contents": "write",
"copilot_requests": "write",
"deployments": "write",
"discussions": "write",
"drives": "write",
"issues": "write",
"merge_queues": "write",
"metadata": "read",
"models": "read",
"packages": "write",
"pages": "write",
"pull_requests": "write",
"repository_hooks": "write",
"repository_projects": "write",
"security_events": "write",
"statuses": "write",
"vulnerability_alerts": "read"
},
"events": [
"branch_protection_rule",
"check_run",
"check_suite",
"create",
"delete",
"deployment",
"deployment_status",
"discussion",
"discussion_comment",
"fork",
"gollum",
"issues",
"issue_comment",
"label",
"merge_group",
"milestone",
"page_build",
"public",
"pull_request",
"pull_request_review",
"pull_request_review_comment",
"push",
"registry_package",
"release",
"repository",
"repository_dispatch",
"status",
"watch",
"workflow_dispatch",
"workflow_run"
]
},
"pull_requests": [
{
"url": "https://api.github.com/repos/RexiAI/rexiAI/pulls/16",
"id": 4368798504,
"number": 16,
"head": {
"ref": "spec/001-landing-booking",
"sha": "50c83af500bea4693b5bde838387aa7fe3c40f65",
"repo": {
"id": 1344981252,
"url": "https://api.github.com/repos/RexiAI/rexiAI",
"name": "rexiAI"
}
},
"base": {
"ref": "main",
"sha": "2a312b2a6651a13bc8faf7bb21dd3f4633f072e4",
"repo": {
"id": 1344981252,
"url": "https://api.github.com/repos/RexiAI/rexiAI",
"name": "rexiAI"
}
}
}
]
}
]
}

## Evidence: failing check annotations (Lint & Format)

command: gh api repos/RexiAI/rexiAI/check-runs/98512339290/annotations
exit: 0
at: 2026-08-27T12:16:00Z

12 annotations: 1 failure (exit code 1 at .github line 35) + 10 warnings @typescript-eslint/no-explicit-any + 1 warning Node.js 20 deprecated. Verbatim first 3 annotation messages: "Process completed with exit code 1." / "Unexpected any. Specify a different type" / "Node.js 20 is deprecated..."

## Evidence: failing job logs (tail -c 6000)

command: gh run view 33070831632 --log-failed | tail -c 6000
exit: 0
at: 2026-08-27T12:16:05Z

```
Format	UNKNOWN STEP	2026-08-27T12:13:22.5573846Z [^[[33mwarn^[[39m] api/stripe-webhook.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.5686638Z [^[[33mwarn^[[39m] config/availability.yaml
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.7769818Z [^[[33mwarn^[[39m] docs/changes/001-landing-booking.md
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.8462242Z [^[[33mwarn^[[39m] src/__tests__/AC-001-i18n.test.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.8590566Z [^[[33mwarn^[[39m] src/__tests__/AC-002-landing-content.test.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.9034304Z [^[[33mwarn^[[39m] src/__tests__/AC-005-free-hour.test.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.9493414Z [^[[33mwarn^[[39m] src/__tests__/AC-007-bookings.test.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.9841173Z [^[[33mwarn^[[39m] src/__tests__/AC-008-webhook.test.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:22.9955288Z [^[[33mwarn^[[39m] src/__tests__/AC-009-gcal-event.test.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.0043942Z [^[[33mwarn^[[39m] src/__tests__/AC-010-email.test.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.0218775Z [^[[33mwarn^[[39m] src/__tests__/AC-011-booking-ui.test.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.0301648Z [^[[33mwarn^[[39m] src/__tests__/AC-012-result-views.test.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.0957111Z [^[[33mwarn^[[39m] src/App.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1296937Z [^[[33mwarn^[[39m] src/components/BookingWidget.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1371520Z [^[[33mwarn^[[39m] src/components/LanguageSwitcher.tsx
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1537867Z [^[[33mwarn^[[39m] src/domain/availability.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1615228Z [^[[33mwarn^[[39m] src/domain/email.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1702926Z [^[[33mwarn^[[39m] src/domain/freeHour.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1833144Z [^[[33mwarn^[[39m] src/domain/gcal.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.1962196Z [^[[33mwarn^[[39m] src/domain/pricing.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2121496Z [^[[33mwarn^[[39m] src/domain/time.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2264345Z [^[[33mwarn^[[39m] src/i18n/dictionary.ts
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2566248Z [^[[33mwarn^[[39m] Code style issues found in 24 files. Run Prettier with --write to fix.
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2803717Z ##[error]Process completed with exit code 1.
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2902861Z Node 20 is being deprecated. This workflow is running with Node 24 by default. If you need to temporarily use Node 20, you can set the ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true environment variable. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.2903947Z Post job cleanup.
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3592423Z [command]/usr/bin/git version
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3635474Z git version 2.55.0
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3663469Z Temporarily overriding HOME='/home/runner/work/_temp/9e8ef0c9-9d17-4897-8576-7c4aa80da6f1' before making global git config changes
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3664672Z Adding repository directory to the temporary git global config as a safe directory
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3667388Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/rexiAI/rexiAI
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3697790Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3727274Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3962761Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3985485Z http.https://github.com/.extraheader
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.3993983Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.4026373Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.4231517Z [command]/usr/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.4264246Z [command]/usr/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.4588466Z Cleaning up orphan processes
frontend-ci / Lint & Format	UNKNOWN STEP	2026-08-27T12:13:23.4817863Z ##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/

```

## Post-PR CI check — Round 3 (phase 2, attempt 3)

**Date:** 2026-08-27
**PR:** https://github.com/RexiAI/rexiAI/pull/16
**Branch:** spec/001-landing-booking
**Head SHA:** 5fe89b2a7be6e13180630a65e5e35123738e8233
**Run:** https://github.com/RexiAI/rexiAI/actions/runs/33071499963
**Mode:** post-PR CI re-check per .standards/docs/SPEC_PIPELINE.md §Post-PR CI check-and-remediate loop
**Loop budget:** SPEC_LOOP_COUNT=3, SPEC_PHASE1_RETRIES=0, SPEC_PHASE2_RETRIES=2 — phase-2 round 2 re-check after fix push (previous run 33070831632 failed Lint & Format prettier 24 files, new head 5fe89b2 after commit 5fe89b2)
**Trigger:** fix commit 5fe89b2a7be6e13180630a65e5e35123738e8233 (after 50c83af) — Prettier format fix
**Verdict:** PASS — 0 checks in `fail` bucket, all non-skipped checks pass

Bounded poll: 10s interval, up to ~5 min. Initial poll at 2026-08-27T12:23:29Z showed Vercel `pending`; terminal at 2026-08-27T12:25:54Z with all buckets `pass`/`skipping` (no `pending`). Vercel flipped pending→pass between polls; CI already terminal `pass`.

### Per-check table (terminal, bucket is parse rule)

| Check                             | Bucket   | State   | Workflow | Link                                                                                 |
| --------------------------------- | -------- | ------- | -------- | ------------------------------------------------------------------------------------ |
| Vercel Preview Comments           | pass     | SUCCESS | —        | https://vercel.com/github                                                            |
| frontend-ci / Build               | pass     | SUCCESS | CI       | https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514760023            |
| frontend-ci / Docker Build & Push | skipping | SKIPPED | CI       | https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514898130            |
| frontend-ci / Unit Tests          | pass     | SUCCESS | CI       | https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514641635            |
| frontend-ci / Lint & Format       | pass     | SUCCESS | CI       | https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514641937            |
| Vercel                            | pass     | SUCCESS | CI       | https://vercel.com/danielbueno76-4270s-projects/rexi-ai/2EdtjbYJzxQa9BYMcPWLxnSkNPWJ |

`skipping` is not `fail` (conditional workflow jobs skipped). Only `fail` bucket counts as FAIL. Zero FAIL → overall PASS.

**Build anomaly check:** Build was `skipping` in Round 2 because Lint & Format failed (workflow `needs: lint` gating). After Lint passes in Round 3, Build is `pass` (SUCCESS) — expected. No anomaly. Docker Build & Push remains `skipping` on non-main branch — expected per workflow condition, not a failure. Criteria met: Vercel pass + frontend-ci Lint & Format pass + Unit Tests pass + Build pass (Docker skipping acceptable).

### Failing check IDs

No failing checks. All non-skipped checks pass.

Source: `gh api repos/RexiAI/rexiAI/commits/5fe89b2a7be6e13180630a65e5e35123738e8233/check-runs` (conclusion == failure → 0 results)

| Check | ID  | Conclusion |
| ----- | --- | ---------- |
| —     | —   | —          |

### Evidence: Post-PR CI — Round 3 poll to terminal

## Evidence: post-PR CI check Round 3 — poll 1 (Vercel pending)

command: gh pr checks 16 --json name,state,bucket,workflow,link
exit: 0
at: 2026-08-27T12:23:29Z

[{"bucket":"skipping","link":"https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514898130","name":"frontend-ci / Docker Build & Push","state":"SKIPPED","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514760023","name":"frontend-ci / Build","state":"SUCCESS","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514641635","name":"frontend-ci / Unit Tests","state":"SUCCESS","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514641937","name":"frontend-ci / Lint & Format","state":"SUCCESS","workflow":"CI"},{"bucket":"pass","link":"https://vercel.com/github","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},{"bucket":"pending","link":"https://vercel.com/danielbueno76-4270s-projects/rexi-ai/2EdtjbYJzxQa9BYMcPWLxnSkNPWJ","name":"Vercel","state":"PENDING","workflow":""}]

## Evidence: post-PR CI check Round 3 — terminal (all pass)

command: gh pr checks 16 --json name,state,bucket,workflow,link
exit: 0
at: 2026-08-27T12:25:54Z

[{"bucket":"pass","link":"https://vercel.com/github","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},{"bucket":"skipping","link":"https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514898130","name":"frontend-ci / Docker Build & Push","state":"SKIPPED","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514760023","name":"frontend-ci / Build","state":"SUCCESS","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514641635","name":"frontend-ci / Unit Tests","state":"SUCCESS","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/33071499963/job/98514641937","name":"frontend-ci / Lint & Format","state":"SUCCESS","workflow":"CI"},{"bucket":"pass","link":"https://vercel.com/danielbueno76-4270s-projects/rexi-ai/2EdtjbYJzxQa9BYMcPWLxnSkNPWJ","name":"Vercel","state":"SUCCESS","workflow":""}]

## Evidence: check-runs for head SHA 5fe89b2a7be6e13180630a65e5e35123738e8233

command: gh api repos/RexiAI/rexiAI/commits/5fe89b2a7be6e13180630a65e5e35123738e8233/check-runs
exit: 0
at: 2026-08-27T12:25:54Z

{
"total_count": 5,
"check_runs": [
{
"id": 98515101318,
"name": "Vercel Preview Comments",
"head_sha": "5fe89b2a7be6e13180630a65e5e35123738e8233",
"conclusion": "success",
"status": "completed"
},
{
"id": 98514898130,
"name": "frontend-ci / Docker Build & Push",
"head_sha": "5fe89b2a7be6e13180630a65e5e35123738e8233",
"conclusion": "skipped",
"status": "completed"
},
{
"id": 98514760023,
"name": "frontend-ci / Build",
"head_sha": "5fe89b2a7be6e13180630a65e5e35123738e8233",
"conclusion": "success",
"status": "completed"
},
{
"id": 98514641937,
"name": "frontend-ci / Lint & Format",
"head_sha": "5fe89b2a7be6e13180630a65e5e35123738e8233",
"conclusion": "success",
"status": "completed"
},
{
"id": 98514641635,
"name": "frontend-ci / Unit Tests",
"head_sha": "5fe89b2a7be6e13180630a65e5e35123738e8233",
"conclusion": "success",
"status": "completed"
}
]
}

## Evidence: CI run view (head 5fe89b2)

command: gh run view 33071499963 --json conclusion,status,headSha,workflowName,displayTitle
exit: 0
at: 2026-08-27T12:26:02Z

{
"conclusion": "success",
"displayTitle": "feat(001-landing-booking): landing with i18n, availability, pricing, booking and deployment wiring",
"headSha": "5fe89b2a7be6e13180630a65e5e35123738e8233",
"status": "completed",
"workflowName": "CI"
}
