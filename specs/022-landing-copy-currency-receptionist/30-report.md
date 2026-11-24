# 30-report — spec 022 landing-copy-currency-receptionist

Pipeline mode: full. Autopilot: false.

## Verdict rows

- Verifier's verdict (carried forward): PASS (25-verification.md, attempt 3, phase 1).
- Mutation score: **skipped — no tier declared on this branch (default `mvp`); Stryker not configured here.**
- Complexity summary (carried from Refactorer/Verifier): 0 complexity errors at limit 6 on changed files, on scripts + tests, and repo-wide; the 11 prior errors in scripts/*.mjs were refactored away. The eslint `**/*.mjs` block now sets `complexity: ['error', 6]` (owner scope addition), pinned by AC-022-06-05/09 with a 6/7 boundary probe.
- Equivalent mutants: none (no mutation run).
- Design-principles gate: fails [] (222 pre-existing WARNs, unchanged).

## Mutation: skipped, reason

Tier: no tier declared on this branch cut from main, so default `mvp`. Mutation is a `production`-tier gate. In addition: `stryker.config.json`, `scripts/run-mutation.sh` and `AGENTS_REXIAI.md` (spec 021, PR #118, still open) are absent. `@stryker-mutator/*` packages sit in node_modules but are not in package.json and have no config. The brief says not to install dependencies or add config in this spec, and ADR 0028 forbids running Stryker directly.

## Evidence: final test status

command: npm test (via .standards/scripts/agent-test-summary.sh --run /tmp/opencode/t022.log)
exit: 0
at: 2026-11-24T15:51:55Z
Test-run hash: 23d77ae7bfcd7cd3f67c11a329f14c4b5ab46f505d9fa8c562c2758a1c2c455d

`test-run-reuse.sh --check` returned `RERUN hash-mismatch`, because the check compares against the earlier attempt-1/2 record. The suite was therefore re-run. The post-run hash equals the Verifier's attempt-3 hash, so the tree is unchanged. Result matches the Verifier: 759 passed / 1 pre-existing env-gated skip (AC-006 live Jitsi/ffmpeg).

## Remediation record

- Phase 1: Verifier BLOCK at attempt 1 (traceability, AC-022-03 untraced). Fixed in cycle 1 and resolved at attempt 2 (PASS). Budget used: 2 of 3.
- Attempt 3 was an owner-authorized scope addition, not a remediation cycle: Task 6 (refactor of the 11 scripts/*.mjs) and the eslint `.mjs` complexity rule with AC-022-06-05/09 and a new test. The counter is unchanged.
- Phase 2: not started (no PR opened). Phase 3: not applicable.

## Remaining risk

- Mutation testing never ran, so test strength for Services.tsx and the refactored scripts/*.mjs is unmeasured.
- The real-service paths of the refactored scripts are untested: live Jitsi/PulseAudio recording bot, M365 consent, billing chain against real services, dev API server. Only the env-gated AC-006 test touches them, and it was skipped. See the "Remaining risk" section of 25-verification.md.
- The 222 design-principles WARNs and the AC-006 skip are pre-existing and flagged to the Architect.
