# 003-booking-comms-polish

> Spec pipeline archive. Original source: `specs/003-booking-comms-polish/` (deleted by this script).
> Archived: 2026-10-21

## Original ask

# 003 — Booking communications polish under disabled billing

## Problem

Spec 002 (merged, PR #68) made bookings work without Stripe when
`BILLING_ENABLED=false`, but the booking conversation with operator and client
still speaks the billing-era language. Observed by the owner on a real
billing-disabled booking (preview deployment, 2026-10-19):

1. **Misleading in-flight status.** While the booking POST runs, the SPA shows
   "Redirigiendo a Stripe..." / "Redirecting to Stripe..."
   (`src/i18n/dictionary.ts:74,187`, `submitting` key) even when billing is
   disabled. No redirect ever happens — the confirmation renders in place.
2. **Wrong billing copy in emails.** The operator email carries
   "Reserva sin cargo — se factura tras la reunión (pro-rata 0,50 EUR/min)"
   (`src/domain/email.ts:46`, `amountLine`), and the client email carries the
   pro-rata billing-model lines (`email.ts:144-147`, `billingModelLines`).
   Both are sent from the direct booking path where **nothing is ever
   charged**. The owner received the operator variant in his personal mailbox
   and asked why.
3. **Unprofessional email structure.** Both emails are flat line lists with no
   visual hierarchy and no calendar integration. Owner wants a better
   structured, professional email for operator AND client, including an
   "Add to Google Calendar" link.
4. **Web confirmation must not offer a join link.** The spec-002 confirmation
   panel renders an "Unirse a la sesión" CTA
   (`src/components/booking/BookingConfirmation.tsx:38-45`, dictionary key
   `booking.confirmation.joinLink`). Owner decision (2026-10-19): the customer
   joins **only via the email's Jitsi link** — the web confirmation shows the
   booking facts and tells the customer the confirmation was sent by email.
   Context/goal: meetings run in Jitsi rooms so they can be recorded and
   processed by the owner's AI assistant; the emailed link is the canonical
   join path.

## Ask

### A. Billing-aware in-flight copy

The SPA already fetches `billingEnabled` on load (`GET /api/config` — the
free-mode banner consumes it). When `billingEnabled === false`, the submitting
status must use a neutral confirming copy (es + en, dictionary-driven) that
never mentions Stripe. Billing-enabled: copy stays exactly as today.

### B. No billing language when billing is disabled

The reservation emails sent from the direct path (billing disabled) must
contain **zero** references to charging, billing, pro-rata, or prices — in
subject and body, operator and client variants. Billing-enabled emails stay
**byte-for-byte unchanged**: `src/__tests__/AC-016-email-safety.test.ts` and
`src/__tests__/AC-018-billing-guards.test.ts` pin the current wording (e.g.
'Reserva sin cargo', 'pro-rata 0,50 EUR/min') and must keep passing
unmodified — those assertions encode the enabled-world contract, not a defect.

### C. Professional restructure + Google Calendar link (disabled-billing emails)

The UX agent produces the layout + final copy in `15-design.md` from
transactional-email best practice. Owner must-haves:

- Clear hierarchy: key facts at top (date, start time, timezone, duration;
  client identity for the operator email, service framing for the client
  email), mobile-readable single-column layout.
- Primary CTA: the meeting join link, button-styled.
- Secondary CTA: "Añadir a Google Calendar" —
  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<title>&dates=<UTCstart>/<UTCend>&details=<details>`
  with times as UTC `YYYYMMDDTHHMMSSZ`, details containing the join link.
  All dynamic values URL-encoded (`encodeURIComponent`); HTML sinks escaped
  with the existing `escapeHtml`.
- Professional, calm tone; Spanish (existing email language — do not silently
  expand to bilingual emails).

### D. Web confirmation panel: no join link

Remove the join CTA from `BookingConfirmation.tsx`; the panel keeps title,
date, time, and the "confirmation sent by email" note (final copy/layout: UX
agent, es + en via dictionary). The direct-path API response shape stays
**unchanged** (`{ checkoutUrl: null, joinUrl, billingDisabled: true }` — the
frontend simply stops rendering `joinUrl`; zero backend test churn).

**Owner-authorized test changes** (per docs/TESTING.md §Tests That Encode a
Defect — these encode the superseded spec-002 contract, owner authorization is
this spec, changes must be recorded in the PR body):
`src/__tests__/AC-002-frontend-confirmation.render.test.tsx` (expects the
joinLink CTA when joinUrl present) and `src/__tests__/AC-002-frontend-confirmation.test.ts`
AC-002-17 (pins dictionary keys incl. `joinLink`). The
"billingDisabled without a joinUrl still confirms and never navigates" unit
test stays valid untouched.

Research digest gathered for the UX agent (fetched 2026-10-19):

- Postmark, "15 transactional email best practices" — subject ≤50 chars and
  useful without opening; proper From/preheader.
  https://postmarkapp.com/guides/transactional-email-best-practices
- Moosend 2026 guide — key information at top; one obvious tappable CTA; one
  simple mobile-friendly layout; reassuring copy reduces support tickets.
  https://moosend.com/blog/transactional-email-best-practices/
- Mailjet — itemized summary of the transaction as a core component.
  https://www.mailjet.com/blog/email-best-practices/transactional-email-structure-what-is-the-most-crucial-information/
- Unione — professional tone without marketing phrases; emphasize critical
  information. https://unione.io/en/blog/transactional-email-best-practices/

The UX agent may deepen this research (owner suggested sources like LinkedIn
top voices) and owns the final layout/copy decisions inside the constraints
below.

## Constraints

- No new dependencies: hand-built HTML through the existing
  `renderHtml`/`escapeHtml` pipeline in `src/domain/email.ts`; the calendar
  link is plain URL construction.
- Security: client-controlled values (email, name) escaped at every sink
  (`escapeHtml`); no upstream error passthrough (docs/SECURITY.md).
- Billing-enabled path byte-for-byte unchanged (subject, lines, pro-rata
  wording, webhook-driven flow).
- Spec-002 side-effect policy unchanged: operator-email failure = visible
  booking failure; client email best-effort (logged, swallowed).
- `api/bookings/direct.ts` must give the email builders the billing mode
  (flag or separate builder functions — Coder's call, cyclomatic ≤6, no
  behavior forks leaking into the enabled path).
- SPA: dictionary-only copy (es + en for the in-flight status), no hardcoded
  strings, reuse the existing `/api/config` fetch — no extra requests.
- Direct-path API response shape unchanged (joinUrl stays in the JSON; the
  confirmation UI stops consuming it — see Ask D).
- Calendar-link times must derive from the same resolved slot start/end and
  timezone chain (`AVAILABILITY_TIMEZONE` → `TIMEZONE` → 'Europe/Madrid') as
  the calendar event itself — no second source of truth.

## Out of scope (owner questions handled outside the pipeline)

- Brave/Windows camera diagnostics for meet.jit.si (client-environment issue).
- Local Jibri recording verification (infrastructure, answered directly).
- Reviving meet.rexi-ai.com self-hosted Jitsi for prod (separate effort).

## Tasks

# 10-tasks.md — Spec 003: Booking communications polish under disabled billing

Five tasks. Tasks 2-3 depend on Task 1 (calendar-link builder). Tasks 4-5 are
frontend and independent of 1-3. Final email copy/layout, confirmation-panel
copy, and the in-flight status string come from `15-design.md` (stage 1.5, UX
Designer) — this file and `20-acceptance/` pin the invariants; 15-design pins
the exact wording inside those invariants.

## Global context (facts the Coder needs — all verified against source 2026-10-21)

- **Stack**: React 19 + Vite SPA (`src/`), serverless-style API handlers
  (`api/*.ts`), Vitest. Test command: `npm test` (= `vitest run --exclude
'.standards/**'`). Lint: `npm run lint`. ESLint complexity ≤6 everywhere.
- **Billing kill-switch**: `src/domain/billing.ts` `isBillingEnabled()` — only
  the exact string `'false'` (trimmed, any case) in `BILLING_ENABLED` disables;
  unset/anything else = ENABLED (fail-safe).
- **Direct path** (billing disabled only): `api/bookings.ts:125` →
  `finishDirectBooking` (`api/bookings/direct.ts`). Side-effect order: overlap
  probe (best-effort) → calendar event (fail = static 500 `GCAL_ERROR`) →
  operator email (fail = static 500 `EMAIL_ERROR`, visible booking failure, no
  rollback) → client email (best-effort: logged, swallowed) → 200
  `{ checkoutUrl: null, joinUrl, billingDisabled: true }`. This policy is
  UNCHANGED by spec 003 (pinned by unmodified AC-002-05…15).
- **joinUrl on the direct path is always a non-empty string at runtime**: a
  meeting error 502s before the direct branch (`api/bookings.ts:47-56,74-79,
118-125`), and `createMeetingLink` (`src/domain/meeting.ts`) currently cannot
  fail. `OperatorEmailInput.joinUrl` / `ClientEmailInput.joinUrl` are still
  typed `string | null | undefined` — the builders must not crash on a falsy
  value (Task 2/3 pin the defensive behavior).
- **Email module**: `src/domain/email.ts`. `sendOperatorEmail(input,
fetchImpl?)` and `sendClientEmail(input, fetchImpl?)` POST to Resend
  (`https://api.resend.com/emails`) with `{from,to,subject,text,html}`.
  `escapeHtml` (line 29) replaces `&` first, then `< > " '`. `renderText` keeps
  values raw; `renderHtml` escapes per field and joins with `<br/>` inside one
  `<p>`. `assertClientSenderUsable` (line 183) rejects `@resend.dev` sandbox
  senders for client-facing mail. `sendPaymentLinkEmail` is post-meeting
  recorded billing — NOT touched by this spec.
- **Current wording that must stay byte-identical for billing-ENABLED calls**
  (default input shapes): operator reservation line `'Reserva sin cargo — se
factura tras la reunión (pro-rata 0,50 EUR/min)'` (email.ts:46), operator
  charge line `` `${(cents/100).toFixed(2)} EUR (${cents} cents)` `` with label
  `'Importe cobrado'` (email.ts:49-50), operator subject
  `` `Nueva reserva: ${clientEmail} - ${date} ${startTime}` `` (email.ts:99),
  client lines `'Tu reunión con RexiAI está confirmada.'` + `'Reserva sin
cargo: no se cobra nada al reservar.'` + `'Se factura después de la reunión a
0,50 EUR/min (30 EUR/hora), con los primeros 60 minutos gratis la primera
vez.'` (email.ts:144-156), client subject `` `Reserva confirmada: ${date}
${startTime}` `` (email.ts:170).
- **Time chain**: `src/domain/time.ts`. `getEnvTimezone()` =
  `AVAILABILITY_TIMEZONE` → `TIMEZONE` → `'Europe/Madrid'` (empty string counts
  as unset — truthiness, mirrors `resolveCalendarTimezone` in direct.ts:30-36
  and AC-002-14 + its unit sibling). `slotIntervalUtc(dateStr, timeStr, hours)`
  returns `{start, end}` Dates using `getEnvTimezone()` + `zonedToUtc`
  (DST-correct, iterative offset resolution). `getConfiguredTimezone()` (yaml
  loader folds `AVAILABILITY_TIMEZONE` first — `src/domain/availability.ts:
254-292,353`) drives the display label `` `Hora (${timezone})` `` in today's
  emails. **Calendar-link times must derive from the same env chain the
  calendar event uses (`resolveCalendarTimezone`/`getEnvTimezone` →
  `slotIntervalUtc`) — no second source of truth** (informal spec §Constraints).
- **SPA wiring**: `useSiteConfig` (`src/hooks/useSiteConfig.ts`) fetches
  `/api/config` once per page load (module-level cache + in-flight dedupe,
  fail-safe default `{billingEnabled: true}`); `BookingWidget` passes
  `billingEnabled` to `BookingLayout`; the submit button label
  (`BookingLayout.tsx:68-74`) shows `dict.booking.form.submitting`
  ('Redirigiendo a Stripe...' es:74 / 'Redirecting to Stripe...' en:187) while
  `fields.submitting`, IGNORING `billingEnabled` — this is the Ask A bug.
  `useBookingSubmit.applyDirectConfirmation` sets `ConfirmationState {date,
startTime, joinUrl}`; `BookingConfirmation.tsx:38-47` renders the join CTA
  (`dict.booking.confirmation.joinLink`, es:82/en:195) when `joinUrl` is
  truthy — this is the Ask D removal.
- **Dictionary constraints**: `src/i18n/dictionary.ts` — `es` and `en` must
  keep identical shape (`_check` at line 235). AC-001-05 (unmodified) forbids
  em/en dashes ('—', '–') anywhere in `JSON.stringify({es,en})` — all NEW or
  CHANGED dictionary copy must avoid them (email HTML is not subject to this).
- **Test conventions** (mirror AC-002/AC-016/AC-018): save/restore `process.env`
  per test; mock `fs.readFileSync` with the availability yaml fixture
  (`timezone: Europe/Madrid`, monday 09:00-13:00); handler-level tests set
  `BOOKING_RATE_LIMIT='1000'` + `_resetRateLimit()`; capture Resend payloads by
  stubbing `fetch` (module level: `fetchImpl` param; handler level:
  `vi.stubGlobal` + distinguish calls by `body.to`); stub `window.location` as
  `{href:''}` to prove non-navigation. Fixture slot: `2027-03-01` (Monday)
  `10:00`, inside the mocked window.
- **Traceability citation rule**: `check-scenario-traceability.sh` scans
  `*.test.ts`/`*.spec.ts` — NOT `.tsx`. Every `AC-003-NN` ID must be cited in
  at least one `.ts` test file (render `.tsx` files may cite IDs additionally,
  but the gate only sees `.ts`). Follow the AC-002 pattern (citations in
  `AC-002-frontend-confirmation.test.ts`, supplementary render test in `.tsx`).
- **Files that must NOT be modified** (they encode enabled-world or spec-002
  contracts and stay green untouched): `src/__tests__/AC-016-email-safety.test.ts`,
  `src/__tests__/AC-018-billing-guards.test.ts`, `src/__tests__/AC-002-direct-booking.test.ts`
  (AC-002-05…15), `src/__tests__/AC-001-i18n.test.tsx`, `src/__tests__/billing-free-mode.test.tsx`,
  `src/__tests__/AC-011-booking-ui.test.tsx`, `src/__tests__/AC-003-availability-config.test.ts`
  (legacy spec-001 task-3 IDs — do not touch, do not reuse its ID range), and
  inside `src/__tests__/AC-002-frontend-confirmation.test.ts` everything except
  the AC-002-17 key list. The unit test `'billingDisabled without a joinUrl
still confirms and never navigates'` (same file, lines 170-189) stays valid
  untouched — `ConfirmationState` keeps carrying `joinUrl`.
- **Owner-authorized test modifications** (docs/TESTING.md §Tests That Encode a
  Defect; authorization = this spec; MUST be recorded in the PR body):
  1. `src/__tests__/AC-002-frontend-confirmation.render.test.tsx` — the
     join-link expectation (lines 77-80: `getByRole('link', {name:
dict.booking.confirmation.joinLink})` + href assertion) inverts to
     asserting the join CTA is absent.
  2. `src/__tests__/AC-002-frontend-confirmation.test.ts` — AC-002-17's key
     list `['title','joinLink','dateLabel','timeLabel','note']` drops
     `joinLink` (Decision 6).
- **No new dependencies** (informal spec §Constraints): hand-built HTML through
  the existing `escapeHtml` pipeline; the calendar link is plain URL string
  construction.

## Task 1 — Google Calendar TEMPLATE link builder

A pure builder in `src/domain/` (email.ts or a sibling module — Coder's call)
that produces the "Añadir a Google Calendar" URL for a booked slot.

Acceptance criteria:

- Output URL shape, exactly:
  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<enc>&dates=<UTCstart>/<UTCend>&details=<enc>`
  — the four parameters in this order, no others; `&` appears exactly 3 times
  and raw `=` exactly 4 times in the URL (one per parameter) (everything dynamic is
  `encodeURIComponent`-encoded, so encoded values carry `%26`/`%3D`, never raw
  separators).
- `dates`: UTC `YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ`, the `/` between start and
  end raw (structural). Start/end derive from the slot via the SAME env
  timezone chain the direct-path calendar event uses (`AVAILABILITY_TIMEZONE` →
  `TIMEZONE` → `Europe/Madrid`, empty = unset) — reuse
  `slotIntervalUtc`/`getEnvTimezone` from `src/domain/time.ts` (or
  `slotIntervalUtcForTimezone` fed by that chain); no second conversion
  implementation, no fixed UTC-offset arithmetic (DST-correct via
  `zonedToUtc`).
- End = start + `hours` (whole hours, 1-4 upstream-validated; builder does not
  re-validate).
- `text` (event title) and `details` are caller-supplied strings,
  `encodeURIComponent`-encoded; `details` contains the meeting join URL
  (encoded like any other value) when a join URL exists.
- A falsy/absent join URL never throws: the builder is not called with CTA
  intent in that case (Tasks 2-3 omit the calendar CTA), and if called with an
  empty details-join it still returns a well-formed encoded URL.
- Cyclomatic complexity ≤6 per function; pure (no I/O, no env reads other than
  through the time.ts chain); unit-testable without mocks.
- Exact title/details copy: from `15-design.md` (Spanish).

Scenarios: `20-acceptance/AC-003-calendar-link.md` (AC-003-10 … AC-003-13).

## Task 2 — Operator reservation email, billing-disabled variant

The direct path's operator email becomes a professional, structured,
billing-free confirmation. Layout + final copy: `15-design.md`. The
billing-enabled output stays byte-identical.

Acceptance criteria:

- `api/bookings/direct.ts` gives the email builders the billing mode, per the
  informal-spec constraint. HARD BOUNDARIES from unmodified pinned tests
  (Decision 3): the `sendOperatorEmail` call in direct.ts may gain extra keys
  on its input object (AC-002-06 checks operator args field-by-field and only
  excludes `slotConflictWith`), but the `sendClientEmail` call's FIRST argument
  must stay exactly `{clientEmail, date, startTime, hours, joinUrl}`
  (AC-002-06 `toEqual`), and both call sites keep the existing function names
  (AC-002's `vi.mock` factory provides only `sendOperatorEmail`/`sendClientEmail`;
  any other imported name would be `undefined` at those tests' runtime and flip
  the pinned 200s into 500s). Mechanism within those boundaries (flag key,
  extra parameter, wrapper) = Coder's call.
- Disabled-mode operator email — subject, text part, and html part contain ZERO
  billing references: none of (case-insensitive) `EUR`, `€`, `pro-rata`,
  `prorrateo`, `factur`, `cargo`, `cobr`, `pago`, `pagar`, `precio`, `tarifa`,
  `importe`, `stripe`, `reembols`, `gratis`, `gratuit`, `billing`, `charge`
  (Decisions 4, 5). In particular `'Reserva sin cargo'` and `'0,50 EUR/min'`
  never appear.
- HTML part is hand-built (no new deps), single-column mobile-readable layout
  per `15-design.md`, with: key facts (date, start time labeled with the
  resolved timezone from `getConfiguredTimezone()` — same resolution as today's
  `Hora (<tz>)` label, duration, client identity = `clientEmail`) positioned
  BEFORE the CTAs in document order; primary CTA = anchor with `href` equal to
  the join URL, button-styled per 15-design; secondary CTA = anchor with text
  `'Añadir a Google Calendar'` and `href` equal to the Task 1 builder output
  for this slot (details containing the join URL).
- Spanish only (final strings from 15-design; no English sentences, no silent
  bilingual expansion).
- Every client-controlled value passes `escapeHtml` at every HTML sink; the
  calendar URL sits in `href` with its structural `&` escaped as `&amp;` by the
  same per-field escaping; text part keeps values raw (no double-escaping —
  AC-016-02 parity).
- `slotConflictWith` set → the disabled-mode email still carries a
  prominent conflict warning naming the conflicting bookingId (the field exists
  because nothing else surfaces it); its wording per 15-design, without refund
  language (banned set).
- Falsy join URL (defensive, unreachable via direct path): email still builds
  and sends; join CTA and calendar CTA omitted; facts intact; no throw.
- Billing-ENABLED guarantee: calling `sendOperatorEmail` with today's input
  shape (no mode signal / default) produces byte-identical subject, text, and
  html to today's output (golden strings in §Global context). No behavior fork
  leaks into the enabled path: with default inputs the new code path is not
  entered.
- Side-effect policy untouched: operator-email failure on the direct path is
  still a visible 500 `EMAIL_ERROR` with a static body (pinned by unmodified
  AC-002-11 — do not re-test; do not break).
- `src/__tests__/AC-016-email-safety.test.ts` passes UNMODIFIED (it exercises
  the default/enabled shape, including the reservation wording at AC-016-04 and
  the timezone label at AC-016-05).
- Cyclomatic ≤6 per function; the disabled variant does not grow the enabled
  builder's complexity (separate function or early-branch, Coder's call).

Scenarios: `20-acceptance/AC-003-operator-email.md` (AC-003-14 … AC-003-20).

## Task 3 — Client confirmation email, billing-disabled variant

Same treatment for the client-facing email. Layout + final copy:
`15-design.md` (service framing for the client, per informal spec §C).

Acceptance criteria:

- Disabled-mode client email — subject, text, html contain ZERO billing
  references (same banned set as Task 2). In particular `'Reserva sin cargo'`,
  `'0,50 EUR/min'`, and `'60 minutos gratis'` never appear.
- HTML part per `15-design.md`: single-column, key facts at top (date, start
  time labeled with the resolved timezone, duration), service framing copy,
  primary CTA = join-URL anchor (button-styled), secondary CTA =
  `'Añadir a Google Calendar'` anchor from the Task 1 builder (details contain
  the join URL). Spanish only.
- Escaping: client-controlled values `escapeHtml`-escaped at every HTML sink;
  text part raw; calendar URL percent-encoded + attribute-escaped (same rules
  as Task 2).
- Falsy join URL (defensive): still sends; both CTAs omitted; facts intact.
- `assertClientSenderUsable` sandbox-sender guard STILL applies to the
  disabled-mode send (throws before any Resend request when `EMAIL_FROM` ends
  in `@resend.dev`).
- Billing-ENABLED guarantee: `sendClientEmail` with today's input shape (the
  exact AC-018-05 input) produces byte-identical subject/text/html to today's
  output (golden strings in §Global context, including both
  `billingModelLines` and the `'Enlace de la reunión'` line when joinUrl set).
- Best-effort policy untouched: client-email failure on the direct path is
  still logged and swallowed, booking still 200 (pinned by unmodified
  AC-002-12 — do not re-test; do not break). Recipient remains
  `input.clientEmail` (never `EMAIL_TO`).
- direct.ts's `sendClientEmail` call keeps its first argument EXACTLY
  `{clientEmail, date, startTime, hours, joinUrl}` (AC-002-06 `toEqual`);
  the mode signal travels via the boundaries in Task 2's first criterion.
- `src/__tests__/AC-018-billing-guards.test.ts` passes UNMODIFIED (AC-018-05
  pins the enabled client wording through the default shape).
- Cyclomatic ≤6 per function.

Scenarios: `20-acceptance/AC-003-client-email.md` (AC-003-21 … AC-003-27).

## Task 4 — Billing-aware in-flight submit copy (Ask A)

While the booking POST is in flight, the submit button label becomes
billing-aware. Copy strings: `15-design.md` (neutral, confirming, never
mentions Stripe).

Acceptance criteria:

- `billingEnabled === false` + submitting → button label is the new neutral
  es/en dictionary copy; label does not match `/stripe/i`; label ≠
  `'Redirigiendo a Stripe...'` / `'Redirecting to Stripe...'`.
- `billingEnabled === true` (including the fail-safe default when `/api/config`
  is unreachable or silent) + submitting → label stays exactly
  `dict.booking.form.submitting` (unchanged keys/values at dictionary.ts:74/187).
- New copy lives ONLY in the dictionary (new key(s) under `booking.form` —
  name per 15-design/Coder): defined, non-empty, in BOTH `es` and `en`; no
  hardcoded strings in components; no em/en dashes anywhere in the dictionary
  JSON (AC-001-05 unmodified stays green).
- Reuses the existing `useSiteConfig`/`/api/config` fetch — the flow issues no
  `/api/config` request beyond the single one page-load fetch that exists
  today; no new endpoints, no extra requests of any kind for this copy.
- `billingEnabled` already reaches `BookingLayout` as a prop — no new
  plumbing through `BookingWidget` beyond what exists (label logic changes in
  `BookingLayout.tsx:68-74` or equivalent).
- Untouched and green: `billing-free-mode.test.tsx`, `AC-011-booking-ui.test.tsx`
  (they exercise the enabled label path), `AC-002-frontend-confirmation.test.ts`
  non-AC-002-17 tests.

Scenarios: `20-acceptance/AC-003-inflight-copy.md` (AC-003-28 … AC-003-31).

## Task 5 — Confirmation panel without the join link (Ask D)

`BookingConfirmation.tsx` stops rendering the join CTA. The panel keeps title,
date, time, and the "confirmation sent by email" note. Final copy/layout:
`15-design.md` (es + en via dictionary).

Acceptance criteria:

- Panel renders (for both locales): `role="status"`, dictionary title, date
  value, time value, and the sent-by-email note — and NO anchor whose `href`
  equals the response `joinUrl`, and no join-CTA copy ('Unirse a la sesión' /
  'Join the session').
- The direct-path API response shape and the frontend state contract are
  UNCHANGED: `POST /api/bookings` (billing disabled) still answers
  `{checkoutUrl: null, joinUrl, billingDisabled: true}` (pinned by unmodified
  AC-002-05); `applyDirectConfirmation` still stores `joinUrl` in
  `ConfirmationState` (pinned by unmodified AC-002-16); the unit test
  `'billingDisabled without a joinUrl still confirms and never navigates'`
  passes untouched. ONLY the rendering stops consuming `joinUrl`.
- `booking.confirmation.joinLink` key REMOVED from both `es` and `en`
  dictionaries (only consumer gone — YAGNI); remaining keys `title`,
  `dateLabel`, `timeLabel`, `note` stay defined and non-empty in both locales
  (copy may be refreshed per 15-design, dash-free).
- Panel copy is dictionary-only; panel text never matches
  `/billing|stripe|disabled|checkout/i` (invariant preserved from the existing
  render test); no hardcoded user-facing strings; h3 focus behavior
  (`titleRef`) preserved.
- Owner-authorized test modifications executed exactly as scoped in §Global
  context (render-test join-link expectation inverted; AC-002-17 key list drops
  `joinLink`) and RECORDED IN THE PR BODY (note for stage 5b: the PR body must
  list both files, the changed assertions, and this spec as the authorization —
  docs/TESTING.md §Tests That Encode a Defect procedure, scenario IDs
  preserved verbatim).
- New AC-003-32/33/34 tests live in `.ts` (citation rule) with an optional
  supplementary `.tsx` render test.

Scenarios: `20-acceptance/AC-003-confirmation-panel.md` (AC-003-32 … AC-003-34).

## Documented decisions (resolved by the Specifier, not open)

1. **Scenario IDs start at AC-003-10.** Spec-001 used per-TASK numbering, so
   `docs/changes/001-landing-booking.md` owns headings AC-001-* through
   AC-017-*, including AC-003-01…09 (still cited by
   `src/__tests__/AC-003-availability-config.test.ts`). Reusing 01…09 would give
   one ID two meanings across two archives. Precedent: spec 002 started at
   AC-002-05 because spec-001 owns AC-002-01…04. `check-scenario-traceability.sh`
   resolves by exact ID against BOTH live specs and archives, so the legacy
   citations stay resolvable while this spec is in flight and after it archives.
2. **Asks B and C are merged per email variant** (one task per email, not one
   task per ask): both apply to the same builders; splitting would make Task C
   rewrite what Task B just wrote. Zero-billing-language is an acceptance
   criterion of the restructured emails.
3. **Billing-mode signal is constrained by unmodified pinned tests.**
   AC-016/AC-018-05 call the send functions with today's shapes → default must
   stay byte-identical (disabled mode is opt-in). AC-002-06 `toEqual`s the
   client call's first argument exactly and tolerates extra operator-arg keys;
   AC-002's email `vi.mock` factory provides only the two existing export
   names → direct.ts must keep calling `sendOperatorEmail`/`sendClientEmail`
   under those names, the client first-arg shape is frozen, and the mode
   travels by any channel within those bounds (extra operator-input key, an
   additional parameter position — `calls[0][0]` is the only pinned arg — or a
   mode carried by a shared options argument). Mechanism = Coder's call per the
   informal-spec constraint; the scenarios pin behavior only.
4. **`gratis`/`gratuito` are banned** in disabled-mode emails: Ask B says ZERO
   references to charging, billing, pro-rata, **or prices**; "free" states a
   price, and the owner's tone ask is professional/calm, not promotional. See
   Open questions — relaxable at the human gate without renumbering anything.
5. **The banned set includes `reembols`** (refund): today's operator conflict
   warning says "reembolsar manualmente", which is meaningless with billing
   disabled (nothing was charged). The warning itself MUST survive the
   restructure (it is the only surface for the overlap backstop) with
   disabled-appropriate wording from 15-design.
6. **`booking.confirmation.joinLink` is removed from both dictionaries** rather
   than left dead (YAGNI); the authorized AC-002-17 modification is exactly the
   key-list update this implies. `ConfirmationState.joinUrl` stays (unmodified
   AC-002-16 pins it; the untouched no-joinUrl unit test pins the undefined
   case).
7. **Calendar-link parameter contract is exactly the owner's template**:
   `action=TEMPLATE`, `text`, `dates`, `details`, in that order, no extra
   parameters (no `location`, `ctz`, `trp`); raw `/` inside `dates`; everything
   else `encodeURIComponent`. Byte-deterministic output keeps scenarios and
   mutation testing honest.
8. **Two handler-level e2e scenarios (AC-003-20, AC-003-27) exist solely to
   prove the direct.ts → builder mode wiring** that AC-002's module mocks
   cannot see (mocks intercept before content is built). Side-effect ORDER and
   FAILURE POLICY are deliberately NOT re-scenarized — unmodified AC-002-06…12
   remain the single source for those (pruning rule).
9. **Timezone semantics split deliberately**: calendar-link TIMES use the env
   chain (`getEnvTimezone`/`slotIntervalUtc`) because that is what the direct
   path's calendar event uses (`resolveCalendarTimezone`, pinned by AC-002-14);
   the DISPLAYED timezone label in the emails keeps today's
   `getConfiguredTimezone()` resolution (pinned behavior at AC-016-05). Both
   chains put `AVAILABILITY_TIMEZONE` first and agree in every configuration
   the pinned tests exercise.
10. **In-flight copy key naming is free** (Coder/UX via 15-design), but the
    existing `booking.form.submitting` key and value stay untouched for the
    enabled path — the new neutral copy is an ADDITION, and the label picks
    between them on the already-present `billingEnabled` prop.
11. **Subjects of disabled-mode emails are 15-design's call** within the banned
    set (today's disabled-path subjects already contain no billing language;
    the restructure may keep or replace them). The Postmark ≤50-char subject
    guidance from the research digest is advice to the UX agent, not a pinned
    scenario — the digest is UX input, the owner's must-haves are the
    constraints.

## Open questions (non-blocking; answer at the human gate, defaults are safe)

1. **Does the owner want "gratis/gratuito" banned from disabled-mode emails?**
   Decision 4 applies the strict reading of Ask B ("zero references to ...
   prices") and bans it, so UX cannot write e.g. "sesión gratuita". If the
   owner actually wants the free-ness stated in the emails, say so at the gate:
   the fix is removing two stems from the banned list in Task 2/3 criteria and
   in AC-003-14/21 — no renumbering, no structural change. Default (banned) is
   the conservative reading and matches the "professional, calm tone" ask.

## Acceptance scenarios

Index (full Given/When/Then in `20-acceptance/`):

## AC-003-10 — TEMPLATE URL shape, UTC dates from the slot, duration, and full encoding

## AC-003-11 — Timezone env chain drives the conversion, same as the calendar event

## AC-003-12 — Summer-time slots convert with the DST offset, never a fixed one

## AC-003-13 — Hostile and special-character values are percent-encoded, separators stay structural

## AC-003-14 — Disabled-mode operator email carries zero billing language

## AC-003-15 — Disabled-mode operator email structure: facts first, join CTA, calendar CTA

## AC-003-16 — Operator email escaping: hostile clientEmail inert in html, raw in text

## AC-003-17 — Slot-conflict warning survives the restructure, named and billing-free

## AC-003-18 — Falsy join URL: operator email still sends, CTAs omitted

## AC-003-19 — Default operator call is byte-identical to today (enabled-path guarantee)

## AC-003-20 — Direct-path e2e: the operator email Resend receives is the disabled variant

## AC-003-21 — Disabled-mode client email carries zero billing language

## AC-003-22 — Disabled-mode client email structure: facts first, service framing, both CTAs

## AC-003-23 — Client email escaping at every sink

## AC-003-24 — Falsy join URL: client email still sends, CTAs omitted

## AC-003-25 — Default client call is byte-identical to today (enabled-path guarantee)

## AC-003-26 — Sandbox-sender guard still blocks disabled-mode client sends

## AC-003-27 — Direct-path e2e: the client email Resend receives is the disabled variant, to the client

## AC-003-28 — Billing disabled: in-flight label is the neutral dictionary copy (es)

## AC-003-29 — Billing enabled: in-flight label stays 'Redirigiendo a Stripe...'

## AC-003-30 — Billing disabled, en locale: in-flight label is the en neutral copy

## AC-003-31 — No extra network requests for the billing-aware copy

## AC-003-32 — Panel renders the facts and note, never the join link (es)

## AC-003-33 — Panel is dictionary-only and join-link-free in en

## AC-003-34 — joinLink dictionary key removed; remaining confirmation keys intact

## Acceptance scenarios

## AC-003-10 — TEMPLATE URL shape, UTC dates from the slot, duration, and full encoding

## AC-003-11 — Timezone env chain drives the conversion, same as the calendar event

## AC-003-12 — Summer-time slots convert with the DST offset, never a fixed one

## AC-003-13 — Hostile and special-character values are percent-encoded, separators stay structural

## AC-003-14 — Disabled-mode operator email carries zero billing language

## AC-003-15 — Disabled-mode operator email structure: facts first, join CTA, calendar CTA

## AC-003-16 — Operator email escaping: hostile clientEmail inert in html, raw in text

## AC-003-17 — Slot-conflict warning survives the restructure, named and billing-free

## AC-003-18 — Falsy join URL: operator email still sends, CTAs omitted

## AC-003-19 — Default operator call is byte-identical to today (enabled-path guarantee)

## AC-003-20 — Direct-path e2e: the operator email Resend receives is the disabled variant

## AC-003-21 — Disabled-mode client email carries zero billing language

## AC-003-22 — Disabled-mode client email structure: facts first, service framing, both CTAs

## AC-003-23 — Client email escaping at every sink

## AC-003-24 — Falsy join URL: client email still sends, CTAs omitted

## AC-003-25 — Default client call is byte-identical to today (enabled-path guarantee)

## AC-003-26 — Sandbox-sender guard still blocks disabled-mode client sends

## AC-003-27 — Direct-path e2e: the client email Resend receives is the disabled variant, to the client

## AC-003-28 — Billing disabled: in-flight label is the neutral dictionary copy (es)

## AC-003-29 — Billing enabled: in-flight label stays 'Redirigiendo a Stripe...'

## AC-003-30 — Billing disabled, en locale: in-flight label is the en neutral copy

## AC-003-31 — No extra network requests for the billing-aware copy

## AC-003-32 — Panel renders the facts and note, never the join link (es)

## AC-003-33 — Panel is dictionary-only and join-link-free in en

## AC-003-34 — joinLink dictionary key removed; remaining confirmation keys intact

## Verification

# 25-verification.md — Spec 003: Booking communications polish under disabled billing

- **Stage**: 4 (Verifier), independent re-check of stages 2-3
- **Branch**: `spec/003-booking-comms-polish` (verified in place; no branch switch, no commit, no push, no fix)
- **Attempt**: 1, phase 1 (full run; no prior verification of this spec exists)
- **Verified**: 2026-10-21 (all timestamps UTC)
- **Information barrier**: `specs/003-booking-comms-polish/00-informal.md` was NOT read. Verification is against `10-tasks.md` (5 tasks, 11 documented decisions), `20-acceptance/` (25 scenarios AC-003-10…34, 5 files), and `15-design.md` (locked strings) only.
- **Method**: every prior green claim (Coder, Refactorer) was treated as unverified and re-executed. The verdict below is a transcription of gate exit codes and outputs, not a judgment over them.

## Scope under verification (stage 2+3 uncommitted output)

NEW: `src/domain/calendarLink.ts`, `src/domain/emailHtml.ts`, `src/domain/emailDirect.ts`,
`src/__tests__/AC-003-{calendar-link,operator-email,client-email,direct-path-emails,inflight-copy,confirmation-panel}.test.ts`.
MODIFIED: `src/domain/email.ts` (incl. Refactorer's Resend-transport consolidation into `postResendEmail` + pass-through removal), `api/bookings/direct.ts`, `src/i18n/dictionary.ts`, `src/components/booking/BookingLayout.tsx`, `src/components/booking/BookingConfirmation.tsx`, `src/components/BookingWidget.css`, and the two OWNER-AUTHORIZED test edits `src/__tests__/AC-002-frontend-confirmation.render.test.tsx` + `src/__tests__/AC-002-frontend-confirmation.test.ts`.
`git diff main --name-only` confirms exactly these 8 modified files; untracked in-scope files are exactly the 9 new files above. Out of scope and untouched by this verification: `runs.jsonl`, `specs/` scratch, `.env*`, `config/availability.yaml`, `.gitignore`, `opencode.json`, `.standards/**`.

## Verdict summary

| #   | Check                                                                                                           | Result                                                                                     | Exit                  |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------- |
| 1   | Scenario traceability                                                                                           | PASS                                                                                       | 0                     |
| 2   | Full test suite (`npm test`)                                                                                    | PASS                                                                                       | 0                     |
| 3   | Complexity gate (eslint + tsc + vite build)                                                                     | PASS                                                                                       | 0 / 0 / 0             |
| 3.5 | Design-principles gate                                                                                          | PASS (scoped authoritative exit 0; unscoped exit 1 adjudicated OUT-OF-SCOPE, ruling below) | 0 scoped / 1 unscoped |
| 4   | Scenario-to-behavior spot check (AC-003-14, AC-003-10; AC-003-19/25/20/27 additionally confirmed for audit (b)) | PASS                                                                                       | 0                     |
| 5   | No unaccounted behavior                                                                                         | PASS (finding line below)                                                                  | —                     |
| (a) | Authorized-change audit                                                                                         | PASS                                                                                       | —                     |
| (b) | Byte-identity audit                                                                                             | PASS                                                                                       | —                     |
| (c) | Phase-2 risk note                                                                                               | RECORDED for PR Opener                                                                     | —                     |

**OVERALL VERDICT: PASS** — Architect (stage 5a Mutation Runner) may proceed.

## Evidence: scenario traceability

command: bash .standards/scripts/check-scenario-traceability.sh
exit: 0
at: 2026-10-21T18:32:37Z

```
Scenario IDs found: 25 live, 84 archived

PASS AC-003-10 — traced to a test
PASS AC-003-11 — traced to a test
PASS AC-003-12 — traced to a test
PASS AC-003-13 — traced to a test
PASS AC-003-14 — traced to a test
PASS AC-003-15 — traced to a test
PASS AC-003-16 — traced to a test
PASS AC-003-17 — traced to a test
PASS AC-003-18 — traced to a test
PASS AC-003-19 — traced to a test
PASS AC-003-20 — traced to a test
PASS AC-003-21 — traced to a test
PASS AC-003-22 — traced to a test
PASS AC-003-23 — traced to a test
PASS AC-003-24 — traced to a test
PASS AC-003-25 — traced to a test
PASS AC-003-26 — traced to a test
PASS AC-003-27 — traced to a test
PASS AC-003-28 — traced to a test
PASS AC-003-29 — traced to a test
PASS AC-003-30 — traced to a test
PASS AC-003-31 — traced to a test
PASS AC-003-32 — traced to a test
PASS AC-003-33 — traced to a test
PASS AC-003-34 — traced to a test


✔ Scenario traceability check: every scenario traced, every reference resolves.
```

(ANSI color codes stripped from the human output; text verbatim. Machine-readable
transcript, `bash .standards/scripts/check-scenario-traceability.sh --json`, run at
2026-10-21T18:32:53Z, exit 0:)

```json
{
  "checks": [1, 2],
  "passes": [
    "AC-003-10 — traced to a test",
    "AC-003-11 — traced to a test",
    "AC-003-12 — traced to a test",
    "AC-003-13 — traced to a test",
    "AC-003-14 — traced to a test",
    "AC-003-15 — traced to a test",
    "AC-003-16 — traced to a test",
    "AC-003-17 — traced to a test",
    "AC-003-18 — traced to a test",
    "AC-003-19 — traced to a test",
    "AC-003-20 — traced to a test",
    "AC-003-21 — traced to a test",
    "AC-003-22 — traced to a test",
    "AC-003-23 — traced to a test",
    "AC-003-24 — traced to a test",
    "AC-003-25 — traced to a test",
    "AC-003-26 — traced to a test",
    "AC-003-27 — traced to a test",
    "AC-003-28 — traced to a test",
    "AC-003-29 — traced to a test",
    "AC-003-30 — traced to a test",
    "AC-003-31 — traced to a test",
    "AC-003-32 — traced to a test",
    "AC-003-33 — traced to a test",
    "AC-003-34 — traced to a test"
  ],
  "fails": []
}
```

Prior claim (exit 0, 25 live AC-003 IDs traced) **independently confirmed**. Check 1
(scenario→test) and check 2 (reference→scenario) both clean; the 84 archived IDs
resolve against `docs/changes/` (legacy AC-003-01…09 citations in
`AC-003-availability-config.test.ts` included — Decision 1 holds).

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-21T18:33:01Z

```
> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'


 RUN  v5.0.1 /home/dbueno/projects/rexiAI


 Test Files  30 passed (30)
      Tests  171 passed (171)
   Start at  20:32:55
   Duration  6.15s (environment 64%, tests 19%, setup 6%, transform 6%, import 4%, worker 1%)

Environment  jsdom was created 30 times · 35.82s total, 64% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments
```

Prior claim (exit 0, 30 files / 171 tests) **independently confirmed**. Hidden-skip
audit: zero `skipped`/`todo` markers in the run output; `grep -rEn "\.(skip|todo|only)\("`
across `src/__tests__/` returns nothing — no test is skipped, disabled, or
`.only`-isolated. This was a real full-suite execution, not a report transcription.

## Evidence: complexity gate

command: npm run lint && npx tsc -b && npm run build
exit: 0
at: 2026-10-21T18:33:31Z

Three real executions, each exit 0 (individual timestamps recorded per command):

    [1/3] npm run lint  (= eslint . — includes complexity ≤6 as error)
          exit 0, at 2026-10-21T18:33:24Z, output:

```
> rexiai-website@0.0.0 lint
> eslint .
```

    [2/3] npx tsc -b
          exit 0, at 2026-10-21T18:33:27Z, output: (empty — clean compile)

    [3/3] npm run build  (= tsc -b && vite build)
          exit 0, at 2026-10-21T18:33:31Z, output:

```
> rexiai-website@0.0.0 build
> tsc -b && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 43 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-RxdbQujM.css   11.56 kB │ gzip:  2.50 kB
dist/assets/index-D7lmfMI7.js   242.12 kB │ gzip: 75.62 kB

✓ built in 146ms
```

Prior claims (all 0) **independently confirmed**. The Refactorer's claimed structure
holds under the real tool: ESLint `complexity ≤6` (error severity) reports zero
violations across all changed and new files.

## Evidence: design-principles gate

command: bash .standards/scripts/check-code-principles.sh -BaseRef main
exit: 0
at: 2026-10-21T18:34:28Z

Authoritative blame-scoped run (judges only the change: diff of `main`…working tree).
Human output (ANSI stripped, excerpt — all gate sections PASS):

```
Checking design principles in: . (tier: mvp)
...
PASS SOLID-ISP (node): no fat interfaces
PASS SOLID-DIP (node): no domain→infrastructure imports
...
--- Component-per-file ---
PASS Component-per-file: no violations

--- Property tests ---
Property tests: skipped (project tier is mvp — production+ required)

---------------------------------------------
✔ Design-principles check: 0 FAIL(s), 0 WARN(s).
```

Machine-readable transcript (`-BaseRef main --json`, run at 2026-10-21T18:34:33Z, exit 0):

```json
{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [],
  "warns": []
}
```

    Unscoped full-tree contract run (recorded per the gate contract; adjudication below)
    (unscoped) command: bash .standards/scripts/check-code-principles.sh
    (unscoped) exit: 1
    (unscoped) at: 2026-10-21T18:34:00Z

Unscoped human output (ANSI stripped) — the sole FAIL line and all 22 WARN lines, verbatim:

```
Checking design principles in: . (tier: mvp)
FAIL Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10
WARN Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28
WARN Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25
WARN Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41
WARN Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43
WARN Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75
WARN Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22
WARN Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79
WARN Method body >20 lines (node): ./api/bookings/recorded-billing.ts:222:244:?:KISS_LINES=24
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
WARN Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30
WARN Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33
WARN SRP: possible god file (node) — ./api/stripe-webhook.ts: 621 lines, 14 methods (split by responsibility)
WARN LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)

---------------------------------------------
✘ Design-principles check: 1 FAIL(s), 22 WARN(s).
```

Machine-readable transcript (`--json`, unscoped, run at 2026-10-21T18:34:23Z, exit 1):
`fails` = exactly 1 entry — `{"message": "Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7"}`; `warns` = the 22 entries transcribed above; `tier: "mvp"`.

### RULING on the unscoped exit 1 (verbatim adjudication, spec-002 precedent + Stop-and-Ask matrix)

The sole unscoped FAIL is `./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10`
— a vendored example file inside the `.standards` git submodule. Evidence gathered at
2026-10-21T18:34:50Z–18:35:10Z:

- `git diff main -- .standards` → empty (submodule pointer unchanged vs main);
- `git submodule status .standards` → ` 3b1879050fbc295df9cdd64753e4704cca87be74 .standards (v1.7.0-119-g3b18790)` (no `+`/`-` prefix: checked-out commit == recorded pointer, clean);
- `git -C .standards status --porcelain` → empty (zero modified vendored files);
- `git diff main --name-only | grep -c '^\.standards'` → `0`.

RULING: the FAIL is pre-existing debt in the pinned clean submodule, untouched by this
spec, identical in kind and in the exact same file to the spec-002 phase-1 run
(recorded in `runs.jsonl`, runId 2836ee65: "sole FAIL is vendored
.standards/skills/hallmark/site/examples/cobalt-01/script.js CC=10 ... ruled
OUT-OF-SCOPE finding per Stop-and-Ask matrix, run not blocked; authoritative
-BaseRef main blame-scoped run exit 0"). Per the Stop-and-Ask decision matrix
("Out-of-scope finding → Record it; do not fix; propose a follow-up spec"), it is
recorded as an OUT-OF-SCOPE finding and does not block this run; the authoritative
blame-scoped run (`-BaseRef main`, the same authority the 002 precedent used) exits 0
with 0 FAIL / 0 WARN. The follow-up proposal to the standards repo (fix or exclude
the vendored hallmark example) was already emitted in the 002 telemetry and stands;
no new follow-up is opened here.

WARN adjudication: all 22 unscoped WARNs sit in vendored `.standards/**` files (9) or
in project files NOT in this spec's change set (13: `Landing.tsx`,
`ServicesCarousel.tsx` ×2, `recorded-billing.ts`, `checkout.ts`, `stripe-webhook.ts` ×5,
`microsoftGraph.ts`, `bookings.ts`, `time.ts`, `cobalt-01` ×2 counted in the 9) —
pre-existing debt, zero of them attributable to a file this spec touched. Per the
matrix ("Design gate WARN (not FAIL) → Record in the report; do not stop; flag to the
Architect") they are recorded and flagged, not blocking. The scoped run's 0 WARN
confirms the change itself introduces none.

**Design-principles gate result for spec 003: PASS** (scoped exit 0; unscoped exit 1
adjudicated OUT-OF-SCOPE per the ruling above).

## Evidence: scenario-to-behavior spot check

command: npx vitest run src/**tests**/AC-003-calendar-link.test.ts src/**tests**/AC-003-operator-email.test.ts src/**tests**/AC-003-client-email.test.ts
exit: 0
at: 2026-10-21T18:41:13Z

```
 RUN  v5.0.1 /home/dbueno/projects/rexiAI


 Test Files  3 passed (3)
      Tests  25 passed (25)
   Start at  20:41:12
   Duration  1.13s (environment 75%, setup 8%, transform 7%, tests 5%, import 3%, worker 1%)
```

Per-scenario filtered re-runs (the `skipped` counts are the `-t` filter excluding
non-matching tests within the file — not hidden suite skips; the full suite evidence
above shows 171 passed / 0 skipped):

    npx vitest run src/__tests__/AC-003-operator-email.test.ts -t "AC-003-14"
      → exit 0, at 2026-10-21T18:41:14Z: "Tests  1 passed | 9 skipped (10)"
    npx vitest run src/__tests__/AC-003-calendar-link.test.ts -t "AC-003-10"
      → exit 0, at 2026-10-21T18:41:15Z: "Tests  1 passed | 5 skipped (6)"

### Spot check 1 — AC-003-14 (disabled-mode operator email carries zero billing language)

Read `src/__tests__/AC-003-operator-email.test.ts` lines 33-109 against
`20-acceptance/AC-003-operator-email.md` AC-003-14. The test is NOT name-matching; it
genuinely enforces every Then-clause against the REAL builder output: it calls the
production `sendOperatorEmail(input, fetchImpl, {billingDisabled: true})`, captures
the actual Resend request body via the fetch stub (`JSON.parse(init.body)`, exactly
one call asserted), and then:

- Then-1 ("none of the banned billing words ... case-insensitively"): `expectNoBillingLanguage(subject, text, html)` sweeps all 17 substring stems (`€`, `pro-rata`, `prorrateo`, `factur`, `cargo`, `cobr`, `pago`, `pagar`, `precio`, `tarifa`, `importe`, `stripe`, `reembols`, `gratis`, `gratuit`, `billing`, `charge`) via `field.toLowerCase()).not.toContain(stem)` over all three payload parts.
- Then-2 ("'Reserva sin cargo', 'pro-rata', '0,50 EUR/min', 'Importe cobrado', '€' appear in none of the three"): explicit `not.toContain` per named string across subject/text/html (`pro-rata` covered by the stem sweep).
- Then-3 ("entirely in Spanish, final copy per 15-design.md"): pins the exact 15-design locked subject `Nueva reserva: 2027-03-01 10:00 (Europe/Madrid)` (`toBe`, byte-exact) and the locked H1 `Nueva reserva recibida`.

**Documented EUR word-token interpretation (recorded per instruction):** the test
checks `EUR` as `/\bEUR\b/i` (word token), not as a raw substring, and documents why
in a comment at lines 33-36: a case-insensitive raw substring `eur` matches the
timezone label `Europe/Madrid`, which AC-003-15 REQUIRES in the same html — a naive
substring reading would make AC-003-14 and AC-003-15 mutually unsatisfiable. The
word-token reading is the only self-consistent interpretation of the scenario pair,
and the actual currency phrase is still banned as an exact substring
(`'0,50 EUR/min'`, Then-2). I independently confirm the claim: `/\bEUR\b/i` does not
match `Europe` (no word boundary mid-token) and does match `0,50 EUR/min`. Accepted
as a faithful enforcement of the scenario, not a weakening.

Finding: **PASS** — assertions match the Given/When/Then; false-green risk excluded.

### Spot check 2 — AC-003-10 (TEMPLATE URL shape, UTC dates, duration, full encoding)

Read `src/__tests__/AC-003-calendar-link.test.ts` lines 59-70 against
`20-acceptance/AC-003-calendar-link.md` AC-003-10. The test calls the production
`buildCalendarTemplateUrl` with the scenario's Given values (2027-03-01, 10:00, 2h,
Europe/Madrid default via `beforeEach` env deletion) and enforces every Then-clause:

