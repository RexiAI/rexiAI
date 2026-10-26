# 30-report — spec 006 (branded meeting link + local recording bot)

Stage 5a (Mutation Runner). Written against `10-tasks.md`, `20-acceptance/`, and
`25-verification.md`. The informal spec (`00-informal.md`) was not read.

**Precondition:** `25-verification.md` exists and its current verdict is **PASS**
(phase-1 remediation round, attempt 2). Stage 5a therefore ran.

## Verdict: GREEN

Mutation testing is **skipped — `mvp` tier** (see §Conformance tier determination
for the live evidence). The full suite was re-run by this stage and is green
(414 passed, 1 skipped, exit 0). No stage-5a gate blocks stage 5b.

One **handoff blocker** is recorded for stage 5b anyway, and it is not this
stage's artifact: the pipeline's `check-audit-trail.sh` fails on a
Verifier-owned evidence-format gap in `25-verification.md`
(§Audit-trail gate finding). Stage 5b runs that gate before pushing, so it must
be fixed by the Verifier first. The Verifier's PASS verdict itself stands.

---

## Verifier's verdict (carried forward)

**PASS** — `25-verification.md`, phase-1 remediation round, attempt 2.

The attempt-1 verdict was **BLOCK** on a single gate, `spot-check`: the
end-to-end recorder was absent (`--decide` printed an action nothing consumed).
The Verifier's scoped re-verification closed it by tracing the live chain
(systemd unit → `recording-bot-cron.sh --watch` → `recording-bot.mjs --watch` →
`runRoom` → `joinRoom` → `runSession` → `applyStep` → `capture.start()/stop()` →
`finalizeRecording`) and then reproducing it twice by execution:

- live two-human capture: `mean_volume=-17.6 dB`, muxed `.mp4` in
  `RECORDINGS_DIR` (`exit: 0`, `2026-10-26T12:17:51Z`);
- bot-alone control (independent scratch reproduction): `mean_volume=-91.0 dB`
  with the participant store exposed, i.e. the bot does not record itself
  (`exit: 0`, `2026-10-26T12:19:00Z`).

Carried forward unchanged; not re-litigated here.

---

## Conformance tier determination

Repository tier: **`mvp`**.

Per `.standards/docs/SPEC_PIPELINE.md §Conformance tiers`, the "Architect —
mutation testing" row is **skip** at `mvp`; per
`.standards/docs/CONFORMANCE_TIERS.md`, mutation testing (PiTest / Gremlins /
Stryker) is a `production`-tier rule, so at `mvp` it is out of scope rather than
an unmet gap. The Architect role still runs — only the mutation *test* does not.

The tier was verified live by this stage, not assumed:

- No `AGENTS_*.md` project-instructions file exists at the repo root; root
  `AGENTS.md` is a symlink to `.standards/AGENTS.md`, and it carries no
  `Conformance tier:` declaration.
- `check-code-principles.sh` therefore terminates its auto-detection in
  `TIER="${TIER:-mvp}"` (line 365).
- The gate's own JSON reports `"tier": "mvp"` (its `--json` output, extract
  below).
- The project has not adopted mutation tooling: no `stryker` binary in
  `node_modules/.bin/`, no `stryker.conf.*`, and no `mutation` script in
  `package.json`.

## Evidence: conformance tier auto-detection source

command: ls AGENTS*.md; grep -n "Conformance tier" AGENTS.md; grep -n 'TIER="${TIER:-mvp}"' .standards/scripts/check-code-principles.sh
exit: 0
at: 2026-10-26T12:27:21Z

AGENTS.md
AGENTS.md: no 'Conformance tier:' declaration
365:TIER="${TIER:-mvp}"

## Evidence: conformance tier reported by the gate

command: .standards/scripts/check-code-principles.sh --json 2>/dev/null | jq -r '.tier, (.gates|join(","))'
exit: 1
at: 2026-10-26T12:26:58Z

mvp
complexity,dry,yagni,solid,component-per-file,property-tests

