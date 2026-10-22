# 25-verification.md — Spec 005: Home-hosted recording on this WSL machine

Stage 4 (Verifier) artifact. Attempt 1, phase 1 (no phase-1 or phase-2 retries yet).
Verified against `10-tasks.md` + `20-acceptance/` only. `00-informal.md` was not read.

Branch: `spec/005-home-hosted-recording`. Verdict: **PASS** (see §Design-principles
adjudication for one out-of-scope, non-blocking FAIL recorded per the Stop-and-Ask
matrix).

---

## Evidence: scenario traceability

command: bash .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-10-22T14:12:40Z

{
  "checks": [1, 2],
  "passes": ["AC-005-06 — traced to a test", "AC-005-07 — traced to a test", "AC-005-08 — traced to a test", "AC-005-09 — traced to a test", "AC-005-10 — traced to a test", "AC-005-11 — traced to a test", "AC-005-12 — traced to a test", "AC-005-13 — traced to a test", "AC-005-14 — traced to a test", "AC-005-15 — traced to a test", "AC-005-16 — traced to a test", "AC-005-17 — traced to a test", "AC-005-18 — traced to a test", "AC-005-19 — traced to a test", "AC-005-20 — traced to a test", "AC-005-21 — traced to a test", "AC-005-22 — traced to a test", "AC-005-23 — traced to a test", "AC-005-24 — traced to a test", "AC-005-25 — traced to a test", "AC-005-26 — traced to a test", "AC-005-27 — traced to a test", "AC-005-28 — traced to a test", "AC-005-29 — traced to a test", "AC-005-30 — traced to a test", "AC-005-31 — traced to a test", "AC-005-32 — traced to a test", "AC-005-33 — traced to a test", "AC-005-34 — traced to a test", "AC-005-35 — traced to a test", "AC-005-36 — traced to a test", "AC-005-37 — traced to a test", "AC-005-38 — traced to a test", "AC-005-39 — traced to a test", "AC-005-40 — traced to a test", "AC-005-41 — traced to a test", "AC-005-42 — traced to a test", "AC-005-43 — traced to a test", "AC-005-44 — traced to a test", "AC-005-45 — traced to a test", "AC-005-46 — traced to a test", "AC-005-47 — traced to a test", "AC-005-48 — traced to a test", "AC-005-49 — traced to a test", "AC-005-50 — traced to a test", "AC-005-51 — traced to a test", "AC-005-52 — traced to a test"],
  "fails": []
}

Result: 47/47 scenario IDs (AC-005-06 … AC-005-52) traced to a test, 0 fails, exit 0.
PASS.

---

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-22T14:12:40Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  47 passed (47)
      Tests  287 passed (287)
   Start at  16:11:01
   Duration  10.87s (environment 69%, tests 15%, setup 7%, transform 5%, import 3%, worker 1%)

Environment  jsdom was created 47 times · 69.51s total, 69% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

Result: 47 test files passed, 287 tests passed, exit 0. No skipped/disabled tests.
PASS.

---

## Evidence: complexity gate

command: npm run lint
exit: 0
at: 2026-10-22T14:12:40Z

> rexiai-website@0.0.0 lint
> eslint .

/home/dbueno/projects/rexiAI/tests/e2e/funnel-consent-boundary.e2e.ts
  30:5  warning  Unexpected console statement  no-console
  34:3  warning  Unexpected console statement  no-console
  63:5  warning  Unexpected console statement  no-console
  92:3  warning  Unexpected console statement  no-console

/home/dbueno/projects/rexiAI/tests/e2e/home-timer-scan.e2e.ts
  35:5  warning  Unexpected console statement  no-console
  39:3  warning  Unexpected console statement  no-console
  90:3  warning  Unexpected console statement  no-console

/home/dbueno/projects/rexiAI/tests/e2e/switch-refusal.e2e.ts
  30:5  warning  Unexpected console statement  no-console
  34:3  warning  Unexpected console statement  no-console
  81:3  warning  Unexpected console statement  no-console

✖ 10 problems (0 errors, 10 warnings)

Result: ESLint `complexity: ['error', 6]` (eslint.config.cjs:51) produced 0 errors
(no cyclomatic-complexity violations anywhere in the changed files), 10 `no-console`
warnings confined to the three Task-9 e2e journey files (journeys print to stdout by
design). Exit 0. PASS.

---

## Evidence: design-principles gate

command: bash .standards/scripts/check-code-principles.sh --json
exit: 1
at: 2026-10-22T14:12:40Z