- Then-1 (exact link): `toBe` on the FULL URL — `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<enc>&dates=20270301T090000Z/20270301T110000Z&details=<enc>` — byte-exact, param order pinned (Decision 7).
- Then-2/3 (`<E>`/`<D>` are `encodeURIComponent` of title/details): asserted by constructing the expected string with `encodeURIComponent(TITLE)` / `encodeURIComponent(DETAILS)` and comparing the whole URL.
- Then-4 (decoding `<D>` contains the join URL): `decodeURIComponent(url.split('&details=')[1])).toContain('https://meet.jit.si/rexi-cal')`.
- Then-5 (end = start + exactly 2 hours): `parseStamp(end) - parseStamp(start) === 2 * 3600000` over the real output's `dates` param.

The sibling tests confirm the scenario family is genuinely enforced, not decorated:
AC-003-11 walks all four env-chain branches (America/New_York, TIMEZONE=Europe/Lisbon,
empty-string-as-unset, default Madrid) with exact `dates` strings; AC-003-12 pins the
DST pair (summer 08:00Z vs winter 09:00Z for the same wall clock); AC-003-13 counts
raw separators (exactly 3 `&`, exactly 4 `=`), bans raw space/angle/quote characters,
and re-checks both encoded params against `encodeURIComponent` of hostile inputs.

