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

| # | Check | Command | Exit | Result |
|---|---|---|---|---|
| 1 | scenario traceability | `bash .standards/scripts/check-scenario-traceability.sh` (+ `--json`) | 0 | PASS — 15/15 live scenarios traced, every test reference resolves |
| 2 | full test suite | `npm test` (`vitest run --exclude '.standards/**'`) | 0 | PASS — 24 files / 136 tests passed, 0 skipped, 0 failed |
| 3 | complexity gate | `npm run lint` (ESLint, complexity ≤6) + `npx tsc -b` + `npm run build` | 0 / 0 / 0 | PASS |
| 4 | design-principles gate | `bash .standards/scripts/check-code-principles.sh -BaseRef main` (+ `--json`) | 0 | PASS — 0 FAIL, 1 WARN on this spec's change (unscoped full-tree run: exit 1, sole FAIL vendored/pre-existing — ruled out-of-scope, see Adjudication (a)) |
| 5 | scenario-to-behavior spot check | manual read + targeted `npx vitest run --reporter=verbose` | 0 | PASS — AC-002-08 and AC-002-16 assertions genuinely enforce their Then-clauses |
| — | no unaccounted behavior | (finding line, not a command) | — | CLEAN — every diff hunk traces to a task/scenario/design directive |

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
  "passes": ["AC-002-05 — traced to a test", "AC-002-06 — traced to a test", "AC-002-07 — traced to a test", "AC-002-08 — traced to a test", "AC-002-09 — traced to a test", "AC-002-10 — traced to a test", "AC-002-11 — traced to a test", "AC-002-12 — traced to a test", "AC-002-13 — traced to a test", "AC-002-14 — traced to a test", "AC-002-15 — traced to a test", "AC-002-16 — traced to a test", "AC-002-17 — traced to a test", "AC-002-18 — traced to a test", "AC-002-19 — traced to a test"],
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
  "warns": [{ "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:13): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {", "file": "./api/bookings.ts", "line": "13" }]
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
  "fails": [{ "message": "Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }],
  "warns": [{ "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "45" }, { "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "101" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "93" }, { "message": "Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75", "file": "./src/pages/Landing.tsx", "line": "13" }, { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22", "file": "./src/components/ServicesCarousel.tsx", "line": "32" }, { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79", "file": "./src/components/ServicesCarousel.tsx", "line": "54" }, { "message": "Method body >20 lines (node): ./api/bookings/recorded-billing.ts:222:244:?:KISS_LINES=24", "file": "./api/bookings/recorded-billing.ts", "line": "222" }, { "message": "Possible duplication (9x identical 4-line block, first at ./api/bookings/checkout.ts:26): date: string /startTime: string /hours: number /email: string", "file": "./api/bookings/checkout.ts", "line": "26" }, { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:304): startTime: string /hours: number /joinUrl?: string | null /date: string", "file": "./api/stripe-webhook.ts", "line": "304" }, { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:138): email: string /date: string /startTime: string /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "138" }, { "message": "Possible duplication (3x identical 4-line block, first at ./src/domain/microsoftGraph.ts:178): }) /if (!res.ok) { /const text = await res.text().catch(() => '') /headers: { Authorization: `Bearer ${token}` },", "file": "./src/domain/microsoftGraph.ts", "line": "178" }, { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: \"problem\", /docs: { /description: /meta: {", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "115" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:140): startTime: string /hours: number /amountTotal: number /date: string", "file": "./api/stripe-webhook.ts", "line": "140" }, { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "132" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:13): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {", "file": "./api/bookings.ts", "line": "13" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:116): .status(400) /.json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } }) /return false /res", "file": "./api/stripe-webhook.ts", "line": "116" }, { "message": "Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "133" }, { "message": "Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30", "file": "./.standards/ci/templates/archunit/OutboxArchRules.java", "line": "30" }, { "message": "Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33", "file": "./.standards/ci/templates/archunit/SagaArchRules.java", "line": "33" }, { "message": "SRP: possible god file (node) — ./api/stripe-webhook.ts: 621 lines, 14 methods (split by responsibility)", "file": "./api/stripe-webhook.ts", "line": "" }, { "message": "LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)", "file": "./src/domain/time.ts", "line": "" }]
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

