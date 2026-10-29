# 30-report — 008-customer-name-and-recording-folders

**Stage:** 5a (Mutation Runner) · **Branch:** `spec/008-customer-name-and-recording-folders`
**Base ref:** `main` · **Tier:** `mvp`
**Precondition:** `25-verification.md` verdict **PASS** (read before this stage ran — carried forward below).
`00-informal.md` was not read.

**Overall: GREEN.** Mutation testing is skipped at `mvp` tier per
`docs/SPEC_PIPELINE.md §Conformance tiers` (the mutation gate is `production`+ only).
No mutants were run, so no mutation-killing tests were written and no new code was
added by this stage. The full suite was re-run as the final act and is green.

---

## Evidence: Verifier verdict (carried forward)

command: (read) specs/008-customer-name-and-recording-folders/25-verification.md
exit: 0
at: 2026-10-29T11:01:10Z

```
**Overall verdict: PASS** (after Phase 1 attempt 1 remediation)

Gate summary
| # | Check | Command | Exit | Verdict |
| 1 | scenario traceability | `check-scenario-traceability.sh --json` | 0 | PASS |
| 2 | full test suite | `npm test` | 0 | PASS (1 pre-existing env-gated skip, not an AC-008 test) |
| 3 | complexity gate | `npm run lint` (eslint `complexity≤6`) | 0 | PASS |
| 3.5 | design-principles gate | `check-code-principles.sh -BaseRef main --json` | 0 | PASS (Phase 1 attempt 1 remediation: 0 FAIL / 5 WARN) |
| 4 | spot check | manual | n/a | PASS |
| 5 | no unaccounted behavior | diff skim | n/a | findings recorded (legitimate DRY consolidations) |
```

24/24 acceptance scenarios traceable (`AC-008-01` … `AC-008-24`), 0 traceability
fails. Verdict was **FAIL** on the first Phase 1 attempt (design-principles, 2 KISS
FAILs) and moved to **PASS** on the scoped re-verification — see §Remediation record.

---

## Evidence: conformance tier resolution

command: bash .standards/scripts/check-code-principles.sh -BaseRef main --json
exit: 0
at: 2026-10-29T11:02:41Z

```json
{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [], "warns": [ /* 5 WARNs, listed verbatim under §Complexity summary */ ]
}
```

Tier independently re-confirmed as **`mvp`** by the shared tier detector, matching
the prior stages' determination: the repo declares no tier override (no
`CONFORMANCE_TIER` marker in `AGENTS.md`/`README.md`/`package.json`), so
`check-code-principles.sh` auto-detects the harness default.

Corroborating (not a gate): no Stryker configuration exists in the repo
(`ls stryker.conf* stryker.config*` → no match, exit 2) and
`.github/workflows/` contains only `ci.yml` + `release.yml` — no `-Pmutation` /
`stryker run` job. Consistent with a project that never opted into the
`production`-tier mutation gate.

---

## Mutation score

**skipped — `mvp` tier**