Finding: **PASS** — assertions match the Given/When/Then; false-green risk excluded.

### Additional confirmations under audit (b) (not part of the random-2 minimum)

- **AC-003-19** (operator enabled-path golden): asserts `toBe` on subject `Nueva reserva: client@example.com - 2027-03-01 10:00`, the exact five text lines (incl. `Reserva sin cargo — se factura tras la reunión (pro-rata 0,50 EUR/min)`), and html `<p>` + `<br/>` join — matching the 10-tasks §Global-context goldens byte-for-byte, captured through the real `sendOperatorEmail(input, fetchImpl, {})` → `buildBody` → consolidated `postResendEmail`.
- **AC-003-25** (client enabled-path golden): asserts `toBe` on subject `Reserva confirmada: 2027-03-01 10:00`, the exact seven lines (incl. both billing-model lines and `Enlace de la reunión`), html shape, and `payload.to === clientEmail` — through the real `sendClientEmail(..., {})` → `buildClientBody` → `postResendEmail`.
- **AC-003-20/27** (direct-path e2e): full-handler runs asserting the 200 body `{checkoutUrl: null, joinUrl, billingDisabled: true}`, exactly-one Resend request per recipient (operator@example.com / client@example.com, never EMAIL_TO for the client copy), banned-stem sweep on the captured payloads, join anchor, and `Añadir a Google Calendar` anchor with `dates=20270301T090000Z/20270301T100000Z`.

