# 25-verification.md — Verifier report (spec 007-client-requested-reschedule)

Stage 4 (Verifier) independent re-verification of stages 2–3.
Branch: `spec/007-client-requested-reschedule`. Attempt 1, phase 1.
Worked from `10-tasks.md`, `20-acceptance/*.md`, and `15-design.md` only (never
`00-informal.md`).

## Overall verdict

**PASS** — every gate attributable to this branch's diff is clean. Two
out-of-scope findings are recorded below and not fixed (per instruction): a
vendored-submodule design-principles FAIL (environmental, byte-identical
pre/post this branch) and a pre-existing scenario-ID collision in a tracked test
file. Neither is attributable to this branch; both are flagged for follow-up.

Gate-by-gate:

| Gate | Result | Exit | Attribution |
|---|---|---|---|
| Scenario traceability | PASS | 0 | 50/50 scenarios traced; all references resolve |
| Full test suite | PASS | 0 | 519 passed, 1 skipped (pre-existing LIVE-gated test) |
| Complexity (ESLint) | PASS | 0 | 0 errors, 10 warnings (e2e `no-console`, pre-existing) |
| Design-principles | PASS (scoped) | 1 plain / 0 blame-scoped | plain FAIL is vendored submodule content, not this diff |
| Scenario-to-behavior spot check | PASS | — | 3 scenarios verified, assertions match |

## Evidence: scenario traceability

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-10-28T16:41:16Z

{
  "checks": [1, 2],
  "passes": ["AC-007-01 — traced to a test", "AC-007-02 — traced to a test", "AC-007-03 — traced to a test", "AC-007-04 — traced to a test", "AC-007-05 — traced to a test", "AC-007-06 — traced to a test", "AC-007-07 — traced to a test", "AC-007-08 — traced to a test", "AC-007-09 — traced to a test", "AC-007-10 — traced to a test", "AC-007-11 — traced to a test", "AC-007-12 — traced to a test", "AC-007-13 — traced to a test", "AC-007-14 — traced to a test", "AC-007-15 — traced to a test", "AC-007-16 — traced to a test", "AC-007-17 — traced to a test", "AC-007-18 — traced to a test", "AC-007-19 — traced to a test", "AC-007-20 — traced to a test", "AC-007-21 — traced to a test", "AC-007-22 — traced to a test", "AC-007-23 — traced to a test", "AC-007-24 — traced to a test", "AC-007-25 — traced to a test", "AC-007-26 — traced to a test", "AC-007-27 — traced to a test", "AC-007-28 — traced to a test", "AC-007-29 — traced to a test", "AC-007-30 — traced to a test", "AC-007-31 — traced to a test", "AC-007-32 — traced to a test", "AC-007-33 — traced to a test", "AC-007-34 — traced to a test", "AC-007-35 — traced to a test", "AC-007-36 — traced to a test", "AC-007-37 — traced to a test", "AC-007-38 — traced to a test", "AC-007-39 — traced to a test", "AC-007-40 — traced to a test", "AC-007-41 — traced to a test", "AC-007-42 — traced to a test", "AC-007-43 — traced to a test", "AC-007-44 — traced to a test", "AC-007-45 — traced to a test", "AC-007-46 — traced to a test", "AC-007-47 — traced to a test", "AC-007-48 — traced to a test", "AC-007-49 — traced to a test", "AC-007-50 — traced to a test"],
  "fails": []
}

Note: an early invocation of this script transiently reported one dangling
`AC-005-02` reference (exit 1). That did not reproduce across three subsequent
runs. Investigation confirmed `AC-005-02` is a valid heading in
`docs/changes/001-landing-booking.md:446` (spec 001 numbers scenarios per TASK,
so its archive owns headings `AC-001`…`AC-017`, including `AC-005-01`…`AC-005-05`).
The reference therefore resolves; the transient was a race with the parallel
orchestrator's filesystem activity in the shared working tree. The current
clean state is deterministic (3× exit 0).

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-28T16:34:00Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 Test Files  70 passed (70)
      Tests  519 passed | 1 skipped (520)

The one skipped test is `describe.skipIf(!LIVE)('live: the bot joins a room and
records a real participant', …)` in `src/__tests__/AC-006-bot-adapter.test.ts`
(line 705) — a pre-existing live-environment test gated behind the `LIVE` env
var, in a file unchanged from `main`. It is a documented conditional skip, not a
silently-disabled acceptance test. No `AC-007` test uses `.skip`/`.skipIf`.

## Evidence: complexity gate

command: npm run lint
exit: 0
at: 2026-10-28T16:38:00Z

