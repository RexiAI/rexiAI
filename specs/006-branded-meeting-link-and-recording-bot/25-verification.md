# 25-verification — spec 006 (branded meeting link + local recording bot)

Verifier stage 4, attempt 1, phase 1. Independent re-check of Coder + Refactorer
claims against `10-tasks.md`, `15-design.md`, and `20-acceptance/`. The informal
spec (`00-informal.md`) was not read.

## Verdict: BLOCK

The pipeline stops. The scenario-to-behavior spot check (check 4) produced a
substantive finding: the end-to-end recording capability — a component that joins
a Jitsi room over WebRTC, observes participants, crosses the two-human threshold,
and produces audio — is **absent**. Scenarios AC-006-13 … AC-006-20 and
AC-006-24 … AC-006-26 are satisfied only by unit-level pure functions and a
finalizer that nothing calls in a live path. The tests are green because they
exercise decisions and a muxer, not a recorder.

Failing gate ID: `spot-check`.

---

## Evidence: scenario traceability

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-10-26T10:46:10Z

{
  "checks": [1, 2],
  "passes": ["AC-006-01 — traced to a test", "AC-006-02 — traced to a test", "AC-006-03 — traced to a test", "AC-006-04 — traced to a test", "AC-006-05 — traced to a test", "AC-006-06 — traced to a test", "AC-006-07 — traced to a test", "AC-006-08 — traced to a test", "AC-006-09 — traced to a test", "AC-006-10 — traced to a test", "AC-006-11 — traced to a test", "AC-006-12 — traced to a test", "AC-006-13 — traced to a test", "AC-006-14 — traced to a test", "AC-006-15 — traced to a test", "AC-006-16 — traced to a test", "AC-006-17 — traced to a test", "AC-006-18 — traced to a test", "AC-006-19 — traced to a test", "AC-006-20 — traced to a test", "AC-006-21 — traced to a test", "AC-006-22 — traced to a test", "AC-006-23 — traced to a test", "AC-006-24 — traced to a test", "AC-006-25 — traced to a test", "AC-006-26 — traced to a test", "AC-006-27 — traced to a test", "AC-006-28 — traced to a test", "AC-006-29 — traced to a test", "AC-006-30 — traced to a test", "AC-006-31 — traced to a test", "AC-006-32 — traced to a test", "AC-006-33 — traced to a test", "AC-006-34 — traced to a test", "AC-006-35 — traced to a test", "AC-006-36 — traced to a test"],
  "fails": []
}

PASS — all 36 scenario IDs (AC-006-01 … AC-006-36) resolve to a test, no dangling
references.

---

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-26T10:46:50Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  61 passed (61)
      Tests  382 passed (382)
   Start at  11:45:00
   Duration  14.76s (environment 71%, tests 14%, setup 7%, transform 4%, import 3%, worker 1%)

PASS — 61 files / 382 tests green, exit 0. No skipped or disabled tests reported
(the `AC-006-19` real-ffmpeg case uses `it.skipIf(!hasFfmpeg)`; see spot check —
that guard is a genuine environment-skip, not a silent skip of the finalizer's
core assertion, which is separately asserted with a simulated runner).

---

## Evidence: complexity gate

command: npm run lint
exit: 0
at: 2026-10-26T10:47:20Z

> rexiai-website@0.0.0 lint
> eslint .

/home/dbueno/projects/rexiAI/tests/e2e/funnel-consent-boundary.e2e.ts
  30:5  warning  Unexpected console statement  no-console
  34:3  warning  Unexpected console statement  no-console
  63:5  warning  Unexpected console statement  no-console
  92:3  warning  Unexpected console statement  no-console

/home/dbueno/projects/rexiAI/tests/e2e/home-timer-scan.e2e.ts
  35:5  warning  Unexpected console statement  no-console
  39:3  warning  Unexpected console statement  no-console
  90:3  warning  Unexpected console statement  no-console

/home/dbueno/projects/rexiAI/tests/e2e/switch-refusal.e2e.ts
  30:5  warning  Unexpected console statement  no-console
  34:3  warning  Unexpected console statement  no-console
  81:3  warning  Unexpected console statement  no-console

✖ 10 problems (0 errors, 10 warnings)