## Check 5 — No unaccounted behavior (finding line, not a command)

FINDING: PASS. Every production-side change in the diff traces to a task/decision:
`calendarLink.ts` → Task 1 (Decision 7 param contract; reuses `slotIntervalUtc`, no
second conversion); `emailHtml.ts` → shared-primitive extraction supporting Tasks 2-3
(`escapeHtml`/`renderText`/`renderHtml` moved verbatim, re-exported from `email.ts` so
the module surface is unchanged); `emailDirect.ts` → Tasks 2-3 (all locked strings
match 15-design byte-for-byte: subjects, preheaders, H1s, reassurance, help lines,
CTA labels `Unirse a la reunión` / `Añadir a Google Calendar`, calendar title
`Sesión con RexiAI`, details prefix `Enlace de acceso a la sesión: `, conflict
lead/body; `getConfiguredTimezone()` for the display label per Decision 9;
grammar-aware duration is disabled-variant-only); `email.ts` mode dispatch →
Decision 3 (mode as additional argument position; `calls[0][0]` untouched);
`direct.ts` → Tasks 2-3 wiring (client first-arg EXACTLY the pinned shape, mode in
third position, `undefined` fetchImpl preserving the default-global-fetch behavior);
`dictionary.ts` → Tasks 4-5 (exactly the design-mandated diff); `BookingLayout.tsx`
→ Task 4 (`submitButtonLabel` implements the 15-design selection formula verbatim);
`BookingConfirmation.tsx` + `BookingWidget.css` → Task 5 (CTA block deleted; the
`.booking-confirmation__cta` rules incl. hover/focus-visible deleted as
design-mandated dead styles). Supplementary ID-less unit tests (builder boundaries,
duration grammar, mode-signal regression guard) trace to Task acceptance criteria and
Decision 8 (the mode-wiring proof is the stated purpose of the e2e pair); they assert
spec-scoped behavior only. No logic found that lacks a task/scenario/decision origin.

