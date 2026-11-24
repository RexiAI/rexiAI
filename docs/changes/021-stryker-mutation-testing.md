# 021-stryker-mutation-testing

> Spec pipeline archive. Original source: `specs/021-stryker-mutation-testing/` (deleted by this script).
> Archived: 2026-11-24

## Original ask

# 021 — Mutation testing with Stryker

## Problem

The spec pipeline's Mutation Runner (stage 5a) skips mutation testing on this
repo: no conformance tier is declared (harness default `mvp`) and Stryker is
not installed. Line coverage alone does not prove the tests catch bugs
(.standards/docs/TESTING.md §Mutation Testing).

## Goal

Make mutation testing real and bounded for this repo, so stage 5a produces a
scoped mutation score on every spec.

## Requirements

1. Declare the conformance tier `production` for this repo in its own
   project instructions file, per .standards/docs/CONFORMANCE_TIERS.md §How to
   declare a tier (e.g. `AGENTS_REXIAI.md` with `## Conformance tier:
   production`), and make the pipeline find it (wire it into `opencode.json`
   instructions if that is the documented mechanism).
2. Install Stryker as dev dependencies: `@stryker-mutator/core` and
   `@stryker-mutator/vitest-runner` (the repo uses Vitest, not Jest). Pin
   versions (no ranges per docs/SECURITY.md §Dependency Management if the repo
   convention allows; otherwise follow the existing package.json style).
3. Add `stryker.config.json` (amended: originally `stryker.conf.json`; renamed
   because `.standards/scripts/run-mutation.sh` only discovers
   `stryker.config.{mjs,cjs,js,json}` and exits 3 otherwise — owner decision,
   option a) derived from
   `.standards/ci/templates/stryker.conf.json`, switched to the vitest runner,
   with `mutate` globs covering `src/**/*.ts(x)` and `api/**` production code,
   excluding tests, e2e journeys, and pure copy/data files (locale dictionaries)
   where mutants are noise. Threshold from the template/standard (target ≥80%).
   `incremental: true` with a stable `incrementalFile`.
4. Runs go through `.standards/scripts/run-mutation.sh` (bounded, scoped per
   ADR 0028: `--base <ref>` diff scope, 900 s budget, two passes max). Add an
   npm script (e.g. `npm run mutation`) that calls it.
5. Mutation artifacts (reports, incremental cache dir as appropriate, `.stryker-tmp/`)
   are gitignored; the incremental file policy follows the template.
6. Optional CI: a GitHub Actions job running the scoped mutation on PRs,
   non-blocking (advisory) at first. Never touches Vercel. Mutation runs
   periodically, not every commit, per TESTING.md — if a per-PR job is too
   slow, make it manual (`workflow_dispatch`) instead.
7. Prove it works: run a scoped mutation against a small real target
   (e.g. booking/pricing/consent logic) and record the score.

## Out of scope

Raising scores across the whole tree; fixing surviving mutants outside the
spec's own scope (record as follow-up).

## Tasks

# 021 — Mutation testing with Stryker — Tasks

Source: `00-informal.md`. Scope: config/tooling only; no production code changes.

## Task 1 — Declare conformance tier `production` (AC-001)
- New file `AGENTS_REXIAI.md` at repo root contains the exact line `## Conformance tier: production`.
- `opencode.json` `instructions` array contains the entry `"AGENTS_REXIAI.md"`; every pre-existing entry is unchanged.

## Task 2 — Install Stryker dev dependencies (AC-002)
- `package.json` `devDependencies` contains `@stryker-mutator/core` and `@stryker-mutator/vitest-runner`, both at the same major version.
- Neither appears in `dependencies`.
- `package-lock.json` resolves both packages (lockfile updated by `npm install`, not by hand).
- Version style follows the existing `package.json` style (caret ranges); exact resolution is pinned by `package-lock.json`. See Open question Q1.