Note on `exit: 1`: the exit code is the gate script's (`PIPESTATUS[0]`), not the
tier extraction. The gate returns 1 because of one FAIL —
`./.standards/skills/hallmark/site/examples/cobalt-01/script.js` (CC=10) — an
example shipped inside the `.standards` submodule, not child-repo code, already
diagnosed and dismissed as out-of-repo noise in `25-verification.md`
§design-principles gate. The tier row itself printed unambiguously: `mvp`.

## Evidence: mutation tooling not adopted

command: ls node_modules/.bin/stryker; ls stryker.conf.*; grep -n '"test"\|mutation' package.json
exit: 0
at: 2026-10-26T12:27:21Z

ls: cannot access 'node_modules/.bin/stryker': No such file or directory
ls: cannot access 'stryker.conf.*': No such file or directory
13:    "test": "vitest run --exclude '.standards/**'"

---

## Mutation score

**skipped — `mvp` tier.**

No mutation tool was run, because the tier does not require one
(`.standards/docs/SPEC_PIPELINE.md §Conformance tiers`: mutation testing is
`production` and `multi-service` only; `.standards/docs/CONFORMANCE_TIERS.md`:
"Mutation testing (PiTest / Gremlins / Stryker) — `production`"). Running Stryker
here would have been running a gate the project has not adopted at its declared
tier, and would have required installing tooling (`@stryker-mutator/*`) that no
tracked file references — a dependency addition this stage has no mandate to
make.

No mutants were generated, so there are no survivors, and this stage wrote no
new tests: there is no surviving mutant to kill. The test suite is unchanged by
stage 5a.

## Evidence: mutation score

command: (none — skipped by tier policy; no mutation tool configured)
exit: 0
at: 2026-10-26T12:26:58Z

Mutation testing skipped — `mvp` tier. Per
`.standards/docs/SPEC_PIPELINE.md` §Conformance tiers and
`.standards/docs/CONFORMANCE_TIERS.md`, mutation testing
(PiTest / Gremlins / Stryker) is a `production`-tier gate and is skipped at
`mvp`. Repo tier is `mvp` (no `Conformance tier:` declaration; gate
auto-detection defaults to `mvp`; no Stryker dependency or config present).

---

## Equivalent mutants

**None.** Mutation testing was skipped at `mvp` tier, so no mutants were
generated and no mutant reached the equivalence question. There is nothing to
name as un-killable, and no mutant was rationalised away — nothing was analysed
as "matches the intent" because nothing was mutated.

---

## Test-suite status: the headline feature's proof is opt-in

Read this before trusting the green number below. The live capture test — the
one that proves the bot actually joins a room, crosses the two-human threshold,
and records audible audio — is **skipped in the default suite**:

```
const LIVE = process.env['BOT_LIVE_TEST'] === '1'
describe.skipIf(!LIVE)('live: the bot joins a room and records a real participant', () => {
```

It runs only under `BOT_LIVE_TEST=1 npx vitest run src/__tests__/AC-006-bot-adapter.test.ts`,
which is how the Verifier produced the `-17.6 dB` capture and the `-91.0 dB`
bot-alone control. In a plain `npm test` — including the run recorded below —
that block is the **1 skipped** test, so the default suite's green does **not**
re-prove live capture; it proves the unit/acceptance layer around it.

The separate `it.skipIf(!hasFfmpeg)` case in `AC-006-recording-output.test.ts`
(AC-006-19) is an environment guard, and in this run it was **not** skipped:
`ffmpeg` and `ffprobe` are present, so the real-ffmpeg assertion executed.

## Evidence: live-test gating (source fact)

command: grep -n "const LIVE\|describe.skipIf(!LIVE)\|it.skipIf(!hasFfmpeg)" src/__tests__/AC-006-bot-adapter.test.ts src/__tests__/AC-006-recording-output.test.ts
exit: 0
at: 2026-10-26T12:27:26Z

