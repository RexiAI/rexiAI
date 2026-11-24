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