## Task 3 — `stryker.config.json` (AC-003)
- Repo-root `stryker.config.json` derived from `.standards/ci/templates/stryker.conf.json` (template content; only the filename differs).
- No repo-root `stryker.conf.json` exists. Reason: `.standards/scripts/run-mutation.sh` only discovers `stryker.config.{mjs,cjs,js,json}` and exits 3 otherwise (owner decision, option a).
- `testRunner` is `"vitest"`; `coverageAnalysis` is `"perTest"`.
- `jsonReporter.fileName` is `reports/mutation/mutation.json` (the default report path `run-mutation.sh` reads).
- `incremental` is `true`; `incrementalFile` is `reports/mutation/stryker-incremental.json`.
- `thresholds` are `high: 90, low: 80, break: 80` (template values).
- `mutate` includes `src/**/*.ts`, `src/**/*.tsx`, `api/**/*.ts`.
- `mutate` excludes (negated globs): `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `**/*.spec.tsx`, `**/*.d.ts`, `**/__tests__/**`, `src/i18n/locales/**`, `src/content/**`.
- `tests/**` and `e2e` journey files are never matched by any positive `mutate` glob.
- `.standards/**` is not mutated.

## Task 4 — `npm run mutation` via bounded wrapper (AC-004)
- `package.json` `scripts.mutation` invokes `.standards/scripts/run-mutation.sh` and no other Stryker entry point (no direct `stryker run`).
- The script passes no `--all` and no `--budget` override, so the wrapper defaults apply (diff-scoped, 900 s, threshold 80).
- Extra args forward: `npm run mutation -- --base <ref>` and `-- --only <files>` reach the wrapper.

## Task 5 — Gitignore mutation artifacts (AC-005)
- `.gitignore` contains `reports/mutation/` and `.stryker-tmp/`.
- The incremental file lives under `reports/mutation/` (template policy), so it is ignored; no mutation artifact is tracked by git.

## Task 6 — Manual CI mutation job (AC-006)
- New workflow `.github/workflows/mutation.yml` triggered only by `workflow_dispatch` (input `base`, default `origin/main`). Chosen over per-PR because TESTING.md says "periodically, not every commit"; per-PR promotion is a follow-up.
- The job runs `npm ci` then `npm run mutation -- --base <input>`; `continue-on-error: true` (advisory).
- Checkout uses `fetch-depth: 0` and `submodules: true` (wrapper needs `.standards/` and the base ref).
- Every third-party action is pinned to a full commit SHA with version comment (SECURITY.md §CI/CD Supply Chain).
- `permissions: contents: read` only; no secrets referenced; no `vercel` command anywhere in the file.
- `.github/workflows/ci.yml` is unchanged.

## Task 7 — Proof run with recorded score (AC-007)
- One scoped run `npm run mutation -- --only src/domain/pricing.ts` is executed.
- The wrapper output (exit code, scoped score on covered code, score incl. NoCoverage, mutated file list) is recorded verbatim in `specs/021-stryker-mutation-testing/30-report.md`, labelled *scoped*.
- Surviving mutants are recorded as follow-ups; no test or production code is changed to raise the score (out of scope).

## Open questions (non-blocking; defaults chosen above)
- Q1: SECURITY.md says pin exact versions; repo uses caret ranges everywhere. Default: caret + lockfile (informal spec fallback). Confirm or require exact pins.
- Q2: CI trigger: default `workflow_dispatch` only. Confirm vs advisory per-PR job.
- Q3: Proof target `src/domain/pricing.ts` — confirm or name another.

## Acceptance scenarios

## AC-001-01 — Tier file declares production
## AC-001-02 — Tier file wired into opencode instructions
## AC-002-01 — Both packages are devDependencies
## AC-002-02 — Same major version
## AC-002-03 — Lockfile resolves both
## AC-003-01 — Vitest runner and report path
## AC-003-02 — Incremental cache
## AC-003-03 — Thresholds from template
## AC-003-04 — Production code is mutated
## AC-003-05 — Tests, copy and data excluded
## AC-003-06 — Filename discoverable by the wrapper
## AC-004-01 — Script calls the wrapper
## AC-004-02 — Args forward to the wrapper
## AC-005-01 — Artifact paths ignored
## AC-005-02 — Nothing tracked after a run
## AC-006-01 — Manual trigger only
## AC-006-02 — Runs the wrapper, advisory
## AC-006-03 — Checkout sufficient for diff scope
## AC-006-04 — Supply-chain hygiene
## AC-006-05 — Existing CI untouched
## AC-007-01 — Scoped run executed and recorded
## AC-007-02 — No score chasing

## Verification

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

## Post-PR CI check — round 2 (phase 2)

Verifier: scoped post-PR CI re-check, **round 2, phase 2** (SPEC_LOOP_COUNT=1, SPEC_PHASE1_RETRIES=0, SPEC_PHASE2_RETRIES=1). PR https://github.com/RexiAI/rexiAI/pull/118, head `d6cabc69c85acd7c667ab0458ff6dd4872f5393e` (confirmed via `gh pr view 118 --json headRefOid`). Scoped to previously failing `Unit Tests`; full status of all checks recorded. Waited to terminal with `gh pr checks 118 --watch`.

## Evidence: post-PR CI checks round 2

command: gh pr checks 118 --json name,state,bucket,workflow,link
exit: 0
at: 2026-11-24T14:30:43Z

| Check | Workflow | bucket | Result |
|---|---|---|---|
| Unit Tests (138517457829, run 45414644039) | CI | pass | PASS (previously FAIL — re-check scope) |
| Lint & Format | CI | pass | PASS |
| Build | CI | pass | PASS |
| Docker Build & Push | CI | skipping | SKIPPED (push-to-main only) |
| Vercel | — | pass | PASS |
| Vercel Preview Comments | — | pass | PASS |

Failing check IDs: none.

## Post-PR CI verdict — round 2: PASS

All checks terminal; no failures. Phase-2 budget used: 2 of 3. Phase 3 (deploy verification) may proceed.

## Quality gates

# 30-report — spec 021 stryker-mutation-testing

Mode: full, not autopilot. Tier: production (AGENTS_REXIAI.md).

## Verifier verdict (carried forward)
PASS — 25-verification.md (attempt 1, phase 1).

## Mutation
### Scope pass
command: GATE_RUNS_FILE=$PWD/runs.jsonl npm run mutation -- --base main
exit: 3
at: 2026-11-24T14:23:53Z

Result: **scoped: no mutable files.** `git diff main` + untracked files = .gitignore, .prettierignore, eslint.config.cjs,
opencode.json, package.json, package-lock.json, runs.jsonl, vite.config.ts, .github/workflows/mutation.yml, stryker.config.json,
AGENTS_REXIAI.md, src/__tests__/AC-021-stryker-mutation.test.ts. None match the `mutate` globs (src/**/*.ts minus tests, api/**/*.ts);
no src/ or api/ production code changed.