command: npx vitest run --reporter=verbose src/__tests__/AC-002-direct-booking.test.ts src/__tests__/AC-002-frontend-confirmation.test.ts src/__tests__/AC-002-frontend-confirmation.render.test.tsx src/__tests__/AC-002-env-docs-cleanup.test.ts src/__tests__/AC-011-booking-ui.test.tsx
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

| Scenario clause | Test assertion | Enforced? |
|---|---|---|
| Given billing disabled | `process.env[BILLING_ENABLED] = 'false'` (line 249) | yes |
| Given `findOverlappingBookingId` → `'other-booking-id'` | `m.mockOverlap.mockResolvedValue('other-booking-id')` (250); generated id is `crypto.randomUUID()`, necessarily different | yes |
| Then 200 | `expect(res.status).toHaveBeenCalledWith(200)` (253) | yes |
| Then exactly the three-key body, no conflict flag in response | `expect(jsonBody(res)).toEqual(SUCCESS_BODY)` (254) where `SUCCESS_BODY = { checkoutUrl: null, joinUrl, billingDisabled: true }`; the handler builds a literal `{ checkoutUrl: null, joinUrl, billingDisabled: true }` (`api/bookings/direct.ts:140` — read, no extra/undefined keys possible), so the toEqual is exact against the real construction | yes |
| Then calendar event created and client email sent | `toHaveBeenCalledTimes(1)` on both mocks (255-256) | yes |
| Then `sendOperatorEmail` receives `slotConflictWith: 'other-booking-id'` | `expect(m.mockSendOperatorEmail.mock.calls[0][0].slotConflictWith).toBe('other-booking-id')` (257) | yes |

Not a name-match: the test drives the REAL production handler (`import bookingsHandler
from '../../api/bookings'`; only `hasConflict` stubbed, validation path real) and every
Then-clause has a value-level assertion. The production flag path is also confirmed by
read: `detectSlotConflict` returns the overlap only when `overlap && overlap !== bookingId`
(direct.ts:47) and `notifyOperator` spreads `slotConflictWith` only when non-empty
(direct.ts:84).

### AC-002-16 — `src/__tests__/AC-002-frontend-confirmation.test.ts:70-92`

| Scenario clause | Test assertion | Enforced? |
|---|---|---|
| Given form holds date `2027-03-01`, slot `10:00`, valid email, hours `1` | `fillValid()` sets exactly those (47-49); hours comes from the hook default `useState<number>(1)` (`useBookingFields.ts:10` — read) | yes |
| Given fetch resolves ok/200 with `{ checkoutUrl: null, joinUrl: 'https://meet.jit.si/rexi-test', billingDisabled: true }` | `makeFetchMock({ ok: true, body: BOOKINGS_RESPONSE.json() })` + `vi.stubGlobal` (71-72); response body is the scenario's exact triple (15-23) | yes |
| When the submit handler runs | `result.current.submit(submitEvent())` inside `act` on the REAL hooks `useBookingFields` + `useBookingSubmit` (33-39, 76-78) | yes |
| Then `window.location.href` never assigned | location swapped for `{ href: '' }` (AC-011 pattern, 59-61) and `expect(window.location.href).toBe('')` after submit (84) | yes |
| Then no error state set | `conflictError === ''` (85) and `errors toEqual({})` (86) | yes |
| Then confirmation non-null and equals `{ date, startTime, joinUrl }` from submitted fields + response | `expect(fields.confirmation).toEqual({ date: '2027-03-01', startTime: '10:00', joinUrl: 'https://meet.jit.si/rexi-test' })` (87-91) | yes |

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
