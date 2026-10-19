# 002-no-stripe-when-billing-disabled

> Spec pipeline archive. Original source: `specs/002-no-stripe-when-billing-disabled/` (deleted by this script).
> Archived: 2026-10-19

## Original ask

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

## Tasks

# 10-tasks.md — Spec 002: No Stripe when billing is disabled (+ env/docs cleanup)

Stage 1 artifact. Input: `00-informal.md`. Scenarios: `20-acceptance/AC-002-*.md`.
The Coder implements from this file + the scenario files only.

## Global context (facts the Coder needs)

**Stack.** TypeScript monorepo-ish layout: React SPA in `src/`, Vercel serverless
handlers in `api/`, domain logic in `src/domain/`, Vitest tests in
`src/__tests__/` (jsdom for component/hook tests). No test framework changes.

**Billing kill-switch.** `src/domain/billing.ts` → `isBillingEnabled(): boolean`.
Fail-safe semantics (DO NOT modify this module): returns `false` only when
`process.env['BILLING_ENABLED']?.trim().toLowerCase() === 'false'`; unset, empty,
typo'd, or any other value ⇒ `true` (billing enabled).

**Current booking flow** (`api/bookings.ts` handler, in order):

1. `isPostMethod` → 405 `METHOD_NOT_ALLOWED`
2. `enforceRateLimit` (in-memory per-process, `BOOKING_RATE_LIMIT` default 10 per
   `BOOKING_RATE_WINDOW_MIN` default 10, keyed on first `x-forwarded-for` hop) →
   429 `RATE_LIMITED` + `Retry-After`
3. `prepareBookingInput` (`api/bookings/validation.ts`) → 400 (`INVALID_EMAIL`,
   `INVALID_DATE`, `PAST_DATE`, `INVALID_TIME`, `INVALID_DURATION` via
   `priceCents(hours, true)` in `src/domain/pricing.ts` — a pure function, no
   Stripe — plus `SLOT_UNAVAILABLE` against `config/availability.yaml`)
4. `checkSlotConflict` (`api/bookings/calendar.ts` → `hasConflict`, which uses the
   `src/domain/calendar.ts` facade and returns `false` on calendar outage) → 409
   `SLOT_CONFLICT`
5. `resolveMeeting` (`src/domain/meeting.ts` → `createMeetingLink`, Jitsi room,
   Stripe-free) → 502 `MEETING_ERROR` on failure
6. second `checkSlotConflict` → 409
7. `reserve` → `createCheckout` (`api/bookings/checkout.ts`): `isFreeHourAvailable`
   (Stripe `customers.list` via `src/domain/freeHour.ts`) → duration re-validation
   → `stripe.checkout.sessions.create` (€0 reservation session) → 200
   `{ checkoutUrl, joinUrl }`.

**Webhook side-effect flow to mirror** (`api/stripe-webhook.ts`,
`handleNewBooking` standard-reservation branch — the direct path reproduces this
minus all Stripe steps):

1. `detectSlotConflict`: `findOverlappingBookingId({ bookingId, date, startTime,
hours })` (`src/domain/calendar.ts` facade); a thrown probe error is swallowed
   → treated as `null` (no conflict); never blocks the booking.
2. `tryCreateEvent`: `createCalendarEvent({ provider: getCalendarProvider(),
timezone, bookingId, email, date, startTime, hours, joinUrl })`; timezone
   resolution order: `AVAILABILITY_TIMEZONE` → `TIMEZONE` → `'Europe/Madrid'`;
   failure → 500 `GCAL_ERROR`, abort before any email.
3. `trySendEmail`: `sendOperatorEmail({ clientEmail, date, startTime, hours,
amountCents: 0, joinUrl, kind: 'reservation', slotConflictWith? })`
   (`src/domain/email.ts`; `slotConflictWith` only passed when step 1 found a
   different bookingId); failure → 500 `EMAIL_ERROR`, abort before client email,
   NO rollback of the calendar event (webhook parity).
4. `trySendClientEmail`: `sendClientEmail({ clientEmail, date, startTime, hours,
joinUrl })`; failure → `console.error` log + swallow (booking still succeeds).

**Frontend.** `src/components/booking/hooks/useBookingSubmit.ts` POSTs
`/api/bookings` and today only handles `if (url) window.location.href = url` or
error. Form/UI state lives in `useBookingFields.ts`; `BookingWidget.tsx` →
`BookingLayout.tsx` render the form. i18n: `src/i18n/dictionary.ts` exports `es`
and `en`; `type Dictionary = typeof es` plus the `en as unknown as Dictionary`
assignment enforce key parity at compile time. Locale is read from
`localStorage['rexi-locale']`, default `'es'` (`src/i18n/I18nContext.tsx`).
`useBookingSubmit(fields, dict)` receives the dictionary directly, so hook-level
tests need no JSX/provider.

**Test conventions.**

- Scenario IDs are cited verbatim in test names: `it("AC-002-05: …")`.
- `scripts/check-scenario-traceability.sh` scans only `*.test.ts` / `*.spec.ts`
  (NOT `.tsx`). Every AC-002-NN ID below must be cited by at least one `*.test.ts`
  file. Component-render checks may live in additional `.tsx` tests citing the
  same IDs, but the `.ts` citation is what the gate sees.
- Handler-test pattern to copy: `src/__tests__/AC-007-bookings.test.ts` (mocks
  the `stripe` module, partial-mocks `api/bookings/calendar` `hasConflict`, spies
  `fs.readFileSync` to return an availability YAML with `monday 09:00-13:00`,
  books `2027-03-01` (a Monday) at `10:00`) and `src/__tests__/billing-free-mode.test.tsx`
  (env save/restore discipline, mocked `stripeClient`). For task 1 additionally
  `vi.mock` `src/domain/calendar` and `src/domain/email`.
- Rate limit is per-process in-memory: a test file issuing many POSTs will hit
  429 after 10. Set `BOOKING_RATE_LIMIT=1000` (restore after) or vary
  `x-forwarded-for` per request.
- Restore every `process.env` key touched (`BILLING_ENABLED`,
  `STRIPE_SECRET_KEY`, `AVAILABILITY_TIMEZONE`, `BOOKING_RATE_LIMIT`, …).

**Scenario-ID numbering (hard constraint).** This spec's scenarios start at
`AC-002-05`. IDs `AC-002-01..04` are historically owned by archived spec 001
(`docs/changes/001-landing-booking.md`, per-task numbering) and cited by
`src/__tests__/AC-002-landing-content.test.tsx`. Do not reuse, renumber, or edit
that file.

**Global constraints (all tasks).**

- No new npm dependencies. Cyclomatic complexity ≤6 per function.
- Do not modify: `src/domain/billing.ts`, `api/stripe-webhook.ts` behavior,
  `api/bookings/recorded-billing.ts`, `src/domain/providers.ts`, and any existing
  test file (`AC-011/013/014/016/018`, `billing-free-mode`, …). The full existing
  suite must stay green unmodified.
- Never touch local `.env` / `.env.local` (gitignored).
- Security: 500 responses on the direct path go to a browser, so they carry
  STATIC messages only — never upstream error text (`errMsg(e)` stays server-side
  via `console.error`). Note this deliberately differs from the webhook, whose
  responses go to Stripe. Client/operator email HTML continues to be built
  exclusively inside `src/domain/email.ts` (its `escapeHtml` discipline must not
  be bypassed by new HTML assembly elsewhere).

---

## Task 1 — Backend: direct booking when billing is disabled

Create `api/bookings/direct.ts` exporting one entry point (suggested:
`createDirectBooking(input, joinUrl, res)`; internal decomposition is the Coder's
call within the complexity budget) and branch in the `api/bookings.ts` handler
AFTER the second `checkSlotConflict` and INSTEAD OF `reserve`/`createCheckout`:

```ts
if (!isBillingEnabled()) return finishDirectBooking(...)   // new
const checkout = await reserve(...)                        // unchanged
```

Acceptance criteria:

- Preflight order and status semantics (405/429/400/409/502/409) are unchanged;
  the branch runs only after both conflict checks pass and the meeting link exists.
- The disabled path makes ZERO Stripe calls: `getStripe`,
  `checkout.sessions.create`, `customers.list`, `isFreeHourAvailable`,
  `markFreeHourUsed` are never invoked, and the request succeeds even with
  `STRIPE_SECRET_KEY` unset from `process.env`.
- A `bookingId` is generated server-side per request: a unique non-empty string
  (suggested `crypto.randomUUID()`). The SAME id is passed to
  `findOverlappingBookingId` and `createCalendarEvent`. It is not returned to the
  client and requires no dedup/idempotency machinery (single synchronous request;
  nothing retries it).
