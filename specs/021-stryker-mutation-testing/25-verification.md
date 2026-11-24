# 25-verification — spec 021-stryker-mutation-testing

Verifier: stage 4, full mode, not autopilot. **attempt 1, phase 1** (SPEC_LOOP_COUNT=0, SPEC_PHASE1_RETRIES=0, SPEC_PHASE2_RETRIES=0).

## Verdict: PASS

Every gate ran; no gate produced a finding. Architect / Mutation Runner may proceed. Flags below are non-blocking and routed for stage 5a/5b.

## Evidence: scenario traceability

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-11-24T14:22:17Z

{
  "checks": [1, 2],
  "passes": ["AC-001-01 — traced to a test", "AC-001-02 — traced to a test", "AC-002-01 — traced to a test", "AC-002-02 — traced to a test", "AC-002-03 — traced to a test", "AC-003-01 — traced to a test", "AC-003-02 — traced to a test", "AC-003-03 — traced to a test", "AC-003-04 — traced to a test", "AC-003-05 — traced to a test", "AC-003-06 — traced to a test", "AC-004-01 — traced to a test", "AC-004-02 — traced to a test", "AC-005-01 — traced to a test", "AC-005-02 — traced to a test", "AC-006-01 — traced to a test", "AC-006-02 — traced to a test", "AC-006-03 — traced to a test", "AC-006-04 — traced to a test", "AC-006-05 — traced to a test", "AC-007-01 — traced to a test", "AC-007-02 — traced to a test"],
  "fails": []
}

Note: acceptance files contain **22** scenario headings (`grep '^## AC-'` = 22), not the 25 quoted by the orchestrator. All 22 traced. (An earlier invocation passing the spec folder as SPECS_DIR returned empty passes/fails — wrong argument shape, discarded; the run above uses the default `specs`.)

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-11-24T14:22:08Z
Test-run hash: 81cf406af689f9cbd99e0c92be7ff0c219d44b610c1133ff7c61082fd46176f6

SUMMARY: mode=run exit=0 signal=1 log_lines=19 log=/tmp/pipeline/021-verifier-suite.log
Pre-run hash 81cf406af689f9cbd99e0c92be7ff0c219d44b610c1133ff7c61082fd46176f6 = post-run hash (tree unchanged during run).
full log: §Raw log: full test suite

Supporting checks (same run window):
- `npm run lint` — exit 0 — 0 errors, 14 warnings (pre-existing no-console warnings; none in changed files)
- `npm run build` — exit 0 — "✓ built in 171ms"
- `npm run format:check` — exit 0 — "All matched files use Prettier code style!"

## Evidence: complexity gate

command: npx eslint src/__tests__/AC-021-stryker-mutation.test.ts eslint.config.cjs vite.config.ts
exit: 0
at: 2026-11-24T14:22:55Z

(no output) — project eslint.config.cjs:60 enforces `complexity: ['error', 6]`. Changed JSON/YAML files (stryker.config.json, mutation.yml, package.json) carry no code. An attempted `--rule` CLI override errored (exit 2, flat-config CLI parse) and was discarded in favour of the real project config above.

## Evidence: design-principles gate

command: .standards/scripts/check-code-principles.sh --json
exit: 0
at: 2026-11-24T14:22:38Z

