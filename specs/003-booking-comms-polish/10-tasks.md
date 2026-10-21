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