{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [{ "message": "Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }],
  "warns": [{ "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "45" }, { "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "101" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "93" }, { "message": "Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75", "file": "./src/pages/Landing.tsx", "line": "13" }, { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22", "file": "./src/components/ServicesCarousel.tsx", "line": "32" }, { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79", "file": "./src/components/ServicesCarousel.tsx", "line": "54" }, { "message": "Method body >20 lines (node): ./api/bookings/recorded-billing.ts:222:244:?:KISS_LINES=24", "file": "./api/bookings/recorded-billing.ts", "line": "222" }, { "message": "Possible duplication (9x identical 4-line block, first at ./api/bookings/checkout.ts:26): date: string /startTime: string /hours: number /email: string", "file": "./api/bookings/checkout.ts", "line": "26" }, { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:304): startTime: string /hours: number /joinUrl?: string | null /date: string", "file": "./api/stripe-webhook.ts", "line": "304" }, { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:138): email: string /date: string /startTime: string /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "138" }, { "message": "Possible duplication (3x identical 4-line block, first at ./src/domain/microsoftGraph.ts:178): }) /if (!res.ok) { /const text = await res.text().catch(() => '') /headers: { Authorization: `Bearer ${token}` },", "file": "./src/domain/microsoftGraph.ts", "line": "178" }, { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: \"problem\", /docs: { /description: /meta: {", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "115" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:140): startTime: string /hours: number /amountTotal: number /date: string", "file": "./api/stripe-webhook.ts", "line": "140" }, { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "132" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:13): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {", "file": "./api/bookings.ts", "line": "13" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:116): .status(400) /.json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } }) /return false /res", "file": "./api/stripe-webhook.ts", "line": "116" }, { "message": "Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "133" }, { "message": "Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30", "file": "./.standards/ci/templates/archunit/OutboxArchRules.java", "line": "30" }, { "message": "Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33", "file": "./.standards/ci/templates/archunit/SagaArchRules.java", "line": "33" }, { "message": "SRP: possible god file (node) — ./api/stripe-webhook.ts: 621 lines, 14 methods (split by responsibility)", "file": "./api/stripe-webhook.ts", "line": "" }, { "message": "LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)", "file": "./src/domain/time.ts", "line": "" }]
}

### Design-principles adjudication (out-of-scope finding — non-blocking)

Raw gate exit code is 1, transcribed above verbatim. The single FAIL and all 22
WARNs are **out-of-scope** for this spec, independently confirmed:

- (a) The FAIL is genuinely in `.standards/`, not any spec-005 file:
  `./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10` —
  a pre-existing example file inside the standards submodule.
- (b) `.standards/` is untouched by this branch:
  `git diff --stat .standards/` → empty (exit 0);
  `git status --porcelain .standards/` → empty (exit 0). The file is committed in
  the submodule's own history (submodule HEAD `30bec2d`).
- (c) Every WARN file is either under `.standards/` or a pre-existing, untouched
  source file (`src/pages/Landing.tsx`, `src/components/ServicesCarousel.tsx`,
  `api/bookings/*`, `api/stripe-webhook.ts`, `src/domain/*`). The branch's only
  tracked modifications are `.gitignore`, `docs/recording-pipeline.md`,
  `scripts/recording/pipeline.mjs` — none of which appear in any FAIL/WARN line.