Per `docs/SPEC_PIPELINE.md §Conformance tiers`, the mutation-testing stage runs at
`production` and `multi-service` only; at `mvp` the pipeline is Specifier → UX →
Coder → Refactorer → Verifier (+ Architect's commit/PR act). No mutator was
invoked (`npx stryker run` was **not** run), no surviving-mutant set exists, and no
mutation-killing tests were authored by this stage.

The mutation row is therefore not applicable, recorded as:

| Metric | Value |
|---|---|
| Tool | n/a — no mutator invoked |
| Threshold | n/a (no `production`-tier gate configured) |
| Score | **skipped — `mvp` tier** |
| Survivors killed | n/a |

---

## Equivalent mutants

**None recorded — vacuous.** An equivalent mutant is a survivor judged un-killable
by any test; with no mutator run there is no survivor set to classify. This is a
consequence of the `mvp` skip, not a claim that the suite would be mutation-clean
were Stryker run.

*(For a future `production`-tier promotion of this project: the untested-surface
note in §Out-of-scope findings — `scripts/recording/*.mjs` outside both the ESLint
`complexity` rule and `check-code-principles.sh` discovery — is the area most likely
to yield killable survivors, and would need coverage before an ≥80% mutation score
is reachable.)*

---

## Complexity summary (carried from the Refactorer, re-recorded by the Verifier)

The Refactorer leaves no report artifact by design; its claims are auditable only
because the Verifier re-executes them. Carried forward verbatim from
`25-verification.md`:

### Before / after (Phase 1 attempt 1 remediation)

| Function | File | Before | After | Fix |
|---|---|---|---|---|
| `getRawBookingFields` | `api/stripe-webhook.ts` | 24 lines (pre-image 20, at limit; Task 6 `name` extraction pushed it over) | **16 lines** | split into helper |
| `buildSessionParams` | `api/bookings/checkout.ts` | 27 lines (pre-image 22, already over; Task 3 `name` metadata field worsened it) | **13 lines** | split into helper |

Both were genuine `docs/CODING_CONVENTIONS.md` KISS `method >20 lines` violations
under blame-scoping; the gate was fixed by changing the code, never the threshold.

### Gate result at final re-run

| Gate | Result |
|---|---|
| cyclomatic complexity (`eslint complexity ≤6`, `eslint.config.cjs:51`) | **0 errors** (10 pre-existing `no-console` warnings, all in `tests/e2e/*.e2e.ts`, not in the diff) |
| design-principles (`check-code-principles.sh -BaseRef main`) | **0 FAIL / 5 WARN** (exit 0) |
| property tests | n/a — `mvp` tier (property tests are `production`+ too) |

### The 5 WARNs (review hints, not gates — carried forward verbatim)

1. `Possible duplication (5x identical 4-line block, first at ./api/bookings/types.ts:16): date: string / startTime: string / hours: number / email: string`
2. `Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:310): startTime: string / hours: number / joinUrl?: string | null / date: string`
3. `Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:15): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) / return false / return true / if (req.method !== 'POST') {`
4. `Possible duplication (3x identical 4-line block, first at ./api/bookings/validation.ts:131): name: string / date: string / startTime: string / email: string`
5. `SRP: possible god file (node) — ./api/stripe-webhook.ts: 629 lines, 9 methods (split by responsibility)`

WARNs 1–4 are field-shape blocks that share one reason-to-change (partly the
Refactorer's own `BookingRequestFields` consolidation); WARN 5 is a **pre-existing**
god file that the helper extraction grew by 12 lines. Per
`docs/SPEC_PIPELINE.md §Stop-and-Ask decision matrix`, a WARN is recorded and
flagged, not a stop.

---

## Evidence: final test status (full suite, one final time)

command: npm test
exit: 0
at: 2026-10-29T11:02:41Z

```
> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  71 passed (71)
      Tests  447 passed | 1 skipped (448)
   Start at  12:02:25
   Duration  15.60s (environment 71%, tests 13%, setup 7%, transform 4%, import 3%, worker 1%)
```

Identical result to the Verifier's run (71 files / 447 passed / 1 skipped): every
acceptance test, unit test and property test in the configured suite is green. The
**1 skipped** is the pre-existing, `LIVE`-env-gated
`describe.skipIf(!LIVE)('live: the bot joins a room and records a real participant', …)`
in `src/__tests__/AC-006-bot-adapter.test.ts:705` — untouched by this branch and not
an AC-008 scenario. **No new code was added by this stage**, so this re-run is a
regression confirmation of the Verifier's green rather than coverage of new tests.

---

## Out-of-scope findings (carried forward from `25-verification.md` — record only, do not fix)

These are **not** gate FAILs and are unchanged by this stage. They are carried
forward so the PR Opener / reviewer sees them with the report.

1. **Vendored `.standards` CC=10 FAIL (full-tree run only).**
   `.standards/skills/hallmark/site/examples/cobalt-01/script.js:7` reports `CC=10`
   under the *full-tree* `check-code-principles.sh --json` (exit 1). It is git
   submodule content (`3b1879050fbc… .standards (v1.7.0-119-g3b18790)`), **not
   tracked by the parent repo**, byte-identical pre/post branch (`git diff` empty),
   and it vanishes from the blame-scoped run. Scope leak in the full-tree run, not
   a defect in this spec's code. **Follow-up proposed:** make
   `check-code-principles.sh` (or its callers) skip the vendored `.standards/` tree
   in child-repo full-tree runs.

2. **Scenario-ID collision.** `AC-008-01`..`AC-008-06` (this spec's form/API-name
   scenarios) collide with the pre-existing `src/__tests__/AC-008-webhook.test.ts`
   (spec 001's task-8 webhook idempotency) and `docs/changes/001-landing-booking.md`.
   Two tests claim the same IDs with different meanings. Traceability still resolves
   (authority = the in-flight `specs/008-*/20-acceptance/`), so check 1 passed — the
   collision is real and confusing for anyone grepping IDs. **Follow-up proposed:**
   a spec to normalize the ID convention (per-spec namespace or a global
   unique-sequence registry). Do **not** renumber in this spec.

3. **`prettier --check .` flags `specs/**` markdown (13 files).** `.prettierignore`
   does not list `specs/`, so `npx prettier --check "specs/**/*.md"` exits 1.
   **Action for the PR Opener:** the archive one-pager
   (`docs/changes/008-customer-name-and-recording-folders.md`, written by stage 5b)
   will likely carry the same formatting and fail the CI `Lint & Format` job in
   phase 2 unless it is `prettier --write`-cleaned before the push, or `specs/` +
   `docs/changes/` are added to `.prettierignore`. **This report file is itself
   `specs/**` markdown and falls under the same finding.**

**Additional pre-existing coverage observation** (Verifier, not this stage):
`scripts/recording/*.mjs` (Tasks 7/8, incl. the new `folder.mjs`) is outside both
the ESLint `complexity` rule (`files: ['**/*.{js,jsx,ts,tsx}']` excludes `.mjs`) and
`check-code-principles.sh` discovery (`-name '*.js'` does not match `*.mjs`), so it
is not mechanically complexity- or KISS-gated by either tool. Not a FAIL for this
spec; worth a follow-up.

---

## Remediation record

| # | Phase | Gate / trigger | Attempt resolved at | Status |
|---|---|---|---|---|
| 1 | Phase 1 (pre-PR) | design-principles — 2 KISS `>20 lines` FAILs (`getRawBookingFields` 24, `buildSessionParams` 27) on Verifier attempt 1 | **attempt 2** (`SPEC_PHASE1_RETRIES=1`, scoped re-verification: gate re-run exit **0**, 0 FAIL / 5 WARN; `npm test` exit **0**) | resolved — Phase 1 budget not exhausted (1 of max 3 used) |
| 2 | Phase 2 (post-PR) | — | — | **none occurred** — no PR exists yet (stage 5b has not run); Phase 2 counter untouched (0 of max 3) |

Carried forward from `25-verification.md` §Remediation record; attempt information
was present there, so no entry is inferred. **No BLOCK occurred during stage 5a** —
the mutation gate was skipped by tier, not failed, so this stage consumed no
remediation budget and added no BLOCK row.

**Working-tree note (not a STOP):** the tree is intentionally dirty — this branch's
work is the uncommitted working tree vs `main` (`25-verification.md` §Base ref).
Per the decision matrix this stage stashes nothing and commits nothing; the commit
is stage 5b's act. Recorded so the state is explicit, not accidental.

---

## Stage-5b blocker: audit-trail gate FAILs on `25-verification.md` (not this file)

command: bash .standards/scripts/check-audit-trail.sh 008-customer-name-and-recording-folders
exit: 1
at: 2026-10-29T11:03:02Z

```
PASS 008-customer-name-and-recording-folders: 10-tasks.md present and non-empty
PASS 008-customer-name-and-recording-folders: 20-acceptance/ has an AC-*.md with a '## AC-NNN-NN' heading (AC-015-10)
PASS 008-customer-name-and-recording-folders: 25-verification.md present and non-empty
PASS 008-customer-name-and-recording-folders: 30-report.md present and non-empty
PASS 008-customer-name-and-recording-folders: 15-design.md present and non-empty (AC-015-13)
PASS ... evidence block 'scenario traceability' — command: bash .standards/scripts/check-scenario-traceability.sh --json, exit: 0, at: 2026-10-29T10:47:30Z
PASS ... evidence block 'full test suite' — command: npm test, exit: 0, at: 2026-10-29T10:47:37Z
PASS ... evidence block 'complexity gate' — command: npm run lint, exit: 0, at: 2026-10-29T10:48:20Z
FAIL 008-customer-name-and-recording-folders: 25-verification.md has no evidence block for 'design-principles gate' (AC-015-04/AC-015-14)
FAIL 008-customer-name-and-recording-folders: evidence block 'scenario-to-behavior spot check' is missing: exit (AC-015-04)
FAIL Audit-trail check: 2 violation(s).
```

**Both violations are in `25-verification.md`, the Verifier's artifact. This file
(`30-report.md`) passed its own content checks — 10-tasks/20-acceptance/25-verification/
30-report/15-design all present and non-empty.** The gate does not inspect
`30-report.md` evidence blocks at all, so nothing here can clear them.

Root cause — the Verifier's artifact deviates from `docs/SPEC_PIPELINE.md §Evidence
block format`, which specifies a `## Evidence: <check name>` heading and a numeric
`exit:` code:

| # | Violation | Cause in `25-verification.md` | Conforming form |
|---|---|---|---|
| 1 | no `design-principles gate` block found | heading is `## Evidence: design-principles gate (blame-scoped to the change vs main)` — the parenthetical suffix means the heading name does not match | `## Evidence: design-principles gate` (move the parenthetical into the body prose) |
| 2 | spot-check block missing `exit:` | marker is `exit: n/a (manual inspection, no command)` — the gate requires `^exit:[[:space:]]*[0-9]+` | a numeric code (the doc's own worked example uses `exit: 0` for a manual spot check) |

**Not fixed here, deliberately.** `25-verification.md` is the Verifier's independent
evidence about work I did not run; editing it to satisfy a format gate would be me
asserting an exit code for a check I never executed — fabricated evidence, and exactly
the failure mode the separate Verifier stage exists to prevent. Per
`docs/SPEC_PIPELINE.md §Stop-and-Ask decision matrix` ("Out-of-scope finding → Record
it; do not fix; propose a follow-up"), it is recorded, not repaired.

**Consequence:** stage 5b runs this gate before pushing, so the PR Opener will be
blocked. The orchestrator must route the two format fixes back to the **Verifier**
(the owner of the artifact), then re-run `check-audit-trail.sh` — after which nothing
else in this folder is outstanding. This is a Phase 1 format defect, not a new
gate failure of the code: the underlying checks it formats were all executed and
passed.

---

## Handoff to stage 5b (PR Opener)

- **Mutation Runner verdict: GREEN** — `mvp` tier, mutation gate skipped (not failed).
- **Final suite: green** — exit 0, 71 files / 447 passed / 1 pre-existing env-gated skip.
- **Verifier: PASS** — carried forward, unchanged.
- Nothing was committed, pushed, or opened by this stage.
- **Precondition still open:** `check-audit-trail.sh` exits **1** on two format
  violations in `25-verification.md` (see §Stage-5b blocker). Route them to the
  Verifier before pushing — do **not** push with the gate red.
- Before pushing, action out-of-scope finding 3 (prettier `specs/**` +
  `docs/changes/**`).

PR: (appended by stage 5b — the PR Opener writes the PR URL and commit count here)
