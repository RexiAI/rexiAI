# 25 — Verification Report — 001-landing-booking

**Verifier:** spec-verifier (stage 4)
**Attempt:** 1, phase 1
**Date:** 2026-08-26
**Scope:** specs/001-landing-booking/10-tasks.md (13 tasks) + 20-acceptance/ (69 scenarios) vs implemented code under src/, api/, config/

> Verifier did NOT read specs/001-landing-booking/00-informal.md.

## Verdict: PASS

All five runnable gates PASS. WARNs are review hints, no FAILs.

| Gate | Result |
|------|--------|
| 1. Scenario traceability | PASS |
| 2. Full test suite | PASS |
| 3. Complexity gate | PASS (0 FAIL, 3 WARN) |
| 3.5 Design-principles gate | PASS (0 FAIL, 3 WARN) |
| 4. Scenario-to-behavior spot check | PASS |
| 5. No unaccounted behavior | PASS (no findings) |

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

 RUN  v4.1.11 /home/dbueno/projects/rexiAI

 ✓ src/__tests__/AC-010-email.test.ts > AC-010 > AC-010-01: Operator receives a complete booking summary 4ms
 ✓ src/__tests__/AC-010-email.test.ts > AC-010 > AC-010-02: Exactly one send per completed booking 1ms
 ✓ src/__tests__/AC-010-email.test.ts > AC-010 > AC-010-03: Provider failure propagates as retryable error 2ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-01: Completed payment triggers all three side effects once 6ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-02: Replayed event causes no duplicate side effects 1ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-03: Invalid signature rejected with zero side effects 1ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-04: Unrelated event types ignored 1ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-05: Calendar failure yields retryable response without email 1ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-06: Email failure after calendar success yields retryable response 2ms
 ✓ src/__tests__/AC-013-deployment-config.test.ts > AC-013 > AC-013-01: Committed availability config parses 43ms
 ✓ src/__tests__/AC-013-deployment-config.test.ts > AC-013 > AC-013-02: Environment template lists every backend variable with no secrets 1ms
 ✓ src/__tests__/AC-013-deployment-config.test.ts > AC-013 > AC-013-03: Serverless functions mounted alongside the SPA rewrite 1ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-01: Slots from weekly schedule 38ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-02: Weekday without an entry yields no slots 2ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-03: Blackout exception empties the day 2ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-04: Override exception replaces weekly slots 3ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-05: Window shorter than one hour yields no slots 2ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-06: Malformed YAML fails the load 2ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-07: Window with end not after start fails the load 2ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-08: Missing or mismatched timezone fails the load 2ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-09: Malformed time value fails the load 3ms
 ✓ src/__tests__/AC-005-free-hour.test.ts > AC-005 > AC-005-01: Unknown email is eligible 4ms
 ✓ src/__tests__/AC-005-free-hour.test.ts > AC-005 > AC-005-02: Customer without the flag is eligible 1ms
 ✓ src/__tests__/AC-005-free-hour.test.ts > AC-005 > AC-005-03: Customer with the flag is not eligible 1ms
 ✓ src/__tests__/AC-005-free-hour.test.ts > AC-005 > AC-005-04: Marking usage persists the flag 1ms
 ✓ src/__tests__/AC-005-free-hour.test.ts > AC-005 > AC-005-05: Stripe failure is never treated as eligible 1ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-01: First-timer one-hour booking creates a zero-euro checkout session 48ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-02: First-timer two-hour booking charges 30 EUR 3ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-03: Returning client pays full price 3ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-04: Invalid email rejected without calling Stripe 1ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-05: Invalid durations rejected without calling Stripe 3ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-06: Off-grid start time rejected 2ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-07: Start outside availability rejected 2ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-08: Conflicting existing booking rejected 3ms
 ✓ src/__tests__/AC-012-result-views.test.tsx > AC-012 > AC-012-01: Success view shows localized confirmation 95ms
 ✓ src/__tests__/AC-012-result-views.test.tsx > AC-012 > AC-012-02: Cancel view shows localized cancellation with a way back 138ms
 ✓ src/__tests__/AC-002-landing-content.test.tsx > AC-002 > AC-002-01: Hero displays localized catchphrase 256ms
 ✓ src/__tests__/AC-001-i18n.test.tsx > AC-001 > AC-001-01: Default language is Spanish 273ms
 ✓ src/__tests__/AC-002-landing-content.test.tsx > AC-002 > AC-002-02: Services section lists exactly four services 107ms
 ✓ src/__tests__/AC-002-landing-content.test.tsx > AC-002 > AC-002-03: Contact CTA is a mailto link 235ms
 ✓ src/__tests__/AC-002-landing-content.test.tsx > AC-002 > AC-002-04: Page structure has the four main sections 65ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-01: Selecting a date loads available slots 291ms
 ✓ src/__tests__/AC-001-i18n.test.tsx > AC-001 > AC-001-02: Switching to English 315ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-02: Duration control offers whole hours 1 to 4 only 386ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-03: Localized pricing rules are displayed 50ms
 ✓ src/__tests__/AC-001-i18n.test.tsx > AC-001 > AC-001-03: Switching back to Spanish 198ms
 ✓ src/__tests__/AC-001-i18n.test.tsx > AC-001 > AC-001-04: Language choice persists across reload 126ms
 ✓ src/__tests__/AC-001-i18n.test.tsx > AC-001 > AC-001-05: No hardcoded user-facing strings in components 36ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-01: Open day returns YAML slots (filter with no busy) 3ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-02: Exact busy interval removes its slots 1ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-03: Partial-hour busy overlap blocks both touched slots 1ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-04: Blackout exception day returns empty 14ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-05: Past dates rejected 20ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-06: Malformed date rejected 21ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-07: Missing date parameter rejected 1ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-04: Valid submit posts to the API and redirects to Stripe 152ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-01: First-time client pricing table 2ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-02: Returning client pricing table 0ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-03: Zero hours rejected 0ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-04: Hours above maximum rejected 0ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-05: Negative hours rejected 0ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-06: Fractional hours rejected 0ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-05: Invalid email blocks submission without a request 162ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-06: Missing required fields block submission 109ms
 ✓ src/__tests__/AC-009-gcal-event.test.ts > AC-009 > AC-009-01: Summer times convert through CEST correctly 2ms
 ✓ src/__tests__/AC-009-gcal-event.test.ts > AC-009 > AC-009-02: Winter times convert through CET correctly 0ms
 ✓ src/__tests__/AC-009-gcal-event.test.ts > AC-009 > AC-009-03: Event carries the booking id property 1ms
 ✓ src/__tests__/AC-009-gcal-event.test.ts > AC-009 > AC-009-04: Duplicate suppression 1ms
 ✓ src/__tests__/AC-009-gcal-event.test.ts > AC-009 > AC-009-05: Calendar id and service-account credentials come from configuration 1ms

 Test Files  13 passed (13)
      Tests  69 passed (69)
   Start at  17:58:42
   Duration  3.48s (transform 1.46s, setup 1.57s, import 4.05s, tests 3.29s, environment 14.72s)

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
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-DUVvrM7X.css    0.27 kB │ gzip:  0.22 kB
dist/assets/index-CMsKek45.js   209.94 kB │ gzip: 65.74 kB
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

