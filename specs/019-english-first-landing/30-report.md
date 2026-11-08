# 019 — English-first landing relaunch: stage 5a report

Stage 5a of `docs/SPEC_PIPELINE.md` (Mutation Runner). Written from tests and
scenarios only; `00-informal.md` was not read.

- **spec:** `specs/019-english-first-landing`
- **branch:** `spec/019-english-first-landing`
- **tier:** `mvp` — declared at `10-tasks.md:4` ("Conformance tier: **`mvp`** — no
  mutation-testing task, no property-test task") and reaffirmed at `10-tasks.md:686`
- **base:** `24bd5ab` (`chore: bump engineering standards submodule to v1.51.1 (#94)`);
  the whole spec is one uncommitted working tree on top of it, 44 dirty paths
- **precondition:** `25-verification.md` exists and its current verdict is
  **PASS (attempt 2, phase 1)** — satisfied, so stage 5a ran
- **verdict of this stage:** **GREEN** — mutation gate skipped by tier policy,
  full suite green, every configured gate green, audit-trail gate green

Nothing was committed, pushed, or opened. No test and no production file was
edited by this stage: the only file written is this report.

## Mutation score

Mutation score: SKIPPED — conformance tier `mvp` (no mutation tooling run).

The mutation-testing gate is a **`production`-tier** requirement
(`docs/SPEC_PIPELINE.md` §Conformance tiers: "Architect — mutation testing |
skip | yes | yes"), so an `mvp` spec runs the pipeline without it and conforms
fully to that subset. No Stryker configuration or dependency exists in this repo
and none was added: `ls stryker.conf.*` → no match; `package.json` dev+deps
contain no `stryker*` package.

## Evidence: final full test suite

command: npm test
exit: 0
at: 2026-11-08T16:58:15Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  93 passed (93)
      Tests  621 passed | 1 skipped (622)
   Start at  17:57:59
   Duration  16.50s (environment 68%, tests 17%, setup 7%, transform 4%, import 3%, worker 1%)

Re-confirmed after the Verifier's PASS, as this stage requires. Identical to
attempt 2 of `25-verification.md` (93 files / 621 passing / 1 skipped). The
single skip is the pre-existing `describe.skipIf(!LIVE)` at
`src/__tests__/AC-006-bot-adapter.test.ts:705`, present at `HEAD` as well.

## Complexity summary (carried from the Refactorer's gates via the Verifier)

- **Gate used:** ESLint `complexity: ['error', 6]` — `eslint.config.cjs:51` —
  run through `npm run lint`, plus `scripts/check-code-principles.sh` as the
  language-agnostic design-principles gate.
- **Worst changed function:** `Landing` (`src/pages/Landing.tsx:14`) at
  **cyclomatic complexity 5**, against the configured maximum of 6.
- **Full changed-function set** (forced-threshold measurement, values are the
  evidence; exit 1 is expected because the threshold is forced to 1):
  `Landing` 5, `submitButtonLabel` 4, `BookingLayout` 4, `getInitialLocale` 4,
  `env` 3, an arrow function in `I18nContext.tsx` 3, `About` 2. `Services` and
  `Proof` are single-`map` JSX and do not register above 1.
- **Design-principles gate:** **0 FAIL / 210 WARN** — no FAIL, so no pipeline
  stop. Exactly one WARN lands on a file this spec touches:
  `WARN Method body >20 lines (node): ./src/pages/Landing.tsx:14:110:Landing:KISS_LINES=87`
  (87-line JSX body; a KISS line-count hint, not the cyclomatic rule). The
  other 209 WARNs are pre-existing in `api/*`, `src/domain/*`,
  `src/pages/Privacy.tsx`, `src/content/privacy.ts`, `scripts/*` and
  `.standards/*`.
- **Property tests:** skipped — `mvp` tier (`mvp` is `production+` required);
  the gate reports `Property tests: skipped (project tier is mvp — production+ required)`.
- **Duplication:** DRY WARNs are all pre-existing (`api/bookings/*`,
  `api/stripe-webhook.ts`, `src/content/privacy.ts`, `.standards/*`); none lands
  on a file this spec creates or changes.

The Refactorer leaves no report artifact by design
(`docs/spec-pipeline/audit-contract.md` §What each stage leaves behind); these
are the Verifier's independent measurements, re-confirmed by force-running the
threshold in this stage.

## Evidence: complexity gate (changed functions)

command: npx eslint --rule '{"complexity":["error",1]}' --no-warn-ignored src/components/About.tsx src/components/Proof.tsx src/components/Services.tsx src/pages/Landing.tsx src/i18n/dictionary.ts src/i18n/I18nContext.tsx src/components/booking/BookingLayout.tsx src/content/legalEntity.ts
exit: 1  (expected: the forced threshold of 1 reports every function above it; the values are the evidence)
at: 2026-11-08T16:58:25Z

/home/dbueno/projects/rexiAI/src/components/About.tsx
  11:8  error  Function 'About' has a complexity of 2. Maximum allowed is 1  complexity

/home/dbueno/projects/rexiAI/src/components/booking/BookingLayout.tsx
  19:1  error  Function 'submitButtonLabel' has a complexity of 4. Maximum allowed is 1  complexity
  26:8  error  Function 'BookingLayout' has a complexity of 4. Maximum allowed is 1      complexity

/home/dbueno/projects/rexiAI/src/content/legalEntity.ts
  34:1  error  Function 'env' has a complexity of 3. Maximum allowed is 1  complexity

/home/dbueno/projects/rexiAI/src/i18n/I18nContext.tsx
   9:1   error  Function 'getInitialLocale' has a complexity of 4. Maximum allowed is 1  complexity
  46:45  error  Arrow function has a complexity of 3. Maximum allowed is 1               complexity

/home/dbueno/projects/rexiAI/src/pages/Landing.tsx
  14:8  error  Function 'Landing' has a complexity of 5. Maximum allowed is 1  complexity

✖ 7 problems (7 errors, 0 warnings)

Identical to the Verifier's forced-threshold run in `25-verification.md`: same 7
functions, same values. Under the project's configured threshold of 6 this is 0
errors, which is what `npm run lint` reports below.

## Evidence: lint

command: npm run lint
exit: 0
at: 2026-11-08T16:57:47Z

> rexiai-website@0.0.0 lint
> eslint .

✖ 11 problems (0 errors, 11 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.

Zero errors. All 11 warnings are in files this spec does not touch
(`api/bookings/checkout.ts` — 1 `import/order`; `tests/e2e/funnel-consent-boundary.e2e.ts`,
`tests/e2e/home-timer-scan.e2e.ts`, `tests/e2e/switch-refusal.e2e.ts` — 10 `no-console`).

## Evidence: format check

command: npm run format:check
exit: 0
at: 2026-11-08T16:57:46Z

> rexiai-website@0.0.0 format:check
> prettier --check .

Checking formatting...
All matched files use Prettier code style!

## Evidence: build

command: npm run build
exit: 0
at: 2026-11-08T16:57:54Z

> tsc -b && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 48 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.93 kB │ gzip:  0.61 kB
dist/assets/index-5JNv8OKY.css   12.35 kB │ gzip:  2.54 kB
dist/assets/index-CweKhoYg.js   261.68 kB │ gzip: 82.92 kB

✓ built in 169ms

`npm run build` is `tsc -b && vite build`, so the TypeScript gate is covered here.

## Evidence: design-principles gate

command: bash .standards/scripts/check-code-principles.sh
exit: 0
at: 2026-11-08T16:57:56Z

---------------------------------------------
✔ Design-principles check: 0 FAIL(s), 210 WARN(s).
  WARNs are review hints — verify each before merging.

Tail of the run as executed (the full 210-line WARN list is verbatim in
`25-verification.md` §Evidence: design-principles gate and did not change):

WARN Null-discipline: return null (./api/reschedule/submit.ts:200)
WARN Null-discipline: return null (./api/reschedule/submit.ts:242)

**0 FAIL / 210 WARN.** Per the Stop-and-Ask matrix, a design-gate WARN is
recorded and flagged to the Architect, not a stop. The single WARN on a file
this spec produces is the `Landing` 87-line body noted in the complexity
summary; every other WARN is pre-existing.

## Evidence: scenario traceability

command: bash .standards/scripts/check-scenario-traceability.sh
exit: 0
at: 2026-11-08T16:57:39Z

PASS AC-019-23 — traced to a test
PASS AC-019-24 — traced to a test

✔ Scenario traceability check: every scenario traced, every reference resolves.

All 24 `AC-019-*` scenarios trace to a test (full per-ID list in
`25-verification.md` §Evidence: scenario traceability).

## Verification verdict (carried forward)

- **Verdict: PASS (attempt 2, phase 1).** `25-verification.md` line 1072,
  superseding attempt 1's FAIL (line 868).
- **Phase-1 attempt count: 2** — attempt 1 (full run, FAIL on one blocking
  finding: deleted `public/services/*.svg`), then attempt 2 (scoped
  re-verification of that finding plus the numbering advisory, PASS). The two
  open items it closed are marked CLOSED in `25-verification.md` §Advisory status;
  the 11 remaining advisories are OPEN and routed to this stage, none of them a
  FAIL or a BLOCK.

Carried forward verbatim from that file; not re-litigated here. This stage did
**not** re-run the Verifier's scenario-to-behaviour spot check (it is the
Verifier's check, and it already passed at attempt 1).

## Remediation record

BLOCK occurred: **yes — one, resolved.**

| Phase | Attempt at which resolved | What blocked | Resolution |
|---|---|---|---|
| 1 (pre-PR) | **2** | Verifier verdict FAIL at attempt 1: `public/services/{apps,consulting,saas,webs}.svg` deleted, against binding Open question 4 ("do not delete the existing `/services/*.svg` assets") | Restored (`git checkout -- public/services/`); scoped re-verification at phase 1, attempt 2 returned PASS. Labelled advisory finding 12 (numbering `010`/`019`) fixed in the same round. |

- **Phase-1 budget consumed:** 1 of 3 remediation rounds (attempt 2 is the fix
  round). 2 rounds remain unused.
- **Phase-2 (post-PR CI):** not entered — no PR exists yet at stage 5a.
- **Phase-3 (deploy verification):** not entered — stage 5c runs after stage 5b.
- **BLOCKs during this stage (5a):** none. No gate failed, so no remediation
  budget was consumed by the Mutation Runner.

Source: `25-verification.md` §Verdict (attempt 1, FAIL) and §Attempt 2 — scoped
re-verification ("Attempt 2, phase 1 — one remediation round consumed (of 3)").
No orchestrator loop summary beyond that was supplied to this stage, so no other
attempt count is claimed.

## Equivalent mutants

**None — not applicable.** Mutation testing was not run (see §Mutation score), so
no mutant was generated, none survived, and no equivalent-mutant judgement was
required. This is a tier-policy skip, not an exhausted search for un-killable
mutants.

## Autopilot

Autopilot: false

Decisions resolved at the human gate: 9

All nine `Open questions` in `10-tasks.md` §Open questions (lines 691–725) were
resolved at the human gate before `/build` and are binding: (1) scenario-ID
collision resolved by renumbering the spec to `019`; (2) ES copy approved as
translated; (3) free-mode card note kept; (4) service cards text only, `/services/*.svg`
not deleted; (5) `about.bio` dictionary string, rendered only when non-empty;
(6) duration selector hidden in free mode, free mode sends `hours: 1`;
(7) `.env.example` `VITE_LEGAL_EMAIL` folded to `info@rexi-ai.com`; (8) nav stays
at three links; (9) contact section rewritten with the final first-person copy
and no response-time promise.

This run was not an autopilot run: `SPEC_AUTOPILOT` was unset and no `autopilot`
token was passed, so no entry in `45-decisions.md` is expected and no
`Autopilot decisions:` count applies. No stop-and-ask condition was hit.

## Out-of-scope findings (recorded, not fixed)

Per the Stop-and-Ask matrix ("Out-of-scope finding | Record it; do not fix;
propose a follow-up spec"), carried from `25-verification.md` §Advisory status
and left untouched by this stage:

1. `src/__tests__/AC-019-hero.test.ts:13` holds the retired hero copy as a
   literal, so `grep -rn "with or without AI" src/` is not clean (the behaviour
   is correct; only the fixture string is a literal).
2. `src/index.css` drops the unused `--text-xs` token.
3. `.gitignore` / `.prettierignore` gain `.vitest` entries with no matching task.
4. Global `a:focus-visible, button:focus-visible` rule in `src/App.css` styles
   every surface, not just the landing.
5. ES `#hero` is 566px tall against `15-design.md`'s ≤560px budget (design-file
   budget, not an acceptance criterion).
6. AC-019-10's width dimension is not exercised in jsdom.
7. AC-019-18's modified-dictionary clause is only executed against `About`.
8. AC-019-16's "Tell me what is broken" absence is asserted scoped to `#booking`.
9. `About` trims `about.bio`.
10. `10-tasks.md`'s claim of an `AC-019-email.test.ts` ID collision is not
    reproducible; the Test changes record still carries it.
11. Per-stage test attribution is not verifiable from VCS (one working tree, no
    Coder/Refactorer commits) — a pipeline-process note, not this spec's.

Also recorded, outside this spec: an untracked `.env.bak-rexi-*` at the repo
root contains a plaintext operator email and other env values (gitignored,
outside `src/`) — worth deleting by hand.

## Evidence: audit-trail gate

command: bash .standards/scripts/check-audit-trail.sh 019-english-first-landing
exit: 0
at: 2026-11-08T16:58:52Z

PASS 019-english-first-landing: 10-tasks.md present and non-empty
PASS 019-english-first-landing: 20-acceptance/ has an AC-*.md with a '## AC-NNN-NN' heading (AC-015-10)
PASS 019-english-first-landing: 25-verification.md present and non-empty
PASS 019-english-first-landing: 30-report.md present and non-empty
PASS 019-english-first-landing: 15-design.md present and non-empty (AC-015-13)
PASS 019-english-first-landing: 40-deploy.md absent — tolerated pre-5c (stage 5d re-runs with --require-deploy, AC-031-21)
PASS 019-english-first-landing: 45-decisions.md optional without an 'Autopilot: true' marker (AC-035-35)
PASS 019-english-first-landing: evidence block 'scenario traceability' — command: bash .standards/scripts/check-scenario-traceability.sh, exit: 0, at: 2026-11-08T16:47:02Z
PASS 019-english-first-landing: evidence block 'full test suite' — command: npm test, exit: 0, at: 2026-11-08T16:47:06Z
PASS 019-english-first-landing: evidence block 'complexity gate' — command: npm run lint, exit: 0, at: 2026-11-08T16:47:26Z
PASS 019-english-first-landing: evidence block 'design-principles gate' — command: bash .standards/scripts/check-code-principles.sh, exit: 0, at: 2026-11-08T16:52:22Z
PASS 019-english-first-landing: evidence block 'scenario-to-behavior spot check' — command: node /tmp/opencode/spot-check.mjs   (real Chrome via CDP against `npm run build` output served by `vite preview`; each rendered value below is the product, then compared with the test's assertion), exit: 0, at: 2026-11-08T16:52:04Z
✔ Audit-trail check: specs/019-english-first-landing complete, verifier evidence recorded.

Recorded honestly: a pre-write run of the same command at
2026-11-08T16:57:38Z exited **1** with exactly one violation — `FAIL
019-english-first-landing: missing 30-report.md (AC-015-12)` — because this
report did not exist yet. Writing it was this stage's deliverable, so that FAIL
was inside this stage's authority and is now cleared; nothing was faked and no
other line differed. That run also confirmed all five Verifier evidence blocks
and `15-design.md` were already in place.

## Stage verdict

**GREEN.** Mutation gate skipped by tier policy (`mvp`), the full suite is green
at 93 files / 621 passing / 1 pre-existing skip, and every configured gate this
stage can run is green: lint (0 errors), format, build (incl. `tsc -b`),
design-principles (0 FAIL / 210 pre-existing WARN), scenario traceability
(24/24), audit trail. The Verifier's PASS (attempt 2, phase 1) carries forward
and was not contradicted. Stage 5b (PR Opener) may proceed on this report.