fails: []
warns: 223 — all pre-existing; `jq -r '.warns[].file' | grep -E 'AC-021|stryker|eslint.config|vite.config|mutation.yml'` → no match (exit 1). No WARN touches this spec's diff. Full JSON: /tmp/pipeline/cp.json (scratch). First entries verbatim:
{
  "tier": "production",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests", "comments", "naming", "null-discipline"],
  "fails": [],
  "warns": [{ "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "45" }, { "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "101" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:111:242::KISS_LINES=38", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "111" }, { "message": "Method body >20 lines (node): ./src/pages/Privacy.tsx:10:52:SectionView:KISS_LINES=43", "file": "./src/pages/Privacy.tsx", "line": "10" }, { "message": "Method body >20 lines (node): ./src/pages/Privacy.tsx:54:102:Privacy:KISS_LINES=42", "file": "./src/pages/Privacy.tsx", "line": "54" }, { "message": "Method body >20 lines (node): ./api/stripe-webhook.ts:143:165:getRawBookingFields:KISS_LINES=

## Evidence: scenario-to-behavior spot check

command: npx vitest run src/__tests__/AC-021-stryker-mutation.test.ts -t 'AC-004-02|AC-003-03|AC-003-06' --reporter=verbose
exit: 0
at: 2026-11-24T14:24:49Z

 ✓ src/__tests__/AC-021-stryker-mutation.test.ts > AC-003 stryker config > AC-003-03 thresholds 3ms
 ✓ src/__tests__/AC-021-stryker-mutation.test.ts > AC-003-06 filename > AC-003-06 wrapper-discoverable filename 0ms
 ✓ src/__tests__/AC-021-stryker-mutation.test.ts > AC-004 npm script > AC-004-02 args forward to the wrapper (skip exit 2 on clean tree) 55ms
      Tests  3 passed | 16 skipped (19)

Assertions read against Given/When/Then:
- AC-004-02: legitimate. Builds a scratch git repo (mkdtemp, git init, copies stryker.config.json, commits) giving the clean tree the Given demands; runs the real `.standards/scripts/run-mutation.sh --base HEAD`; asserts the exact skip message and exit 2 (not 3). Not weakened. Minor fidelity gap: invokes the wrapper directly rather than `npm run mutation --`, bridged by asserting `pkg.scripts.mutation` contains the wrapper path.
- AC-003-03: asserts thresholds toEqual {high:90, low:80, break:80} — matches scenario literal.
- AC-003-06: asserts stryker.config.json exists; on disk `ls stryker.config.json stryker.conf.json` → stryker.config.json present, "ls: cannot access 'stryker.conf.json': No such file or directory".

## Evidence: no unaccounted behavior

command: git status --short; git diff .gitignore .prettierignore eslint.config.cjs vite.config.ts package.json opencode.json
exit: 0
at: 2026-11-24T14:21:00Z

- opencode.json + AGENTS_REXIAI.md: Task 1 (AC-001), pre-existing entries unchanged.
- .gitignore (reports/mutation/, .stryker-tmp/): Task 5.
- .prettierignore (.stryker-tmp, reports), eslint ignores (.stryker-tmp/**, reports/**), vite test exclude (.stryker-tmp/**), stryker ignorePatterns (.opencode, .standards, .agents, …): not literally in a task, but in scope — they keep Stryker's sandbox and report artifacts out of lint/format/test and fix the EISDIR on symlinked dirs during the proof run. Additive, harmless.
- .github/workflows/mutation.yml: `on: workflow_dispatch` only (input base default origin/main); actions SHA-pinned (checkout@3d3c42e5…, setup-node@949feb24…); `permissions: contents: read`; no secrets, no Vercel; continue-on-error true; input passed via env, not interpolated into run.
- No file under src/ (except the new test) or api/ changed — AC-007-02 holds.

## Flags (non-blocking)

1. **specs/021-stryker-mutation-testing/.proof-run-note.md is untracked and NOT gitignored** (`git check-ignore` exit 1). Scratch — PR Opener must not commit it; Mutation Runner owns the score and 30-report.md.
2. Coder proof run (scratch, unverified here): scoped score 74.6% covered / 68.8% incl. NoCoverage on src/domain/pricing.ts — below break 80. Stage 5a gate, recorded only.
3. Coder reports wrapper maps Stryker's break-threshold exit 1 to 3 (tooling failure) — a .standards wrapper quirk; Mutation Runner should distinguish.
4. Scenario count 22, not 25.

Routing if later reversed: behavior → spec-coder; structural → spec-refactorer.

## Raw log: full test suite

command: npm test
exit: 0
at: 2026-11-24T14:22:08Z


> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'


 RUN  v5.1.1 /home/dbueno/projects/rexiAI

warning: in the working copy of 'stryker.config.json', LF will be replaced by CRLF the next time Git touches it
pre-commit: no repo-local hook and no convention entrypoint found — skipping (nothing enforced here)

 Test Files  107 passed (107)
      Tests  677 passed | 1 skipped (678)
   Start at  15:21:52
   Duration  16.00s (environment 66%, tests 17%, setup 9%, import 4%, transform 2%, worker 1%)

Environment  jsdom was created 107 times · 99.53s total, 66% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments


## Post-PR CI check — round 1 (phase 2)

Verifier: post-PR CI check, **round 1, phase 2** (SPEC_LOOP_COUNT=1, SPEC_PHASE1_RETRIES=0, SPEC_PHASE2_RETRIES=0). PR https://github.com/RexiAI/rexiAI/pull/118, head `a37f69699b5ee598b3f03737f666976227a0b41f`. `mutation.yml` is workflow_dispatch-only and did not run on the PR (expected).

## Evidence: post-PR CI checks

command: gh pr checks 118 --json name,state,bucket,workflow,link
exit: 0
at: 2026-11-24T14:27:02Z

| Check | Workflow | bucket | Result |
|---|---|---|---|
| Unit Tests | CI | fail | FAIL |
| Lint & Format | CI | pass | PASS |
| Build | CI | pass | PASS |
| Docker Build & Push | CI | skipping | SKIPPED (depends on failed job) |
| Vercel | — | pass | PASS |
| Vercel Preview Comments | — | pass | PASS |

Failing check IDs (`gh api repos/RexiAI/rexiAI/commits/a37f696.../check-runs`, conclusion == failure): `Unit Tests 138515168249`

## Evidence: post-PR CI failure log

command: gh run view 45413982165 --log-failed
exit: 0
at: 2026-11-24T14:27:30Z

```
FAIL src/__tests__/AC-021-stryker-mutation.test.ts > AC-004 npm script > AC-004-02 args forward to the wrapper (skip exit 2 on clean tree)
AssertionError: expected '' to contain 'no changed files against \'HEAD\' — n…'
FAIL src/__tests__/AC-021-stryker-mutation.test.ts > AC-006 manual CI job > AC-006-05 existing CI untouched
Error: Command failed: git diff main -- .github/workflows/ci.yml
Serialized Error: { status: 128, ... }
Test Files  1 failed | 106 passed (107)
     Tests  2 failed | 674 passed | 2 skipped (678)
##[error]Process completed with exit code 1.
```

Diagnosis: both failures are in the spec's own acceptance tests and pass locally (stage-4 suite green) but depend on the local git environment. AC-006-05 runs `git diff main` — CI's `actions/checkout` is shallow and has no local `main` ref (git exit 128). AC-004-02 expects the wrapper's "no changed files against 'HEAD'" message and receives empty output in the CI checkout (environment-dependent git/wrapper invocation). Routing: **behavior → Coder** (make the tests environment-independent, e.g. compare against `origin/main` with fetch/skip-when-absent or a non-git assertion; do not weaken assertions or thresholds).

## Post-PR CI verdict — round 1: FAIL

Failing: `Unit Tests` (138515168249). Phase-2 budget used: 1 of 3. Pipeline stops this round; orchestrator routes fix to Coder, PR Opener re-pushes, Verifier re-checks only `Unit Tests`.