> rexiai-website@0.0.0 lint
> eslint .

✖ 10 problems (0 errors, 10 warnings)

All 10 warnings are `no-console` in `tests/e2e/*.e2e.ts` (funnel-consent-boundary,
home-timer-scan, switch-refusal). No `complexity` (≤6, eslint.config.cjs:51)
violations anywhere, and the changed `api/**` and `src/**` files are linted (not
in the ignore list). Type-check gate also confirmed clean separately:
`npx tsc -b --pretty false` → exit 0.

## Evidence: design-principles gate

Two runs recorded. The plain run is the full-tree scan; the `-BaseRef main` run
is the script's own blame-scoping mode (judges only this branch's diff), used to
answer the attribution question the prior stages raised.

### Plain run (full tree)

command: .standards/scripts/check-code-principles.sh --json
exit: 1
at: 2026-10-28T16:40:00Z

{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [{ "message": "Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }],
  "warns": [{ "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "45" }, { "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "101" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "93" }, { "message": "Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75", "file": "./src/pages/Landing.tsx", "line": "13" }, { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22", "file": "./src/components/ServicesCarousel.tsx", "line": "32" }, { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79", "file": "./src/components/ServicesCarousel.tsx", "line": "54" }, { "message": "Method body >20 lines (node): ./api/stripe-webhook.ts:141:160:getRawBookingFields:KISS_LINES=21", "file": "./api/stripe-webhook.ts", "line": "141" }, { "message": "Method body >20 lines (node): ./api/bookings/checkout.ts:44:65:buildSessionParams:KISS_LINES=23", "file": "./api/bookings/checkout.ts", "line": "44" }, { "message": "Method body >20 lines (node): ./api/bookings/recorded-billing.ts:218:240:?:KISS_LINES=24", "file": "./api/bookings/recorded-billing.ts", "line": "218" }, { "message": "Method body >20 lines (python): ./scripts/recording/whisper_transcribe.py:37:64:main:KISS_LINES=23 [approximate heuristic — comprehension/decorator forms can inflate the count; ADR 0006 warn phase]", "file": "./scripts/recording/whisper_transcribe.py", "line": "37" }, { "message": "Possible duplication (11x identical 4-line block, first at ./api/bookings.ts:18): date: string /startTime: string /hours: number /email: string", "file": "./api/bookings.ts", "line": "18" }, { "message": "Possible duplication (5x identical 4-line block, first at ./api/stripe-webhook.ts:277): startTime: string /hours: number /joinUrl?: string | null /date: string", "file": "./api/stripe-webhook.ts", "line": "277" }, { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:115): email: string /date: string /startTime: string /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "115" }, { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: \"problem\", /docs: { /description: /meta: {", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "115" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:19): startTime: string /hours: number /locale?: Locale /date: string", "file": "./api/bookings.ts", "line": "19" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:117): startTime: string /hours: number /amountTotal: number /date: string", "file": "./api/stripe-webhook.ts", "line": "117" }, { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "132" }, { "message": "Possible duplication (3x identical 4-line block, first at ./src/domain/email.ts:160): date: string /startTime: string /hours: number /clientEmail: string", "file": "./src/domain/email.ts", "line": "160" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:446): date: string /startTime: string /hours: number /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "446" }, { "message": "Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "133" }, { "message": "Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30", "file": "./.standards/ci/templates/archunit/OutboxArchRules.java", "line": "30" }, { "message": "Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33", "file": "./.standards/ci/templates/archunit/SagaArchRules.java", "line": "33" }, { "message": "SRP: possible god file (node) — ./api/stripe-webhook.ts: 610 lines, 8 methods (split by responsibility)", "file": "./api/stripe-webhook.ts", "line": "" }, { "message": "LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)", "file": "./src/domain/time.ts", "line": "" }]
}

### Blame-scoped run (this branch's diff only)

command: .standards/scripts/check-code-principles.sh -BaseRef main --json
exit: 0
at: 2026-10-28T16:40:20Z

