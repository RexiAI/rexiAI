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

 RUN  v4.1.11 /home/dbueno/projects/rexiAI

 ✓ src/__tests__/AC-010-email.test.ts > AC-010 > AC-010-01: Operator receives a complete booking summary 5ms
 ✓ src/__tests__/AC-010-email.test.ts > AC-010 > AC-010-02: Exactly one send per completed booking 1ms
 ✓ src/__tests__/AC-010-email.test.ts > AC-010 > AC-010-03: Provider failure propagates as retryable error 2ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-01: Completed payment triggers all three side effects once 6ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-02: Replayed event causes no duplicate side effects 2ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-03: Invalid signature rejected with zero side effects 2ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-04: Unrelated event types ignored 1ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-05: Calendar failure yields retryable response without email 1ms
 ✓ src/__tests__/AC-008-webhook.test.ts > AC-008 > AC-008-06: Email failure after calendar success yields retryable response 2ms
 ✓ src/__tests__/AC-013-deployment-config.test.ts > AC-013 > AC-013-01: Committed availability config parses 36ms
 ✓ src/__tests__/AC-013-deployment-config.test.ts > AC-013 > AC-013-02: Environment template lists every backend variable with no secrets 1ms
 ✓ src/__tests__/AC-013-deployment-config.test.ts > AC-013 > AC-013-03: Serverless functions mounted alongside the SPA rewrite 1ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-01: Slots from weekly schedule 38ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-02: Weekday without an entry yields no slots 1ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-03: Blackout exception empties the day 1ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-04: Override exception replaces weekly slots 1ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-05: Window shorter than one hour yields no slots 1ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-06: Malformed YAML fails the load 2ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-07: Window with end not after start fails the load 1ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-08: Missing or mismatched timezone fails the load 2ms
 ✓ src/__tests__/AC-003-availability-config.test.ts > AC-003 > AC-003-09: Malformed time value fails the load 2ms
 ✓ src/__tests__/AC-005-free-hour.test.ts > AC-005 > AC-005-01: Unknown email is eligible 4ms
 ✓ src/__tests__/AC-005-free-hour.test.ts > AC-005 > AC-005-02: Customer without the flag is eligible 1ms
 ✓ src/__tests__/AC-005-free-hour.test.ts > AC-005 > AC-005-03: Customer with the flag is not eligible 0ms
 ✓ src/__tests__/AC-005-free-hour.test.ts > AC-005 > AC-005-04: Marking usage persists the flag 1ms
 ✓ src/__tests__/AC-005-free-hour.test.ts > AC-005 > AC-005-05: Stripe failure is never treated as eligible 3ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-01: First-timer one-hour booking creates a zero-euro checkout session 44ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-02: First-timer two-hour booking charges 30 EUR 3ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-03: Returning client pays full price 2ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-04: Invalid email rejected without calling Stripe 1ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-05: Invalid durations rejected without calling Stripe 1ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-06: Off-grid start time rejected 3ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-07: Start outside availability rejected 2ms
 ✓ src/__tests__/AC-007-bookings.test.ts > AC-007 > AC-007-08: Conflicting existing booking rejected 2ms
 ✓ src/__tests__/AC-012-result-views.test.tsx > AC-012 > AC-012-01: Success view shows localized confirmation 109ms
 ✓ src/__tests__/AC-012-result-views.test.tsx > AC-012 > AC-012-02: Cancel view shows localized cancellation with a way back 128ms
 ✓ src/__tests__/AC-002-landing-content.test.tsx > AC-002 > AC-002-01: Hero displays localized catchphrase 246ms
 ✓ src/__tests__/AC-002-landing-content.test.tsx > AC-002 > AC-002-02: Services section lists exactly four services 91ms
 ✓ src/__tests__/AC-001-i18n.test.tsx > AC-001 > AC-001-01: Default language is Spanish 249ms
 ✓ src/__tests__/AC-002-landing-content.test.tsx > AC-002 > AC-002-03: Contact CTA is a mailto link 197ms
 ✓ src/__tests__/AC-002-landing-content.test.tsx > AC-002 > AC-002-04: Page structure has the four main sections 68ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-01: Selecting a date loads available slots 277ms
 ✓ src/__tests__/AC-001-i18n.test.tsx > AC-001 > AC-001-02: Switching to English 285ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-02: Duration control offers whole hours 1 to 4 only 410ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-03: Localized pricing rules are displayed 56ms
 ✓ src/__tests__/AC-001-i18n.test.tsx > AC-001 > AC-001-03: Switching back to Spanish 184ms
 ✓ src/__tests__/AC-001-i18n.test.tsx > AC-001 > AC-001-04: Language choice persists across reload 150ms
 ✓ src/__tests__/AC-001-i18n.test.tsx > AC-001 > AC-001-05: No hardcoded user-facing strings in components 30ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-01: Open day returns YAML slots (filter with no busy) 2ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-02: Exact busy interval removes its slots 0ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-03: Partial-hour busy overlap blocks both touched slots 0ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-04: Blackout exception day returns empty 8ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-05: Past dates rejected 17ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-06: Malformed date rejected 1ms
 ✓ src/__tests__/AC-006-availability-api.test.ts > AC-006 > AC-006-07: Missing date parameter rejected 1ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-04: Valid submit posts to the API and redirects to Stripe 103ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-01: First-time client pricing table 2ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-02: Returning client pricing table 0ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-03: Zero hours rejected 1ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-04: Hours above maximum rejected 0ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-05: Negative hours rejected 0ms
 ✓ src/__tests__/AC-004-pricing.test.ts > AC-004 > AC-004-06: Fractional hours rejected 0ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-05: Invalid email blocks submission without a request 172ms
 ✓ src/__tests__/AC-011-booking-ui.test.tsx > AC-011 > AC-011-06: Missing required fields block submission 106ms
 ✓ src/__tests__/AC-009-gcal-event.test.ts > AC-009 > AC-009-01: Summer times convert through CEST correctly 2ms
 ✓ src/__tests__/AC-009-gcal-event.test.ts > AC-009 > AC-009-02: Winter times convert through CET correctly 0ms
 ✓ src/__tests__/AC-009-gcal-event.test.ts > AC-009 > AC-009-03: Event carries the booking id property 1ms
 ✓ src/__tests__/AC-009-gcal-event.test.ts > AC-009 > AC-009-04: Duplicate suppression 0ms
 ✓ src/__tests__/AC-009-gcal-event.test.ts > AC-009 > AC-009-05: Calendar id and service-account credentials come from configuration 0ms

 Test Files  13 passed (13)
      Tests  69 passed (69)
   Start at  18:02:29
   Duration  3.54s (transform 1.60s, setup 1.67s, import 4.20s, tests 3.11s, environment 15.18s)

## Remediation record

No BLOCK occurred during the run.

- Phase 1 (pre-PR loop): 0 BLOCKs — Verifier attempt 1, phase 1, verdict PASS (25-verification.md: Attempt 1, phase 1, gatesFailed: [], warnings: 3 DRY WARNs). No remediation needed, no re-delegation.
- Phase 2 (post-PR loop): not yet entered — PR not yet opened (PR Opener is stage 5b, runs after this report).
- Overall: remediation budget 3/3 remaining in both phases; no attempt count consumed.

Carried forward from 25-verification.md attempt entry and Verifier's telemetry record (gatesFailed: [], outcome: pass).

## Telemetry

Recorded via .standards/scripts/record-gate-run.sh if present — see command below.

PR:
