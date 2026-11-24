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
