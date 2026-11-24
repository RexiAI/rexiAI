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