{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [],
  "warns": [{ "message": "Method body >20 lines (node): ./api/stripe-webhook.ts:141:160:getRawBookingFields:KISS_LINES=21", "file": "./api/stripe-webhook.ts", "line": "141" }, { "message": "Method body >20 lines (node): ./api/bookings/checkout.ts:44:65:buildSessionParams:KISS_LINES=23", "file": "./api/bookings/checkout.ts", "line": "44" }, { "message": "Method body >20 lines (node): ./api/bookings/recorded-billing.ts:218:240:?:KISS_LINES=24", "file": "./api/bookings/recorded-billing.ts", "line": "218" }, { "message": "Possible duplication (11x identical 4-line block, first at ./api/bookings.ts:18): date: string /startTime: string /hours: number /email: string", "file": "./api/bookings.ts", "line": "18" }, { "message": "Possible duplication (5x identical 4-line block, first at ./api/stripe-webhook.ts:277): startTime: string /hours: number /joinUrl?: string | null /date: string", "file": "./api/stripe-webhook.ts", "line": "277" }, { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:115): email: string /date: string /startTime: string /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "115" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:19): startTime: string /hours: number /locale?: Locale /date: string", "file": "./api/bookings.ts", "line": "19" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:117): startTime: string /hours: number /amountTotal: number /date: string", "file": "./api/stripe-webhook.ts", "line": "117" }, { "message": "Possible duplication (3x identical 4-line block, first at ./src/domain/email.ts:160): date: string /startTime: string /hours: number /clientEmail: string", "file": "./src/domain/email.ts", "line": "160" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:446): date: string /startTime: string /hours: number /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "446" }, { "message": "SRP: possible god file (node) — ./api/stripe-webhook.ts: 610 lines, 8 methods (split by responsibility)", "file": "./api/stripe-webhook.ts", "line": "" }]
}

### Attribution determination