Per the Stop-and-Ask decision matrix ("Out-of-scope finding → record it; do not
fix; propose a follow-up"), this is recorded, not fixed, and does not stop the
pipeline: the spec-005 deliverable (all new + modified files) has **0 FAILs and
0 WARNs** under the design-principles gate.

- **Follow-up proposal:** lower the cyclomatic complexity of
  `.standards/skills/hallmark/site/examples/cobalt-01/script.js` (CC=10) in the
  standards repository itself — a change outside this spec's scope, and outside
  the child repo entirely.

PASS (spec-005 scope clean; 1 FAIL + 22 WARNs all out-of-scope/pre-existing).

---

## Evidence: scenario-to-behavior spot check

command: manual read — specs/005-home-hosted-recording/20-acceptance/AC-005-disk-guard.md + src/__tests__/AC-005-disk-guard.test.ts; specs/005-home-hosted-recording/20-acceptance/AC-005-prod-switch.md + src/__tests__/AC-005-prod-switch.test.ts
exit: 0 (no assertion mismatches found)
at: 2026-10-22T14:12:40Z

Verified the tests assert what their scenarios describe (not merely same-named passing tests):

- AC-005-13 (ample free space): scenario → no warning + processed==1; test asserts `r.processed===1`, warn/error logs absent. Match.
- AC-005-14 (below soft min): scenario → warn naming free GB + threshold, continues; test asserts `processed===1`, warn matches `/10 GB/` and `/REXI_MIN_FREE_GB=20|20 GB/`. Match.
- AC-005-17 (below hard floor): scenario → error naming GB + floor, processed==0, zero ffprobe, contained exit 0; test asserts err matches `/2 GB/` and `/REXI_HARD_MIN_FREE_GB=5|hard floor/i`, `processed===0`, `runCli --scan` exit 0, zero ffprobe calls. Match.
- AC-005-18 (env overrides only from passed env): scenario → warn + no `process.env` read; test asserts warn `/45 GB/` and `/REXI_MIN_FREE_GB=50/`, and disk.mjs source contains no `process.env` property access. Match.
- AC-005-19 (undeterminable fails open): scenario → loud warning + continues; test asserts `/cannot determine free space/i` + `processed===1` for throw, empty stdout, and garbage output. Match.
- AC-005-33 (usage validation): scenario → usage msg + non-zero + zero external calls; test asserts out contains `<public-url>`, code != 0, calls length 0. Match.
- AC-005-34 (happy path ordering): scenario → three gates in order, vercel only after all three, env add, redeploy, rollback printed; test asserts curls[0] no `-k/--insecure`, curls[1] `%{http_code}`, curls[2] probe URL, first vercel after last gate, `env add` contains MEETING_BASE_URL/URL/production, `deploy --prod`, rollback output. Match.
- AC-005-35 (TLS gate failure): scenario → non-zero, names TLS, zero vercel, no rollback; test asserts code != 0, `/TLS/i`, zero vercel calls, no rollback. Match.
- AC-005-36 (reachability failure): scenario → non-zero, names reachability, zero vercel; test asserts code != 0, `/reachab/i`, zero vercel. Match.
- AC-005-37 (probe-room failure): scenario → non-zero, names probe-room, zero vercel; test asserts code != 0, `/probe/i`, zero vercel for both non-200 and non-HTML. Match.
- AC-005-38 (existing var replaced): scenario → replace path, exit 0, no abort; test asserts code 0, `env add` contains `--force` + URL, deploy --prod ran. Match.

Result: spot check passed — the tests genuinely assert their scenarios' Given/When/Then behavior.
PASS.

---

## No unaccounted behavior

Skimmed the full diff. Every changed/added file traces to a task or is pipeline scratch:

- `.gitignore` (+`runs.jsonl`) → Task 8.
- `docs/recording-pipeline.md` → Task 7.
- `scripts/recording/pipeline.mjs` (+disk-guard wiring in `scanAll` only) → Task 2.
- `scripts/recording/disk.mjs` (new) → Task 2.
- `deploy/home/{install-recording-host.sh,expose-funnel.sh,expose-path-b.sh,switch-meeting-base-url.sh,README.md}` → Tasks 1, 3, 4, 5, 6.
- `src/__tests__/AC-005-*.test.ts` (9 files) → acceptance tests per task topics.
- `src/__tests__/shell-harness.ts` → test helper for PATH-shim shell tests (legitimate).
- `tests/e2e/{home-timer-scan,funnel-consent-boundary,switch-refusal}.e2e.ts` → Task 9 journeys (names pinned in 10-tasks.md).
- `specs/` → pipeline scratch.

No logic found that does not trace back to a task or scenario.

---

## Overall verdict

**PASS** — every Verifier check ran and produced no in-scope findings:

| Check | Result | Exit |
|---|---|---|
| scenario traceability | PASS | 0 |
| full test suite | PASS (287/287) | 0 |
| complexity gate | PASS (0 errors) | 0 |
| design-principles gate | PASS for spec-005 scope; 1 out-of-scope FAIL + 22 out-of-scope WARNs recorded | 1 (raw, out-of-scope) |
| scenario-to-behavior spot check | PASS | n/a |
| no unaccounted behavior | clean | n/a |

Architect may proceed. The single design-principles FAIL is a pre-existing
`CC=10` in the standards submodule's hallmark example (`.standards/` untouched by
this branch), recorded per the Stop-and-Ask matrix as an out-of-scope finding with
a follow-up proposal — it is not a defect in the spec-005 deliverable and routes
to neither the Coder nor the Refactorer.
