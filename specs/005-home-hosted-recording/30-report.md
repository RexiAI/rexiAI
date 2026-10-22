# 30-report.md — Spec 005: Home-hosted recording on this WSL machine

Stage 5a (Mutation Runner) artifact. Branch `spec/005-home-hosted-recording`.
`00-informal.md` was not read (information barrier).

---

## Verifier's verdict (carried forward)

**PASS** — from `25-verification.md`, attempt 1, phase 1. Every Verifier check
produced no in-scope findings: scenario traceability (47/47 traced), full test
suite (287/287), complexity gate (0 errors), design-principles gate (spec-005
scope clean; 1 pre-existing out-of-scope FAIL + 22 out-of-scope WARNs recorded,
not fixed), scenario-to-behavior spot check (PASS), no unaccounted behavior.

---

## Conformance tier determination

Mutation testing runs only at `production` tier and above
(`.standards/docs/SPEC_PIPELINE.md §Conformance tiers`, `.standards/docs/CONFORMANCE_TIERS.md`).
This repo's tier is **`mvp`**, confirmed live (not assumed):

- No `AGENTS_*.md` at repo root (glob returned none) and no `Conformance tier:`
  declaration in root `AGENTS.md` (`grep -n "Conformance tier" AGENTS.md AGENTS_*.md`
  → "no AGENTS.md tier declaration").
- `check-code-principles.sh` auto-detection terminates in
  `TIER="${TIER:-mvp}"` (script lines 357–365) when no declaration is found.
- The Verifier's own gate run reported `"tier": "mvp"` in its JSON
  (`25-verification.md` §design-principles gate).
- Prior archived specs (001, 002, 003, 004) all resolved the same default.

Per `docs/SPEC_PIPELINE.md §Conformance tiers`, the Architect — mutation testing
row is **skip** at `mvp`; the Architect role runs at every tier, the mutation
*test* does not.

---

## Mutation score

**skipped — `mvp` tier.**

Per `.standards/docs/SPEC_PIPELINE.md §Conformance tiers` ("Architect — mutation
testing: skip" at `mvp`) and `.standards/docs/CONFORMANCE_TIERS.md` (mutation
testing is `production`-tier, so it is out of scope — not a gap — at `mvp`). No
mutation tooling (Stryker) was run; no mutants generated; no surviving mutants to
kill.

## Evidence: mutation score

command: (none — skipped by tier policy)
exit: 0
at: 2026-10-22T14:16:02Z

Mutation testing skipped — `mvp` tier. Per `.standards/docs/SPEC_PIPELINE.md`
§Conformance tiers and `.standards/docs/CONFORMANCE_TIERS.md`, mutation testing
(PiTest / Gremlins / Stryker) is a `production`-tier gate and is skipped at
`mvp`. Repo tier is `mvp` (no `Conformance tier:` declaration; gate auto-detect
defaults to `mvp`).

---

## Equivalent mutants

n/a — mutation testing was skipped at `mvp` tier; no mutants were generated, so
no equivalent mutants to name.

---

## Complexity summary (carried from the Refactorer, re-recorded by the Verifier)

The Refactorer leaves no report artifact; its gates are re-executed and recorded
by the Verifier in `25-verification.md`:

- **Complexity gate** (`npm run lint`, ESLint `complexity: ['error', 6]`): 0
  errors — no cyclomatic-complexity violations in any changed file. Exit 0. PASS.
  10 `no-console` warnings confined to the three Task-9 e2e journey files
  (journeys print to stdout by design), not complexity violations.
- **Design-principles gate** (`check-code-principles.sh`): spec-005 scope clean —
  0 FAIL, 0 WARN in the branch's changed/added files. Raw exit 1 comes from a
  single pre-existing out-of-scope FAIL (`CC=10` in
  `.standards/skills/hallmark/site/examples/cobalt-01/script.js`) plus 22
  out-of-scope WARNs under `.standards/` or pre-existing untouched source files.
  Recorded, not fixed, per the Stop-and-Ask matrix ("Out-of-scope finding →
  record it; do not fix; propose a follow-up").

---

## Full suite, one final time

Re-ran the full test suite after the (skipped) mutation stage, to re-confirm the
Verifier's green in this stage's own session.

## Evidence: final test status

command: npm test
exit: 0
at: 2026-10-22T14:16:02Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  47 passed (47)
      Tests  287 passed (287)
   Start at  16:16:02
   Duration  9.30s (environment 70%, tests 15%, setup 7%, transform 5%, import 3%, worker 1%)

Environment  jsdom was created 47 times · 59.88s total, 70% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

Result: 47 test files passed, 287 tests passed, exit 0. No skipped/disabled tests.

---

## Remediation record

**none.**

No BLOCK occurred during this run. Carried forward from `25-verification.md`:
the Verifier ran at "Attempt 1, phase 1 (no phase-1 or phase-2 retries yet)" and
reported PASS — no phase-1 re-delegation and no phase-2 (post-PR) loop entries
exist. The one design-principles FAIL was adjudicated out-of-scope and did not
enter the remediation budget (no fix was routed to the Coder or Refactorer).
Nothing was guessed or invented: `25-verification.md` contains no attempt-2+
entries.

---

## Summary

| Row | Value |
|---|---|
| Verifier verdict | PASS (carried forward) |
| Mutation score | skipped — `mvp` tier |
| Equivalent mutants | n/a |
| Complexity summary | 0 in-scope violations (complexity + design-principles); 1 pre-existing out-of-scope FAIL + 22 out-of-scope WARNs recorded |
| Final test status | 47 files / 287 tests passed, exit 0 |
| Remediation record | none |

**GREEN.** Stage 5b (PR Opener) may proceed.