- Side effects run synchronously in the handler, in webhook order: overlap probe →
  `createCalendarEvent` (provider `getCalendarProvider()`, timezone
  `AVAILABILITY_TIMEZONE` → `TIMEZONE` → `'Europe/Madrid'`, plus
  `bookingId/email/date/startTime/hours/joinUrl`) → `sendOperatorEmail`
  (`clientEmail/date/startTime/hours`, `amountCents: 0`, `joinUrl`,
  `kind: 'reservation'`, `slotConflictWith` only when the probe found a different
  bookingId) → `sendClientEmail` (`clientEmail/date/startTime/hours/joinUrl`).
- Error policy (webhook parity, static client messages):
  probe failure → swallow (no conflict); calendar failure → 500 `GCAL_ERROR`, no
  emails sent; operator-email failure → 500 `EMAIL_ERROR`, client email skipped,
  calendar event NOT rolled back; client-email failure → `console.error` + swallow,
  response still 200. Every 500 body message is a static string that excludes the
  thrown error's text; the full error is logged server-side.
- Success response: `200` with body EXACTLY
  `{ checkoutUrl: null, joinUrl: <meeting join URL string>, billingDisabled: true }`.
- Duration validation on the disabled path relies on the preflight validator
  (`priceCents(hours, true)` inside `prepareBookingInput`, a pure function);
  invalid durations (e.g. `hours = 5`) yield 400 `INVALID_DURATION` with zero
  Stripe calls and zero side effects. No `isFreeHourAvailable` answer is needed.
- Enabled path (`BILLING_ENABLED` unset / `'true'` / anything but exact `false`):
  byte-for-byte unchanged behavior — €0 `sessions.create`, response
  `{ checkoutUrl, joinUrl }` with NO `billingDisabled` key, and none of the direct
  side-effect functions called from the handler (side effects remain
  webhook-driven). `isBillingEnabled()` is consulted per request (no caching).

Scenarios: `20-acceptance/AC-002-direct-booking.md` (AC-002-05 … AC-002-15).

## Task 2 — Frontend: confirmation state when billingDisabled

Touch: `useBookingSubmit.ts`, the state holder it writes to (`useBookingFields.ts`
or equivalent), the render path (`BookingLayout.tsx` / `BookingWidget.tsx`), and
`src/i18n/dictionary.ts` (both locales).

Acceptance criteria:

- `BookingResponse` type becomes
  `{ error?: { message?: string }; checkoutUrl?: string | null; billingDisabled?:
boolean; joinUrl?: string }`.
- On `res.ok` with `data.billingDisabled === true` (and thus `checkoutUrl` null):
  NO navigation happens (`window.location.href` untouched); a confirmation state
  `{ date, startTime, joinUrl }` is set from the submitted field values and the
  response's `joinUrl`.
- When the confirmation state is non-null, a confirmation panel renders INSTEAD
  OF the booking form (inline in the widget; no route change, no
  `/booking/success` navigation — that page assumes a Stripe return and cannot
  show the join link). Panel shows: title from the dictionary, the booked date
  value, the booked startTime value, and — when `joinUrl` is present — an
  `<a>` with `href={joinUrl}` labeled from the dictionary.
- New dictionary section `booking.confirmation` with at least keys `title` and
  `joinLink`, defined for BOTH `es` and `en` (the existing `Dictionary` type
  check enforces parity). Every user-facing string in the new UI comes from the
  active dictionary; no hardcoded literals in components.
- Enabled path unchanged: a truthy `checkoutUrl` still assigns
  `window.location.href` (existing test `AC-011-04` must pass unmodified — that
  is the regression guard for "redirect still happens"; no duplicate AC-002
  scenario for it). Error handling (409 → `conflictError`, non-ok → message,
  network throw → generic error) unchanged.
- Tests: hook-level behavior (submit → confirmation state set, no redirect) and
  dictionary-content assertions in a `*.test.ts` file citing AC-002-16/17;
  supplementary `.tsx` render tests may cite the same IDs.

Scenarios: `20-acceptance/AC-002-frontend-confirmation.md` (AC-002-16 … AC-002-17).

## Task 3 — Repo cleanup: `.env.example` + `docs/microsoft-cutover.md`

Scope: ONLY `.env.example` and `docs/microsoft-cutover.md`. Rationale: Vercel
production already dropped the dead vars; `src/domain/providers.ts` hardcodes
`getCalendarProvider() → 'microsoft'` and `getEmailProvider() → 'gmail'`, and no
code reads `EMAIL_PROVIDER` or `CALENDAR_PROVIDER` (only tests manipulate them
via `process.env`, which is independent of `.env.example`).

Acceptance criteria:

- `.env.example`: remove the `EMAIL_PROVIDER` and `CALENDAR_PROVIDER` assignment
  lines and their now-dead `# Providers` comment block. Do NOT remove any other
  entry — explicitly kept: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`, `MICROSOFT_CLIENT_ID`,
  `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REFRESH_TOKEN`, `AVAILABILITY_TIMEZONE`,
  `AVAILABILITY_HOURS`, `AVAILABILITY_DAYS`, `RECORDED_BILLING_TOKEN`,
  `BILLING_ENABLED`, `BOOKING_RATE_LIMIT`, `BOOKING_RATE_WINDOW_MIN`, and the
  `MEETING_BASE_URL` guidance comment.
- **AC-013-02 constraint (hard):** the seven variables required by
  `src/__tests__/AC-013-deployment-config.test.ts` — `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_REFRESH_TOKEN`,
  `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO` — must all remain present, and no
  secret-looking values (`sk_test_`, `whsec_`, `sk_live`) may appear. That test
  must pass unmodified.
- `.env.example` EMAIL_FROM guidance: the target sender is `info@rexi-ai.com`
  (verified Resend domain, GoDaddy mailbox); remove the `hola@rexi-ai.com`
  example.
- `docs/microsoft-cutover.md`: drop or explicitly annotate as removed/ignored the
  `EMAIL_PROVIDER=gmail` references (Account-split table row and section 4 env
  block) and the `CALENDAR_PROVIDER=microsoft` line in the section 4 env block;
  no line may present either as live configuration. Live vars in that block
  (`MICROSOFT_CLIENT_ID`, `MICROSOFT_REFRESH_TOKEN`, `MEETING_BASE_URL`,
  `EMAIL_FROM=info@rexi-ai.com`, `EMAIL_TO`) stay documented.
- Do not touch `.env` / `.env.local`. Do not edit tests AC-014/016/018 — they
  assert tolerance of a stale `EMAIL_PROVIDER` process-env value and must stay
  green with their original intent.

Scenarios: `20-acceptance/AC-002-env-docs-cleanup.md` (AC-002-18 … AC-002-19).

---

## Documented decisions (resolved by the Specifier, not open)

1. **Scenario IDs start at AC-002-05** — 01..04 collide with archived spec 001
   (see Global context).
2. **No calendar rollback on operator-email failure** — mirrors the webhook
   (`tryCreateEvent` success is not undone when `trySendEmail` 500s). The direct
   path has no retry loop, so the operator sees a 500-worthy failure only in
   server logs + the client's error state; accepted as webhook parity.
3. **Inline confirmation panel, not `/booking/success`** — the informal spec
   delegated this call; the success route assumes a Stripe return and cannot
   display `joinUrl`.
4. **`bookingId` is an opaque server-generated id, not exposed in the response** —
   the response shape is fixed at the three named keys.
5. **Static 500 messages on the direct path** — required by the informal spec's
   "no upstream error bodies to the client"; a deliberate, documented divergence
   from the webhook's `errMsg(e)` bodies (which only Stripe reads).
6. **Task 1 carries 11 scenarios (AC-002-05 … AC-002-15), shifting tasks 2/3 to
   AC-002-16…17 and AC-002-18…19** — the timezone-resolution chain
   (`AVAILABILITY_TIMEZONE` → `TIMEZONE` → `'Europe/Madrid'`) is new code on the
   direct path and gets its own scenario (AC-002-14) instead of being folded into
   the side-effect-order scenario; the enabled-path/no-caching scenario becomes
   AC-002-15. An earlier draft of this file pinned the ranges to 05…14/15…16/
   17…18; the ranges above are authoritative.

## Open questions (non-blocking; no answer needed before /build)

- Follow-up (out of scope here): `src/domain/bookingLookup.ts` `findReservation`
  resolves bookingIds against Stripe sessions, so a `recorded-billing` POST for a
  direct-path bookingId would 404 if billing is re-enabled after free-mode
  bookings were taken. Harmless while `BILLING_ENABLED=false` (recorded-billing
  short-circuits before Stripe), but worth a future spec if the deployment flips
  the flag back with pending direct bookings.

## Acceptance scenarios

## AC-002-05 — Direct booking succeeds with the fixed response shape and zero Stripe calls

## AC-002-06 — Side effects run synchronously in webhook order with one server-generated bookingId

## AC-002-07 — Preflight still gates the direct branch: conflict answers 409 with zero side effects

## AC-002-08 — Overlap backstop flags the operator email without blocking the booking

## AC-002-09 — Overlap probe failure is swallowed

## AC-002-10 — Calendar failure aborts with a static 500 before any email

## AC-002-11 — Operator-email failure returns a static 500, skips the client email, and does not roll back the calendar event

## AC-002-12 — Client-email failure is logged and swallowed; the booking still succeeds

## AC-002-13 — Invalid duration is rejected with zero Stripe calls and zero side effects

## AC-002-14 — Calendar timezone resolution mirrors the webhook chain

## AC-002-15 — Billing-enabled path is unchanged and the flag is consulted per request

## AC-002-16 — A billingDisabled response sets a confirmation state without navigation

## AC-002-17 — Confirmation panel replaces the form with dictionary copy in both locales

## AC-002-18 — `.env.example` drops the dead provider config and keeps every live variable

## AC-002-19 — `docs/microsoft-cutover.md` stops documenting dead provider config

## Verification

# 25-verification.md — Spec 002: no-stripe-when-billing-disabled

Stage 4 (Verifier) independent re-check of stages 2+3. Every prior green claim was
re-executed, not trusted.

- Branch: `spec/002-no-stripe-when-billing-disabled` (checked out, nothing committed or pushed)
- Attempt: **1** (first full verification run; phase 1, no remediation retries —
  `SPEC_LOOP_COUNT=1 SPEC_PHASE1_RETRIES=0 SPEC_PHASE2_RETRIES=0`)
- Verified against: `10-tasks.md`, `20-acceptance/AC-002-{direct-booking,frontend-confirmation,env-docs-cleanup}.md`, `15-design.md`.
  Information barrier honored: `00-informal.md` was NOT read.
- Scope under verification (stage 2+3 uncommitted output): new `api/bookings/direct.ts`,
  `src/components/booking/BookingConfirmation.tsx`, 4 test files
  `src/__tests__/AC-002-{direct-booking,env-docs-cleanup,frontend-confirmation,frontend-confirmation.render}.test.*`;
  modified `api/bookings.ts`, `src/components/booking/BookingLayout.tsx`,
  `src/components/booking/hooks/useBookingFields.ts`, `src/components/booking/hooks/useBookingSubmit.ts`,
  `src/i18n/dictionary.ts`, `src/components/BookingWidget.css`, `.env.example`, `docs/microsoft-cutover.md`.
- Out of scope (human-sanctioned dirty files, not verified, not reverted): `opencode.json`,
  `config/availability.yaml`, `.gitignore`.

## Verdict summary

| #   | Check                           | Command                                                                       | Exit      | Result                                                                                                                                                   |
| --- | ------------------------------- | ----------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | scenario traceability           | `bash .standards/scripts/check-scenario-traceability.sh` (+ `--json`)         | 0         | PASS — 15/15 live scenarios traced, every test reference resolves                                                                                        |
| 2   | full test suite                 | `npm test` (`vitest run --exclude '.standards/**'`)                           | 0         | PASS — 24 files / 136 tests passed, 0 skipped, 0 failed                                                                                                  |
| 3   | complexity gate                 | `npm run lint` (ESLint, complexity ≤6) + `npx tsc -b` + `npm run build`       | 0 / 0 / 0 | PASS                                                                                                                                                     |
| 4   | design-principles gate          | `bash .standards/scripts/check-code-principles.sh -BaseRef main` (+ `--json`) | 0         | PASS — 0 FAIL, 1 WARN on this spec's change (unscoped full-tree run: exit 1, sole FAIL vendored/pre-existing — ruled out-of-scope, see Adjudication (a)) |
| 5   | scenario-to-behavior spot check | manual read + targeted `npx vitest run --reporter=verbose`                    | 0         | PASS — AC-002-08 and AC-002-16 assertions genuinely enforce their Then-clauses                                                                           |
| —   | no unaccounted behavior         | (finding line, not a command)                                                 | —         | CLEAN — every diff hunk traces to a task/scenario/design directive                                                                                       |

**Overall verdict: PASS** (Architect / stage 5a may proceed).

## Evidence: scenario traceability

command: bash .standards/scripts/check-scenario-traceability.sh
exit: 0
at: 2026-10-19T11:33:59Z

```
Scenario IDs found: 15 live, 69 archived

PASS AC-002-05 — traced to a test
PASS AC-002-06 — traced to a test
PASS AC-002-07 — traced to a test
PASS AC-002-08 — traced to a test
PASS AC-002-09 — traced to a test
PASS AC-002-10 — traced to a test
PASS AC-002-11 — traced to a test
PASS AC-002-12 — traced to a test
PASS AC-002-13 — traced to a test
PASS AC-002-14 — traced to a test
PASS AC-002-15 — traced to a test
PASS AC-002-16 — traced to a test
PASS AC-002-17 — traced to a test
PASS AC-002-18 — traced to a test
PASS AC-002-19 — traced to a test


✔ Scenario traceability check: every scenario traced, every reference resolves.
```

Machine-readable transcript (`--json`):

command: bash .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-10-19T11:34:18Z

```json
{
  "checks": [1, 2],
  "passes": [
    "AC-002-05 — traced to a test",
    "AC-002-06 — traced to a test",
    "AC-002-07 — traced to a test",
    "AC-002-08 — traced to a test",
    "AC-002-09 — traced to a test",
    "AC-002-10 — traced to a test",
    "AC-002-11 — traced to a test",
    "AC-002-12 — traced to a test",
    "AC-002-13 — traced to a test",
    "AC-002-14 — traced to a test",
    "AC-002-15 — traced to a test",
    "AC-002-16 — traced to a test",
    "AC-002-17 — traced to a test",
    "AC-002-18 — traced to a test",
    "AC-002-19 — traced to a test"
  ],
  "fails": []
}
```

Both checks (1 = scenario-to-test, 2 = reference-to-scenario) ran; `fails` is empty.
The 15 live AC-002-05…19 IDs are each cited by a `*.test.ts` file (the .tsx render
test cites AC-002-17 supplementarily; the gate-visible citation is the .ts file,
per 10-tasks §Test conventions).

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-19T11:35:21Z

```

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'


 RUN  v5.0.1 /home/dbueno/projects/rexiAI


 Test Files  24 passed (24)
      Tests  136 passed (136)
   Start at  13:35:16
   Duration  5.21s (environment 64%, tests 17%, transform 8%, setup 6%, import 4%, worker 1%)

Environment  jsdom was created 24 times · 29.48s total, 64% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

```

No test file skipped, no test skipped/todo/disabled: the summary reports `24 passed (24)`
files and `136 passed (136)` tests with no skipped/failed buckets. File count reconciles
exactly with `src/__tests__/` (24 files: AC-001, 4x AC-002 new, AC-002-landing-content,
AC-003…AC-018, billing-free-mode, brand-home-link) — the 4 new AC-002 files all ran
(confirmed individually in the spot-check verbose run below). Prior claim "exit 0,
24 files / 136 tests" independently reproduced.

## Evidence: complexity gate

command: npm run lint
exit: 0
at: 2026-10-19T11:35:45Z

```

> rexiai-website@0.0.0 lint
> eslint .

```

ESLint (`eslint .`, includes `complexity ≤6` rule) — zero findings on the whole repo,
so the Refactorer's complexity claim holds under the real linter for every changed file.

command: npx tsc -b
exit: 0
at: 2026-10-19T11:36:17Z

(no output — clean compile; dictionary es/en parity is a compile-time gate via
`type Dictionary = typeof es` and passed)

command: npm run build
exit: 0
at: 2026-10-19T11:36:21Z

```

> rexiai-website@0.0.0 build
> tsc -b && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 43 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:  0.28 kB
dist/assets/index-DUJBfjP1.css   12.07 kB │ gzip:  2.57 kB
dist/assets/index-DBEBDBHh.js   242.12 kB │ gzip: 75.60 kB

✓ built in 154ms
```

## Evidence: design-principles gate

Authoritative run for this pipeline: blame-scoped to the change under verification
(`-BaseRef main` — the script's own documented "judge only the change" mode: only files
present in the worktree-vs-main diff are evaluated, untracked files count as fully
diff-introduced; per the Verifier contract the gate runs "against the changed files").

command: bash .standards/scripts/check-code-principles.sh -BaseRef main
exit: 0
at: 2026-10-19T11:38:48Z

```
Checking design principles in: . (tier: mvp)

PASS Complexity/KISS (java): no violations found