Exit-3 interpretation: the wrapper remaps any nonzero Stryker exit to 3. Here the log says
`error: unknown option '--since'` / `stryker exited 1 (tooling failure, not a score)`: installed @stryker-mutator/core 10.1.1
rejects `--since`, so diff mode itself fails (tooling defect in `.standards/scripts/run-mutation.sh`, not touched here). The
score lines printed after it are the pre-existing reports/mutation/mutation.json from the AC-007 proof run, NOT a new measurement. Not counted as a pass.
Follow-up: wrapper/Stryker 10 diff-mode incompatibility (diff-mode would need `--since` replaced by an explicit `--mutate` file list from `git diff`).

### Evidence run (AC-007 proof) — src/domain/pricing.ts, SCOPED, not a gate
command: npm run mutation -- --base main --only src/domain/pricing.ts   (run by coder, task 7; ~55 s of 900 s; one pass)
wrapper exit: 3 (Stryker break-threshold exit 1 remapped; the run completed and produced a report — a score, not tooling failure)
Mutated file: src/domain/pricing.ts only.
Score (covered): **74.6%** — killed 44, survived 15, timeout 0, **no-coverage 5**; incl. no-coverage: 68.8%. Threshold 80% not met.
Config fix during proof: `ignorePatterns` added to stryker.config.json (.opencode symlinked dirs caused EISDIR).