The plain run's single FAIL — `Cyclomatic complexity >6 (node):
./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7` (CC=10) — is
**environmental, not attributable to this branch**:

1. `git diff --name-only main...HEAD` contains no path under
   `.standards/skills/hallmark/`.
2. `git diff main...HEAD -- .standards/skills/hallmark/site/examples/cobalt-01/script.js`
   is empty — byte-identical pre/post this branch.
3. The blame-scoped run (`-BaseRef main`) exits 0 with `fails: []` — zero
   diff-introduced FAILs.

The blame-scoped run's 11 WARNs (KISS method-length, DRY 4-line duplication,
SRP god-file in `api/stripe-webhook.ts`) are review hints in files this branch
touched. None is a FAIL (KISS/DRY/SOLID are outside the default blocking set
`complexity,property-tests,component-per-file`). Flagged to the Architect below.

## Evidence: scenario-to-behavior spot check

command: (manual read of scenario .md vs test assertions)
exit: 0
at: 2026-10-28T16:41:16Z

Three scenarios checked at random; each test's assertions were read directly
against the scenario's Given/When/Then.

1. **AC-007-25 — wrong/expired/rotated token → one generic 404.** Scenario
   requires byte-identical responses across the three causes, code
   `INVALID_RESCHEDULE_TOKEN`, and no calendar move.
   `src/__tests__/AC-007-reschedule-api.test.ts:179` pushes the three bodies and
   asserts `new Set(bodies).size === 1`, `error.code === 'INVALID_RESCHEDULE_TOKEN'`,
   and `cal.mockMove` not called. Matches.
2. **AC-007-13 — move writes the new token and increments the count.** Scenario:
   token T0→T1, count "0"→"1". `src/__tests__/AC-007-calendar-move.test.ts:182`
   asserts `written[RESCHEDULE_TOKEN_PROPERTY_ID] === TOKEN_T1` and
   `written[RESCHEDULE_COUNT_PROPERTY_ID] === '1'`. Matches.
3. **AC-007-34 — operator-notification failure returns 5xx, move stands (D5).**
   Scenario requires 5xx (never silent), no rollback, logged.
   `src/__tests__/AC-007-reschedule-emails.test.ts:239` asserts status ≥500,
   `cal.mockMove` called exactly once, `console.error` containing the upstream
   detail. Matches.

No false green found: each checked test asserts the scenario's actual behavior,
not merely a same-ID placeholder.


## No unaccounted behavior

Skimmed the full diff (17 modified files + new files) against Tasks 1–8 and the
documented decisions D1–D7. Finding: **none unaccounted.**

- New domain modules (`rescheduleToken.ts`, `rescheduleUrl.ts`, `reschedule.ts`,
  `graphEventProperties.ts`, `rescheduleEmail.ts`) each map to a task (T1, T7,
  T4, T2, T6 respectively) and carry a header comment citing it.
- `api/reschedule.ts` + `api/reschedule/{resolve,submit,booking,errors}.ts` map
  to T5; `routeGuards.ts` and `errorText.ts` are DRY consolidations of the 405/
  429 envelope and the `errMsg`/`errorText` helper that six pre-existing handlers
  each owned a copy of (their headers say so) — legitimate refactor, not new
  behavior.
- `deploy/reschedule/{index.html,README.md}` map to T8 (the page document +
  hosting contract).
- The `AC-003-*` and `AC-006-*` test edits are the decision-D3 byte-freeze
  authorization (help line shortened, reschedule link inserted; scenario IDs
  preserved verbatim).

## Out-of-scope findings (recorded, not fixed — per instruction)

1. **Vendored design-principles FAIL (environmental).** Plain-run FAIL at
   `.standards/skills/hallmark/site/examples/cobalt-01/script.js:7` (CC=10) lives
   in the `.standards/` submodule's vendored example content, byte-identical
   pre/post this branch, and is absent from the blame-scoped run (exit 0). Not
   this branch's defect. Recommendation: exclude `.standards/**` from the
   design-principles scan, or downgrade vendored example content.
2. **Scenario-ID collision in a pre-existing tracked test.**
   `src/__tests__/AC-007-bookings.test.ts` is tracked on `main` (unchanged by
   this branch) and carries `AC-007-01`…`AC-007-08` with *bookings* semantics
   (free-hour billing, email/duration/off-grid/availability/conflict
   validation), while this spec's `AC-007-01`…`AC-007-08` are *token / token-
   store / calendar-move* scenarios. Both resolve under the mechanical gate
   (the IDs exist in the in-flight scenarios), so the gate does not flag it —
   but the same ID now names two unrelated behaviors. Pre-existing; recorded,
   not touched. Recommendation: renumber one side in a follow-up spec.
3. **Design-principles WARNs in touched files** (flag to Architect, non-blocking):
   KISS method-length in `api/stripe-webhook.ts:141`, `api/bookings/checkout.ts:44`,
   `api/bookings/recorded-billing.ts:218`; DRY 4-line booking-state-shape
   duplication (`api/bookings.ts`, `api/stripe-webhook.ts`, `src/domain/email.ts`);
   SRP god-file `api/stripe-webhook.ts` (610 lines, 8 methods). WARN = review
   hint, not a stop.

## Remediation budget

Attempt 1, phase 1: initial full run — no BLOCK, no code/design-gate FAIL
attributable to this branch.
Attempt 2, phase 1 (SPEC_PHASE1_RETRIES=1): one report-format FAIL from
`check-audit-trail.sh` (evidence-block heading mismatch for the complexity gate);
fixed by renaming the heading; re-run exits 0. Budget not consumed (the finding
was report formatting, not a code/design defect).


## Scoped re-verification — attempt 2, phase 1 (audit-trail gate)

Reason: `scripts/check-audit-trail.sh 007-client-requested-reschedule` exited 1
with a single FAIL — `no evidence block for 'complexity gate'` — because the
heading `## Evidence: complexity gate (ESLint)` carried a `(ESLint)` suffix that
broke the gate's case-insensitive exact match against the literal
`complexity gate`. The evidence content was correct; only the heading was wrong.

Fix: renamed the heading to exactly `## Evidence: complexity gate` (the raw
output block below it is unchanged).

command: bash .standards/scripts/check-audit-trail.sh 007-client-requested-reschedule
exit: 0
at: 2026-10-28T16:49:53Z

PASS 007-client-requested-reschedule: 10-tasks.md present and non-empty
PASS 007-client-requested-reschedule: 20-acceptance/ has an AC-*.md with a '## AC-NNN-NN' heading (AC-015-10)
PASS 007-client-requested-reschedule: 25-verification.md present and non-empty
PASS 007-client-requested-reschedule: 30-report.md present and non-empty
PASS 007-client-requested-reschedule: 15-design.md present and non-empty (AC-015-13)
PASS 007-client-requested-reschedule: evidence block 'scenario traceability' — command: .standards/scripts/check-scenario-traceability.sh --json, exit: 0, at: 2026-10-28T16:41:16Z
PASS 007-client-requested-reschedule: evidence block 'full test suite' — command: npm test, exit: 0, at: 2026-10-28T16:34:00Z
PASS 007-client-requested-reschedule: evidence block 'complexity gate' — command: npm run lint, exit: 0, at: 2026-10-28T16:38:00Z
PASS 007-client-requested-reschedule: evidence block 'design-principles gate' — command: .standards/scripts/check-code-principles.sh --json, exit: 1, at: 2026-10-28T16:40:00Z
PASS 007-client-requested-reschedule: evidence block 'scenario-to-behavior spot check' — command: (manual read of scenario .md vs test assertions), exit: 0, at: 2026-10-28T16:41:16Z
✔ Audit-trail check: specs/007-client-requested-reschedule complete, verifier evidence recorded.

The prior FAIL is gone: the audit-trail gate now exits 0. No other gate re-run —
this was scoped to the audit-trail gate per the re-verification discipline.