--- DRY ---
WARN Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:13): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {

--- YAGNI ---
PASS YAGNI (go): no premature abstractions detected
PASS YAGNI (node): no premature abstractions detected

--- SOLID ---
PASS SOLID-SRP (java): no oversized files
PASS SOLID-SRP (go): no oversized files
PASS SOLID-OCP (java): no large type-dispatch chains
PASS SOLID-OCP (go): no large type-dispatch chains
PASS SOLID-OCP (node): no large type-dispatch chains
PASS SOLID-LSP (java): no heavy instanceof dispatch
PASS SOLID-ISP (java): no fat interfaces
PASS SOLID-ISP (node): no fat interfaces
PASS SOLID-DIP (java): no domain→infrastructure imports
PASS SOLID-DIP (go): no domain→infrastructure imports
PASS SOLID-DIP (node): no domain→infrastructure imports
PASS SOLID-DIP (python): no domain→infrastructure imports
PASS SOLID-DIP (rust): no domain→infrastructure imports

--- Component-per-file ---
PASS Component-per-file: no violations

--- Property tests ---
Property tests: skipped (project tier is mvp — production+ required)

---------------------------------------------
✔ Design-principles check: 0 FAIL(s), 1 WARN(s).
  WARNs are review hints — verify each before merging.
```

Machine-readable transcript (`--json`):

command: bash .standards/scripts/check-code-principles.sh -BaseRef main --json
exit: 0
at: 2026-10-19T11:39:21Z

```json
{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [],
  "warns": [
    {
      "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:13): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {",
      "file": "./api/bookings.ts",
      "line": "13"
    }
  ]
}
```

0 FAIL on this spec's changed/added files. 1 WARN (review hint, flagged to the Architect,
not a stop per the Stop-and-Ask matrix): DRY — 3x identical 4-line 405-handler block,
first at `api/bookings.ts:13`. `dry` is outside the script's default blocking set
(complexity, property-tests, component-per-file), so it is warn-only by design; the
duplicated shape predates this spec (the same WARN appears in the unscoped run at the
same anchor).

## Evidence: design-principles gate (unscoped full-tree run)

Recorded for completeness and for Adjudication (a) — this is the run matching the
Refactorer's prior claim (exit 1, sole FAIL vendored, 22 WARNs). Every FAIL/WARN line
verbatim below.

command: bash .standards/scripts/check-code-principles.sh
exit: 1
at: 2026-10-19T11:37:00Z

```
Checking design principles in: . (tier: mvp)

PASS Complexity/KISS (java): no violations found
WARN Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28
WARN Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25
FAIL Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10
WARN Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41
WARN Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43
WARN Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75
WARN Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22
WARN Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79
WARN Method body >20 lines (node): ./api/bookings/recorded-billing.ts:222:244:?:KISS_LINES=24

--- DRY ---
WARN Possible duplication (9x identical 4-line block, first at ./api/bookings/checkout.ts:26): date: string /startTime: string /hours: number /email: string
WARN Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:304): startTime: string /hours: number /joinUrl?: string | null /date: string
WARN Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:138): email: string /date: string /startTime: string /bookingId: string
WARN Possible duplication (3x identical 4-line block, first at ./src/domain/microsoftGraph.ts:178): }) /if (!res.ok) { /const text = await res.text().catch(() => '') /headers: { Authorization: `Bearer ${token}` },
WARN Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: "problem", /docs: { /description: /meta: {
WARN Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:140): startTime: string /hours: number /amountTotal: number /date: string
WARN Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},
WARN Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:13): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {
WARN Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:116): .status(400) /.json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } }) /return false /res
WARN Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],

--- YAGNI ---
WARN Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30
WARN Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33
PASS YAGNI (go): no premature abstractions detected
PASS YAGNI (node): no premature abstractions detected

--- SOLID ---
PASS SOLID-SRP (java): no oversized files
PASS SOLID-SRP (go): no oversized files
WARN SRP: possible god file (node) — ./api/stripe-webhook.ts: 621 lines, 14 methods (split by responsibility)
PASS SOLID-OCP (java): no large type-dispatch chains
PASS SOLID-OCP (go): no large type-dispatch chains
PASS SOLID-OCP (node): no large type-dispatch chains
PASS SOLID-LSP (java): no heavy instanceof dispatch
WARN LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)
PASS SOLID-ISP (java): no fat interfaces
PASS SOLID-ISP (node): no fat interfaces
PASS SOLID-DIP (java): no domain→infrastructure imports
PASS SOLID-DIP (go): no domain→infrastructure imports
PASS SOLID-DIP (node): no domain→infrastructure imports
PASS SOLID-DIP (python): no domain→infrastructure imports
PASS SOLID-DIP (rust): no domain→infrastructure imports

--- Component-per-file ---
PASS Component-per-file: no violations

--- Property tests ---
Property tests: skipped (project tier is mvp — production+ required)

---------------------------------------------
✘ Design-principles check: 1 FAIL(s), 22 WARN(s).
  Reference: docs/CODING_CONVENTIONS.md §Design Principles, docs/ARCHITECTURE.md, docs/TESTING.md
```

Machine-readable transcript (`--json`), fails entry verbatim:

command: bash .standards/scripts/check-code-principles.sh --json
exit: 1
at: 2026-10-19T11:37:16Z

```json
{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [
    {
      "message": "Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10",
      "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js",
      "line": "7"
    }
  ],
  "warns": [
    {
      "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28",
      "file": "./.standards/ci/templates/go-saga-lint.go",
      "line": "45"
    },
    {
      "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25",
      "file": "./.standards/ci/templates/go-saga-lint.go",
      "line": "101"
    },
    {
      "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41",
      "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js",
      "line": "7"
    },
    {
      "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43",
      "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js",
      "line": "93"
    },
    {
      "message": "Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75",
      "file": "./src/pages/Landing.tsx",
      "line": "13"
    },
    {
      "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22",
      "file": "./src/components/ServicesCarousel.tsx",
      "line": "32"
    },
    {
      "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79",
      "file": "./src/components/ServicesCarousel.tsx",
      "line": "54"
    },
    {
      "message": "Method body >20 lines (node): ./api/bookings/recorded-billing.ts:222:244:?:KISS_LINES=24",
      "file": "./api/bookings/recorded-billing.ts",
      "line": "222"
    },
    {
      "message": "Possible duplication (9x identical 4-line block, first at ./api/bookings/checkout.ts:26): date: string /startTime: string /hours: number /email: string",
      "file": "./api/bookings/checkout.ts",
      "line": "26"
    },
    {
      "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:304): startTime: string /hours: number /joinUrl?: string | null /date: string",
      "file": "./api/stripe-webhook.ts",
      "line": "304"
    },
    {
      "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:138): email: string /date: string /startTime: string /bookingId: string",
      "file": "./api/stripe-webhook.ts",
      "line": "138"
    },
    {
      "message": "Possible duplication (3x identical 4-line block, first at ./src/domain/microsoftGraph.ts:178): }) /if (!res.ok) { /const text = await res.text().catch(() => '') /headers: { Authorization: `Bearer ${token}` },",
      "file": "./src/domain/microsoftGraph.ts",
      "line": "178"
    },
    {
      "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: \"problem\", /docs: { /description: /meta: {",
      "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js",
      "line": "115"
    },
    {
      "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:140): startTime: string /hours: number /amountTotal: number /date: string",
      "file": "./api/stripe-webhook.ts",
      "line": "140"
    },
    {
      "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},",
      "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js",
      "line": "132"
    },
    {
      "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:13): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {",
      "file": "./api/bookings.ts",
      "line": "13"
    },
    {
      "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:116): .status(400) /.json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } }) /return false /res",
      "file": "./api/stripe-webhook.ts",
      "line": "116"
    },
    {
      "message": "Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],",
      "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js",
      "line": "133"
    },
    {
      "message": "Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30",
      "file": "./.standards/ci/templates/archunit/OutboxArchRules.java",
      "line": "30"
    },
    {
      "message": "Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33",
      "file": "./.standards/ci/templates/archunit/SagaArchRules.java",
      "line": "33"
    },
    {
      "message": "SRP: possible god file (node) — ./api/stripe-webhook.ts: 621 lines, 14 methods (split by responsibility)",
      "file": "./api/stripe-webhook.ts",
      "line": ""
    },
    {
      "message": "LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)",
      "file": "./src/domain/time.ts",
      "line": ""
    }
  ]
}
```

## Adjudication (a) — does the vendored-submodule FAIL block THIS pipeline run?

**Ruling: NO — out-of-scope finding, recorded here and proposed as a follow-up for the
standards repo. This run is not blocked.** Reasoning, per the Stop-and-Ask matrix
("Out-of-scope finding → Record it (Verifier: 25-verification.md); do not fix; propose
a follow-up spec") and the evidence:

1. **The failing file is not this repo's code and is not in this spec's diff.** The sole
   FAIL is `.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90 CC=10`.
   `.standards` is a pinned git submodule (`git submodule status` →
   `3b1879050fbc295df9cdd64753e4704cca87be74 .standards (v1.7.0-119-g3b18790)`, clean —
   `git -C .standards status --short` empty). The child repo does not even track the file:
   `git ls-files --error-unmatch .standards/skills/hallmark/site/examples/cobalt-01/script.js`
   → `error: pathspec ... did not match any file(s) known to git`.
2. **It pre-exists on main and is untouched by this spec.**
   `git diff main --name-only` → 11 files, zero under `.standards/` (grep -c standards → 0).
   The submodule pointer was last moved by commit `934aa61` on main (pre-dates this branch).
3. **This pipeline cannot fix it.** The Coder/Refactorer may not edit submodule content or
   gate config ("Fix the code, never the threshold" presupposes code under verification;
   there is none here). Treating it as blocking would stop every future pipeline run in
   every child repo until the standards repo ships a fix — a defect of the vendored example,
   not of spec 002.
4. **Script-is-authority is preserved, not overridden.** The verdict is transcribed from
   the gate's exit code — from the run scoped by the script's own documented `-BaseRef`
   blame mechanism ("judge only the change ... findings in untouched files are not
   reported"), which is the invocation matching the Verifier contract's "against the
   changed files". Scoped run: exit 0, 0 FAIL. The unscoped exit 1 is transcribed verbatim
   above and its FAIL is recorded as an out-of-scope finding. No deterministic gate result
   on this spec's diff was overruled by my reading of anything.

**Follow-up (for the standards repo, not this spec):** `cobalt-01/script.js` CC=10 in
`skills/hallmark/site/examples/` — either refactor the example below the ≤6 threshold or
exclude `site/examples/` demo assets from the gate's scan; until then every whole-tree
run in every child repo exits 1 on vendored content.

## Evidence: scenario-to-behavior spot check

Scenarios checked (2 required, 4 covered): **AC-002-08** (overlap backstop) and
**AC-002-16** (confirmation state) as the primary pair, plus AC-002-17 render test and
the unmodified AC-011-04 redirect guard as supporting reads. Method: read the scenario
Given/When/Then against the test body assertion-by-assertion, then re-execute the tests.

command: npx vitest run --reporter=verbose src/**tests**/AC-002-direct-booking.test.ts src/**tests**/AC-002-frontend-confirmation.test.ts src/**tests**/AC-002-frontend-confirmation.render.test.tsx src/**tests**/AC-002-env-docs-cleanup.test.ts src/**tests**/AC-011-booking-ui.test.tsx
exit: 0
at: 2026-10-19T11:43:37Z

```
 ✓ src/__tests__/AC-002-frontend-confirmation.test.ts > AC-002 frontend confirmation state > AC-002-16: A billingDisabled response sets a confirmation state without navigation 23ms
 ✓ src/__tests__/AC-002-direct-booking.test.ts > AC-002 direct booking (billing disabled) > AC-002-08: Overlap backstop flags the operator email without blocking the booking 5ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-04: Valid submit posts to the API and redirects to Stripe 108ms
 Test Files  5 passed (5)
      Tests  33 passed (33)