## Audit (a) — AUTHORIZED-CHANGE AUDIT (executed at 2026-10-21T18:35:27Z)

command: `git diff main -- src/__tests__/` → exit 0. Result: **PASS**.

- `--stat`: exactly 2 pre-existing test files modified — `AC-002-frontend-confirmation.render.test.tsx` (+5/-4) and `AC-002-frontend-confirmation.test.ts` (+4/-1). These are precisely the two OWNER-AUTHORIZED files (10-tasks §Global context). No other pre-existing test file appears in the diff: `AC-016-email-safety.test.ts`, `AC-018-billing-guards.test.ts`, `AC-002-direct-booking.test.ts` (AC-002-05…15), `AC-001-i18n.test.tsx`, `billing-free-mode.test.tsx`, `AC-011-booking-ui.test.tsx`, `AC-003-availability-config.test.ts`, and `AC-010-email.test.ts` are byte-untouched (confirmed: not in `git diff main --stat -- src/__tests__/`; the 6 new AC-003 test files are untracked additions, not modifications).
- Render-test change matches the documented before/after: the old `getByRole('link', {name: dict.booking.confirmation.joinLink})` + `href === JOIN_URL` expectation is replaced by `queryAllByRole('link')).toHaveLength(0)` (zero links) + `innerHTML).not.toContain(JOIN_URL)` (no JOIN_URL in html) — exactly the authorized inversion, with an authorization comment citing spec 003.
- Unit-test change matches the documented before/after: AC-002-17's key list `['title','joinLink','dateLabel','timeLabel','note']` → `['title','dateLabel','timeLabel','note']` (`joinLink` dropped, Decision 6) — and nothing else in the file changed (the diff hunk touches only the key-list line plus an authorization comment; the untouched `'billingDisabled without a joinUrl still confirms and never navigates'` test and all non-AC-002-17 tests are unmodified, as required).
- Scenario IDs preserved verbatim: the `it('AC-002-17: ...')` heading is unchanged; no ID renumbering anywhere in the diff.
- OBSERVATION (cosmetic, not a violation): the AC-002-17 test TITLE still reads "Both dictionaries define booking.confirmation title and joinLink" while the key list no longer includes `joinLink`. The authorization scoped the change to "exactly the key-list update" — editing the title text would have EXCEEDED the authorized scope, so keeping it is the conservative, correct choice under docs/TESTING.md §Tests That Encode a Defect (ID preserved verbatim). Flagged to the Architect as a candidate wording tweak for a future authorized pass; not blocking.
- PR-body duty re-stated for stage 5b (per Task 5 criterion): the PR body must list both files, the changed assertions, and spec 003 as the authorization.