src/__tests__/AC-006-bot-adapter.test.ts:515:const LIVE = process.env['BOT_LIVE_TEST'] === '1'
src/__tests__/AC-006-bot-adapter.test.ts:516:const LIVE_BASE = process.env['BOT_LIVE_TEST_BASE'] || 'https://meet.ffmuc.net'
src/__tests__/AC-006-bot-adapter.test.ts:695:describe.skipIf(!LIVE)('live: the bot joins a room and records a real participant', () => {
src/__tests__/AC-006-recording-output.test.ts:121:  it.skipIf(!hasFfmpeg)(

---

## Complexity summary (carried from the Refactorer)

The Refactorer leaves no report artifact; its gates are re-executed and recorded
by the Verifier in `25-verification.md`. Carried forward verbatim as measured:

- `deploy/join/index.html` inline script cyclomatic complexity: **9 → 5**.
- `api/stripe-webhook.ts`: **631 → 603 lines**, method count **14 → 9**
  (`getRawBookingFields` extraction among them).
- Overall max cyclomatic complexity: **6**, with **0 violations** of the
  project's ESLint `complexity: ['error', 6]` gate.

Independently corroborated at stage 4: `npm run lint` → 0 errors (the 10
existing `no-console` warnings are confined to pre-existing `tests/e2e/*`
files), and the supplementary `npx eslint scripts/recording/bot/*.mjs
scripts/recording-bot.mjs` run added by the remediation round → 0 errors,
0 warnings.

Carried WARNs (not blockers, recorded for stage 5b / reviewers):
`api/stripe-webhook.ts:148 getRawBookingFields` KISS_LINES=21 and
`api/bookings/checkout.ts:45 buildSessionParams` KISS_LINES=23 — both just over
the 20-line method guideline; plus DRY duplication warnings from repeated
`BookingInput`/`BookingData` field-shape literals in `api/bookings.ts` and
`api/stripe-webhook.ts`. The `stripe-webhook.ts` "possible god file" WARN is now
603 lines / 9 methods after the Refactorer's split (down from 631 / 14).

Note on the tier: property testing is also a `production`-tier rule
(`docs/CONFORMANCE_TIERS.md`), so the gate skips that check at `mvp`. Three
property-test files nonetheless exist in this spec's tree
(`PROP-consent-notice.test.ts`, `PROP-meeting-url.test.ts`,
`PROP-participants.test.ts`) and do run as part of the suite below — they are
included in the 414 passing tests, not skipped.

---

## Final test status (re-run by this stage)

**PASS** — 62 test files, **414 passed, 1 skipped**, exit 0. Re-run by stage 5a
itself after the mutation-kill work (which was a no-op); no number is copied
from the Verifier's run, which reported a different count (61 files / 382 tests,
before the remediation round added the bot-adapter suite).

## Evidence: final full test suite

command: npm test
exit: 0
at: 2026-10-26T12:26:58Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  62 passed (62)
      Tests  414 passed | 1 skipped (415)
   Start at  13:26:59
   Duration  16.91s (environment 69%, tests 15%, setup 8%, transform 5%, import 4%, worker 1%)

Environment  jsdom was created 62 times · 109.18s total, 69% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

The single skipped test is the `BOT_LIVE_TEST`-gated live capture described
above. No acceptance scenario depends on it exclusively: the two IDs that block
also carries, AC-006-14 and AC-006-19, are additionally asserted by tests that
ran in this suite (evidence below), and stage 4's traceability check resolved
36/36 IDs.

## Evidence: skipped live block is not the sole coverage for its scenario IDs

command: grep -rn "AC-006-14\|AC-006-19" src/__tests__/ | grep -v "AC-006-bot-adapter"
exit: 0
at: 2026-10-26T12:28:36Z

src/__tests__/AC-006-record-threshold.test.ts:31:  it('AC-006-14: exactly two non-bot humans starts the recording', () => {
src/__tests__/AC-006-recording-output.test.ts:91:  it('AC-006-19: the finalized recording reports an audio stream to ffprobe', async () => {
src/__tests__/AC-006-recording-output.test.ts:92:    const recordings = path.join(base, 'AC-006-19')
src/__tests__/AC-006-recording-output.test.ts:113:      env: { RECORDINGS_DIR: path.join(base, 'AC-006-19-silent') },

---

## Non-blocking flags carried forward from the Verifier

Recorded, not fixed here — neither is a gate failure, and neither is stage 5a's
file to change.

1. **No `schedule.json` producer (follow-up spec needed).** The bot *reads*
   `schedule.json` (`scripts/recording/bot/schedule.mjs`, `scripts/recording-bot.mjs`,
   and both systemd units), but nothing in the repo writes it —
   `api/bookings.ts`, `api/bookings/direct.ts`, and `api/stripe-webhook.ts` never
   emit it. Consequence: `--watch` and `--missed` are correct and live-verified
   but have no input when run unattended. No task in `10-tasks.md` assigns the
   producer, and no acceptance scenario asserts schedule production, so this is a
   genuine out-of-scope input rather than an unmet scenario — but it must be
   closed by a follow-up spec **before** the bot is trusted unattended. The
   timer/service units should not be enabled in production until then.
2. **Orphaned Chrome processes.** A prior *manual* run left browser processes
   behind: `/tmp/chrome-p4-{Alpha,Beta,Rexi Recorder}`, room
   `rexi-39f7a6cd00000000`, ports 9481–9483. They are not from the committed
   vitest live test (which uses `rexi-live-profile-*` dirs and cleans up in its
   `finally`) and not from the Verifier's runs (both cleaned up). Flagged for the
   Coder to kill; harmless to the suite, but they hold ports and profile dirs.

Also carried (housekeeping before stage 5b commits): six untracked NAT-diagnostic
screenshots at the repo root (`router-1.png`, `router-2.png`,
`router-connect.png`, `router-nat.png`, `router-nat2.png`, `router-wan.png`)
trace to nothing in the tasks or scenarios — they should be excluded from the
spec branch rather than committed.

---

## Remediation record

Per `.standards/docs/SPEC_PIPELINE.md §Remediation budget`, carried from the
attempt entries in `25-verification.md`:

| Phase | Attempt | Gate | Outcome |
|---|---|---|---|
| 1 (pre-PR) | 1 | `spot-check` | **BLOCK** — end-to-end recorder absent; `--decide` printed an action with no consumer |
| 1 (pre-PR) | 2 | `spot-check` (scoped re-verification) | **Resolved → PASS** — recorder wired and live-verified twice (`-17.6 dB` capture, `-91.0 dB` bot-alone control) |

- **BLOCKs during this run: 1.** Resolved in **phase 1, attempt 2** — inside the
  phase-1 budget of max 3 (2 of 3 used, 1 remaining).
- **Phase 2 (post-PR) BLOCKs: none.** No PR exists yet; stage 5b owns that loop,
  and its counter is independent of the phase-1 counter above.
- No other gate produced a BLOCK: traceability (36/36), the full suite, the
  complexity gate, and the design-principles gate were green from attempt 1, and
  the attempt-1 design-principles FAIL was out-of-repo `.standards` submodule
  noise, not an in-scope defect.
- Stage 5a itself raised **no** BLOCK and invoked no remediation loop: its only
  gate (mutation testing) is tier-skipped, so the phase-1 budget was not
  consumed further.

---

## Audit-trail gate finding (handoff blocker for stage 5b — Verifier-owned, NOT fixed here)

Running the pipeline's own audit gate on this folder **fails**, and the cause is
in `25-verification.md`, not in this report. Stage 5b runs this gate before
pushing, so **stage 5b will be blocked until it is corrected**.

## Evidence: audit-trail gate

command: .standards/scripts/check-audit-trail.sh 006-branded-meeting-link-and-recording-bot
exit: 1
at: 2026-10-26T12:28:15Z

PASS 006-branded-meeting-link-and-recording-bot: 10-tasks.md present and non-empty
PASS 006-branded-meeting-link-and-recording-bot: 20-acceptance/ has an AC-*.md with a '## AC-NNN-NN' heading (AC-015-10)
PASS 006-branded-meeting-link-and-recording-bot: 25-verification.md present and non-empty
PASS 006-branded-meeting-link-and-recording-bot: 30-report.md present and non-empty
PASS 006-branded-meeting-link-and-recording-bot: 15-design.md present and non-empty (AC-015-13)
PASS 006-branded-meeting-link-and-recording-bot: evidence block 'scenario traceability' — command: .standards/scripts/check-scenario-traceability.sh --json, exit: 0, at: 2026-10-26T10:46:10Z
PASS 006-branded-meeting-link-and-recording-bot: evidence block 'full test suite' — command: npm test, exit: 0, at: 2026-10-26T10:46:50Z
PASS 006-branded-meeting-link-and-recording-bot: evidence block 'complexity gate' — command: npm run lint, exit: 0, at: 2026-10-26T10:47:20Z
PASS 006-branded-meeting-link-and-recording-bot: evidence block 'design-principles gate' — command: .standards/scripts/check-code-principles.sh --json, exit: 1, at: 2026-10-26T10:47:50Z
FAIL 006-branded-meeting-link-and-recording-bot: evidence block 'scenario-to-behavior spot check' is missing: exit (AC-015-04)
✘ Audit-trail check: 1 violation(s).

Cause, precisely: `check-audit-trail.sh` selects the evidence block whose
`## Evidence:` heading **exactly** equals one of its five check names
(`FIVE_CHECKS`, lines 76-82) and then requires a **numeric** exit
(`marker "$block" '^exit:[[:space:]]*\K[0-9]+'`, line 156). The heading it
therefore selects is the attempt-1 block in `25-verification.md`:

```
## Evidence: scenario-to-behavior spot check

command: manual — read 20-acceptance/AC-006-record-threshold.md, AC-006-recording-output.md, AC-006-missed-meeting.md; traced `--finalize`/`--decide`/`--missed` callers; grep for any WebRTC client
exit: n/a (finding)
at: 2026-10-26T10:48:00Z
```

`exit: n/a (finding)` does not match `[0-9]+`, so the block is reported as
missing its exit code. The attempt-2 blocks that carry the PASS-producing
scoped spot-check evidence (`## Evidence: live proof (scoped spot-check re-run)`,
`## Evidence: scenario tests (scoped spot-check)`) use headings with
parentheticals, so the exact-match selector never reaches them.

Why this stage did not fix it: `25-verification.md` is the Verifier's
independent record of what *it* executed. Rewriting its `exit:` line, or
renaming its headings to make a gate pass, would put stage 5a's hand on another
stage's evidence — the exact failure mode the separate Verifier stage exists to
prevent (`.standards/docs/SPEC_PIPELINE.md §Why a separate Verifier stage`). A
numeric exit for a manual read is the Verifier's to assert (the attempt-1
finding was a BLOCK, so `exit: 1` would carry its own meaning), not mine to
invent.

Minimal correction, for the Verifier: give the attempt-1 spot-check block a
numeric `exit:` (or retitle the attempt-2 scoped block to the exact contract
name `## Evidence: scenario-to-behavior spot check` with its `exit: 0`). One of
the two, chosen by the agent that ran it. This is a formatting gap in the
Verifier's artifact, not a technical defect in the spec's code, and it does not
change the PASS verdict — but it is a hard gate failure for stage 5b until
fixed.

---

## What this stage changed

Nothing but this report. No production code, no test file, no threshold, no
gate configuration, and no exemption list was modified — stage 5a had no
surviving mutant to kill and no gate to widen. Specifically **not** done:
committed, pushed, tagged, or opened a PR (that is stage 5b). The working tree
still carries this spec's uncommitted work by design; it was not stashed,
cleaned, or committed here, per the stop-and-ask matrix.

---

## Gate summary

| Item | Result |
|---|---|
| Verifier precondition (`25-verification.md`) | PASS (attempt 2, phase 1) |
| Conformance tier | `mvp` (live-verified: no declaration, gate auto-detect, no Stryker) |
| Mutation score | skipped — `mvp` tier (threshold ≥80% applies at `production`+) |
| Equivalent mutants | none (no mutants generated) |
| Complexity (carried from Refactorer) | max CC 6, 0 violations; inline script 9→5; webhook 631→603 lines / 14→9 methods |
| Final full suite | 62 files, 414 passed, 1 skipped, exit 0 |
| Remediation | 1 BLOCK, resolved phase 1 attempt 2 (budget 2/3) |
| Stage 5a gates | GREEN (mutation skipped by tier; suite green) |
| Audit-trail gate (`check-audit-trail.sh`) | **FAIL** — Verifier-owned evidence-format gap in `25-verification.md`; blocks stage 5b until corrected |
| Non-blocking | `schedule.json` producer (follow-up spec); orphaned Chrome processes |