```

(excerpt: the spot-checked test lines + summary from the verbose run; full 78-line
output captured — 5 files, 33 tests, all ✓, exit 0)

### AC-002-08 — `src/__tests__/AC-002-direct-booking.test.ts:248-258`

| Scenario clause                                                          | Test assertion                                                                                                                                                                                                                                                                                                                                        | Enforced? |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Given billing disabled                                                   | `process.env[BILLING_ENABLED] = 'false'` (line 249)                                                                                                                                                                                                                                                                                                   | yes       |
| Given `findOverlappingBookingId` → `'other-booking-id'`                  | `m.mockOverlap.mockResolvedValue('other-booking-id')` (250); generated id is `crypto.randomUUID()`, necessarily different                                                                                                                                                                                                                             | yes       |
| Then 200                                                                 | `expect(res.status).toHaveBeenCalledWith(200)` (253)                                                                                                                                                                                                                                                                                                  | yes       |
| Then exactly the three-key body, no conflict flag in response            | `expect(jsonBody(res)).toEqual(SUCCESS_BODY)` (254) where `SUCCESS_BODY = { checkoutUrl: null, joinUrl, billingDisabled: true }`; the handler builds a literal `{ checkoutUrl: null, joinUrl, billingDisabled: true }` (`api/bookings/direct.ts:140` — read, no extra/undefined keys possible), so the toEqual is exact against the real construction | yes       |
| Then calendar event created and client email sent                        | `toHaveBeenCalledTimes(1)` on both mocks (255-256)                                                                                                                                                                                                                                                                                                    | yes       |
| Then `sendOperatorEmail` receives `slotConflictWith: 'other-booking-id'` | `expect(m.mockSendOperatorEmail.mock.calls[0][0].slotConflictWith).toBe('other-booking-id')` (257)                                                                                                                                                                                                                                                    | yes       |

Not a name-match: the test drives the REAL production handler (`import bookingsHandler
from '../../api/bookings'`; only `hasConflict` stubbed, validation path real) and every
Then-clause has a value-level assertion. The production flag path is also confirmed by
read: `detectSlotConflict` returns the overlap only when `overlap && overlap !== bookingId`
(direct.ts:47) and `notifyOperator` spreads `slotConflictWith` only when non-empty
(direct.ts:84).

### AC-002-16 — `src/__tests__/AC-002-frontend-confirmation.test.ts:70-92`

| Scenario clause                                                                                                           | Test assertion                                                                                                                                | Enforced? |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Given form holds date `2027-03-01`, slot `10:00`, valid email, hours `1`                                                  | `fillValid()` sets exactly those (47-49); hours comes from the hook default `useState<number>(1)` (`useBookingFields.ts:10` — read)           | yes       |
| Given fetch resolves ok/200 with `{ checkoutUrl: null, joinUrl: 'https://meet.jit.si/rexi-test', billingDisabled: true }` | `makeFetchMock({ ok: true, body: BOOKINGS_RESPONSE.json() })` + `vi.stubGlobal` (71-72); response body is the scenario's exact triple (15-23) | yes       |
| When the submit handler runs                                                                                              | `result.current.submit(submitEvent())` inside `act` on the REAL hooks `useBookingFields` + `useBookingSubmit` (33-39, 76-78)                  | yes       |
| Then `window.location.href` never assigned                                                                                | location swapped for `{ href: '' }` (AC-011 pattern, 59-61) and `expect(window.location.href).toBe('')` after submit (84)                     | yes       |
| Then no error state set                                                                                                   | `conflictError === ''` (85) and `errors toEqual({})` (86)                                                                                     | yes       |
| Then confirmation non-null and equals `{ date, startTime, joinUrl }` from submitted fields + response                     | `expect(fields.confirmation).toEqual({ date: '2027-03-01', startTime: '10:00', joinUrl: 'https://meet.jit.si/rexi-test' })` (87-91)           | yes       |

Also verified the POST itself is real (`fetchMock` called with `'/api/bookings'`, method
POST, 80-83). Supporting: the supplementary `.tsx` render test proves the panel swap for
AC-002-17 in both locales (form element gone from the card, `href` equals the join URL,
dictionary-only copy, no internal-state words, no navigation), and the unmodified
AC-011-04 test passes (redirect intact).

**Spot-check result: PASS — no false greens found in the sampled scenarios.**

## No unaccounted behavior (finding line, not a command)

**Finding: CLEAN.** Full diff skim (`git diff main --name-only` → 11 files + 6 untracked
scope files) found no logic that fails to trace to `10-tasks.md`, a scenario, or a
`15-design.md` directive:

- `api/bookings/direct.ts` (new, 141 lines): every function maps to Task 1 acceptance
  criteria (webhook-order side effects, static-500 error policy, timezone chain,
  server-generated bookingId, self-id dedupe rule, literal three-key 200 body).
- `api/bookings.ts` (+14): the kill-switch branch placed after the second conflict check
  and before `reserve` (Task 1), plus the `joinUrlOrEmpty` type-satisfying helper —
  justified in-code (meeting failure already 502s upstream); preflight order untouched.
- `useBookingSubmit.ts` / `useBookingFields.ts`: widened `BookingResponse` (Task 2 verbatim),
  confirmation state + setter (Task 2 / 15-design), `applyDirectConfirmation` branch
  BEFORE the redirect (15-design watch item 2), function extractions to stay inside the
  method-length guideline (documented in-code). See Adjudication (c).
- `BookingConfirmation.tsx` (new): 1:1 with 15-design §Per-Task Directives (role=status,
  h3 tabIndex -1 + one-shot focus, dl/dt/dd, guarded anchor with rel=noopener, dictionary-
  only strings, no icons). One component per file.
- `BookingLayout.tsx` (+11): confirmation branch inside the unchanged `.booking-card`
  chrome (15-design §Layout).
- `src/i18n/dictionary.ts` (+14): the five `booking.confirmation` keys in both locales,
  copy matching 15-design recommendations, no em-dashes, no internal-state words.
- `BookingWidget.css` (+82): exclusively the `.booking-confirmation*` BEM block (15-design
  §Components).
- `.env.example` / `docs/microsoft-cutover.md`: exactly the Task 3 removals/annotations —
  Providers block gone, `hola@` gone, EMAIL_FROM guidance → `info@rexi-ai.com`, dead vars
  annotated as removed, live vars kept (asserted by the green AC-002-18/19 and unmodified
  AC-013 tests).
- Extra non-AC unit tests inside the two new test files (self-id probe answer, empty
  `AVAILABILITY_TIMEZONE` fall-through, unchanged redirect/409/500/throw paths,
  missing-joinUrl, `useResetOnDate` survival): all trace to 10-tasks implied clauses or
  15-design watch items 1/2/7 — accounted test coverage, not unaccounted production behavior.
- Modified-but-out-of-scope per orchestrator instruction (human-sanctioned, NOT verified,
  not reverted): `opencode.json`, `config/availability.yaml`, `.gitignore`.

## Evidence: prettier whole-repo format check (out-of-scope finding, Adjudication (b))

command: npx prettier --check .
exit: 1
at: 2026-10-19T11:43:33Z

```
Checking formatting...
[warn] specs/002-no-stripe-when-billing-disabled/10-tasks.md
[warn] specs/002-no-stripe-when-billing-disabled/15-design.md
[warn] specs/002-no-stripe-when-billing-disabled/20-acceptance/AC-002-direct-booking.md
[warn] specs/002-no-stripe-when-billing-disabled/20-acceptance/AC-002-env-docs-cleanup.md
[warn] specs/002-no-stripe-when-billing-disabled/20-acceptance/AC-002-frontend-confirmation.md
[warn] Code style issues found in 5 files. Run Prettier with --write to fix.
```

## Adjudication (b) — phase-2 CI risk: prettier fails solely on specs/ markdown

**Claim verified: TRUE.** `npx prettier --check .` exits 1 on exactly 5 files, all under
`specs/002-no-stripe-when-billing-disabled/` (`10-tasks.md`, `15-design.md`, and the three
`20-acceptance/AC-002-*.md`); zero source files fail. `.prettierignore` was read: it lists
`.standards`, `dist`, `package-lock.json`, `.playwright-mcp`, `CHANGELOG.md` — no `specs/`
entry. **Recorded as an out-of-scope finding; NOT fixed, `.prettierignore` NOT edited**
(per instruction and the Stop-and-Ask matrix: record, do not fix).

Phase-2 CI nuance for the orchestrator: stage 5b runs `archive-spec.sh` as its final act
inside the PR, deleting `specs/002-*/` before the merge — but CI also runs on the PR head
while the folder is still present, and the archived one-pager `docs/changes/002-*.md` must
itself be prettier-clean. If Self CI wires `format:check`, expect red here until either
`.prettierignore` gains `specs/` (a one-line repo fix, out of this spec's scope) or the
spec markdown is prettier-formatted. Routing this diagnosis back to the orchestrator.

## Adjudication (c) — Refactorer's behavior-preservation claim on useBookingSubmit.ts

**Ruling: CONFIRMED — the refactor is genuinely exercised, with one benign micro-delta
recorded below.**

The diff vs main: the former one-line `prettier-ignore` handler was extracted into
`runBookingSubmit` (validate → guard → submitting → try/catch(GENERIC)/finally), plus a
`GENERIC_ERROR_MESSAGE = 'Error'` const, an `errorMessage()` helper, and the new
`applyDirectConfirmation` branch inserted BEFORE the untouched `checkoutUrl` redirect.

Genuine exercise, confirmed by read + re-run (all green in check 2 and the spot-check run):

1. **Pre-existing AC-011 tests (file has ZERO diff vs main — `git diff main --stat` on it is
   empty):** `AC-011-04` renders the full production `App`, fills date/slot/email, clicks
   submit, and asserts the POST body and `window.location.href === 'https://checkout.stripe.com/pay/cs_123'`
   — the redirect path through `runBookingSubmit → doSubmit → handleBookingResponse`.
   `AC-011-05`/`-06` exercise the validation guard inside `runBookingSubmit` (invalid email /
   missing fields → no request, dictionary errors rendered). Re-run result: `✓ AC-011-04`
   (108ms) in the verbose transcript above; all 6 AC-011 tests pass in the full suite.
2. **AC-002-16** drives the same extracted pipeline through the real hooks and asserts the
   new confirmation branch sets state without navigation (mapping table above).
3. **AC-002-17** (dictionary .ts test + both-locale .tsx render tests) proves the downstream
   render of what the extracted code stores.
4. **Supplementary unit tests** in `AC-002-frontend-confirmation.test.ts` re-pin every
   pre-refactor behavior through the public hook API: enabled redirect without confirmation
   (105-117), 409 → `es.booking.form.conflict` (119-136), non-ok → server message (138-154),
   network throw → `'Error'` + `submitting` reset (156-168), billingDisabled without joinUrl
   (170-189), `useResetOnDate` not clearing confirmation (191-212).

**Micro-delta (recorded, not a finding against any scenario):** the non-ok fallback changed
from `data.error?.message ?? 'Error'` to `errorMessage(data)` using `message || GENERIC_ERROR_MESSAGE`.
`||` also falls back on an EMPTY-STRING server message, where `??` kept `''`. No scenario or
task clause pins the empty-message case (Task 2 requires only "non-ok → message, network
throw → generic error ... unchanged", both still true for every non-empty message); the new
behavior matches the const's documented intent ("neither the server body nor the fetch gives
a message" — empty = none given). Benign; flagged for the Architect's awareness, not a FAIL.

## Warnings for the Architect (WARN = review hint, no stop)

1. Scoped design-principles WARN: DRY — 3x identical 4-line 405 block, first at
   `api/bookings.ts:13` (pre-existing shape; `dry` is warn-only by the gate's default
   blocking set).
2. Unscoped run carries 22 WARNs, all in untouched and/or vendored files (pre-existing debt:
   `stripe-webhook.ts` god-file hint, `Landing.tsx`/`ServicesCarousel.tsx` method lengths,
   checkout/webhook type-shape duplication, `.standards` templates, `time.ts` instanceof
   count). None introduced by this spec.
3. Vendored FAIL follow-up for the standards repo: `skills/hallmark/site/examples/cobalt-01/script.js`
   CC=10 (Adjudication (a)).
4. Phase-2 CI risk: whole-repo `prettier --check .` red solely on `specs/**` markdown —
   `.prettierignore` lacks `specs/` (Adjudication (b)). Out-of-scope; route before/with the PR.
5. useBookingSubmit `??`→`||` empty-message micro-delta (Adjudication (c)).

## Overall verdict

**PASS** — attempt 1, phase 1. All five contract checks executed for real and green:

- Gate 1 scenario traceability: exit 0 (15/15 traced, `fails: []`).
- Gate 2 full test suite: exit 0 (24 files / 136 tests, none skipped).
- Gate 3 complexity: `npm run lint` exit 0, `npx tsc -b` exit 0, `npm run build` exit 0.
- Gate 4 design-principles: authoritative blame-scoped run (`-BaseRef main`) exit 0, 0 FAIL;
  unscoped full-tree run exit 1 with its sole FAIL ruled an out-of-scope vendored finding
  (Adjudication (a)) — not attributable to this change.
- Gate 5 spot check: AC-002-08 and AC-002-16 assertions genuinely enforce their Then-clauses;
  no false greens.
- No unaccounted behavior: CLEAN.

Pipeline may proceed to stage 5a (Mutation Runner). Nothing was fixed, refactored, committed,
or pushed by this stage; the only writes are this report and temporary scratch captures under
`/tmp/verif002/` (cleaned up).

## Quality gates

# 30-report.md — Spec 002: no-stripe-when-billing-disabled

Stage 5a (Mutation Runner). Branch `spec/002-no-stripe-when-billing-disabled`, nothing
committed or pushed by this stage. Information barrier honored: `00-informal.md` was
NOT read.

## Verdict summary

| Row                                                                    | Value                                                                                                                                                                                    |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verifier verdict (carried forward)                                     | **PASS** — attempt 1, phase 1, 0 retries (`25-verification.md` §Verdict summary / §Overall verdict)                                                                                      |
| Mutation score                                                         | **skipped — `mvp` tier** (see §Mutation testing below)                                                                                                                                   |
| Complexity summary (carried from Refactorer, re-confirmed by Verifier) | clean — `npm run lint` exit 0 (ESLint `complexity ≤6`, zero repo-wide findings), `npx tsc -b` exit 0, `npm run build` exit 0; blame-scoped design-principles run exit 0, 0 FAIL / 1 WARN |
| Equivalent mutants                                                     | none — no mutants were generated (gate skipped at this tier), so no survivor triage occurred and none is being waived                                                                    |
| Final test status (re-run by this stage)                               | **GREEN** — 24 files / 136 tests passed, 0 skipped, 0 failed                                                                                                                             |
| Stage verdict                                                          | **GREEN** (stage complete for this tier; PR Opener may proceed)                                                                                                                          |

## Mutation testing: skipped

Per `.standards/docs/SPEC_PIPELINE.md §Conformance tiers` — "Architect — mutation
testing: skip (`mvp`) / yes (`production`) / yes (`multi-service`)" — and this agent's
contract ("at mvp tier, skip this stage entirely and write a one-line note in
`30-report.md` saying so"), the mutation gate does not run at `mvp`. Stryker was
therefore not invoked; no mutants were generated, survived, or were killed here.

Tier evidence, three independent sources:

1. `check-code-principles.sh` — the gate script's own tier detection, verbatim from
   the Verifier transcript (`25-verification.md` lines 170 and 200):
   `Checking design principles in: . (tier: mvp)` and
   `Property tests: skipped (project tier is mvp — production+ required)`.
   Machine-readable JSON transcript (`25-verification.md` line 215): `"tier": "mvp"`.
2. Prior archive `docs/changes/001-landing-booking.md` — consistent (`"tier": "mvp"`,
   same property-test skip line). Checked by this stage at 2026-10-19.
3. Both Refactorer and Verifier detected `mvp`; no gate config was touched
   (Stop-and-Ask matrix: "Fix the code, never the threshold — gate config is
   off-limits").

## Evidence: final test status (full suite, one final time)

command: npm test
exit: 0
at: 2026-10-19T11:56:08Z

```
> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  24 passed (24)
      Tests  136 passed (136)
   Start at  13:56:03
   Duration  5.00s (environment 64%, tests 17%, transform 9%, setup 6%, import 4%, worker 1%)
```

No skipped/todo bucket in the summary. Reproduced exactly the Verifier's independently
re-run numbers (24 files / 136 tests, `25-verification.md` check 2) — this stage's own
re-execution, not a paraphrase of theirs. Mutation-killing work added no new test code
at this tier (gate skipped), so no risk of regression from this stage existed; the
re-run confirms it: still green NOW.

## Complexity summary (carried forward)

From `25-verification.md` §Evidence: complexity gate and §Evidence: design-principles
gate — authoritative for this spec's change set:

- `npm run lint` exit 0 — ESLint including `complexity: [error, 6]`, zero findings
  repo-wide, so every changed production file (`api/bookings/direct.ts`,
  `api/bookings.ts`, `BookingConfirmation.tsx`, `BookingLayout.tsx`,
  `useBookingFields.ts`, `useBookingSubmit.ts`, `dictionary.ts`, `BookingWidget.css`)
  is inside the ≤6 cyclomatic bound under the real linter.
- `npx tsc -b` exit 0 — clean compile; es/en dictionary parity holds via the
  compile-time `type Dictionary = typeof es` gate.
- `npm run build` exit 0 — vite production build, 43 modules, 154 ms.
- `bash .standards/scripts/check-code-principles.sh -BaseRef main` exit 0 — 0 FAIL,
  1 WARN on this spec's change (blame-scoped). WARN carried forward below.

## Remediation record

Per `.standards/docs/SPEC_PIPELINE.md §Remediation budget`. Carried forward from
`25-verification.md` attempt metadata (lines 7–8: "Attempt: **1** … phase 1, no
remediation retries — `SPEC_LOOP_COUNT=1 SPEC_PHASE1_RETRIES=0 SPEC_PHASE2_RETRIES=0`")
and corroborated by the orchestrator loop log (`runs.jsonl`, runId
`2836ee65-90f2-45ec-8e71-ec644eb4a1b4`: `outcome: pass`, `loopCount: 1`,
`phase1Retries: 0`, `phase2Retries: 0`).

- BLOCKs resolved: **none** — the pipeline ran straight through to PASS on the first
  Verifier attempt; no gate failure ever routed a fix back to Coder or Refactorer.
- Phase 1: PASS at attempt 1; retries consumed 0 of max 3.
- Phase 2: 0 of max 3 used so far (no PR exists yet — the post-PR CI loop belongs to
  stage 5b and the Verifier's phase-2 re-check, not this stage).
- No attempt information was guessed; every number above is transcribed from the two
  artifacts named.

## Warnings for the Architect (carried from 25-verification.md §Warnings for the Architect)

WARN = review hint per the Stop-and-Ask matrix — recorded, not a stop:

1. Scoped design-principles WARN: DRY — 3x identical 4-line 405-handler block, first
   at `api/bookings.ts:13` (pre-existing shape; `dry` outside the gate's default
   blocking set).
2. 22 unscoped design-principles WARNs, all in untouched and/or vendored files
   (pre-existing debt; none introduced by this spec).
3. Vendored FAIL follow-up for the standards repo:
   `skills/hallmark/site/examples/cobalt-01/script.js` CC=10 (Verifier Adjudication
   (a)) — out of scope for this spec; propose a follow-up there.
4. Phase-2 CI risk: whole-repo `npx prettier --check .` exits 1 solely on 5
   `specs/002-*` markdown files (`.prettierignore` lacks `specs/`) — Verifier
   Adjudication (b); route to the orchestrator before/with the PR.
5. `useBookingSubmit` micro-delta: non-ok error fallback `??` → `||` (empty-string
   server message now falls back to generic `Error`) — not scenario-pinned, benign;
   Verifier Adjudication (c).

## Working-tree state at stage end

Dirty, entirely expected at this pipeline point (stage 5b owns the commits; this stage
committed and pushed nothing):

- Stage 2–3 spec output (uncommitted, in scope): modified `api/bookings.ts`,
  `src/components/booking/BookingLayout.tsx`, `useBookingFields.ts`,
  `useBookingSubmit.ts`, `src/i18n/dictionary.ts`, `src/components/BookingWidget.css`,
  `.env.example`, `docs/microsoft-cutover.md`; new `api/bookings/direct.ts`,
  `src/components/booking/BookingConfirmation.tsx`, 4 `src/__tests__/AC-002-*` test
  files, `specs/002-*/`.
- Human-sanctioned out-of-scope dirty files (touched by no pipeline stage, per
  orchestrator instruction and `25-verification.md` lines 17–18): `opencode.json`,
  `config/availability.yaml`, `.gitignore`.
- Untracked scratch observed by this stage, not touched: `runs.jsonl` (orchestrator
  loop log).

No stash, no revert, no commit performed here — Stop-and-Ask matrix honored.

## Stage outcome

**GREEN** — mutation gate skipped per documented `mvp`-tier rule (no score, no
equivalent mutants by non-generation), full suite re-confirmed green by this stage's
own re-run (exit 0, 24/24 files, 136/136 tests), complexity summary and remediation
record carried forward intact. Hand off to stage 5b (PR Opener) at the orchestrator's
discretion.

## 15-design.md

# Design Spec: 002-no-stripe-when-billing-disabled

Mixed surface: Tasks 1 and 3 have no frontend component (see Out-of-scope tasks at the
bottom). The design directives below apply to **Task 2 only**.

## Design Read

Reading this as: an in-place transactional confirmation state inside the existing RexiAI
booking card (product UI on a Spanish consultancy landing page) for a prospect who just
booked a free session, with a calm trust-first language that must be indistinguishable
from the existing zinc/white token system - an extension, not a redesign.

## Dial Values

- DESIGN_VARIANCE: 5 - not the baseline 8. This panel lives inside a shipped, conservative,
  token-driven single-column card; a high-variance move at the exact moment trust is won
  would read as "different product". The in-app-extension row of the dial table (match
  existing) governs: existing variance is conventional, so 5 (near-symmetric, one small
  character move: the dl term/value pairing and full-width pill CTA).
- MOTION_INTENSITY: 3 - the app's entire motion vocabulary is one 150ms background
  transition (`.slot-chip`). The only honest motion moment is the form-to-panel swap:
  one quiet entrance, transform + opacity, 200ms, once, no loops. At 3 reduced-motion is
  not mandatory per skill 6.B, but it is gated anyway (cheap, correct).
- VISUAL_DENSITY: 3 - the panel replaces a pricing block plus four fields with one title,
  two data rows, one CTA and one note. Card chrome (padding, border, radius) stays
  identical so the widget footprint does not re-skin; content is airier because there is
  less of it.

## Design System / Foundation

Existing in-repo system: native CSS plus the custom token layer in `src/index.css :root`
(zinc neutrals, space scale, radius roles, text scale), BEM-ish global classes, styles
appended to `src/components/BookingWidget.css`. No install, no new dependency (spec
constraint forbids one anyway). Honest label per skill Section 2: this is not Tailwind,
shadcn, or a named system - it is the repo's own native-CSS token practice, and the only
correct choice for an extension of a shipped component. All skill references to GSAP /
Motion / Three.js are rejected for this task: vanilla CSS keyframes/transition match the
existing idiom and the no-deps constraint.

## Global Tokens

- Font: existing system stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
'Helvetica Neue', Arial, sans-serif`), no webfont introduced.
- Accent color: `#18181b` zinc-900 (existing brand action color, via `--color-zinc-900`).
  `--color-green-600` (#059669) stays reserved for free-mode pricing copy and does NOT
  enter the confirmation panel; no new accent is introduced.
- Neutral base: existing zinc scale - `--color-zinc-900` values/title, `--color-zinc-600`
  labels/notes, `--color-zinc-500` de-emphasized, `--color-zinc-200` hairlines if needed,
  `--color-white` card surface. No new hex values anywhere.
- Corner-radius system: existing role-based radii, unchanged: `--radius-full` (9999px) =
  interactive controls (CTA pill matches `.booking-submit`), `--radius-lg` (16px) = card
  shell (outer chrome is not restyled), `--radius-md` (12px) = inputs (unused in panel).
- Theme: light, locked. The app ships light-only tokens and no `color-scheme` or
  dark token layer; one component must not flip modes mid-page. See Watch item 9.
- Icon library: none. The existing app renders zero icons; adding a checkmark SVG or an
  icon dependency for one state is slop and violates the no-new-deps constraint.

## Per-Task Directives

### Task 2: Frontend confirmation state when billingDisabled (AC-002-16, AC-002-17)

- Layout: inline state-swap confirmation panel reusing the existing `.booking-card`
  chrome (outer shell stays, only its contents change). No new layout family is
  introduced. Explicitly rejected from Section 10: Morphing Modal, Glassmorphism Panel,
  Parallax Tilt Card, and all scroll/hero patterns - a post-submit transactional state is
  not a marketing moment. Panel top-to-bottom: title, definition list (date, start time),
  join CTA, one note line.
- Components:
  - `BookingConfirmation.tsx` - new file under `src/components/booking/`, one component
    per file (repo rule), props `{ dict, confirmation }`.
  - `BookingLayout.tsx` - edit: render `BookingConfirmation` instead of the pricing block
    plus `<form>` when the confirmation state is non-null; outer `div.booking-card`
    remains in both branches.
  - `useBookingFields.ts` - edit: add `confirmation: { date: string; startTime: string;
joinUrl?: string } | null` state plus its setter to the returned flat object (the
    hook signature `useBookingSubmit(fields, dict)` must not change - hook tests call it
    without JSX/providers).
  - `useBookingSubmit.ts` - edit: widen `BookingResponse` per tasks; in
    `handleBookingResponse` branch `res.ok && data.billingDisabled === true` BEFORE the
    checkoutUrl redirect: set confirmation from `fields.date` / `fields.selectedSlot` /
    `data.joinUrl`, touch nothing on `window.location`, set no error.
  - `BookingWidget.css` - edit: append `booking-confirmation` block (BEM), following the
    file's property-order comment (layout, box, typography, visual, animation).
  - `src/i18n/dictionary.ts` - edit: new `booking.confirmation` section in BOTH `es` and
    `en`.
- Typography: title `--text-xl` (20px) weight 600 `--color-zinc-900` - not `--text-2xl`
  or larger (hierarchy by weight plus color, not raw scale). `dt` terms `--text-sm`
  weight 500 `--color-zinc-600`. `dd` values `--text-sm2` (14px) weight 500
  `--color-zinc-900`, rendered verbatim as the submitted raw values (`2027-03-01`,
  `10:00` - scenario-pinned, no `Intl`/locale reformulation, no timezone suffix added).
  Note line `--text-sm` `--color-zinc-600`.
- Color usage: no section-level status color. Title and values stay neutral zinc. The CTA
  is the same visual DNA as `.booking-submit`: white `--color-sm2` 600-weight label on
  `--color-zinc-900`, full width, `--radius-full`, hover background `--color-zinc-600`
  with `transition: background 150ms` (mirrors `.slot-chip`), `:focus-visible` outline
  2px solid `--color-zinc-900` offset 2px, never `outline: none`.
- Motion: `.booking-confirmation` gets a one-shot entrance `opacity 0 to 1` plus
  `translateY(4px) to 0`, 200ms ease-out, gated behind
  `@media (prefers-reduced-motion: no-preference)`; animate transform and opacity only.
  No hover lift, no infinite loops, no scroll behavior.
- Copy (recommended, dictionary-owned, zero hardcoded strings in components, default
  locale `es` reads first):
  - `booking.confirmation.title` - es "Reserva confirmada" / en "Booking confirmed"
  - `booking.confirmation.dateLabel` - es "Fecha" / en "Date"
  - `booking.confirmation.timeLabel` - es "Hora" / en "Time"
  - `booking.confirmation.joinLink` - es "Unirse a la sesión" / en "Join the session"
  - `booking.confirmation.note` - es "Te hemos enviado la confirmación por email." / en
    "We have sent the confirmation to your email."
    Tone: match the existing es voice (short sentences, informal "tu", no exclamations, no
    emoji). Tasks require at least `title` and `joinLink`; `dateLabel`, `timeLabel`, and
    `note` are added because every visible string must come from the dictionary and bare
    values would need labels.
- Semantics/a11y: wrapper `<div className="booking-confirmation" role="status">` (same
  pattern as `FreeModeBanner`), polite SR announcement of the swap. Details as `<dl>` with
  `<dt>`/`<dd>`. Title is an `<h3 tabIndex={-1}>` focused once on mount via a ref plus
  `useEffect` so the keyboard user who just pressed Enter on the submit button does not
  lose focus when the form unmounts. CTA is an `<a href={joinUrl}
target="_blank" rel="noopener noreferrer">` rendered only when `joinUrl` is present
  (the type makes it optional even though AC-002-16/17 always provide it).
- A11y contrast: white on zinc-900 is ~16:1 (CTA); zinc-900 on white ~16:1 (values,
  title); zinc-600 on white ~7.5:1 (terms, note). All clear WCAG AA. Nothing uses
  zinc-500 below `--text-xs`.
- Anti-patterns to avoid (specific to this task):
  - No green success box, check-circle emoji, animated checkmark SVG, or confetti. The
    app has zero icons; the confirmation must not become the one place it sprouts them.
  - Do NOT navigate to `/booking/success` and do NOT reuse the `result.*` dictionary keys
    (Documented decision 3: `result` is the Stripe-return voice and cannot show the join
    link). New `booking.confirmation` section only.
  - Do not leak internal-state words into user copy: "billing", "Stripe", "disabled",
    "checkout" must never appear in the panel.
  - Do not display `bookingId`, price, or amount lines (decision 4; free mode has no
    invoice to show).
  - Do not copy the existing hardcoded `'Error'` fallback pattern into the new branch;
    every new user-facing string goes through `dict`.
  - No em-dashes in any copy string (skill 9.G, hard ban).
- Watch items (Coder must check):
  1. `useResetOnDate` must not clear `confirmation` - verify its effect deps; the panel
     state is terminal for the session, not date-driven.
  2. Branch order in `handleBookingResponse`: enabled-path redirect must stay untouched
     and the existing `AC-011-04` test must pass unmodified (billingDisabled absent from
     an enabled response, so it falls through to the `checkoutUrl` redirect).
  3. Dictionary parity is a compile-time gate (`Dictionary = typeof es`,
     `en as unknown as Dictionary`): add all five keys to both locales or `tsc` fails.
  4. Traceability: AC-002-16 and AC-002-17 citations must live in a `*.test.ts` file
     (`.tsx` alone does not satisfy the gate).
  5. `joinUrl?: string` is optional in the type - guard the anchor, never render an
     empty `href`.
  6. Render the date/time values verbatim from the submitted fields; any formatting
     layer risks failing AC-002-17's pinned strings.
  7. jsdom `window.location.href` assertions: reuse the existing AC-011 test pattern for
     proving "never assigned" rather than inventing a new mock approach.
  8. The card will be shorter than the form after the swap. That height change is the
     intrinsic content swap, not a bug; do NOT lock min-heights to compensate.
  9. Theme gap, honestly recorded: skill 6.C wants dark mode on consumer surfaces, but
     this app ships light-only tokens and a single component must not half-introduce a
     second theme. If a dark mode ever comes to the repo, `booking-confirmation` styles
     must be re-checked then; nothing in this spec may flip the page to inverted colors.

## Out-of-scope tasks

- Task 1 (backend direct booking branch in `api/bookings/direct.ts` / `api/bookings.ts`):
  pure server logic, no visual surface. Only its response contract
  (`{ checkoutUrl: null, joinUrl, billingDisabled: true }`) is consumed, by Task 2.
- Task 3 (`.env.example` plus `docs/microsoft-cutover.md` cleanup): config and docs only,
  no visual surface.