## Audit (b) — BYTE-IDENTITY AUDIT (executed at 2026-10-21T18:36:05Z)

Result: **PASS**.

1. **Enabled-path builders byte-identical vs main**: function-level `diff` of `git show main:src/domain/email.ts` extractions against the working tree for `amountLine`, `buildLines`, `buildBody`, `buildClientLines`, `billingModelLines`, `buildClientBody` → all six report IDENTICAL (empty diffs). The 15-design watch item ("enabled-path builders must not be edited") holds.
2. **Moved primitives verbatim**: `escapeHtml` (five replacements, `&` first), `renderText`, `renderHtml` (`<p>` + `<br/>` shape), and the `BodyLine` interface in `emailHtml.ts` are character-for-character the blocks removed from `email.ts` (compared against the diff hunks); `email.ts` re-exports `escapeHtml`, preserving its documented surface.
3. **Dictionary**: `git diff main -- src/i18n/dictionary.ts` is exactly the design-mandated edit set and nothing else — ADD `booking.form.submittingDirect` (es `Enviando tu reserva...` / en `Sending your reservation...`, matching 15-design Task 4 byte-for-byte); REMOVE `booking.confirmation.joinLink` from BOTH locales (Decision 6); REFRESH `note` (es `Te hemos enviado la confirmación por email, con el enlace para unirte a la sesión.` / en `We emailed your confirmation, including the link to join your session.`, matching 15-design Task 5 byte-for-byte). `title` (`Reserva confirmada`/`Booking confirmed`), `dateLabel` (`Fecha`/`Date`), `timeLabel` (`Hora`/`Time`), and `submitting` (`Redirigiendo a Stripe...`/`Redirecting to Stripe...`) appear only as unchanged context lines — byte-stable. No em/en dash introduced (AC-001-05 green unmodified in the full suite).
4. **Goldens genuinely exercise the consolidated `postResendEmail`**: the Refactorer deleted `sendViaResend`/`sendClientViaResend`/`sendPaymentLinkViaResend` and routed all three sends through one `postResendEmail(fetchImpl, apiKey, payload, errorLabel)`. Behavior-preservation evidence: (i) same URL `https://api.resend.com/emails`, same method/headers, `res.text().catch(() => '')` preserved; (ii) payload key order `from,to,subject,text,html` preserved at every call site (JSON.stringify insertion order → serialized body byte-identical); (iii) per-send error prefixes preserved via `errorLabel`: `Resend failed`, `Resend client email failed`, `Resend payment-link email failed`; (iv) `assertClientSenderUsable` still runs BEFORE body build and before any fetch in both client-facing sends (AC-003-26 semantics); (v) EMPIRICAL pins: unmodified `AC-010-email.test.ts` AC-010-03 drives `sendOperatorEmail` against a 500 stub and asserts `rejects.toThrow(/Resend failed/)` — that prefix now only exists inside `postResendEmail`, so the consolidated mapping is exercised by an untouched pinned test; unmodified AC-016 (incl. both payment-link tests) and AC-018 (AC-018-05 enabled client wording) pass through the same consolidated transport; new AC-003-19/25 goldens capture the real request body end-to-end through it (assertions listed in the spot-check section). The full 171-test suite green over these pins is the byte-identity proof of the transport consolidation.
5. **Pass-through removal**: `sendOperatorEmail`/`sendClientEmail`/`sendPaymentLinkEmail` no longer delegate with identical signatures (the CODING_CONVENTIONS pass-through smell); their public signatures are backward-compatible (new optional third `mode` parameter; existing 1- and 2-argument calls behave as before — proven by untouched AC-010/AC-016/AC-018 passing).

## Audit (c) — PHASE-2 RISK NOTE for the PR Opener (recorded, NOT fixed)

After stage 5b runs `archive-spec.sh`, CI (Self CI `Lint & Format` → `prettier --check`)
sees only `docs/changes/003-booking-comms-polish.md` from this spec's artifacts. The
spec-002 phase-2 round-1 failure (runs.jsonl runId f94f27a9, check id 118047893864)
established the failure mode: the stage-5b PR-record append (`PR:` / `Commits:` lines)
lands at column 0 directly after a list item and violates prettier's 2-space
lazy-continuation indent — the append happens after any pre-push formatter pass by
construction. REQUIRED of stage 5b for spec 003: run `npx prettier --write
docs/changes/003-booking-comms-polish.md` AFTER the PR-record append and BEFORE the
push (the root-cause fix in `archive-spec.sh` remains an open standards-repo
follow-up, out of this spec's scope). Also noted from phase 1 of spec 002:
`.prettierignore` lacks `specs/`, so local whole-repo prettier runs warn on spec
scratch — invisible to CI post-archive; deliberately left unfixed here.

## Warnings / review hints for the Architect (non-blocking)

1. Unscoped design-principles: 1 FAIL (vendored `.standards/skills/hallmark/.../cobalt-01/script.js` CC=10) adjudicated OUT-OF-SCOPE per the ruling above; 22 WARNs all in vendored/untouched files (pre-existing debt). Standards-repo follow-up (already proposed in 002 telemetry) stands.
2. Cosmetic: AC-002-17 test title still says "title and joinLink" after the authorized key-list change (see audit (a) observation) — candidate for a future authorized wording tweak; changing it now would exceed the authorization.
3. Phase-2 risk (audit (c)): the PR-record append must be prettier-formatted before push or Lint & Format will fail exactly as in spec-002 round 1.

## Overall verdict

**PASS** (attempt 1, phase 1). All five contract checks ran and produced no findings
attributable to this spec; both mandatory audits pass; the phase-2 risk note is
recorded for the PR Opener. Stage 5a (Mutation Runner) may proceed.

- Gates failed: none.
- BLOCKs relayed this phase: 0 of 3 (phase-1 budget untouched).

## Quality gates

# 30-report.md — Spec 003: Booking communications polish under disabled billing

- **Stage**: 5a (Mutation Runner)
- **Branch**: `spec/003-booking-comms-polish` (verified in place; no branch switch, no commit, no push — that is stage 5b)
- **Ran**: 2026-10-21 (all timestamps UTC)
- **Information barrier**: `specs/003-booking-comms-polish/00-informal.md` was NOT read. This stage worked from `25-verification.md`, `20-acceptance/` IDs as traced by the Verifier, and the live test/gate output only.
- **Precondition satisfied**: `specs/003-booking-comms-polish/25-verification.md` exists and its verdict is **PASS** ("OVERALL VERDICT: PASS — Architect (stage 5a Mutation Runner) may proceed", line 31; "Overall verdict **PASS** (attempt 1, phase 1)", lines 416–423).

## Verdict

**GREEN** — mutation gate skipped per mvp-tier policy; full suite re-run green by this stage. Stage 5b (PR Opener) may proceed, subject to its own preconditions and the audit (c) prettier duty it carries.

## Summary rows (carried + this stage's re-check)

| Row                                                             | Value                                                                                                                                                                                                                                                                                                                                                               | Source                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Verifier verdict (carried forward)                              | **PASS** — attempt 1, phase 1; all 5 checks + audits (a)(b) PASS; 0 BLOCKs                                                                                                                                                                                                                                                                                          | `25-verification.md` verdict table + overall verdict                |
| Mutation score                                                  | **skipped — `mvp` tier** (see one-line note and evidence below)                                                                                                                                                                                                                                                                                                     | this stage, per `docs/SPEC_PIPELINE.md` §Conformance tiers          |
| Complexity summary (carried from Refactorer, re-confirmed live) | scoped (`-BaseRef main`, authoritative): **0 FAIL / 0 WARN**, exit 0; unscoped full-tree: **1 FAIL** — vendored `.standards/skills/hallmark/site/examples/cobalt-01/script.js` CC=10 — ruled **OUT-OF-SCOPE** per the Verifier's ruling + Stop-and-Ask matrix, + **22 pre-existing WARNs** (9 vendored `.standards/**`, 13 in files outside this spec's change set) | Verifier design-principles evidence; live re-run below at 18:54:26Z |
| Equivalent mutants                                              | **none** — no mutants were generated (gate skipped at `mvp` tier), so no survivor classification exists                                                                                                                                                                                                                                                             | this stage                                                          |
| Final test status                                               | **GREEN** — `npm test` exit 0, **30 test files passed (30) / 171 tests passed (171)**, re-run by this stage                                                                                                                                                                                                                                                         | evidence block below                                                |

## Mutation-testing gate: skipped

**One-line note (contract-mandated at `mvp`): Mutation testing skipped — `mvp` tier; per `.standards/docs/SPEC_PIPELINE.md` §Conformance tiers the Architect mutation-testing gate runs at `production` and `multi-service` only ("Architect — mutation testing: skip" at `mvp`), and per `docs/CONFORMANCE_TIERS.md` an `mvp` project conforms fully to the reduced gate set.**

Tier is triple-sourced and live-confirmed by this stage's own command: the gate script's auto-detection reports `tier: mvp` (no `Conformance tier:` declaration exists — root `AGENTS.md` symlinks to `.standards/AGENTS.md`, and `check-code-principles.sh` lines 357–365 default to `mvp` when no declaration is found); the Verifier's scoped and unscoped runs both printed `tier: mvp`; prior archives 001/002 are consistent; this stage re-ran the machine-readable scoped gate and captured `"tier": "mvp"` itself.

No Stryker run was attempted; consequently no surviving mutants, no mutation-killing tests were written by this stage, and no equivalent-mutant roster applies.

## Evidence: mutation score

command: bash .standards/scripts/check-code-principles.sh -BaseRef main --json # tier confirmation for the skip; the mutation gate itself was not executed (policy skip at mvp)
exit: 0
at: 2026-10-21T18:54:26Z

```
{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [],
  "warns": []
}
```