PASS — 0 errors (the project's `complexity: ['error', 6]` and the rest of the
ESLint error rules produce no violations). The 10 warnings are `no-console` in
pre-existing `tests/e2e/*` files, unrelated to this spec.

---

## Evidence: design-principles gate

command: .standards/scripts/check-code-principles.sh --json
exit: 1
at: 2026-10-26T10:47:50Z

{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [{ "message": "Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }],
  "warns": [
    { "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "45" },
    { "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "101" },
    { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" },
    { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "93" },
    { "message": "Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75", "file": "./src/pages/Landing.tsx", "line": "13" },
    { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22", "file": "./src/components/ServicesCarousel.tsx", "line": "32" },
    { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79", "file": "./src/components/ServicesCarousel.tsx", "line": "54" },
    { "message": "Method body >20 lines (node): ./api/stripe-webhook.ts:148:167:getRawBookingFields:KISS_LINES=21", "file": "./api/stripe-webhook.ts", "line": "148" },
    { "message": "Method body >20 lines (node): ./api/bookings/checkout.ts:45:66:buildSessionParams:KISS_LINES=23", "file": "./api/bookings/checkout.ts", "line": "45" },
    { "message": "Method body >20 lines (node): ./api/bookings/recorded-billing.ts:222:244:?:KISS_LINES=24", "file": "./api/bookings/recorded-billing.ts", "line": "222" },
    { "message": "Method body >20 lines (python): ./scripts/recording/whisper_transcribe.py:37:64:main:KISS_LINES=23 [approximate heuristic — comprehension/decorator forms can inflate the count; ADR 0006 warn phase]", "file": "./scripts/recording/whisper_transcribe.py", "line": "37" },
    { "message": "Possible duplication (11x identical 4-line block, first at ./api/bookings.ts:31): date: string /startTime: string /hours: number /email: string", "file": "./api/bookings.ts", "line": "31" },
    { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:284): startTime: string /hours: number /joinUrl?: string | null /date: string", "file": "./api/stripe-webhook.ts", "line": "284" },
    { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:122): email: string /date: string /startTime: string /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "122" },
    { "message": "Possible duplication (3x identical 4-line block, first at ./src/domain/microsoftGraph.ts:178): }) /if (!res.ok) { /const text = await res.text().catch(() => '') /headers: { Authorization: `Bearer ${token}` },", "file": "./src/domain/microsoftGraph.ts", "line": "178" },
    { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: \"problem\", /docs: { /description: /meta: {", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "115" },
    { "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:32): startTime: string /hours: number /locale?: Locale /date: string", "file": "./api/bookings.ts", "line": "32" },
    { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:124): startTime: string /hours: number /amountTotal: number /date: string", "file": "./api/stripe-webhook.ts", "line": "124" },
    { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "132" },
    { "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:14): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {", "file": "./api/bookings.ts", "line": "14" },
    { "message": "Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "133" },
    { "message": "Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30", "file": "./.standards/ci/templates/archunit/OutboxArchRules.java", "line": "30" },
    { "message": "Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33", "file": "./.standards/ci/templates/archunit/SagaArchRules.java", "line": "33" },
    { "message": "SRP: possible god file (node) — ./api/stripe-webhook.ts: 603 lines, 9 methods (split by responsibility)", "file": "./api/stripe-webhook.ts", "line": "" },
    { "message": "LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)", "file": "./src/domain/time.ts", "line": "" }
  ]
}

Exit 1 (findings). The single FAIL is **out-of-repo noise**:
`./.standards/skills/hallmark/site/examples/cobalt-01/script.js` (CC=10) is an
example shipped inside the `.standards` submodule, not child-repo code. Verified
the submodule is clean and untouched by this spec:
`git -C .standards status` → "HEAD detached at 3b18790 / nothing to commit,
working tree clean". Zero FAILs in the child repo's own code.

WARNs are review hints (not stopping). Flag to the Architect — the two in spec
006-changed files: `./api/stripe-webhook.ts:148:167:getRawBookingFields:KISS_LINES=21`
and `./api/bookings/checkout.ts:45:66:buildSessionParams:KISS_LINES=23`, plus the
DRY duplication warns introduced by the repeated `BookingInput`/`BookingData`
field-shape literals in `./api/bookings.ts` and `./api/stripe-webhook.ts`.

---

## Evidence: scenario-to-behavior spot check

command: grep -nE "OnUnitActiveSec|ExecStart|recording-bot-cron|recording-bot\.mjs|recordRoom|joinRoom|runSession|applyStep|capture\.start|capture\.stop|finalizeRecording" deploy/home/rexi-recording-bot.timer deploy/home/rexi-recording-bot.service deploy/home/rexi-recording-bot-watch.service scripts/recording-bot-cron.sh scripts/recording-bot.mjs scripts/recording/bot/session.mjs scripts/recording/bot/capture.mjs scripts/recording/bot/output.mjs ; BOT_LIVE_TEST=1 npx vitest run src/__tests__/AC-006-bot-adapter.test.ts
exit: 0
at: 2026-10-26T12:31:05Z

deploy/home/rexi-recording-bot.timer:12:OnUnitActiveSec=5min
deploy/home/rexi-recording-bot.service:19:# Node is resolved by scripts/recording-bot-cron.sh, so no interpreter version is
deploy/home/rexi-recording-bot.service:34:ExecStart=/home/dbueno/projects/rexiAI/scripts/recording-bot-cron.sh \
deploy/home/rexi-recording-bot-watch.service:35:ExecStart=/home/dbueno/projects/rexiAI/scripts/recording-bot-cron.sh --watch
scripts/recording-bot-cron.sh:2:# scripts/recording-bot-cron.sh — node-path-resolving entry point for the bot's
scripts/recording-bot-cron.sh:10:#   scripts/recording-bot-cron.sh --missed ~/.rexi-recording-bot/schedule.json
scripts/recording-bot-cron.sh:11:#   scripts/recording-bot-cron.sh --watch
scripts/recording-bot-cron.sh:12:#   scripts/recording-bot-cron.sh --run --room rexi-0123456789abcdef
scripts/recording-bot-cron.sh:28:  echo "[recording-bot-cron] node not found — set NODE_BIN=/path/to/node" >&2
scripts/recording-bot-cron.sh:32:echo "[recording-bot-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ) $* via $NODE_BIN"
scripts/recording-bot-cron.sh:33:exec "$NODE_BIN" scripts/recording-bot.mjs "$@"
scripts/recording-bot.mjs:2:// scripts/recording-bot.mjs — host-side entry point for the local recording bot
scripts/recording-bot.mjs:43:import { DEFAULT_JITSI_BASE_URL, JITSI_BASE_URL_ENV, recordRoom } from './recording/bot/capture.mjs'
scripts/recording-bot.mjs:49:import { finalizeRecording } from './recording/bot/output.mjs'
scripts/recording-bot.mjs:71:    '  node scripts/recording-bot.mjs --run --room rexi-<16hex> [--base <jitsi-url>]',
scripts/recording-bot.mjs:72:    '  node scripts/recording-bot.mjs --watch [--schedule <file>] [--room rexi-<16hex>]',
scripts/recording-bot.mjs:73:    '  node scripts/recording-bot.mjs --finalize <audio-file> --room rexi-<16hex>',
scripts/recording-bot.mjs:74:    '  node scripts/recording-bot.mjs --decide <participants.json>',
scripts/recording-bot.mjs:75:    '  node scripts/recording-bot.mjs --missed <schedule.json>',
scripts/recording-bot.mjs:129:  const result = await finalizeRecording({ room, audioPath: audio, env: process.env, runner })
scripts/recording-bot.mjs:158:  const result = await recordRoom({ room, baseUrl: base, env: process.env, log: console })
scripts/recording/bot/session.mjs:72:export async function applyStep({ command, capture }) {
scripts/recording/bot/session.mjs:73:  if (command === 'start') await capture.start()
scripts/recording/bot/session.mjs:74:  if (command === 'stop') return capture.stop()
scripts/recording/bot/session.mjs:85: * cap fired; `artifact` is whatever `capture.stop()` produced (null when nothing
scripts/recording/bot/session.mjs:94:export async function runSession({
scripts/recording/bot/session.mjs:115:    const artifact = await applyStep({ command: step.command, capture })
scripts/recording/bot/session.mjs:126:    const artifact = await capture.stop()
scripts/recording/bot/capture.mjs:12://   4. hands the snapshots to `runSession`, which starts ffmpeg on the sink's
scripts/recording/bot/capture.mjs:30:import { finalizeRecording } from './output.mjs'
scripts/recording/bot/capture.mjs:33:import { runSession } from './session.mjs'
scripts/recording/bot/capture.mjs:47: * and `joinRoom` clicks the page's own join button as a fallback.
scripts/recording/bot/capture.mjs:141:export async function joinRoom({
scripts/recording/bot/capture.mjs:199: * RECORDINGS_DIR until the capture has stopped and `finalizeRecording` muxes it.
scripts/recording/bot/capture.mjs:205:export async function recordRoom({ room, baseUrl, env, log = console, sessionOptions = {}, deps = {} }) {
scripts/recording/bot/capture.mjs:221:  const room$ = await (deps.joinRoom || joinRoom)({
scripts/recording/bot/capture.mjs:231:    const { reason, artifact } = await (deps.runSession || runSession)({
scripts/recording/bot/capture.mjs:247:/** The capture device `runSession` drives: ffmpeg on the sink, then the muxer. */
scripts/recording/bot/capture.mjs:266:      const result = await finalizeRecording({ room, audioPath: outPath, env, runner, log })
scripts/recording/bot/output.mjs:79:export async function finalizeRecording({

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

[live-proof] mean_volume=-18.5 dB file=/tmp/rexi-live-recordings-t1GtBq/rexi-dc7639061d46b10d_2026-10-26-12-31-46/rexi-dc7639061d46b10d_2026-10-26-12-31-46.mp4

 Test Files  1 passed (1)
      Tests  31 passed (31)
   Start at  13:31:06
   Duration  40.80s (tests 99%)

---

**Historical note — attempt-1 BLOCK, since cleared (preserved verbatim, not recoded).**

The attempt-1 evidence block for this check recorded `exit: n/a (finding)`, which
`check-audit-trail.sh` rejects — a `## Evidence: scenario-to-behavior spot check`
block must carry a numeric `exit:` code. The numeric `exit: 0` above is a fresh
re-run performed now (command and `at:` timestamp above), not a retroactive recoding
of that `n/a` into a number never observed. The attempt-1 finding that the `n/a`
encoded — the end-to-end recorder was absent — was real, and is preserved below in
full as the historical BLOCK that the attempt-2 remediation round cleared.

---

**Attempt-1 finding (historical BLOCK — the substantive content behind the original `exit: n/a`):**

**Finding (a) — no test exercises a live recording; the live capture is absent.**

Confirmed by tracing the code, not by trusting the Coder's report:

- `scripts/recording-bot.mjs` lines 29-31 state it outright:
  "CAPTURE IS THE HOST'S ADAPTER, NOT THIS SCRIPT's JOB: joining the room as a
  participant and capturing its audio needs a WebRTC client, which this repo does
  not ship. `--finalize` is the contract that adapter feeds."
- `grep -rniE "webrtc|lib-jitsi|RTCPeerConnection|getUserMedia|MediaRecorder"`
  across `scripts/`, `deploy/`, `api/`, `src/` finds **no** WebRTC client, media
  capture, or room-join code — only comments and the Jitsi *deployment* scripts
  (`deploy/production/setup-jitsi-host.sh`, etc.) that install the stack.
- `--finalize` has exactly one caller: `recording-bot.mjs` itself (`runFinalize`).
  No adapter exists. `--decide` only prints JSON. `--missed` is never scheduled —
  `scripts/recording-cron.sh` still runs the OLD `process-recording.mjs --scan`.
- `recordingAction` / `shouldRecord` / `countNonBotHumans` are referenced only by
  the tests and by `recording-bot.mjs`'s `--decide` print path.

So the scenarios are satisfied by unit-level functions only:
- AC-006-13 … AC-006-17 (threshold) → pure `shouldRecord` / `recordingAction`
  returning 'start'/'continue'/'stop'/'idle'. Nothing acts on the returned action.
- AC-006-18 … AC-006-20 (output) → `finalizeRecording` muxes a *provided* audio
  file. The test writes a fake `'audio'` WAV and uses a `simulatedRunner` (mocked
  ffmpeg/ffprobe); the one real-ffmpeg case is `skipIf(!hasFfmpeg)`. Nothing
  produces the audio file in production.
- AC-006-24 … AC-006-26 (missed) → pure `findMissedMeetings` + `recordMissedMeetings`.

Further: the repo's *actual* recording mechanism is Jibri via
`deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua` (spec 004),
which starts recording on the **first** human occupant (threshold = 1). The spec
006 two-human threshold (`shouldRecord`/`recordingAction`) is wired to **no**
recorder, so even Task 4's decision is disconnected from the stack that records.
The `README.md` this spec adds documents the Jibri path (threshold = 1), which is
inconsistent with spec 006 Task 4.

Classification: the tests are green but assert decisions and a muxer, not a
recorder. The end-to-end capability the spec is titled after ("recording bot")
is not delivered. This is a false green for the *capability*, not a fault in the
individual unit assertions.

**Finding (b) — the `AC-007-bookings.test.ts` edit is a legitimate fixture fix,
not a bent test.**

`git diff -- src/__tests__/AC-007-bookings.test.ts` shows a single addition to
`beforeEach`, no assertion moved:

    +    // spec 006 AC-006-04: createMeetingLink now fails loud without a brand
    +    // (the silent meet.jit.si fallback is gone), so the booking path under test
    +    // needs the configured brand. Fixture only: no assertion in this file changes.
    +    process.env['MEETING_BASE_URL'] = 'https://meet.rexi-ai.com'

Justification holds: `api/bookings.ts` `rejectOnMeetingError` (line 56) returns
`502` when `createMeetingLink` yields `{ status: 'error' }`, and `meeting.ts`
now returns that error when `MEETING_BASE_URL` is unset (AC-006-04). Without the
fixture, AC-007's checkout-path tests (which assert `res.status === 200` and
`stripeMocks.mockCreate` called) would fail on the 502. The fixture restores the
precondition the new fail-loud behavior requires; no assertion changed, no
expected value bent. Legitimate.

**Other confirmations (commands, not reading):**
- `npm run build` → exit 0 ("✓ built in 201ms"; 43 modules). The branded-link
  change to `src/domain/meeting.ts` compiles in both entry points.
- `grep -nE "setTimeout|setInterval|requestAnimationFrame|location\.replace|http-equiv" deploy/join/index.html` → no matches. The page reads `window.location.search`/`.pathname` (a read, not navigation) and `pointAtRoom` sets the action `href` to `https://meet.jit.si/<room>` with no query — decision 8 (no auto-forward) holds.
- `?lang=` is not forwarded: `AC-006-36` test asserts `href === https://meet.jit.si/<room>` and `href` does not contain `lang`; the page's `pointAtRoom` builds the href without any query string.
- `src/domain/meeting.ts` no longer falls back: `meetingBaseUrl` returns `null`
  when unset/invalid, `createMeetingLink` returns `{ status: 'error', ... }`.
  Confirmed by `git diff -- src/domain/meeting.ts` (the `|| 'https://meet.jit.si'`
  branch is gone).

---

## No unaccounted behavior (finding line)

- `router-1.png` … `router-wan.png` (6 untracked images at repo root) are NAT
  diagnostic screenshots, not code — flag for removal from the branch; they trace
  to nothing in the tasks/scenarios.
- `README.md` (+108 lines) documents the Jibri-based recording pipeline. The
  content is documentation, but it records a threshold (first occupant) that
  contradicts spec 006 Task 4's two-human threshold — the same disconnect noted
  in the spot check.
- All other new modules (`src/domain/meetingUrl.ts`, `locale.ts`,
  `consentNotice.ts`, `scripts/recording/bot/*`, `deploy/join/`) trace to Tasks
  1-8 / decisions 1-12; nothing untraced in the logic.

---

## Phase-1 remediation round — attempt 2, phase 1 (scoped re-verification)

Scoped re-verification per docs/SPEC_PIPELINE.md §Remediation budget and
AC-007-02: re-run only the gate that BLOCKed in attempt 1 — `spot-check`.
Traceability / test-suite / complexity / design-principles were green in
attempt 1 and are not re-run in full (one supplementary complexity check below,
run because the fix added ~1,500 lines of new `.mjs` which could have moved the
complexity gate).

The failing gate from attempt 1 was: `spot-check` — "nothing acts on the
returned actions; the end-to-end recording capability is absent." The Coder
claims to have closed it by adding `scripts/recording/bot/{chrome,cdp,pulse,
session,capture,schedule,missed,config,output,participants}.mjs`,
`scripts/recording-bot.mjs`, `scripts/recording-bot-cron.sh`, three systemd
units, `--run`/`--watch`/`--missed` modes, and a `BOT_LIVE_TEST=1` live proof.

Verdict below. Every check executed with commands, not by reading the Coder's
claims.

### 1. A real recorder now exists and is wired — VERIFIED

Traced the full chain (read the code, then confirmed by live execution):

- `deploy/home/rexi-recording-bot-watch.service` (`Type=simple`) →
  `ExecStart=scripts/recording-bot-cron.sh --watch` → resolves node → 
  `scripts/recording-bot.mjs --watch` → `runWatch` → `currentWindows` →
  `activeWindows(readSchedule(...))` → `runRoom` → `recordRoom`.
- `deploy/home/rexi-recording-bot.timer` → `rexi-recording-bot.service`
  (`Type=oneshot`, every 5 min) → `scripts/recording-bot-cron.sh --missed
  <schedule.json>` → `--missed` → `findMissedMeetings` + `recordMissedMeetings`.
- Inside `recordRoom`: `joinRoom` (launchBrowser → openPage → navigate →
  waitForJoin) → `runSession` → `nextStep` (pure threshold) → `applyStep` →
  on command `'start'` **calls `capture.start()`** (ffmpeg on the PulseAudio
  null-sink monitor) and on `'stop'` **calls `capture.stop()` →
  `finalizeRecording`** (mux to RECORDINGS_DIR).

The attempt-1 finding — "`--decide` only prints JSON, nothing acts on the
returned action" — is no longer true. `session.mjs` `applyStep` is the consumer:
`if (command === 'start') await capture.start()` (line 73), and the live run
below proves a `.mp4` actually lands in RECORDINGS_DIR. The chain
schedule/timer → captured file is complete.

### 2. Does the live proof reproduce? — YES (run myself, clean state)

## Evidence: live proof (scoped spot-check re-run)

command: BOT_LIVE_TEST=1 npx vitest run src/__tests__/AC-006-bot-adapter.test.ts
exit: 0
at: 2026-10-26T12:17:51Z

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

[live-proof] mean_volume=-17.6 dB file=/tmp/rexi-live-recordings-zzdIYm/rexi-8747ae3e35388146_2026-10-26-12-18-35/rexi-8747ae3e35388146_2026-10-26-12-18-35.mp4

 Test Files  1 passed (1)
      Tests  31 passed (31)
   Start at  13:17:51
   Duration  44.55s (tests 99%)

`mean_volume=-17.6 dB` (a real participant reads ~-20 dB; silence ~-91 dB),
exit 0, 31 tests. The recording is audible and lands in RECORDINGS_DIR as a
muxed `.mp4` with `metadata.json` and a derivable room — AC-006-14 (start at
two humans) and AC-006-19 (audio stream present) exercised end-to-end, not just
at unit level.

### 2b. The bot-alone control (independent reproduction)

The load-bearing half of the claim is that a bot ALONE does not record itself
(silence, ~-91 dB). This is not a committed test — I reproduced it myself using
the bot's own launch path (`launchBrowser` + `buildJoinUrl` with the bot's muted
join config + `ensurePulseServer` + `loadSink`), joined to a fresh room alone,
confirmed the participant store was exposed (bot actually joined), then captured
only its sink monitor for 8 s.

## Evidence: bot-alone control (independent reproduction)

command: node /tmp/opencode/bot-alone-control.mjs (scratch; removed after)
exit: 0
at: 2026-10-26T12:19:00Z

[recording-bot] started private PulseAudio server at unix:/tmp/rexi-bot-pulse/native
[recording-bot] null sink rexi-bot-4082612 loaded (module 1)
[control] bot joined room (store exposed): true
[control] mean_volume=-91.0 dB (bot alone)

Confirmed independently: `mean_volume=-91.0 dB` with the bot joined (store
exposed) and alone — it does not record itself. The muted join config
(`config.startWithAudioMuted=true`, `config.disableInitialGUM=true`) holds: no
self-audio leaks into the capture.

### 3. The host deviation — (a) honest test workaround

- Production default is unchanged: `capture.mjs` line 36
  `DEFAULT_JITSI_BASE_URL = 'https://meet.jit.si'`. The override is
  test-only, via `BOT_LIVE_TEST_BASE` (default `https://meet.ffmuc.net`), and
  only the `BOT_LIVE_TEST=1` gated test reads it.
- No acceptance scenario pins the bot's capture host. AC-006-13…17 pin the
  pure threshold decision; AC-006-18…20 pin output format/room-derivation/pipeline
  compatibility; Task 1 pins the *client-facing* branded URL and the real-room
  resolution (booking-side, `meeting.ts`), not the bot's join host.
- The comment is truthful about *why*: meet.jit.si now refuses to start a
  conference without a signed-in moderator, and the bot never starts a
  conference (it joins one the humans opened).

Verdict: (a). Production path defaults to meet.jit.si and is unchanged; the
live proof moves off it only because an anonymous test cannot start a
meet.jit.si room. **Note (recorded, not blocking):** the same moderator
requirement raises a real deployment question for production — if meet.jit.si
no longer lets anonymous *clients* start rooms either, the booked humans cannot
open the room the bot joins; that is a hosting-policy/deployment concern (the
repo already ships Jibri/self-host scripts), not a defect in this spec's code.
Second note: `output.mjs` hardcodes `meeting_url` to `https://meet.jit.si/<room>`
regardless of the actual capture host; room derivation only reads the last
segment, so correctness is unaffected, but the constant is a latent assumption.

### 4. The declared gap — genuinely one step removed (out-of-scope), NOT the attempt-1 failure

Confirmed by grep: `schedule.json` is **read** (schedule.mjs, recording-bot.mjs,
both systemd units) but **no in-repo producer writes it**. `api/bookings.ts`,
`api/bookings/direct.ts`, `api/stripe-webhook.ts` never emit it. So `--watch`
and `--missed` have nothing feeding them unattended.

Judgment — this is **not** the same class of failure as attempt 1:

- Attempt 1: the `'start'`/`'stop'` actions had **no consumer inside the
  delivered code** — a chain broken *within* scope. Now the chain is complete and
  live-verified.
- The schedule file is the bot's **input**, produced by a component (the booking
  side) that **no task in 10-tasks.md assigns**. Tasks 1–8 cover branded link,
  consent, participant count, threshold, output, recordings location, missed
  *evaluation*, locale — none says "write schedule.json on booking."
- AC-006-24…26 assert the missed-meeting **evaluation** ("given a booked meeting
  … the bot emits a record naming the room"). The pure `findMissedMeetings` /
  `recordMissedMeetings` is correct and its test asserts exactly the scenario
  (see below). No scenario asserts schedule *production*.

So the scenarios are satisfied by the bot as scoped. The gap is a genuine
out-of-scope input (propose a follow-up spec to have the booking side emit
schedule.json), one step removed from what AC-006-24…26 assert — the
"function green, capability absent" failure does not recur in the same form,
because the capability (join→threshold→record→finalize) is now present and
live-verified. The follow-up must exist before the bot runs unattended; I flag
that plainly rather than bury it.

### Scenario-to-behavior spot check (AC-006-24…26, AC-006-18…20) — PASS

## Evidence: scenario tests (scoped spot-check)

command: npx vitest run src/__tests__/AC-006-missed-meeting.test.ts src/__tests__/AC-006-recording-output.test.ts src/__tests__/AC-006-recordings-location.test.ts src/__tests__/AC-006-record-threshold.test.ts
exit: 0
at: 2026-10-26T12:23:27Z

 Test Files  4 passed (4)
      Tests  27 passed (27)

Read `AC-006-missed-meeting.test.ts` directly: AC-006-24 asserts an elapsed
unrecorded entry → `findMissedMeetings` length 1 + a durable `.rexi-missed`
marker + a log line naming the room; AC-006-25 asserts not-started/in-progress →
empty; AC-006-26 asserts elapsed-but-recorded → empty (using a real
`recordingExistsForRoom` over a session dir). Assertions match the
Given/When/Then, not just the ID.

### 5. Sanity — no other regression

- The three idempotency markers (`.rexi-billed` / `.rexi-transcribed` /
  `.rexi-analyzed`) live only in the processor (`pipeline.mjs`, `billing.mjs`,
  `transcribe.mjs`, `insight.mjs`); the bot modules never write them (grep
  confirms zero references under `scripts/recording/bot/`).
- `RECORDINGS_DIR` single source: `scripts/recording/bot/config.mjs`
  `botRecordingsDir` delegates to `pipeline.mjs` `recordingsDirFrom`
  (`env['RECORDINGS_DIR'] || ~/.jitsi-meet-cfg/storage/jibri/recordings`),
  matching AC-006-21/22/23. No second path knob.
- `process-recording.mjs`, `pipeline.mjs`, `billing.mjs`, `transcribe.mjs`,
  `insight.mjs`, `recording-cron.sh` are all **untouched** (empty `git diff`).
  The only changed processor-adjacent file is the unrelated
  `scripts/test-billing-chain.mjs`.

### Supplementary complexity check (run because the fix added new `.mjs`)

## Evidence: supplementary eslint complexity check on new bot modules

command: npx eslint scripts/recording/bot/*.mjs scripts/recording-bot.mjs
exit: 0
at: 2026-10-26T12:24:00Z

(no output — 0 errors, 0 warnings)

The project's complexity gate (`complexity: ['error', 6]`) is clean on the new
recorder code. Full traceability/design-principles gates were not re-run
(prior green, unchanged scope; the design-principles FAIL in attempt 1 was
out-of-repo `.standards/skills/hallmark/...` noise and stands as-is).

## No unaccounted behavior (finding line)

- New modules trace to Tasks 3–7 (the recorder) and the bot's deployment; the
  cron wrapper and three systemd units trace to the bot's host-side wiring.
  Nothing untraced in the logic.
- Observation (environment, not a spec finding): orphaned Chrome processes from
  a prior *manual* run remain (`/tmp/chrome-p4-{Alpha,Beta,Rexi Recorder}`,
  room `rexi-39f7a6cd00000000`, ports 9481–9483). These are not from the
  committed vitest live test (which uses `rexi-live-profile-*` dirs and cleans
  up in its `finally`), nor from my runs (both of mine cleaned up). Flag for the
  Coder to kill, not a gate finding.

---

## Phase-1 remediation round verdict: PASS

The attempt-1 `spot-check` BLOCK is resolved. A real recorder exists, is wired
end-to-end, and is independently live-verified twice over (a real two-human
meeting records audibly at -17.6 dB; a bot alone records silence at -91 dB, i.e.
it does not record itself). The host deviation is an honest test workaround with
the production default (meet.jit.si) unchanged, and the schedule-file producer
gap is a genuine out-of-scope input (follow-up spec recommended), not a
recurrence of the "capability absent" failure.

Recorded for the Architect (not blocking): (1) follow-up spec for a schedule.json
producer so `--watch`/`--missed` run unattended; (2) meet.jit.si moderator
requirement — confirm anonymous clients can open rooms, else the self-hosted
Jitsi path must be used; (3) orphaned Chrome processes from a prior manual run.
---

## Audit-trail re-check (remediation of the attempt-1 spot-check block)

command: .standards/scripts/check-audit-trail.sh 006-branded-meeting-link-and-recording-bot
exit: 0
at: 2026-10-26T12:34:04Z

PASS — folder complete, verifier evidence recorded. All five evidence blocks
parse with numeric `exit:` codes. The `scenario-to-behavior spot check` block
now carries `exit: 0` from a fresh live re-run (grep wiring proof +
`BOT_LIVE_TEST=1 npx vitest run src/__tests__/AC-006-bot-adapter.test.ts`,
`mean_volume=-18.5 dB`, 31/31 tests, exit 0). The historical attempt-1
`exit: n/a (finding)` was neither deleted nor recoded into an unobserved number —
it is preserved verbatim in the "Historical note / Attempt-1 finding" prose
immediately below the block. No other evidence block was modified.
