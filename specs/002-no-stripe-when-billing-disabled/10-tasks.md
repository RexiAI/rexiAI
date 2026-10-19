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