---------------------------------------------
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

---------------------------------------------
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

Test file: src/__tests__/AC-004-pricing.test.ts

| Scenario | Heading | Test ID | Assertion match |
|----------|---------|---------|-----------------|
| AC-004-01 | First-time client pricing table (1→0,2→3000,3→6000,4→9000) | AC-004-01 | expect(priceCents(1,true)).toEqual({ok:true,cents:0}) etc. — exact table — PASS |
| AC-004-02 | Returning client pricing table (1→3000…4→12000) | AC-004-02 | expect(priceCents(1,false))→3000 … 12000 — exact table — PASS |
| AC-004-03 | Zero hours rejected "at least 1 hour" | AC-004-03 | r=priceCents(0,true); ok false, message /at least 1 hour/i — PASS |
| AC-004-04 | Hours above max "at most 4 hours" | AC-004-04 | r=priceCents(5,true); message /at most 4 hours/i — PASS |
| AC-004-05 | Negative hours rejected | AC-004-05 | priceCents(-1) ok false — PASS (scenario says rejection, no specific message required) |
| AC-004-06 | Fractional hours rejected "whole hours" | AC-004-06 | priceCents(1.5) ok false, message /whole hours/i — PASS |

Verdict: assertions exactly encode the Given/When/Then — not just name match. Spot check PASS.

### Spot check 2: AC-008 Stripe webhook orchestration

Acceptance file: specs/001-landing-booking/20-acceptance/AC-008-stripe-webhook.md — headings AC-008-01 through AC-008-06

Test file: src/__tests__/AC-008-webhook.test.ts

| Scenario | Heading | Test ID | Assertion match |
|----------|---------|---------|-----------------|
| AC-008-01 | Completed payment triggers all three side effects once, 200 | AC-008-01 | mockMark×1 + mockCreateEvent×1 + mockSendEmail×1 + status 200 — PASS |
| AC-008-02 | Replayed event causes no duplicate side effects, 200 | AC-008-02 | second call with find=>true, createEvent still ×1, sendEmail ×1, status 200 — PASS |
| AC-008-03 | Invalid signature → 400 zero side effects | AC-008-03 | constructEvent throws, status 400, none of three mocks called — PASS |
| AC-008-04 | Unrelated event type ignored, 200 no side effects | AC-008-04 | type invoice.paid, status 200, mockMark not called — PASS |
| AC-008-05 | Calendar failure → 5xx without email | AC-008-05 | mockCreateEvent rejected, status 500, mockSendEmail not called — PASS |
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