Gate decision: pricing.ts is NOT changed by this spec; survivors are pre-existing. The spec delivers the mutation tooling (AC-007 proves
it runs end-to-end and reports), so no mutation-kill tests were written and the spec is NOT blocked on this score. Passes used: 1 scope pass (tooling failure, no mutable files) + 1 evidence run (coder's) ≤ 2.

### Follow-up (new spec): kill pricing.ts survivors
NoCoverage: L22, L26, L51, L52, L53 StringLiteral -> "".
Survived: L13, L18 StringLiteral; L22 Cond->false; L26 Cond->false, Equality `hours <= 0`; L49 Block->{}; L50 Cond->false x3, Logical x2;
L52 Cond->false, Equality `v < 0`; L53 Cond->false, Equality `v >= 480`. (Mostly validation-boundary and error-message assertions.)

### Equivalent mutants
None identified (no kill work attempted; not analysed for equivalence).

## Complexity summary
Carried from Refactorer: complexity ≤6 enforced by eslint.config.cjs; Verifier lint exit 0 (see 25-verification.md). No production code changed.

## Final test status
command: npm test
exit: 0
at: 2026-11-24T14:22:08Z
reused-from: 25-verification.md §Evidence: full test suite (test-run hash 81cf406af689f9cbd99e0c92be7ff0c219d44b610c1133ff7c61082fd46176f6)
Check: `.standards/scripts/test-run-reuse.sh --check 25-verification.md` → exit 0, REUSE (worktree unchanged; no new tests written).

## Remediation record
none — Verifier attempt 1, phase 1 (SPEC_PHASE1_RETRIES=0, SPEC_PHASE2_RETRIES=0); no BLOCK occurred.

PR: https://github.com/RexiAI/rexiAI/pull/118
Commits: 7 (6 task/test commits + 1 PR-record commit)

## 40-deploy.md

# 40-deploy — spec 021 (stage 5c)

Repo classification: frontend (vercel.json + Vercel Git integration; no skip permitted by deployer.md — spec is tooling-only but the lane still gets verified)
Deploy URL: https://rexi-ai-git-spec-021-stryke-65e47c-danielbueno76-4270s-projects.vercel.app
Inspector: https://vercel.com/danielbueno76-4270s-projects/rexi-ai/Hb2DNYakqiexf4Dfy5hvgqaeTTw7
PR head: d6cabc69c85acd7c667ab0458ff6dd4872f5393e (PR #118)
Phase-3 attempt: 1 of 3

## Build
command: gh api commits/d6cabc69…/status (context Vercel) + PR bot comment
exit: 0
at: 2026-11-24T14:30:00Z
Vercel status: success; bot comment: Ready, Preview URL above, deployed for the PR head. Build: pass.

## Health check
command: curl -H "x-vercel-protection-bypass: <redacted>" <deploy URL>/
exit: 0
at: 2026-11-24T14:30:30Z
Unauthenticated: HTTP 302 (Vercel deployment protection). With bypass header: HTTP 200. Health: pass.

## E2E
command: REXI_E2E_SITE_URL=<deploy URL>?x-vercel-protection-bypass=<redacted>&x-vercel-set-bypass-cookie=true node tests/e2e/landing.e2e.ts
exit: 0
at: 2026-11-24T14:31:22Z
Output tail: "[e2e:landing] AC-020-23…27 PASSED" (all checks ok). E2E: pass.

Note: no VERCEL_TOKEN used; deployment resolved via commit status and bot comment.

Verdict: PASS

## 45-decisions.md

Condition: Pipeline mode for /home/dbueno/projects/rexiAI/specs/021-stryker-mutation-testing
Options: lite, full
Chosen: full
Why: classifier: 32 named path(s) include '**/*.d.ts', outside docs/, specs/, *.md and scripts/
Reversibility: append a new entry with an explicit lite or full token
At: 2026-11-24T14:14:06Z