Also observed at run start (human banner of the same gate family, and in the Verifier's authoritative scoped run at 2026-10-21T18:34:28Z):

```
Checking design principles in: . (tier: mvp)
Property tests: skipped (project tier is mvp — production+ required)
✔ Design-principles check: 0 FAIL(s), 0 WARN(s).
```

The live exit-0 / 0-FAIL / 0-WARN scoped transcript matches the Verifier's 18:34:33Z transcript line-for-line — no drift in the working tree between stage 4 and stage 5a.

## Evidence: final test status

command: npm test
exit: 0
at: 2026-10-21T18:53:46Z

```
> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'


 RUN  v5.0.1 /home/dbueno/projects/rexiAI


 Test Files  30 passed (30)
      Tests  171 passed (171)
   Start at  20:53:46
   Duration  6.22s (environment 64%, tests 19%, setup 7%, transform 6%, import 4%, worker 1%)

Environment  jsdom was created 30 times · 36.41s total, 64% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments
```

Prior claim (exit 0, 30 files / 171 tests — Coder, Refactorer, Verifier) **independently re-executed and confirmed by this stage**; totals identical. The Verifier's hidden-skip audit (zero `.skip`/`.todo`/`.only` markers, `25-verification.md` lines 113–116) applies to the same unchanged working tree.

## Remediation record (docs/SPEC_PIPELINE.md §Remediation budget)

Carried forward from `25-verification.md` (lines 422–423: "Gates failed: none. BLOCKs relayed this phase: 0 of 3 (phase-1 budget untouched)"), not guessed:

- **Phase 1 (pre-PR loop): PASS at attempt 1; retries 0 of 3.** No BLOCK occurred during the run through stage 5a — remediation record: **none**. The Verifier's single full-scope pass was itself the first and only attempt; this stage's re-run reproduces its results with zero deltas, adding no new attempts.
- **Phase 2 (post-PR loop): not started** — belongs to stage 5b onward. Budget untouched (0 of 3). The audit (c) phase-2 risk note (below) is a pre-emptive duty for the PR Opener, not a BLOCK.

## Warnings carried for the record (non-blocking; sources: `25-verification.md` unless noted)

1. **Unscoped design-principles debt**: 1 FAIL in vendored `.standards/skills/hallmark/site/examples/cobalt-01/script.js` (CC=10), adjudicated OUT-OF-SCOPE (clean pinned submodule, untouched by this spec; spec-002 precedent, runs.jsonl runId 2836ee65), + 22 WARNs all in vendored `.standards/**` (9) or files outside this spec's change set (13) — pre-existing debt. Standards-repo follow-up (proposed in 002 telemetry) stands; no new follow-up opened.
2. **Cosmetic**: AC-002-17 test title still reads "title and joinLink" after the owner-authorized key-list change; fixing it now would exceed the authorization — candidate for a future authorized pass.
3. **Phase-2 prettier risk (audit (c))**: stage 5b MUST run `npx prettier --write docs/changes/003-booking-comms-polish.md` AFTER the PR-record append and BEFORE the push, or Self CI `Lint & Format` fails exactly as in spec-002 phase-2 round 1 (runs.jsonl runId f94f27a9).
4. **`.prettierignore` lacks `specs/`**: local whole-repo prettier runs warn on spec scratch; invisible to CI post-archive; deliberately left unfixed by the Verifier.
5. **PR-body duty (stage 5b)**: the PR body must list the two owner-authorized pre-existing test files, the changed assertions, and spec 003 as the authorization (audit (a)).
6. **Perf observation (from this stage's `npm test` output, transcribed above)**: vitest reports jsdom environment creation at 64% of tracked time (30 creations, 36.41s) and suggests `pool: 'vmThreads'` or `isolate: false`. Advisory only — not a correctness gate, not acted on.

## Scope discipline (this stage)

- Touched exactly one artifact: this `30-report.md`. No test or production file was written or edited — with the mutation gate skipped there was no survivor to kill; no fixable finding surfaced in the re-runs (scoped gate 0 FAIL / 0 WARN, suite 171/171).
- Out-of-scope surfaces untouched: `runs.jsonl` (this stage's contract records no telemetry — not appended to), untracked `specs/002-no-stripe-when-billing-disabled/` scratch, `.env*`, `config/availability.yaml`, `.gitignore`, `opencode.json`, `.standards/**`.
- Working tree at stage entry matched `25-verification.md`'s attested scope 1:1 (8 tracked modifications + 9 new files listed there; `git status` adds only `runs.jsonl` and `specs/` scratch, both declared out-of-scope) — expected in-flight pipeline state, not a Stop-and-Ask dirty-tree condition.
- Nothing committed, pushed, or PR-opened (PR Opener's job, stage 5b).

## 15-design.md

# Design Spec: 003-booking-comms-polish

## Design Read

Reading this as: trust-first transactional email + in-app confirmation polish for a
Spanish consulting booking product (operator + client audiences), with a calm,
professional, receipt-like language, leaning toward the repo's existing zinc/white
token system (SPA) and hand-built, email-client-safe HTML (emails) in the same zinc
DNA. Redesign mode per skill Section 11: **preserve** - modernise structure and CTA
hierarchy only; brand tokens, copy voice, IA and accessibility wins stay.

Surface split: Tasks 1-3 are email design surfaces (visual output, but the URL
mechanics, escaping pipeline and mode-propagation are engineering contracts already
pinned in `10-tasks.md`; this file owns only copy, hierarchy and styling). Tasks 4-5
are browser product UI. No task in this spec is fully out of design scope; nothing
in the spec is a landing page, so Section 10's hero vocabulary does not apply and is
honestly labeled below.

Research note (owner's explicit ask, honored): the informal-spec digest (Postmark /
Moosend / Mailjet / Unione) was deepened live on 2026-10-21 via web search; additional
sources used below are Sender's 2026 email-design guide, Stripo's 2026 CTA guide,
Litmus's bulletproof-button guide, Mailsoftly's 2026 rules, Sendlayer's transactional
design guide, Enchant's 2026 accessibility/dark-mode guide, and one LinkedIn email-
marketing voice (Emily Ryan, CTA-contrast tip; her full feed is auth-walled, the
search excerpt is what informed us). Each major decision carries its source inline.

## Dial Values

- DESIGN_VARIANCE: 4 - trust-first, regulated-ish signal ("professional, calm tone" +
  zero-billing constraint). Transactional emails are single-column documents; the
  skill's Section 1.A maps "trust-first" to 3-4. Not 1-2: the restructure still needs
  a visible hierarchy lift vs today's flat `<br/>` line list.
- MOTION_INTENSITY: 2 - email clients support none (and lean HTML is a deliverability
  rule, Sendlayer); the SPA panel keeps spec-002's existing gated one-shot entrance
  and nothing is added. Preserve, do not extend (skill 11.C).
- VISUAL_DENSITY: 3 - key facts at top with generous whitespace (Mailjet "itemized
  summary" + Moosend "key info first"); 3-5 fact rows max, no marketing blocks, no
  filler sections.

## Design System / Foundation

No external system is installed and none should be: emails are hand-built HTML
through the existing `escapeHtml`/render pipeline (constraint: no new deps, no
web fonts, no images, no background images - Sendlayer/Mailsoftly). The SPA keeps
the repo's existing zinc/white token system from `src/index.css` (`:root` variables),
which spec-002 already established for the confirmation panel (skill 11: redesign -
preserve: extract brand tokens, don't replace them). Email styling mirrors the SPA's
zinc scale in inline hex so the customer's email looks like the product page.

## Global Tokens

- Font (email): `Arial, Helvetica, sans-serif` web-safe stack, explicit (Sender:
  never let the email fall back to Times). SPA panel: existing site font stack,
  unchanged.
- Accent color: `#18181b` (zinc-900) as the single action color: primary button
  background, headings. Secondary link `#52525b` (zinc-600). Warning lead
  `#b91c1c` (red-700). No other accents.
- Neutral base: zinc scale already in `src/index.css` - outer `#fafafa`
  (zinc-50), card `#ffffff` (white, matches existing tokens; it is the established
  base, skill 11.C says preserve wins), hairline `#e4e4e7` (zinc-200), body text
  `#18181b`, muted text `#52525b`/`#71717a`. No pure-black anywhere.
- Corner-radius system: soft, mirroring the repo scale - email card 16px
  (radius-lg), email button 12px (radius-md). SPA untouched (its `--radius-full`
  pills are the existing DNA). One system, email echoes the SPA tokens.
- Theme: light card for both emails, engineered to survive dark-mode inversion
  (solid bgcolors on every surface, no color-dependent-only meaning, no transparent
  assets - Sender/Enchant dark-mode rules). SPA: existing theme behavior, unchanged.
- Icon library: none. Zero icons/images in email (no external assets constraint);
  the SPA panel keeps its text-only design. This is deliberate, not a gap.
- Dash policy: no `—` or `–` in ANY string this spec introduces - dictionary copy is
  hard-banned by AC-001-05; email copy follows the skill's 9.G ban for discipline.
  Locked strings below use commas, colons, periods and plain hyphens only.

## Per-Task Directives

### Task 1: Google Calendar TEMPLATE link builder

- Layout: N/A (URL builder). Engineering contract already pinned in `10-tasks.md`
  (param order `action,text,dates,details`, UTC `YYYYMMDDTHHMMSSZ` pair, env tz
  chain, `encodeURIComponent`); nothing here changes it.
- Components: pinned copy inputs the builder must be called with, byte-exact, so
  Tasks 2-3 and their tests agree:
  - `text` (event title): `Sesión con RexiAI`
  - `details`: `Enlace de acceso a la sesión: {joinUrl}` (decoded details must
    contain the join URL - AC-003-10/15/22)
- Typography: n/a.
- Motion: n/a.
- A11y: n/a; calendar title is descriptive, no time-agnostic gibberish.
- Anti-patterns to avoid: do not stuff booking facts into the event title (Google
  already renders the date range); do not add `location`/`ctz`/`trp` params
  (Decision 7 bans extras).
- Watch items (Coder must check): title/details are the exact strings above; any
  divergence breaks AC-003-13 byte-determinism intent.

### Task 2: Operator reservation email (billing-disabled, Spanish)

- Layout: single-column transactional document stack, 600px max card - subject →
  preheader → wordmark → H1 → (conflict block if set) → facts table → primary CTA →
  secondary CTA → footer. Key facts BEFORE the CTAs in document order
  (AC-003-15; Mailjet "itemized summary is the core"; Sendlayer "don't bury the
  thing the email exists to deliver"). The subject names what happened and carries
  the searchable slot identifier (Sendlayer "include the identifier people search
  their inbox for" - here date+time, not a long attacker-controlled email).
- Locked strings (exact; every one passes the banned-stem screen in Task 2/3
  criteria, contains no `—`/`–`, and no billing word in any language):
  - Subject: `Nueva reserva: {date} {startTime} ({tz})` (47 chars with the fixture
    values `2027-03-01 10:00 (Europe/Madrid)`; ≤50 per Postmark, front-loaded per
    Sender's 30-40-char mobile truncation rule).
  - Preheader (hidden `display:none` span at the very top of the html part):
    `Fecha, hora y enlace de acceso, listos para revisar.`
  - Wordmark: `RexiAI`
  - H1: `Nueva reserva recibida`
  - Fact rows (label → value): `Cliente` → escaped clientEmail; `Fecha` → date;
    `Hora ({tz})` → startTime, `{tz}` from `getConfiguredTimezone()` exactly as
    today's pinned label; `Duración` → `1 hora` when hours=1, else `{n} horas`
    (grammar-correct singular is disabled-variant-only; the enabled frozen line
    `${hours} horas` stays untouched).
  - Primary CTA label: `Unirse a la reunión`
  - Secondary CTA label (must stay byte-exact, pinned by AC-003-15):
    `Añadir a Google Calendar`
  - Conflict block lead: `ATENCIÓN:` ; body: `Conflicto de franja. Ya existe una
reserva (id: {bookingId}) que solapa este horario. Revisa el calendario antes
de la reunión.` (replaces today's "Revisar y reembolsar manualmente" -
    Decision 5: `reembols` banned; the warning survives with disabled-appropriate
    action language).
  - Footer: `RexiAI` wordmark repeat, `#71717a`, 13px, nothing else (no marketing).
- Components (hand-built HTML, inline styles only):
  - Outer `div` bg `#fafafa`; card `div` max-width 600px, width 100%, bg `#ffffff`,
    border 1px solid `#e4e4e7`, border-radius 16px, padding 32px 24px,
    font Arial stack 16px/1.5, color `#18181b`.
  - H1 24px bold (≈1.5x body per Sender's heading-to-body ratio, calm not loud).
  - Facts table: 2-column `table`, label cell `#52525b` 14px, value cell `#18181b`
    16px font-weight 600, row spacing 12px, ONE hairline above and below the table
    block (`border-top`/`border-bottom` 1px solid `#e4e4e7`), none between rows
    (skill 9.F: no per-row hairline strips; whitespace does the grouping).
  - Primary CTA = padding-based bulletproof button (Litmus pattern): `table>td`
    bg `#18181b`, radius 12px, padding 14px 24px, inner `a` color `#ffffff`,
    bold 16px, `text-decoration:none`, `display:inline-block`,
    href = joinUrl. Height ≥44px tap target (Mailsoftly/Enchant). White-on-#18181b
    contrast ≈16:1, passes AA/AAA.
  - Secondary CTA = plain underlined text link, 14px `#52525b`, href = Task 1
    builder output (attribute-escaped). Deliberately NOT a button: one primary CTA
    per email (Sender/Stripo/Mailsoftly), secondary visually subordinate
    (Enchant). ~16px below the button with whitespace.
  - Conflict block (when `slotConflictWith`): full-width `div`, bg `#fafafa`,
    border-left 4px solid `#b91c1c`, padding 12px 16px, placed directly under the
    H1 (prominence: it is the only surface for the overlap backstop). "ATENCIÓN:"
    in `#b91c1c` bold; body text `#18181b`. Meaning never color-only (a11y).
- Text part (same line order as the html reading order; values raw via
  `renderText`): `Cliente: {clientEmail}` / `Fecha: {date}` /
  `Hora ({tz}): {startTime}` / `Duración: {dur}` / `Enlace de la reunión: {joinUrl}` /
  `Añadir a Google Calendar: {calendarUrl}` / (conflict line last, same wording as
  the block body).
- Typography: one family, three sizes (24/16/14→13 footer), two weights. Email H1
  per mailsoftly hierarchy discipline; no ALL CAPS anywhere except the pinned
  `ATENCIÓN:` lead.
- Motion: static. No animations exist in email.
- A11y: contrast values above; single reading order; full plain-text alternative
  (the text part above - its absence is a spam signal per Sendlayer); no images so
  no alt-text debt; `rel="noopener"` on both anchors; escaped sinks (AC-003-16):
  every dynamic value, the calendar URL included, passes `escapeHtml` at its HTML
  sink (the URL's structural `&` becomes `&amp;` in the attribute), raw in text part.
- Anti-patterns to avoid (specific): no "¡Gracias por tu reserva 🎉" celebration
  noise; no marketing footer links (Unione: professional without marketing
  phrases); no em-dash; no second button competing with the join CTA; do not
  reintroduce `Importe`/`Reserva sin cargo` phrasing from the enabled era; no
  "gratis"/"gratuito" anywhere (Decision 4 - the free-ness is simply unstated).
- Watch items (Coder must check):
  1. AC-003-18 fact-set interpretation: the subject carries date + start time
     (+ tz label); duration and client identity live in the text and html parts.
     The falsy-join test's "subject ... contain the slot facts" must assert the
     facts the design puts in the subject (date/time), and all facts in text/html.
     This is Decision 11's design ownership, pinned here.
  2. Falsy joinUrl branch: omit BOTH CTAs and their text lines AND neutralize the
     conflict placement logic unchanged; keep facts; no throw (AC-003-18).
  3. The enabled-path builders (`amountLine`, `buildLines`, `buildBody`) must not
     be edited for this design - new disabled-variant functions only, so AC-003-19
     byte-identity holds.
  4. Outlook desktop renders the button with squared corners under the
     padding-based pattern (Litmus). Accepted constraint cost: hand-built + lean
     beats VML markup; still fully clickable, readable, on-brand.

### Task 3: Client confirmation email (billing-disabled, Spanish)

- Layout: same single-column 600px skeleton as Task 2 (shared chrome), order:
  subject → preheader → wordmark → H1 → reassurance line → facts table → primary
  CTA → secondary CTA → help line → footer. The client's ONLY join path is this
  email, so the CTA instruction is spelled out in plain words right under the
  headline (reassurance-first, Moosend: reassuring copy reduces support tickets).
- Locked strings (banned-stem clean, dash-free):
  - Subject: `Tu reserva está confirmada: {date} {startTime}` (44 chars with
    fixture; "say what happened" per Sendlayer, ≤50 per Postmark, searchable
    identifier = the slot).
  - Preheader: `Los detalles de tu sesión y cómo entrar, en este correo.`
    (extends the subject, does not repeat it - Enchant).
  - H1: `Tu reserva está confirmada`
  - Reassurance line (under H1, 16px `#52525b`): `Para entrar a la sesión, usa el
botón de abajo a la hora indicada.`
  - Fact rows: `Fecha`, `Hora ({tz})`, `Duración` - same resolutions and the same
    grammar-aware duration rule as Task 2.
  - Primary CTA label: `Unirse a la reunión` (identical button spec as Task 2).
  - Secondary CTA label: `Añadir a Google Calendar` (byte-exact, pinned).
  - Help line (below the CTAs, hairline separated): `¿Dudas o necesitas cambiar la
hora? Responde a este correo.` (Sendlayer: a real reply route, no no-reply
    dead-end; the owner's mailbox answers).
  - Footer: `RexiAI` wordmark, `#71717a` 13px.
- Components: byte-identical button/link/table CSS specs to Task 2 (one design,
  two variants; the Coder may share a private block builder between Tasks 2-3
  disabled variants only - zero leakage into the enabled functions).
- Text part: `Tu reserva con RexiAI está confirmada.` / `Fecha: {date}` /
  `Hora ({tz}): {startTime}` / `Duración: {dur}` / `Enlace de la reunión: {joinUrl}` /
  `Añadir a Google Calendar: {calendarUrl}` / `¿Dudas? Responde a este correo.`
- Typography: same scale as Task 2. The service framing for the client is ONE
  calm sentence, not a positioning paragraph (skill 11.C: preserve voice; the
  product's voice is direct and human, see dictionary `hero.subtext`).
- Motion: static.
- A11y: same as Task 2; plus `assertClientSenderUsable` keeps failing loudly
  (design cannot hide the sandbox-sender condition from the operator - AC-003-26).
- Anti-patterns to avoid (specific): no fake urgency, no "we're excited to", no
  upsell, no promises the product doesn't keep (do NOT write "recibirás un
  recordatorio" - no reminder exists; do NOT claim environment prerequisites
  like "solo necesitas un navegador" - the owner's Brave/camera diagnostics are
  explicitly out of scope, don't re-open that wound in copy).
- Watch items (Coder must check):
  1. Same AC-003-24 subject-facts interpretation as Task 2 watch 1.
  2. Falsy joinUrl: both CTAs + their text lines omitted; the reassurance line's
     wording under a no-CTA state may drop the "botón de abajo" reference (defensive,
     unreachable via direct path; if kept it is a known cosmetic edge, not a defect -
     no scenario pins the preheader or reassurance in that branch).
  3. Enabled `buildClientLines`/`billingModelLines`/`buildClientBody` untouched
     (AC-003-25 byte-identity).

### Task 4: Billing-aware in-flight submit copy (es + en dictionary)

- Layout: none - label-only change inside the existing `.booking-submit` button
  (`BookingLayout.tsx:68-74` selection logic). Button visual DNA (pill, zinc-900,
  600 weight) untouched.
- Components (exact dictionary diff):
  - ADD `booking.form.submittingDirect` (key name per Decision 10's freedom):
    - es: `Enviando tu reserva...`
    - en: `Sending your reservation...`
    - existing `booking.form.submitting` stays byte-identical for the enabled path.
  - Selection: `fields.submitting ? (billingEnabled ? dict.booking.form.submitting
: dict.booking.form.submittingDirect) : (billingEnabled ? dict.booking.form.submit
: dict.freeMode.submit)` - the fail-safe default (`useSiteConfig` defaults
    `billingEnabled: true` when `/api/config` is unreachable) therefore keeps the
    Stripe wording automatically, satisfying AC-003-29's edge.
- Typography: existing button scale; copy is 23/25 chars, no wrap risk on the
  full-width button.
- Motion: none added (MOTION 2). The submitting state has no spinner today; do not
  add one - no CSS churn beyond the label.
- A11y: label swap on a `type=submit` button that is `disabled` while submitting;
  screen readers announce the change on the button's accessible name; three-dot
  `...` (ASCII) matches the existing convention, no dash characters, AC-001-05
  stays green.
- Anti-patterns to avoid (specific): do not write "Procesando pago..." (implies
  money) or "Reserva gratuita" (banned stem even here - the SPA invariant is
  narrower but professional discipline applies); do not mention Stripe; do not
  invent a new status panel - the button is the existing status surface.
- Watch items (Coder must check): dictionary-only, both locales non-empty, zero
  extra network requests (AC-003-31: reuse the single `useSiteConfig` fetch; no new
  fetch call at submit time).

### Task 5: Revised web confirmation panel (BookingConfirmation.tsx)

- Layout family: preserve - in-place status panel inside the unchanged
  `.booking-card` chrome (spec-002 design language kept): `role=status` wrapper,
  h3 title (keeps auto-focus, `titleRef` preserved), two-row `dl` (Fecha / Hora),
  refreshed note line. Removal is the redesign: no join anchor (Ask D).
- Components (exact dictionary diff):
  - REMOVE `booking.confirmation.joinLink` from BOTH `es` and `en` (Decision 6 /
    AC-003-34).
  - KEEP byte-stable: `title` ('Reserva confirmada' / 'Booking confirmed'),
    `dateLabel` ('Fecha' / 'Date'), `timeLabel` ('Hora' / 'Time').
  - REFRESH `note` (the only copy that must change - the join path moved to
    email, and the note is the panel's job):
    - es: `Te hemos enviado la confirmación por email, con el enlace para unirte a
la sesión.`
    - en: `We emailed your confirmation, including the link to join your session.`
  - Component change: delete the `confirmation.joinUrl ? <a>...` block; the
    `.booking-confirmation__cta` CSS rules (hover + focus-visible included) become
    dead styles and must be deleted with them (no dead/duplicated rules per repo
    CSS convention). `ConfirmationState.joinUrl` and the API shape stay (pinned).
- Typography: existing scale (title `--text-xl`/600, values `--text-sm2`, note
  `--text-sm`/zinc-600). Hierarchy reads: status → facts → next-step note. That is
  the calm professional order the owner asked for.
- Motion: existing 200ms reduced-motion-gated entrance kept (preserve a11y win;
  skill 6.B already satisfied). Nothing new.
- A11y: `role=status` announcement preserved; h3 focus preserved (tabIndex -1);
  removed CTA removes a tab stop - no regression for keyboard users; panel strings
  still match none of /billing|stripe|disabled|checkout/i (AC-003-33) - the new es
  note contains none of those and the en note contains "link"/"join" only.
- Anti-patterns to avoid (specific): do not replace the panel with a toast/modal
  (terminal in-place state is spec-002's established IA, skill 11.C); do not re-add
  any join affordance "just in case"; do not show the timezone in `timeLabel` (the
  panel has no tz source; the email carries it - inventing a config dependency for
  a label is scope creep).
- Watch items (Coder must check): AC-003-32/33 tests assert absence of the join
  anchor and its copy; the owner-authorized AC-002 test modifications are applied
  exactly as scoped in `10-tasks.md` §Global context and recorded in the PR body
  (stage 2/5b duty, restated so it is not lost); dictionary `_check` shape guard
  stays green (remove the key in BOTH locales).

## Out-of-scope tasks

None of the five tasks is fully outside this design - but the non-design engineering
surfaces the owner pinned and this file must not alter are: Task 1's URL mechanics
(param order/encoding/env-chain, `10-tasks.md` + Decision 7), Tasks 2-3's escaping
and mode-propagation contracts (AC-016/AC-018/AC-002 pins), the billing-enabled
variants of both emails (byte-for-byte frozen; every design decision above applies
to the disabled variants only), the direct-path API response shape, and the
`freeMode` banner/submit copy established by spec 002 (its `GRATIS` badge lives in
the SPA banner, not in any email, and is untouched by the banned-stem set which
targets disabled-mode emails).

PR: https://github.com/RexiAI/rexiAI/pull/69
Commits: 7
