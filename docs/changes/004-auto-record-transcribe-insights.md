# 004-auto-record-transcribe-insights

> Spec pipeline archive. Original source: `specs/004-auto-record-transcribe-insights/` (deleted by this script).
> Archived: 2026-10-22

## Original ask

# 004 — Auto-record every meeting, transcribe it, and extract what the customer wants

## Goal (owner's words, 2026-10-21)

All meetings should be recorded. The engineering-standards video/audio AI
toolchain (the `media-voice` family — Bailian `bl` CLI) should obtain the
transcript of each meeting and use it to understand what the customer wants.
Must be e2e-tested with the e2e agent.

## Problem / current state (verified 2026-10-21)

- **Recording is manual.** The local Jitsi stack (Docker: web/jvb/jicofo/
  prosody/jibri at `host.docker.internal:8443`, `ENABLE_RECORDING=1`) only
  records when a participant clicks _Start recording_. No auto-start mechanism
  exists anywhere in `deploy/production/` (grep: zero hits for auto-record
  knobs). A prosody custom-module mount DOES exist:
  `~/.jitsi-meet-cfg/prosody/prosody-plugins-custom → /prosody-plugins-custom`.
- **Prod never records.** Vercel production has no `MEETING_BASE_URL`, so
  `src/domain/meeting.ts:22` falls back to `https://meet.jit.si` — public
  Jitsi, no Jibri. `meet.rexi-ai.com` is referenced only by deploy configs
  and is currently unreachable.
- **The processor exists but is billing-only and Stripe-coupled.**
  `scripts/process-recording.mjs` (334 lines, zero-dependency Node 22 ESM,
  bare `fetch`/`execFile`; runs via systemd timer `rexi-recording.timer` or
  the sidecar `deploy/production/docker-compose.recording.yml`; ffmpeg IS in
  the sidecar image, Dockerfile line 5). It scans `RECORDINGS_DIR`, maps
  room → reservation by walking **Stripe Checkout Sessions** (`join_url`
  substring match, lines 129–160), POSTs `/api/bookings/recorded-billing`,
  writes `.rexi-billed`. With `BILLING_ENABLED=false` (the owner's standing
  mode since spec 002) there are **no Stripe sessions for direct bookings** —
  attribution breaks and the recorded-billing POST is rejected by the
  kill-switch preflight. Transcription/insights must not depend on Stripe.
- **Zero tests** cover `scripts/process-recording.mjs` today.
- **Tooling on the machine**: `bl` CLI 2.4.0 installed and authenticated
  (`bl auth status` OK). `bl speech recognize` = ASR (FunAudio/Qwen-ASR,
  `--url <local-path>`, `--diarization`, `--language`, `--out <json>`);
  `bl speech synthesize` = TTS (usable to fabricate e2e "customer" audio);
  `bl text chat` = LLM call for the insight step. `ffmpeg`/`ffprobe` on host.
  No whisper, no ASR references in repo. Standards media agents
  (`media-voice` etc.) wrap this same `bl` toolchain — the owner's "video and
  audio AI agent of engineering standards" = use `bl`, not a new stack.
- **Recordings layout**: `~/.jitsi-meet-cfg/storage/jibri/recordings/
<jibri-session-uuid>/` → `<room>_<ts>.mp4` + `metadata.json`
  (`meeting_url` carries the room). Rooms are `rexi-<16hex>`
  (`src/domain/meeting.ts:23`). A resumed meeting yields MULTIPLE mp4s per
  session dir; `findMp4` currently takes newest only.
- `REXI_ARCHIVE_DIR` is documented (`rexi-recording.env.example:26`) but NOT
  implemented — do not assume it.

## Ask

### A. Auto-record booked rooms

Recording must start automatically for booked meetings without any
participant click. Preferred mechanism: a prosody custom lua module
(installed into `prosody-plugins-custom`, provisioned by
`deploy/production/deploy-jitsi.sh` + documented in `jitsi.env.example`) that
triggers Jibri recording start when the first occupant joins a room matching
a configurable prefix (default `rexi-` — only booked rooms; ad-hoc rooms
untouched). Must be idempotent (no duplicate Jibri sessions), must not break
non-matching rooms, and must work on the live local stack (the e2e oracle).
If lua auto-start proves unworkable, the fallback (a headless recorder bot
joining rexi-* rooms) must be chosen explicitly and documented — no silent
half-wiring (the `jibri-finalize.sh` stub is the cautionary precedent).

### B. Transcription step (processor)

In `processOne` (`scripts/process-recording.mjs`), after the audio-stream
check and room resolution: extract audio (`ffmpeg -vn`), run ASR via
`bl speech recognize` (local file path, `--diarization`, Spanish-primary
language handling), write `transcript.json` beside the recording; marker
`.rexi-transcribed`. Handle ALL mp4s of a session dir (concatenate in
timestamp order — resumed meetings). Silent/no-audio recordings: skip
transcription cleanly (existing warning path), no markers. Transcription
must run WITHOUT Stripe attribution (billing-disabled is the default world);
existing session lookup stays for enabled deployments and its failure/absence
becomes non-fatal context ("unattributed recording" still transcribes).
Decouple from `.rexi-billed` (billing marker must not short-circuit
transcription of already-billed dirs and vice versa).

### C. AI insight step ("understand what the customer wants")

Transcript → structured brief via `bl text chat` (same standards toolchain):
extract customer wants — requirements, pain points, decisions, commitments,
next steps — language-aware (es/en), deterministic markdown template
`customer-brief.md` beside the recording; marker `.rexi-analyzed`. Include
best-effort booking context when attribution resolved (client email as
`<client-email>` — the brief must not leak secrets/tokens; it MAY contain the
client address, it lives in a private repo issue + local disk). LLM/ASR call
failures: retry per `bl` defaults, then leave the dir unmarked for the next
scan — never crash the scan loop, never mark done on failure.

### D. Delivery: GitHub issue

On brief completion, create ONE GitHub issue in `RexiAI/rexiAI` per
recording (idempotent — search open/closed issues for the room id before
creating): title `Customer insight: <room> <date>`, body = brief + transcript
path + recording path; label `customer-insight` (script creates the label if
missing). Host-timer mode uses `gh` CLI; sidecar-container mode lacks `gh` —
document that limitation (host mode is the supported path for 004; container
delivery is a follow-up). `GITHUB_TOKEN`/`GH_TOKEN` from
`/etc/rexi-recording.env` (never logged).

### E. Testability + unit tests

The processor stays zero-npm-dependency (bl/ffmpeg/gh are external binaries
like ffprobe — invoked via `execFile`, injectable for tests). New logic in
small pure/injectable units with vitest coverage (mock `execFile`/`fetch`/
`gh`): audio extraction command construction, multi-mp4 ordering, marker
state machine (`.rexi-transcribed`/`.rexi-analyzed`/`.rexi-billed`
independence), ASR/LLM failure handling, issue idempotency, attribution
fallback. Existing zero-test baseline is not an excuse — new code ships
tested (docs/TESTING.md).

### F. Prod runbook (docs-only, gated)

Update `deploy/production/README.md` + `docs/recording-pipeline.md`: revive
`meet.rexi-ai.com` via existing `setup-jitsi-host.sh`/`deploy-jitsi.sh`,
install the auto-record module, set Vercel prod `MEETING_BASE_URL`, provision
`/etc/rexi-recording.env` with `RECORDINGS_DIR`, Bailian API key for `bl`,
`GH_TOKEN`; enable `rexi-recording.timer`. The actual VPS deployment is NOT
in this spec's code scope — the runbook is.

### G. E2E acceptance (owner's explicit ask — the e2e agent runs this)

Scripted full-chain test on the local stack: synthesize a "customer" audio
clip with `bl speech synthesize` stating concrete scripted asks (e.g. "necesito
una página de precios" + one pain point); Playwright joins a `rexi-*` room at
`https://host.docker.internal:8443` with `--use-fake-device-for-media-capture
--use-file-for-fake-audio-capture=<clip>` (cert warning accepted; no human
click for recording). Assert: auto-recording starts (Jibri session dir
appears without UI action); after stopping/leaving, run the processor
one-off (`--room <room> --recording <dir>`) against the REAL session dir;
assert `transcript.json` exists and contains the scripted asks' gist;
`customer-brief.md` exists and mentions the scripted requirement; the GitHub
issue was created with the `customer-insight` label; second processor run is
idempotent (no duplicate issue, markers respected).

## Constraints

- Privacy: recordings/transcripts/briefs are customer data — they stay on
  the recording host + the PRIVATE repo issue; no third-party delivery
  (no email of transcripts), no secrets in logs/issues/briefs.
- Processor style preserved: zero npm deps, bare fetch/execFile, fail-closed
  on missing tokens for billing (unchanged), fail-soft for transcription.
- `.rexi-billed` billing flow behavior unchanged for billing-enabled
  deployments (recorded-billing endpoint + Bearer auth untouched).
- Auto-record must not fire for non-`rexi-` rooms (public/ad-hoc use of the
  same Jitsi stays unrecorded — consent boundary).
- No new npm dependencies in the app; bl/ffmpeg/gh are environment tools
  (documented in the runbook + Dockerfile where the sidecar needs them).
- Cyclomatic ≤6, files <500 lines (the 334-line script grows — split into
  `scripts/recording/` units if needed; keep `process-recording.mjs` as the
  CLI entry).

## Out of scope

- Reviving the VPS / real prod deployment (runbook only).
- Sidecar-container delivery of issues (documented limitation).
- Live in-meeting captions/Jigasi transcription.
- Email delivery of briefs.
- Video analysis (frames/vision) — audio transcript only for 004.

## Tasks

# 10-tasks.md — Spec 004: Auto-record every meeting, transcribe it, extract what the customer wants

Stage 1 (Specifier) artifact. Input: `00-informal.md` (2026-10-21, asks A–G).
Branch: `spec/004-auto-record-transcribe-insights`.

## Scenario ID range & collision avoidance

- Spec-001 used per-TASK numbering; its archive (`docs/changes/001-landing-booking.md`)
  owns headings **AC-004-01 … AC-004-06** (pricing task), still cited by
  `src/__tests__/AC-004-pricing.test.ts`.
- This spec therefore starts at **AC-004-20** (buffer 07–19 deliberately unused).
  Range used: **AC-004-20 … AC-004-53** — 34 scenarios, 8 task files, contiguous,
  zero intersection with any archived ID (verified: `grep '^## AC-004-'` over
  `docs/changes/*.md` yields only 01–06; over `20-acceptance/` yields exactly 20–53).
- Precedent: spec-002 started at AC-002-05, spec-003 at AC-003-10
  (`docs/changes/003-booking-comms-polish.md` §Documented decisions 1).
- Mechanical evidence — see §Traceability verification record at the bottom.

## Global constraints (apply to every task)

- `scripts/` stays **zero-npm-dependency**: node builtins plus external binaries
  (`ffprobe`, `ffmpeg`, `bl`, `gh`) only. All new logic lands in small modules under
  `scripts/recording/*.mjs`; every side-effecting function takes an **injected
  runner** (execFile-like) and, where it does HTTP, an **injected fetch**, so vitest
  mocks `execFile`/`fetch`/`gh` without monkey-patching globals (Ask E).
- `scripts/process-recording.mjs` remains the CLI entry (`--scan`, `--jibri-dir`,
  `--room`/`--recording`, `--dry-run`). Importing any `scripts/recording/*.mjs` must
  have **no side effects** (no top-level main, no process.exit, no I/O at import) —
  the modules are plain ESM, importable from vitest.
- Test files follow the repo convention `src/__tests__/AC-004-<topic>.test.ts`, citing
  scenario IDs in test names (`it("AC-004-20: …")`, docs/SPEC_PIPELINE.md §Scenario
  format). Docs/deploy scenarios (Tasks 1, 7) are verified as content-assertion tests
  (repo pattern: `AC-013-deployment-config.test.ts`, `AC-002-env-docs-cleanup.test.ts`).
  Filesystem-touching units test against real temp dirs; only runners/fetch are injected.
- Cyclomatic complexity ≤6 per function; files <500 lines (the 334-line entry stays
  under budget by delegating to `scripts/recording/`).
- Billing flow unchanged for billing-enabled deployments: the recorded-billing POST
  contract + Bearer auth, ffprobe-over-newest-mp4 minutes, `MAX_MINUTES` behavior, and
  `.rexi-billed` write semantics remain as today (`process-recording.mjs:39-43,72-99,162-177,204-273`).
- Privacy: no secrets/tokens in logs, transcripts, briefs, or issues; recordings,
  transcripts, and briefs stay on the recording host plus the PRIVATE repo issue; no
  third-party delivery.
- No new npm dependencies anywhere; `bl`/`ffmpeg`/`gh` are environment tools
  (documented in the Task 7 runbook; the sidecar Dockerfile already carries ffmpeg at
  `deploy/production/recording-processor/Dockerfile:5` and gains nothing for 004).

## Tasks

### Task 1 — Auto-record prosody module + provisioning (Ask A)

Scenarios: `20-acceptance/AC-004-auto-record-module.md` (AC-004-20 … AC-004-22)
Tests: `src/__tests__/AC-004-auto-record-module.test.ts`

Files: new `deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua`;
edit `deploy/production/deploy-jitsi.sh`; edit `deploy/production/jitsi.env.example`.

Acceptance criteria:

- Lua module at the pinned repo path triggers Jibri recording start when the FIRST
  occupant joins a room whose name starts with the configured prefix; non-matching
  rooms never reach the recording-start path.
- Prefix knob `REXI_AUTO_RECORD_PREFIX`, default `rexi-` (literal default in module
  source; knob documented in `jitsi.env.example`). Module reads it from the prosody
  container env; the local-install docs (Task 7) cover forwarding it into the container.
- Module enabled through the stack's documented prosody-modules env mechanism
  (`GLOBAL_MODULES` — verified wired: local stack `~/docker-jitsi-meet/docker-compose.yml:258`,
  image template `/defaults/prosody.cfg.lua:157`; `/prosody-plugins-custom` is first on
  `plugin_paths` in the runtime config, `conf.d/jitsi-meet.cfg.lua:19`; the mount
  `~/.jitsi-meet-cfg/prosody/prosody-plugins-custom → /prosody-plugins-custom` exists live).
- Session-level idempotency: repeated occupant-joined events for a room must not start
  a second Jibri session (live-proven by AC-004-50).
- `deploy-jitsi.sh` copies the module into `$CONFIG/prosody/prosody-plugins-custom/`,
  ensures `GLOBAL_MODULES` in the Jitsi `.env` includes `rexi_auto_record` without
  duplicating it on re-run, and after copying runs the syntax gate
  `docker exec <prosody> luac -p /prosody-plugins-custom/mod_rexi_auto_record.lua`
  (`/usr/bin/luac` verified in the live container), aborting non-zero on failure.
- No silent half-wiring (the `jibri-finalize.sh` stub is the named cautionary
  precedent): every knob the module reads is documented and defaulted.

STOP condition (explicit, not a Coder decision): if the lua auto-start proves
unworkable on the live local stack, the pipeline STOPS and reports; choosing the
fallback (headless recorder bot) is a human decision per Ask A.

### Task 2 — Session media collection + audio extraction unit (Ask B part 1)

Scenarios: `20-acceptance/AC-004-session-audio.md` (AC-004-23 … AC-004-25)
Tests: `src/__tests__/AC-004-session-audio.test.ts`

Files: new `scripts/recording/media.mjs` exporting `collectSessionMp4s`,
`buildAudioExtractCommand`, `extractAudio`.

Acceptance criteria:

- `collectSessionMp4s(dir)` returns ALL `*.mp4` files in a session dir sorted by
  filename ascending (Jibri's `<room>_<YYYY-MM-DD-HH-MM-SS>.mp4` naming makes
  lexicographic = chronological; layout verified live:
  `rexitest_2026-09-18-13-02-17.mp4` + `metadata.json`). Boundaries: single file →
  1-element array; none → empty array; path is an `.mp4` file → that file (mirrors
  today's `findMp4` file-mode, lines 72-82 — which otherwise stays untouched for billing).
- `buildAudioExtractCommand(mp4s, outPath)` is pure and returns ffmpeg argv with `-vn`,
  every input covered in collection order (single: `-i <mp4>`; multiple: concat in the
  same order), exactly one audio output. Codec/sample-rate choice is the Coder's.
- `extractAudio(runner, mp4s, outPath)` executes via the injected runner; runner
  failure propagates (throws/rejects) — never swallowed, unit writes no markers.

### Task 3 — ASR transcription stage (Ask B part 2)

Scenarios: `20-acceptance/AC-004-transcription.md` (AC-004-26 … AC-004-28)
Tests: `src/__tests__/AC-004-transcription.test.ts`

Files: new `scripts/recording/transcribe.mjs` exporting `buildAsrCommand`, `transcribe`.

Acceptance criteria:

- `buildAsrCommand(audioPath, transcriptPath, language)` returns exactly:
  `bl speech recognize --url <audioPath> --diarization --language <language> --out
<transcriptPath>` (all flags verified against bl 2.4.0 `--help`; `--url` accepts a
  local file path). Language default `es`, overridable via env `REXI_ASR_LANGUAGE`
  (Spanish-primary, Ask B).
- `transcribe({ sessionDir, mp4s, runner, env })`: extract audio (Task 2) → run ASR →
  on success `<sessionDir>/transcript.json` exists (bl `--out` target) and
  `<sessionDir>/.rexi-transcribed` is written. Marker strictly after success.
- On extraction or ASR failure: no marker, error propagates to the caller (scan-level
  containment is Task 6). No script-level retry wrapper — retries are bl's own defaults
  (Ask C: "retry per `bl` defaults").
- The unit imports nothing Stripe-related and reads no STRIPE_* env: transcription
  works with zero Stripe configuration present.

### Task 4 — Customer brief insight stage (Ask C)

Scenarios: `20-acceptance/AC-004-customer-brief.md` (AC-004-29 … AC-004-33)
Tests: `src/__tests__/AC-004-customer-brief.test.ts`

Files: new `scripts/recording/insight.mjs` exporting `buildInsightMessages`,
`renderBrief`, `runInsightStage`.

Acceptance criteria:

- `buildInsightMessages(transcriptJson, context)` produces a `bl text chat` payload
  (flags verified: `--message`/`--system`/`--messages-file`) instructing extraction of
  requirements, pain points, decisions, commitments, next steps, answered in the
  transcript's dominant language (es/en), with no secret env value embedded.
- `renderBrief(llmContent, context)` is a deterministic template: fixed literal
  skeleton — title, booking-context section, and the five section headings in fixed
  order (Requirements, Pain points, Decisions, Commitments, Next steps) — always all
  present; an empty category renders the fixed placeholder "None stated". LLM output
  fills section bodies only; headings are the same literals in every brief regardless
  of content language.
- Booking context best-effort: attribution resolved → client email + booking id in the
  context section; absent → context states the recording is unattributed; skeleton
  identical either way; an email is never fabricated. Client email in the brief is
  allowed (private repo issue + local disk, Ask C); secrets/tokens never.
- `runInsightStage({ sessionDir, transcriptPath, context, runner, deliver })`: call
  `bl text chat` → write `<sessionDir>/customer-brief.md` → invoke Task 5 delivery →
  write `<sessionDir>/.rexi-analyzed` ONLY after brief write AND delivery succeed. Any
  failure → no marker, error propagates; the next scan regenerates the brief
  (overwrites) and re-attempts delivery — the Task 5 search prevents duplicate issues
  in every interleaving (decision 4).

### Task 5 — GitHub issue delivery unit (Ask D)

Scenarios: `20-acceptance/AC-004-issue-delivery.md` (AC-004-34 … AC-004-38)
Tests: `src/__tests__/AC-004-issue-delivery.test.ts`

Files: new `scripts/recording/deliver.mjs` exporting `ensureLabel`,
`findExistingIssue`, `deliverInsightIssue`.

Acceptance criteria:

- Target repo is the fixed constant `RexiAI/rexiAI` (no knob — Ask D pins it).
- `ensureLabel`: `gh label list` check; `gh label create customer-insight` only when
  missing (label absence verified live via `gh label list`).
- `findExistingIssue`: searches open AND closed issues (`--state all`) for the room id
  in the title; a match (either state) suppresses creation.
- `deliverInsightIssue`: on no match, exactly one `gh issue create` with title
  `Customer insight: <room> <YYYY-MM-DD>` (date = the recording session date parsed
  from the mp4 filename timestamp, decision 7), body containing the brief content +
  transcript path + recording (session-dir) path, and `--label customer-insight`.
- All gh calls go through the injected runner as argv arrays; the token travels only
  via environment (`GH_TOKEN`/`GITHUB_TOKEN`, read by gh itself — verified: this
  machine's gh authenticates via GH_TOKEN) and appears in no argv element and no
  console output.
- Any gh failure propagates to the caller — never swallowed, never reported as success,
  no continuation past a failed call.

### Task 6 — Processor rewiring: marker independence, optional attribution, containment, CLI (Ask B part 3 + E)

Scenarios: `20-acceptance/AC-004-processor-rewiring.md` (AC-004-39 … AC-004-46)
Tests: `src/__tests__/AC-004-processor-rewiring.test.ts`

Files: edit `scripts/process-recording.mjs` (stays the CLI entry); new
`scripts/recording/pipeline.mjs` (per-dir stage orchestration, injectable fs/runners/fetch).

Acceptance criteria:

- Per-stage marker gating replaces the whole-dir skip (today line 286 `continue`s on
  `.rexi-billed`): billing stage skips iff `.rexi-billed`; transcription stage skips
  iff `.rexi-transcribed`; insight+delivery stage skips iff `.rexi-analyzed`. A
  billed-only dir is transcribed and analyzed.
- `main()` no longer hard-exits on missing `STRIPE_SECRET_KEY` (lines 297-300 gate
  removed): billing stays fail-closed (skipped with a clear log when key/token
  missing — never POSTs), transcription/insight/delivery run fully Stripe-free.
- Attribution optional: `findReservationByRoom` returning null OR throwing is
  non-fatal — logged as an unattributed recording, transcription proceeds, billing
  skipped, no `.rexi-billed`. Resolved attribution feeds client email + booking id
  into the Task 4 brief context.
- Billing-enabled path preserved behavior-for-behavior: probeMinutes over the NEWEST
  mp4 (`findMp4` untouched — decision 5), `MAX_MINUTES` gate, POST
  `/api/bookings/recorded-billing` with Bearer `RECORDED_BILLING_TOKEN`, `.rexi-billed`
  written after 200. The multi-mp4 collection is transcription-only.
- `MAX_MINUTES` (480) gates the billing stage ONLY: a >480-min recording still
  transcribes and analyzes (decision 6 — the ceiling's stated purpose is charge
  integrity, comment lines 41-42).
- Silent recording (no audio stream): existing warning path unchanged (line 209);
  transcription and insight stages skipped, no markers, no bl/gh calls; billing
  behavior exactly as today.
- Scan containment: each session dir is processed inside try/catch; a throwing dir is
  logged with its path, counted in the failure summary, left unmarked (eligible next
  scan); remaining dirs still process in the same run; the sweep itself exits 0
  (decision 13).
- CLI preserved: `--scan`, `--jibri-dir <dir>`, `--room <room> --recording <mp4|dir>`,
  no-args usage (exit 2, listing all three modes). One-off mode runs the full stage
  chain on the given dir (Ask G drives exactly this). `--dry-run` mutates nothing: no
  POST, no bl/gh calls, no markers, no transcript/brief files — logs planned actions
  only (decision 8).

### Task 7 — Runbook + env example + pipeline docs (Ask F + D limitation + A local install)

Scenarios: `20-acceptance/AC-004-runbook.md` (AC-004-47 … AC-004-49)
Tests: `src/__tests__/AC-004-runbook.test.ts`

Files: edit `docs/recording-pipeline.md`, `deploy/production/README.md`,
`deploy/production/rexi-recording.env.example`, `docs/local-e2e-testing.md`.

Acceptance criteria (content assertions):

- `docs/recording-pipeline.md`: full extended chain (extraction of ALL session mp4s in
  chronological order → `bl speech recognize` with diarization + es-primary hint →
  `transcript.json` + `.rexi-transcribed` → `bl text chat` → `customer-brief.md` →
  idempotent issue delivery → `.rexi-analyzed`); the three markers and their
  independence; transcription requires no Stripe; sidecar-container limitation
  (image lacks `gh` → issue delivery is host-timer-mode only; container delivery is a
  documented follow-up — Ask D).
- `deploy/production/README.md`: revive runbook — `setup-jitsi-host.sh` →
  `deploy-jitsi.sh` (now provisioning the auto-record module + luac gate), Vercel prod
  `MEETING_BASE_URL=https://meet.rexi-ai.com`, `/etc/rexi-recording.env` provisioning
  (`RECORDINGS_DIR`, `DASHSCOPE_API_KEY`, `GH_TOKEN`), `rexi-recording.timer` enable;
  pointer to the local-stack auto-record install steps; explicit note that the actual
  VPS deployment is out of scope for 004 (runbook only).
- `docs/local-e2e-testing.md`: local-stack (e2e oracle) auto-record install — copy the
  module into `~/.jitsi-meet-cfg/prosody/prosody-plugins-custom/`, set `GLOBAL_MODULES`
  (and optionally `REXI_AUTO_RECORD_PREFIX`, forwarded into the prosody container) in
  `~/docker-jitsi-meet/.env`, restart prosody, luac-gate the copy.
- `deploy/production/rexi-recording.env.example`: commented `DASHSCOPE_API_KEY` (bl
  ASR/LLM auth — env mechanism verified via `bl auth status`), `GH_TOKEN` (gh issue
  delivery), `REXI_ASR_LANGUAGE` (default es). `REXI_ARCHIVE_DIR` (line 26) remains
  documented-unimplemented, unchanged. Placeholders only — no real secret values.

### Task 8 — E2E full-chain journeys (Ask G — executed post-PR by the e2e-runner)

Scenarios: `20-acceptance/AC-004-e2e-chain.md` (AC-004-50 … AC-004-53)
Journeys: `tests/e2e/*.e2e.ts` + `e2e.config.ts` (e2e-runner standard, per
`.opencode/agents/e2e-runner.md`); guard: `src/__tests__/AC-004-e2e-journeys.test.ts`.

Acceptance criteria:

- Journeys implement the scripted chain on the live local stack
  (`https://host.docker.internal:8443`, `ENABLE_RECORDING=1` — both verified in
  `~/docker-jitsi-meet/.env:32,262`; `RECORDINGS_DIR=/home/dbueno/rexi-recordings` per
  `~/docker-jitsi-meet/.env:269` and repo `.env:51` — decision 10): `bl speech
synthesize` fabricates the customer clip (scripted Spanish asks: pricing-page
  requirement + one pain point); Playwright joins a freshly generated unique
  `rexi-<16hex>` room with `--use-fake-device-for-media-capture` and
  `--use-file-for-fake-audio-capture=<clip>`, cert warning accepted, zero recording-UI
  interaction; assertions per AC-004-50…53 (auto-record fires unassisted and once;
  non-rexi room never recorded; one-off `--room/--recording` run against the REAL dir
  yields transcript gist + brief mention; exactly one labeled issue; second run
  idempotent).
- Traceability wiring (decision 3): `*.e2e.ts` is invisible to
  `check-scenario-traceability.sh`'s include patterns, so the Coder ALSO ships the
  in-suite guard test citing AC-004-50…53, asserting each journey file exists and
  embeds its scenario IDs. The guard test is pure file assertion — it needs no Docker,
  no stack, no gh/bl, keeping `npm test` green in a bare checkout. Live execution is
  the post-PR e2e stage's job.
- Unique room per run keeps cross-run issue-search idempotency sound (each run's room
  maps to at most one issue ever); leftover-issue hygiene (close/cleanup after
  asserting) follows the e2e-testing skill's data-hygiene rules and is the e2e-runner's
  call, not a scenario assertion.

## Documented decisions (resolved by the Specifier, not open)

1. **Scenario IDs start at AC-004-20** — spec-001's per-task numbering owns
   AC-004-01…06 (archive headings + `AC-004-pricing.test.ts` citations). Buffer
   07–19 unused. `check-scenario-traceability.sh` resolves by exact ID against BOTH
   live specs and archives, so the legacy pricing citations stay green while this
   spec is in flight and after it archives. Precedent: spec-002 → AC-002-05,
   spec-003 → AC-003-10.
2. **Correction to the informal spec's billing-disabled failure mode.** The informal
   text says the recorded-billing POST "is rejected by the kill-switch preflight".
   Actual (`api/bookings/recorded-billing.ts:352-368`): with `BILLING_ENABLED=false`
   the preflight answers **HTTP 200** `{billingDisabled:true}` — not a rejection. The
   real breakage in the billing-disabled world sits earlier: direct bookings create no
   Stripe session → the processor SKIPs at `process-recording.mjs:219-225`, and
   `main()` hard-exits at 297-300 when `STRIPE_SECRET_KEY` is unset. The requirement is
   unchanged; the scenarios (AC-004-40/41) assert the real mechanics, not the
   misdescribed one.
3. **Ask G traceability.** The traceability script scans only
   `*.test.ts/*.spec.ts/*_test.go/*.bats/…` — `*.e2e.ts` journeys are invisible to it,
   so live-journey IDs would read as untraced at stage 4. Resolution: in-suite guard
   test cites AC-004-50…53 and asserts journey registration, following spec-003's
   precedent of citing its "direct-path e2e" scenario (AC-003-20) from an in-suite
   test. The gate script itself is NOT modified (gate config is off-limits to agents).
4. **`.rexi-analyzed` = brief + issue delivery complete.** The spec pins exactly three
   markers, "never mark done on failure", and issue idempotency via search-before-create.
   Binding the marker to the whole insight stage means a delivery failure retries next
   scan, no fourth marker is invented, and scan skip-logic stays O(markers); the gh
   search still guards duplicates in every interleaving (including a lost marker after
   a successful create). Cost: the LLM call repeats during a delivery-failure window —
   bounded and accepted.
5. **Billing keeps probing the newest mp4 (`findMp4` untouched); transcription uses the
   full chronological collection.** "Billing flow behavior unchanged" pins the billing
   side to today's newest-file minutes; resumed-meeting completeness is a
   transcription concern only (Ask B).
6. **`MAX_MINUTES` (480) gates billing only.** The ceiling's stated purpose is charge
   integrity ("a corrupt recording never becomes a charge", script comment lines
   41-42); a long recording still transcribes.
7. **Issue-title date = the recording session date** parsed from the
   `<room>_<ts>.mp4` filename, formatted `YYYY-MM-DD` — not the processing date, so
   re-runs produce a stable title that the idempotency search can match.
8. **`--dry-run` mutates nothing** (no POST, no bl/gh calls, no files, no markers).
   Today it means "no billing call"; extending the stages under the same flag keeps one
   meaning: plan, don't mutate.
9. **ASR language knob**: `REXI_ASR_LANGUAGE`, default `es` ("Spanish-primary"), passed
   as the `--language` hint to `bl speech recognize` (flag verified against bl 2.4.0).
   Brief skeleton headings are fixed English literals (template determinism); LLM
   section bodies follow the transcript language.
10. **The live local `RECORDINGS_DIR` is `/home/dbueno/rexi-recordings`**
    (`~/docker-jitsi-meet/.env:269`, repo `.env:51`), not the informal problem
    statement's `~/.jitsi-meet-cfg/storage/jibri/recordings` (the image default; that
    dir holds only the stale `rexitest` session). Scenarios say "the stack's
    RECORDINGS_DIR" rather than hard-coding a path.
11. **`bl` auth on the recording host = `DASHSCOPE_API_KEY`** in `/etc/rexi-recording.env`
    (verified: `bl auth status` reports the API key sourced from env; bl precedence is
    `--api-key` flag > `DASHSCOPE_API_KEY` > stored profile). `gh` reads
    `GH_TOKEN`/`GITHUB_TOKEN` natively (verified: this machine's gh runs on GH_TOKEN).
12. **Ask E is cross-cutting, not a task.** The injected-runner/zero-dep requirement
    lives in §Global constraints; each unit task (2–6) carries its own vitest coverage
    criteria. There is no separately observable "testability" behavior to scenario-ize.
13. **Scan exit code**: a completed sweep exits 0 even when individual dirs failed
    (failures are logged + counted in the summary) — "never crash the scan loop"
    (Ask C) means per-dir containment; only an unreadable recordings root is fatal
    (today's behavior, line 278-281, unchanged).

## Open questions

**None blocking `/build`.** Two standing stop-conditions are registered instead:

1. **Task 1 fallback gate** (Ask A's own wording): if the lua auto-start proves
   unworkable on the live stack, the pipeline STOPS and reports; the headless
   recorder-bot fallback is a human decision, never a silent substitution.
2. **Ask G's live-infrastructure dependency**: the journeys need the running local
   Jitsi stack plus authenticated `bl` and `gh`. That is the post-PR e2e stage's
   environment (e2e-runner agent). Stages 2–4 need only the guard test (pure file
   assertions). If the stack is down at e2e time, that stage reports an environment
   failure — it is not a Coder-stage defect.

## Traceability verification record (stage 1, pre-Coder)

Commands run from the repo root on 2026-10-22 (this spec's artifacts only change
`specs/**`; no test cites AC-004-20…53 yet — tests are the stage-2 Coder deliverable):

1. **Baseline, before writing any artifact:**
   `bash .standards/scripts/check-scenario-traceability.sh` → **exit 0**
   (`Scenario IDs found: 0 live, 109 archived` — every existing citation resolved).
2. **Post-write, check 2 (collision/dangling gate — the mechanical risk for this spec):**
   `bash .standards/scripts/check-scenario-traceability.sh --checks 2` → **exit 0**
   (`✔ every scenario traced, every reference resolves`). The legacy AC-004-01…06
   citations in `src/__tests__/AC-004-pricing.test.ts` still resolve via the archive;
   nothing new dangles; the new range introduces no collision.
3. **Post-write, full run:** → exit 1 with **exactly 34 FAIL lines, one per new ID
   AC-004-20…53** (`scenario defined … but no test references it`), zero other
   violations (`Scenario IDs found: 34 live, 109 archived`; grep for FAIL lines outside
   the 20–53 range returns empty). This is the structural stage-1 state: check 1 can
   only pass once the Coder's tests cite the IDs, which the stage-4 Verifier re-runs.
   Specs 002 and 003 were in the identical position at their stage 1.

## Acceptance scenarios

## AC-004-20 — deploy-jitsi.sh provisions the auto-record module idempotently

## AC-004-21 — Room-prefix gating is configured and defaults to rexi-

## AC-004-22 — Provisioned module passes the luac syntax gate; deploy aborts on failure

## AC-004-23 — collectSessionMp4s returns every mp4 in chronological order

## AC-004-24 — Audio extraction command carries -vn, every input in order, one output

## AC-004-25 — Extraction failure propagates, nothing is marked

## AC-004-26 — ASR command targets bl with diarization and the Spanish-primary hint

## AC-004-27 — Successful transcription writes transcript.json and .rexi-transcribed

## AC-004-28 — ASR failure leaves the directory unmarked and surfaces the error

## AC-004-29 — Insight prompt asks for the five customer-want categories, language-aware

## AC-004-30 — customer-brief.md renders the fixed skeleton beside the recording

## AC-004-31 — Booking context is best-effort and never fabricated

## AC-004-32 — Secrets never appear in the brief

## AC-004-33 — .rexi-analyzed is written only after brief AND issue delivery succeed

## AC-004-34 — One labeled issue is created when the room has none

## AC-004-35 — An existing open or closed issue for the room suppresses creation

## AC-004-36 — Missing label is created; existing label is not re-created

## AC-004-37 — The token never appears in argv or output

## AC-004-38 — gh failures propagate, never swallowed

## AC-004-39 — .rexi-billed does not short-circuit transcription

## AC-004-40 — Missing STRIPE_SECRET_KEY no longer aborts the run

## AC-004-41 — An unattributed recording still transcribes

## AC-004-42 — The billing-enabled path is unchanged

## AC-004-43 — Silent recording: existing warning, no transcription or insight markers

## AC-004-44 — Scan containment: one bad directory never kills the run

## AC-004-45 — MAX_MINUTES gates billing only

## AC-004-46 — CLI surface preserved; --dry-run mutates nothing

## AC-004-47 — recording-pipeline.md documents the insight chain and the sidecar limitation

## AC-004-48 — The deploy README carries the revival runbook

## AC-004-49 — The env example carries the new tool credentials

## AC-004-50 — Auto-recording fires for the first occupant without any UI action, exactly once

## AC-004-51 — A non-rexi room is never auto-recorded (consent boundary)

## AC-004-52 — One-off processing of the REAL session dir yields transcript and brief carrying the scripted content

## AC-004-53 — One labeled issue per recording; the second run is idempotent

## Verification

# 25-verification.md — Spec 004: Auto-record, transcribe, extract insights

Stage 4 (Verifier) — independent re-execution of every stage 2+3 claim.
Branch: `spec/004-auto-record-transcribe-insights` (checked out; no branch switch,
no commit, no push, no fix by the Verifier).
Attempt 1, phase 1 (full run — first verification of this spec).
Verification target: the UNCOMMITTED stage 2+3 output (9 modified tracked files +
new untracked `scripts/recording/` (7 `.mjs`), `deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua`,
`e2e.config.ts`, `tests/e2e/` (2 journeys), `src/__tests__/AC-004-*.test.ts` (8) +
`src/__tests__/recording-harness.ts`) against `10-tasks.md` (8 tasks, 13 decisions)
and `20-acceptance/` (34 scenarios AC-004-20…53, 8 files).
Information barrier honored: `00-informal.md` was NOT read.

## Overall verdict

**PASS** (attempt 1, phase 1).

| #   | Check                                                  | Result                                                                                                                                               | Exit                                                  |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | Scenario traceability                                  | PASS — 34 live IDs, all traced; every reference resolves                                                                                             | 0                                                     |
| 2   | Full test suite                                        | PASS — 38 files / 228 tests, 0 skipped                                                                                                               | 0                                                     |
| 3   | Complexity gate (lint + tsc + build)                   | PASS — 0 / 0 / 0                                                                                                                                     | 0                                                     |
| 4   | Design-principles gate                                 | PASS — scoped `-BaseRef main` exit 0 (0 FAIL / 0 WARN); unscoped exit 1 adjudicated OUT-OF-SCOPE (sole FAIL = vendored cobalt-01, 002/003 precedent) | 0 (scoped, authoritative) / 1 (unscoped, adjudicated) |
| 5   | Scenario-to-behavior spot check (AC-004-42, AC-004-44) | PASS — assertions genuinely enforce every Then-clause                                                                                                | 0                                                     |
| —   | No unaccounted behavior                                | PASS (finding line below; nothing untraced)                                                                                                          | —                                                     |

Mandatory 004-specific audits (a)–(g): all ruled PASS / recorded — details in §Audits.
Gates failed: **none**. BLOCKs relayed this phase: **0 of 3** (phase-1 budget untouched).

Stage 1.5 confirmation: no `15-design.md` (SKIPPED — no frontend surface), and the
change set ships **no frontend surface**: zero modified files under `src/components/`,
`src/pages/`, or any non-test `src/` path (`git diff main --name-only -- src/ ':!src/__tests__'`
→ empty; see audit (d)). The skip was correct.

## Evidence: scenario traceability

command: bash .standards/scripts/check-scenario-traceability.sh
exit: 0
at: 2026-10-21T23:44:29Z

```
Scenario IDs found: 34 live, 109 archived

PASS AC-004-20 — traced to a test
PASS AC-004-21 — traced to a test
PASS AC-004-22 — traced to a test
PASS AC-004-23 — traced to a test
PASS AC-004-24 — traced to a test
PASS AC-004-25 — traced to a test
PASS AC-004-26 — traced to a test
PASS AC-004-27 — traced to a test
PASS AC-004-28 — traced to a test
PASS AC-004-29 — traced to a test
PASS AC-004-30 — traced to a test
PASS AC-004-31 — traced to a test
PASS AC-004-32 — traced to a test
PASS AC-004-33 — traced to a test
PASS AC-004-34 — traced to a test
PASS AC-004-35 — traced to a test
PASS AC-004-36 — traced to a test
PASS AC-004-37 — traced to a test
PASS AC-004-38 — traced to a test
PASS AC-004-39 — traced to a test
PASS AC-004-40 — traced to a test
PASS AC-004-41 — traced to a test
PASS AC-004-42 — traced to a test
PASS AC-004-43 — traced to a test
PASS AC-004-44 — traced to a test
PASS AC-004-45 — traced to a test
PASS AC-004-46 — traced to a test
PASS AC-004-47 — traced to a test
PASS AC-004-48 — traced to a test
PASS AC-004-49 — traced to a test
PASS AC-004-50 — traced to a test
PASS AC-004-51 — traced to a test
PASS AC-004-52 — traced to a test
PASS AC-004-53 — traced to a test

✔ Scenario traceability check: every scenario traced, every reference resolves.
```

Machine-readable transcript (`--json`, run at 2026-10-21T23:44:42Z, exit 0):
`{"checks":[1,2],"passes":[…34 entries, AC-004-20…53 each "— traced to a test"…],"fails":[]}`.

Claim confirmed: exit 0, 34 live IDs — every stage-1 FAIL (34 untraced IDs, per
10-tasks.md §Traceability verification record) is now traced by the Coder's tests;
check 2 resolves every citation (incl. the legacy AC-004-01…06 pricing citations
via `docs/changes/001-landing-booking.md`).

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-21T23:45:00Z

```
> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  38 passed (38)
      Tests  228 passed (228)
   Start at  01:44:53
   Duration  7.44s (environment 67%, tests 16%, setup 7%, transform 5%, import 3%, worker 1%)
```

Claim confirmed: exit 0, 38 files / 228 tests. Skip/disable audit:
`grep -Ei "skip|todo|only"` over the full vitest log → **zero hits** — no skipped,
disabled, or filtered tests; the 228 count is real execution, not a silent subset.

## Evidence: complexity gate

command: npm run lint && npx tsc -b && npm run build (each also run individually, exits/timestamps below)
exit: 0
at: 2026-10-21T23:45:44Z

```
$ npm run lint        (eslint .)          → EXIT=0  at 2026-10-21T23:45:17Z   (zero findings)
$ npx tsc -b                              → EXIT=0  at 2026-10-21T23:45:31Z   (zero output)
$ npm run build       (tsc -b && vite build) → EXIT=0 at 2026-10-21T23:45:44Z

vite v8.3.1 building client environment for production...
✓ 43 modules transformed.
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-RxdbQujM.css   11.56 kB │ gzip:  2.50 kB
dist/assets/index-D7lmfMI7.js   242.12 kB │ gzip: 75.62 kB
✓ built in 162ms
```

Claims confirmed: 0 / 0 / 0. Note (see audit (a)): `eslint .` exit 0 does NOT prove
CC≤6 for the new `.mjs` units — the repo config's `complexity` rule does not match
`**/*.mjs`. Independent CC re-measurement was performed under audit (a): max CC = 6.

## Evidence: design-principles gate

command: bash .standards/scripts/check-code-principles.sh -BaseRef main --json
exit: 0
at: 2026-10-21T23:47:12Z

```
{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [],
  "warns": []
}
```

The authoritative blame-scoped run (`-BaseRef main`, the same authority the
002/003 precedents used) exits **0 with 0 FAIL / 0 WARN** — the change itself
introduces no design-principles finding. Claim confirmed.

Unscoped run (`bash .standards/scripts/check-code-principles.sh --json`,
at 2026-10-21T23:46:29Z, **exit 1**) — full transcription:

```
tier: "mvp"; gates: ["complexity","dry","yagni","solid","component-per-file","property-tests"]
fails (exactly 1):
FAIL Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10
warns (exactly 22):
WARN Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28
WARN Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25
WARN Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41
WARN Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43
WARN Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75
WARN Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22
WARN Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79
WARN Method body >20 lines (node): ./api/bookings/recorded-billing.ts:222:244:?:KISS_LINES=24
WARN Possible duplication (9x identical 4-line block, first at ./api/bookings/checkout.ts:26): date: string /startTime: string /hours: number /email: string
WARN Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:304): startTime: string /hours: number /joinUrl?: string | null /date: string
WARN Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:138): email: string /date: string /startTime: string /bookingId: string
WARN Possible duplication (3x identical 4-line block, first at ./src/domain/microsoftGraph.ts:178): }) /if (!res.ok) { /const text = await res.text().catch(() => '') /headers: { Authorization: `Bearer ${token}` },
WARN Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: "problem", /docs: { /description: /meta: {
WARN Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:140): startTime: string /hours: number /amountTotal: number /date: string
WARN Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},
WARN Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:13): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {
WARN Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:116): .status(400) /.json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } }) /return false /res
WARN Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],
WARN Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30
WARN Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33
WARN SRP: possible god file (node) — ./api/stripe-webhook.ts: 621 lines, 14 methods (split by responsibility)
WARN LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)
```

### RULING on the unscoped exit 1 (002/003 precedent + Stop-and-Ask matrix)

The sole unscoped FAIL is `./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10`
— a vendored example file inside the `.standards` git submodule, byte-identical to
the file that failed the spec-002 and spec-003 unscoped runs (003 archive
§RULING; runs.jsonl runId 2836ee65). Submodule-untouched evidence gathered at
2026-10-21T23:48:13Z:

```
$ git diff main -- .standards                       → empty (pointer unchanged vs main)
$ git submodule status .standards
 3b1879050fbc295df9cdd64753e4704cca87be74 .standards (v1.7.0-119-g3b18790)   ← no +/- prefix: clean, == recorded pointer
$ git -C .standards status --porcelain              → empty (zero modified vendored files)
$ git diff main --name-only | grep -c '^\.standards' → 0
```

RULING: pre-existing debt in the pinned clean submodule, untouched by this spec,
identical in kind and in the exact same file to the 002/003 phase-1 runs. Per the
Stop-and-Ask decision matrix ("Out-of-scope finding → Record it; do not fix;
propose a follow-up spec") it is recorded as an **OUT-OF-SCOPE finding** and does
not block this run; the authoritative blame-scoped run (`-BaseRef main`) exits 0
with 0 FAIL / 0 WARN. The standards-repo follow-up (fix or exclude the vendored
hallmark example) was already emitted in the 002 telemetry and stands; no new
follow-up is opened here.

WARN adjudication: all 22 unscoped WARNs sit in vendored `.standards/**` files (9)
or in project files NOT in this spec's change set (13: `Landing.tsx`,
`ServicesCarousel.tsx` ×2, `recorded-billing.ts`, `checkout.ts`, `stripe-webhook.ts` ×6,
`microsoftGraph.ts`, `bookings.ts`, `time.ts`) — pre-existing debt, zero attributable
to a file this spec touched (change set: `scripts/**`, `deploy/**`, `docs/**`,
`tsconfig.app.json`, tests). Per the matrix ("Design gate WARN (not FAIL) → Record
in the report; do not stop; flag to the Architect") they are recorded and flagged,
not blocking. The scoped run's 0 WARN confirms the change introduces none.

**Design-principles gate result for spec 004: PASS** (scoped exit 0; unscoped
exit 1 adjudicated OUT-OF-SCOPE per the ruling above).

## Evidence: scenario-to-behavior spot check

command: npx vitest run src/**tests**/AC-004-processor-rewiring.test.ts --reporter=verbose (plus manual assertion-vs-scenario analysis)
exit: 0
at: 2026-10-21T23:58:11Z

```
✓ src/__tests__/AC-004-processor-rewiring.test.ts > AC-004 processor rewiring > AC-004-42: the billing-enabled path is unchanged 4ms
✓ src/__tests__/AC-004-processor-rewiring.test.ts > AC-004 processor rewiring > AC-004-44: scan containment — one bad directory never kills the run 6ms
✓ src/__tests__/AC-004-processor-rewiring.test.ts > AC-004 processor rewiring > AC-004-44: a completed sweep exits 0 even with a failed directory 1ms

(file-level run at 2026-10-21T23:57:55Z, exit 0: Test Files 1 passed (1), Tests 17 passed (17))
```

Scenarios checked: **AC-004-42** (billing-unchanged golden) and **AC-004-44**
(scan containment) from `20-acceptance/AC-004-processor-rewiring.md`, against
`src/__tests__/AC-004-processor-rewiring.test.ts` lines 208–239, 270–343.

**AC-004-42 — every Then-clause genuinely enforced (no false green):**

| Scenario clause                                                | Test assertion (line)                                                                                                                                                                                                                | Verdict  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| POST to `<APP_BASE_URL>/api/bookings/recorded-billing`         | `expect(post!.url).toBe('http://localhost:4099/api/bookings/recorded-billing')` (231)                                                                                                                                                | enforced |
| Header `Authorization Bearer <RECORDED_BILLING_TOKEN>`         | `expect(init.headers.authorization).toBe('Bearer tok_1')` (232)                                                                                                                                                                      | enforced |
| Body `{ bookingId, email, actualMinutes: 90 }`                 | `toEqual({bookingId:'cs_test_1', email:'client@example.com', actualMinutes:90})` — exact-shape, no extra/missing keys (233–237)                                                                                                      | enforced |
| `.rexi-billed` written after the 200                           | `exists(dir,'.rexi-billed')===true` (238); the "only after 200" ordering is enforced by the companion test at 452–469 (POST→500 ⇒ no marker)                                                                                         | enforced |
| Minutes from ffprobe over the NEWEST mp4 (`findMp4` preserved) | Decoy design: a second, older mp4 whose probe answers 60s (=1 min); `newestFirstProbe` answers 5400s (=90 min) only for the newest-by-mtime file. Probing the wrong file would yield `actualMinutes: 1` and fail the exact `toEqual` | enforced |

Given-clause fidelity: `BILLING_ENV` carries STRIPE_SECRET_KEY + RECORDED_BILLING_TOKEN;
the reservation resolves via the fetch fake to `{bookingId:'cs_test_1', email:'client@example.com'}`;
the 200 reply carries `amountCents` (postReply, lines 85–96). Harness integrity
verified (`recording-harness.ts`): `makeFetch` records real url+init, `makeRunner`
throws on `fail:true` (line 25), `blProducesOut` really materializes the `--out`
file — the assertions bite.

**AC-004-44 — every Then-clause genuinely enforced (no false green):**

| Scenario clause                                     | Test assertion (line)                                                                                                                                 | Verdict  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| B and C fully processed in the same run             | `result.processed === 2` (293); B reaches `.rexi-analyzed` (297); `failed` is exactly `[dirA]`, so C is not failed                                    | enforced |
| A logged with its path + counted in failure summary | `lines` contains `dirA` (294); `result.failed` equals `[dirA]` (292); log matches `/Failures:\s*1/` (295)                                             | enforced |
| A receives no markers                               | `exists(dirA,'.rexi-transcribed')===false` (296) — A's injected failure is a real ffmpeg reject (badFfmpeg, 283–284)                                  | enforced |
| Scan process exits 0                                | Dedicated second test (320–343): `runCli({argv:['--scan']})` over a root whose only dir fails ffprobe ⇒ `expect(exitCode).toBe(0)` (342, decision 13) | enforced |
| 2nd run: A attempted again                          | `second.calls` contains a fresh ffmpeg call for dirA (309); `again.failed` = `[dirA]` (310)                                                           | enforced |
| 2nd run: B/C completed stages skipped via markers   | Zero `bl`/`gh` calls referencing B or C dirs on the second scan (312–316); `again.processed === 2` (311)                                              | enforced |

Both spot checks: assertions match the Given/When/Then semantics, not just the
scenario ID. No false greens found.

## No unaccounted behavior (finding line, not a command)

**Finding: PASS — every changed/added unit of logic traces to a task, scenario, or
documented decision.** Diff skim evidence: `process-recording.mjs` (−285/+33) is now
the thin CLI entry delegating to `scripts/recording/cli.mjs` (Task 6); the seven
`.mjs` modules' exports map 1:1 to Tasks 2–6 (`collectSessionMp4s`/`buildAudioExtractCommand`/
`extractAudio`; `buildAsrCommand`/`transcribe`; `buildInsightMessages`/`renderBrief`/
`runInsightStage`; `ensureLabel`/`findExistingIssue`/`deliverInsightIssue`;
`processSessionDir`/`scanAll`) plus decision-traceable helpers (`sessionDateFromMp4`
= decision 7; `billingSkipReason`, `recordingsDirFrom`, `usageText`, `detectDominantLanguage`,
`extractTranscriptText`, `parseChatStdout`, `listMp4Files` — internal support for
specified behavior); `billing.mjs` is the extracted unchanged billing flow
(BILLING_PATH/BILLED_MARKER/MAX_MINUTES=480/findMp4 preserved — §Global constraint).
Two items examined and ruled legitimate: (1) `tsconfig.app.json` +allowJs — an
enabling change for the vitest `.mjs` imports, audited under (d), no production
effect; (2) `recording-processor/Dockerfile` +`COPY scripts/recording/` — a
mechanical consequence of the entry's new imports (without it the container crashes
at import); 10-tasks' "Dockerfile gains nothing for 004" refers to tool binaries
(ffmpeg/bl/gh), and none were added — the +5 lines are the COPY plus a
container-limitation comment consistent with AC-004-47. Injection discipline (Ask E)
verified: zero `process.env` reads inside `scripts/recording/*.mjs` (only a comment
restating the rule); the entry alone wires `env: process.env` into `runCli`.

---

# Audits (004-specific, mandatory)

## Audit (a) — Gate blind spot + independent CC re-measurement: PASS (blind spot CONFIRMED; max CC ≤6 CONFIRMED; recorded as OUT-OF-SCOPE finding, not a BLOCK)

**Blind spot confirmed by direct reading of the gate configs (no gate config edited):**

- `eslint.config.cjs`: the `complexity: ['error', 6]` rule (line 51) lives in the
  block scoped `files: ['**/*.{js,jsx,ts,tsx}']` (line 14) — `**/*.mjs` does not
  match. The dedicated `files: ['**/*.mjs']` block (line 104) sets globals +
  `no-console: off` only, no complexity rule. ⇒ `npm run lint` never measures CC
  of the new `.mjs` units.
- `.standards/scripts/check-code-principles.sh` line 373:
  `NODE_FILES=$(find … -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' …)`
  — `.mjs` is not collected; `.lua` appears nowhere in the script. ⇒ the
  design-principles gate is blind to both new-language surfaces of this spec.

**Independent re-measurement 1 — ESLint `complexity` (the repo's canonical rule), ad-hoc
flat config in /tmp (`--no-config-lookup`, threshold 0 to report every function's CC;
no repo file touched):**

command: npx eslint --no-config-lookup --config /tmp/opencode/verif-004/eslint-cc.config.mjs -f json scripts/recording/{media,transcribe,insight,deliver,billing,pipeline,cli}.mjs scripts/process-recording.mjs
exit: 1 (expected — threshold-0 measurement mode flags every function; not a repo-gate failure)
at: 2026-10-21T23:50:17Z

```
process-recording.mjs:54 Function 'loadEnv'CC=6. Maximum allowed is 0.
pipeline.mjs:181 Async function 'processSessionDir'CC=6. Maximum allowed is 0.
cli.mjs:56 Async function 'runCli'CC=6. Maximum allowed is 0.
billing.mjs:120 Async function 'findReservationByRoom'CC=6. Maximum allowed is 0.
pipeline.mjs:65 Function 'deriveRoom'CC=5. Maximum allowed is 0.
pipeline.mjs:54 Function 'roomFromMetadata'CC=5. Maximum allowed is 0.
pipeline.mjs:227 Async function 'scanAll'CC=5. Maximum allowed is 0.
media.mjs:19 Function 'collectSessionMp4s'CC=5. Maximum allowed is 0.
insight.mjs:55 Function 'collectFromObject'CC=5. Maximum allowed is 0.
insight.mjs:132 Function 'splitLlmSections'CC=5. Maximum allowed is 0.
… (all remaining functions CC ≤5)
```

**Max CC = 6** (loadEnv, processSessionDir, runCli, findReservationByRoom) — at the
limit, none over. Refactorer's "max CC 6" claim CONFIRMED.

**Independent re-measurement 2 — the repo's own heuristic (stricter: counts `&&`/`||`
too), applied to byte-identical copies renamed `.mjs`→`.js` in /tmp (no repo file touched):**

command: bash .standards/scripts/check-code-principles.sh /tmp/opencode/verif-004/cc-js --gates complexity --json
exit: 0
at: 2026-10-21T23:50:48Z

```
{ "tier": "mvp", "gates": ["complexity"], "fails": [],
  "warns": [ KISS_LINES>20 ×6: cli.js:56:runCli=30, deliver.js:22:ensureLabel=27,
             media.js:38:buildAudioExtractCommand=24, insight.js:71:buildInsightMessages=31,
             insight.js:177:runInsightStage=30, pipeline.js:181:processSessionDir=34 ] }
```

**0 FAIL** under the repo heuristic — CC≤6 holds under both measurements. New
observation from the re-measurement: 6 method bodies >20 lines (KISS WARN class)
would surface if the gate covered `.mjs`. Per the matrix, WARNs are recorded and
flagged to the Architect, not blocking.

**Ruling:** the blind spot is real but pre-existing gate-tooling scope, not a defect
of this change set (the code passes both measurements). Per the Stop-and-Ask matrix
("Out-of-scope finding → Record it; do not fix; propose a follow-up spec"): recorded
as an OUT-OF-SCOPE finding, **not a BLOCK**. Follow-up spec proposed: extend
`check-code-principles.sh` NODE_FILES to `*.mjs`/`*.cjs` (and decide `.lua` policy),
and add `**/*.mjs` to the ESLint complexity-scoped block — in the standards repo,
where gate config lives (gate config is off-limits to pipeline agents).

## Audit (b) — Lua module live evidence: PASS

command: docker exec docker-jitsi-meet-prosody-1 luac -p /prosody-plugins-custom/mod_rexi_auto_record.lua
exit: 0
at: 2026-10-21T23:51:16Z

```
(no output — syntax OK)
```

command: docker logs docker-jitsi-meet-prosody-1 2>&1 | grep rexi_auto_record | head
exit: 0
at: 2026-10-21T23:51:19Z

```
2026-10-22 00:56:46 muc.meet.jitsi:rexi_auto_record          info	rexi_auto_record: loaded, recording rooms starting with 'rexi-'
2026-10-22 00:56:46 auth.meet.jitsi:rexi_auto_record         info	rexi_auto_record: loaded, recording rooms starting with 'rexi-'
2026-10-22 00:56:46 meet.jitsi:rexi_auto_record              info	rexi_auto_record: loaded, recording rooms starting with 'rexi-'
2026-10-22 00:56:46 hidden.meet.jitsi:rexi_auto_record       info	rexi_auto_record: loaded, recording rooms starting with 'rexi-'
```

The exact claimed line is present, on all four vhosts (module loaded via
GLOBAL_MODULES merge), with the default prefix `rexi-` rendered from the env fallback.

command: diff deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua ~/.jitsi-meet-cfg/prosody/prosody-plugins-custom/mod_rexi_auto_record.lua && sha256sum both
exit: 0
at: 2026-10-21T23:51:29Z

```
IDENTICAL
72baaf0c9fd2cb2dafd179fef2a843ec4a0311b11514a6c4c9539d07f7a75beb  deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua
72baaf0c9fd2cb2dafd179fef2a843ec4a0311b11514a6c4c9539d07f7a75beb  /home/dbueno/.jitsi-meet-cfg/prosody/prosody-plugins-custom/mod_rexi_auto_record.lua
```

Host-mount copy is byte-for-byte the repo copy (same sha256).

**Deferral check:** first-occupant behavioral proof IS deferred to the post-PR e2e
stage, and that is exactly what the scenarios say — `AC-004-auto-record-module.md`
header: "Live behavioral proof of the module (first-occupant trigger, single session,
non-matching rooms untouched) runs in the e2e stage — see AC-004-e2e-chain.md
(AC-004-50, AC-004-51)"; AC-004-50 asserts the first-occupant trigger + one-session
idempotency live, AC-004-51 the consent boundary. The in-suite scope of AC-004-20…22
is provisioning/config/syntax-gate content assertions — matching what was verified
here and in `AC-004-auto-record-module.test.ts`. The live journey was NOT run by
the Verifier (correct per scope).

## Audit (c) — Dry-run purity on a real session dir: PASS

Session dir found: live `RECORDINGS_DIR=/home/dbueno/rexi-recordings` (repo `.env:51`)
is **empty**; the real session dir lives at the image-default
`~/.jitsi-meet-cfg/storage/jibri/recordings/14759f1c-d3cf-4711-bac8-3c418c952ef6/`
(the `rexitest` session, decision 10) — contents: `rexitest_2026-09-18-13-02-17.mp4`,
`metadata.json`, `.rexi-billed` (a billed-only dir, incidentally a live probe of
AC-004-39 semantics).

command: find <dir> -mindepth 1 -printf '%p|%s|%TY-%Tm-%Td %TH:%TM:%TS\n' | sort (before)
exit: 0
at: 2026-10-21T23:52:23Z

```
…/.rexi-billed|33|2026-10-01 15:32:16.0433024730
…/metadata.json|91|2026-09-18 13:02:48.2858285830
…/rexitest_2026-09-18-13-02-17.mp4|4354042|2026-09-18 13:02:48.2064205440
```

command: node scripts/process-recording.mjs --jibri-dir /home/dbueno/.jitsi-meet-cfg/storage/jibri/recordings/14759f1c-d3cf-4711-bac8-3c418c952ef6 --dry-run
exit: 0
at: 2026-10-21T23:52:36Z

```
--- recording: /home/dbueno/.jitsi-meet-cfg/storage/jibri/recordings/14759f1c-d3cf-4711-bac8-3c418c952ef6/rexitest_2026-09-18-13-02-17.mp4
    duration: 1 min | audio stream: yes
    room: rexitest
    SKIP billing: .rexi-billed marker (already billed).
    DRY-RUN: would extract audio from 1 mp4(s) + run bl speech recognize.
    DRY-RUN: would run bl text chat, write customer-brief.md, open the insight issue.
```

command: find <dir> … | sort (after); diff before after
exit: 0
at: 2026-10-21T23:52:50Z

```
NO-MUTATION: listing+size+mtime identical before/after
```

Exit 0; output is plan-only (no POST, no bl/gh invocation — the DRY-RUN lines are
the planned-action log per decision 8); listing + size + **nanosecond mtimes**
identical before/after; no new file (transcript.json / customer-brief.md / markers)
appeared. Bonus observation: the log shows the billed-only dir planning
transcription+insight while skipping billing — AC-004-39's marker independence
visible on a live dir. Claim confirmed: mutation-free.

## Audit (d) — tsconfig +allowJs scrutiny: PASS

Diff vs main (`git diff main -- tsconfig.app.json`): exactly +4 lines — three
comment lines plus `"allowJs": true`. `checkJs` is never set ⇒ defaults to false.
Claim `allowJs:true, checkJs:false` confirmed.

What allowJs actually enables here: `tsconfig.app.json` has `"include": ["src"]` and
`"noEmit": true`. allowJs only lets the tsc _program_ resolve and infer export types
from the plain-ESM `scripts/recording/*.mjs` files that `src/__tests__/AC-004-*.test.ts`
import — without it, `tsc -b` would error TS2307 on those imports. It cannot pull JS
into any build output (tsc emits nothing; Vite bundles from `index.html`→`src/main.tsx`),
and it does not relax any gate for `.ts` files (strict/noUnusedLocals/etc. unchanged).

Mechanical confirmations (at 2026-10-21T23:53:38Z):

```
$ grep -rn "scripts/" src --include=*.ts --include=*.tsx | grep -v __tests__   → no hits
  (no app-source file imports scripts/ — only tests do)
$ grep -l "collectSessionMp4s\|rexi-billed\|bl speech recognize\|processSessionDir" dist/assets/*.js dist/assets/*.css → no hits
  (zero script symbols in the production bundle)
$ git diff main --name-only -- src/ ':!src/__tests__'                          → empty
  (app source byte-identical to main ⇒ Vite entry graph unchanged by construction)
$ npx tsc -b → exit 0; npm run build → exit 0 (43 modules, same single index bundle)
  (existing type gates hold with allowJs on; the vitest .mjs imports type-resolve)
```

No untyped JS in build output; no weakened type gate; the only consumer of the
allowJs resolution is the test program. Ruling: PASS — the change is minimal,
commented, and side-effect-free for production.

## Audit (e) — Pre-existing test integrity: PASS

command: git diff main --stat -- src/**tests**/ tests/ ; git diff main --name-status -- src/**tests**/ tests/ ; git status --porcelain -- src/**tests**/ tests/ | grep '^??' ; git ls-files counts
exit: 0
at: 2026-10-21T23:54:00Z

```
== tracked modifications/deletions under src/__tests__ + tests/ vs main:
(empty — zero pre-existing test files modified or deleted)
== untracked additions:
?? src/__tests__/AC-004-auto-record-module.test.ts
?? src/__tests__/AC-004-customer-brief.test.ts
?? src/__tests__/AC-004-e2e-journeys.test.ts
?? src/__tests__/AC-004-issue-delivery.test.ts
?? src/__tests__/AC-004-processor-rewiring.test.ts
?? src/__tests__/AC-004-runbook.test.ts
?? src/__tests__/AC-004-session-audio.test.ts
?? src/__tests__/AC-004-transcription.test.ts
?? src/__tests__/recording-harness.ts
?? tests/            (contains exactly e2e/auto-record-consent-boundary.e2e.ts + e2e/auto-record-full-chain.e2e.ts)
== tracked test files on branch: 31   == same count on main: 31
```

Additions are exactly the declared 8 AC-004 test files + `recording-harness.ts` +
the 2 e2e journeys; nothing else; zero pre-existing tests touched (tracked count
31 == main's 31, empty name-status diff). The harness is correctly NOT a `*.test.*`
file (invisible to vitest collection and the traceability gate, as its header states).

## Audit (f) — Disclosed deviation (GLOBAL_MODULES + XMPP_MUC_MODULES): PASS

Files reflect the deviation:

- `deploy-jitsi.sh` (+49): defines `rex_upsert_env_list` (append-once comma-list
  upsert with a membership check — no duplicates on re-run), calls it for BOTH
  `GLOBAL_MODULES` and `XMPP_MUC_MODULES`, copies the module, then runs the luac
  gate inside the prosody container; on gate failure it removes the copied module,
  restores `.env` from a pre-made backup, and exits 1 (no half-wiring — the
  `jibri-finalize.sh` cautionary precedent honored). The comment records the
  live-verified rationale: occupant-joined fires on the MUC component, which loads
  its own `XMPP_MUC_MODULES` list.
- `jitsi.env.example` (+18): documents both hook lines (`GLOBAL_MODULES=rexi_auto_record`,
  `XMPP_MUC_MODULES=rexi_auto_record`) with the same rationale, plus
  `REXI_AUTO_RECORD_PREFIX` (default `rexi-`, commented knob, consent-boundary note).
- Lua module: `os.getenv("REXI_AUTO_RECORD_PREFIX") or "rexi-"` (knob + fallback);
  consent gate order = started-flag → healthcheck → prefix → backend/owner →
  first-human (`human_occupants(room) ~= 1`), i.e. non-matching rooms never reach
  the recording-start path; session idempotency via `room._data.rexi_auto_record_started`.

Scenario satisfaction re-checked against the deviation:

- **AC-004-20** Then-clauses: `.env` sets GLOBAL_MODULES including `rexi_auto_record` ✓
  (upsert call 1); second run keeps it exactly once ✓ (membership check — the test at
  lines 71–86 of `AC-004-auto-record-module.test.ts` actually executes the bash
  function against temp env files, including the pre-populated `GLOBAL_MODULES=foo,bar`
  case → `foo,bar,rexi_auto_record`); module file content unchanged on re-run ✓ (cp
  from repo every run). Managing the SECOND hook additionally violates nothing —
  no Then-clause restricts other keys.
- **AC-004-21**: knob documented with default `rexi-` ✓; module reads env with
  fallback ✓ (test asserts the exact lua line); gating before any recording-start
  logic ✓.
- **AC-004-22**: gate command `docker exec "$PROSODY_CID" luac -p /prosody-plugins-custom/…`
  present after the copy, aborts non-zero with un-provisioning ✓ (test asserts
  command shape + copy-before-gate ordering).

Ruling: the deviation is additive, evidence-backed, documented in both files, and
every scenario Then-clause remains satisfied. PASS.

## Audit (g) — Phase-2 prep note (recorded, not fixed): RECORDED + prettier confirmed

command: git ls-files (prettier-parseable, minus .standards + AGENTS.md symlink → 124 files) | xargs npx prettier --check
exit: 0
at: 2026-10-21T23:56:38Z

```
Checking formatting...
All matched files use Prettier code style!
```

command: npx prettier --check scripts/recording tests e2e.config.ts src/**tests**/AC-004-*.test.ts src/**tests**/recording-harness.ts docs/recording-pipeline.md docs/local-e2e-testing.md deploy/production/README.md
exit: 0
at: 2026-10-21T23:56:39Z

```
Checking formatting...
All matched files use Prettier code style!
```

Whole-repo prettier on TRACKED files: **exit 0** — confirmed. Every new/modified
prettier-parseable file of the 004 change set: **exit 0**. Context: the
filesystem-wide scan (`npx prettier --check .`, at 2026-10-21T23:55:49Z, exit 1)
flags **only** 12 untracked `specs/**` scratch markdown files (002/003 verification
docs + 004 spec artifacts) — out of scope, never committed in the final PR (stage 5b
archives `specs/004-*` away before push), so CI never sees them. `.sh`/`.env.example`
files are not prettier-parseable and are skipped by CI's directory scan (explicit-path
invocations error on them — not a finding).

**Phase-2 note for the PR Opener (recorded, not fixed):** after stage-5b runs
`archive-spec.sh`, the CI-visible markdown becomes `docs/changes/004-auto-record-transcribe-insights.md`.
Per the 003 precedent (archive §Warnings item 3 — spec-002 round 1 failed Lint &
Format on exactly this), the PR Opener must run `prettier --write
docs/changes/004-*.md` **AFTER** appending the PR-record line (the append breaks
prettier's markdown formatting), before pushing.

---

## Warnings / review hints for the Architect (non-blocking)

1. Unscoped design-principles: 1 FAIL (vendored `.standards/skills/hallmark/…/cobalt-01/script.js`
   CC=10) adjudicated OUT-OF-SCOPE per the ruling above; 22 WARNs all in vendored or
   untouched pre-existing files. Standards-repo follow-up (proposed in 002 telemetry) stands.
2. Audit (a) blind spot: repo gates do not measure `.mjs`/`.lua` (ESLint complexity
   block scope + check-code-principles NODE_FILES list). Independent re-measurement
   passes (max CC=6 ESLint-classic; 0 FAIL repo-heuristic), but the gate coverage gap
   itself deserves a follow-up spec in the standards repo. New observation from the
   re-measurement: 6 method bodies >20 lines in the new `.mjs` units
   (`runCli`=30, `ensureLabel`=27, `buildAudioExtractCommand`=24,
   `buildInsightMessages`=31, `runInsightStage`=30, `processSessionDir`=34) —
   KISS-class WARNs that the gate would surface if it scanned `.mjs`; review hint only.
3. Phase-2 risk (audit (g)): the PR-record append must be prettier-formatted before
   push or Lint & Format will fail exactly as in spec-002 round 1.
4. Note for stage 5a/e2e: AC-004-50…53's live proof (first-occupant trigger, consent
   boundary, real-dir one-off chain, issue idempotency) is deferred to the post-PR
   e2e stage per the scenarios themselves; the in-suite guard test
   (`AC-004-e2e-journeys.test.ts`, decision 3) keeps traceability green meanwhile.

## Telemetry (spec 012)

Record appended to `runs.jsonl` via `bash .standards/scripts/record-gate-run.sh -f runs.jsonl`
(env `SPEC_LOOP_COUNT=1 SPEC_PHASE1_RETRIES=0 SPEC_PHASE2_RETRIES=0` exported before
invocation) at 2026-10-22T00:01:47Z, script exit 0:

```
{"specSlug":"004-auto-record-transcribe-insights","gatesFailed":[],"warnings":[…4 entries: cobalt-01 OUT-OF-SCOPE ruling; 22-WARN baseline; audit(a) blind spot + KISS_LINES observations; audit(g) phase-2 prettier note…],"durationSec":1054,"outcome":"pass","runId":"e18480e1-9c04-45c2-a501-71337bb81d05","loopCount":1,"phase1Retries":0,"phase2Retries":0}
```

## Overall verdict

**PASS** (attempt 1, phase 1). All five contract checks ran and produced no findings
attributable to this spec; all seven mandatory 004 audits pass or are recorded per
the matrix. Verdict transcribed from the gates: traceability exit 0; test suite
exit 0; lint/tsc/build exit 0/0/0; design-principles scoped exit 0 (unscoped exit 1
adjudicated OUT-OF-SCOPE — vendored submodule file, identical to 002/003 precedent);
spot checks green with genuine Then-clause enforcement.

- Gates failed: none.
- BLOCKs relayed this phase: 0 of 3 (phase-1 budget untouched).
- Stage 5a (Mutation Runner) may proceed.

## Quality gates

# 30-report.md — Spec 004: Auto-record, transcribe, extract insights

Stage 5a (Mutation Runner) — spec pipeline (`docs/SPEC_PIPELINE.md`).
Branch: `spec/004-auto-record-transcribe-insights` (checked out; no branch switch,
no commit, no push by this stage).
Information barrier honored: `specs/004-auto-record-transcribe-insights/00-informal.md`
was NOT read.

## Overall verdict

**GREEN** (mvp tier — mutation gate skipped per tier policy; full suite re-run green).

| Row                                                                   | Value                                                                                                                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Verifier's verdict (carried forward)                                  | **PASS** — attempt 1, phase 1; 0 BLOCKs of 3 (`25-verification.md` §Overall verdict)                                                                                                       |
| Mutation score                                                        | **skipped — `mvp` tier** (see §Mutation gate: skip reason)                                                                                                                                 |
| Complexity summary (carried from Refactorer via `25-verification.md`) | scoped **0 FAIL / 0 WARN**; unscoped 1 vendored FAIL (ruled OUT-OF-SCOPE) + 22 WARN baseline + 6 KISS_LINES WARN-class observations on `scripts/recording/*.mjs` (see §Complexity summary) |
| Equivalent mutants                                                    | **none — mutation testing was not run at `mvp` tier**, so no mutants (equivalent or otherwise) were produced                                                                               |
| Final test status (full suite, one final time)                        | **PASS — exit 0, 38 files / 228 tests, 0 skipped** (see §Evidence: final test status)                                                                                                      |
| Remediation record                                                    | phase 1: PASS at attempt 1, 0 of 3 used; phase 2: not started, 0 of 3 used (see §Remediation record)                                                                                       |

## Mutation gate: skip reason

Per `.standards/docs/SPEC_PIPELINE.md §Conformance tiers`: stage "Architect —
mutation testing" is **skip** at `mvp` (yes only at `production` /
`multi-service`). The tier was live-confirmed by this stage (not inherited from
the claim) via the design-principles gate's `--json` tier field:

- Live tier probe: `"tier": "mvp"`, scoped run exit 0. Evidence block below.
- Consequently the `production`-tier mutation tools (`npx stryker run` for this
  JS/TS project; target ≥80%) were **not** invoked; no mutation-killing tests
  were written by this stage. No new test code was added here, so the
  "re-run the suite after adding mutation-killing tests" step reduces to a
  straight re-confirmation — performed, green, evidence below.

## Evidence: tier live confirmation (basis of the skip)

command: bash .standards/scripts/check-code-principles.sh -BaseRef main --json
exit: 0
at: 2026-10-22T00:09:22Z

```
{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [],
  "warns": []
}
```

Matches the Verifier's scoped run (`25-verification.md` §Evidence:
design-principles gate, exit 0, 0 FAIL / 0 WARN). `tier: "mvp"` → mutation gate
skipped per §Conformance tiers.

## Evidence: final test status (full suite, one final time)

command: npm test
exit: 0
at: 2026-10-22T00:09:23Z

```
> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  38 passed (38)
      Tests  228 passed (228)
   Start at  02:09:24
   Duration  9.12s (environment 68%, tests 15%, setup 7%, transform 6%, import 4%, worker 1%)
```

Claim re-verified independently (not trusted): exit 0, **38 files / 228 tests**
— identical to the Verifier's numbers. Vitest reports all-pass; no skipped/only
entries in the summary. (The trailing jsdom-environment performance note in the
raw log is a vitest advisory, not a test result.)

## Complexity summary (carried from the Refactorer via `25-verification.md`)

- **Authoritative scoped run** (`-BaseRef main`): exit 0 — **0 FAIL / 0 WARN**.
  The change set introduces no design-principles finding.
- **Unscoped run**: exit 1 — **1 FAIL**, `./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90 CC=10`, a vendored file inside the clean pinned `.standards` submodule (submodule pointer unchanged vs `main`; byte-identical to the file that failed the 002/003 unscoped runs). Adjudicated **OUT-OF-SCOPE** per the Stop-and-Ask matrix ("Out-of-scope finding → record, do not fix, propose follow-up"); ruling and submodule evidence in `25-verification.md` §RULING.
- **22 unscoped WARNs** — baseline debt, all in vendored `.standards/**` (9) or files outside this spec's change set (13); none attributable to 004 files (`25-verification.md` §WARN adjudication).
- **6 KISS_LINES WARN-class observations on the new `scripts/recording/*.mjs`** (from the Verifier's independent re-measurement, audit (a)): `runCli`=30, `ensureLabel`=27, `buildAudioExtractCommand`=24, `buildInsightMessages`=31, `runInsightStage`=30, `processSessionDir`=34 lines. Would surface only if the gate covered `.mjs` (it doesn't — see carried warning 2). Cyclomatic complexity independently re-measured at **max CC = 6** under both ESLint-classic and the repo heuristic — 0 FAIL; at the limit, none over. Review hint, non-blocking, flagged to the Architect per the matrix.

## Equivalent mutants

None. Mutation testing was not run (mvp tier), so no mutants were generated;
there are no equivalent (un-killable) mutants to name.

## Remediation record

Carried forward from `25-verification.md` (§Overall verdict, §Telemetry —
attempt information present; verified attempt fields exist and are quoted, not
guessed):

| Phase                                 | Events                                                                                                                                                                                                                               | Resolution                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Phase 1 (pre-PR local + design gates) | Verifier PASS at **attempt 1**, full run — first verification of this spec. **0 BLOCKs relayed, 0 of 3 budget used** (`SPEC_PHASE1_RETRIES=0` in the Verifier's telemetry record, runId e18480e1). No fix-delegation loops occurred. | Resolved at phase 1 / attempt 1 |
| Phase 2 (post-PR CI)                  | **Not started** — nothing pushed (stage 5a never commits/pushes; PR Opener is the next stage). **0 of 3 budget used** (`SPEC_PHASE2_RETRIES=0`).                                                                                     | —                               |

## Carried warnings for the Architect / stage 5b (from `25-verification.md` §Warnings; non-blocking)

1. **Unscoped design-principles baseline**: 1 vendored FAIL (cobalt-01, OUT-OF-SCOPE
   ruling stands, same file as 002/003) + 22 WARNs in vendored/untouched files.
   Standards-repo follow-up proposed in 002 telemetry stands.
2. **`.mjs`/`.lua` gate-coverage blind spot** (audit (a), CONFIRMED): `eslint.config.cjs`
   `complexity` rule does not match `**/*.mjs`; `check-code-principles.sh` NODE_FILES
   collects neither `.mjs` nor `.lua`. The 004 code passes both independent
   re-measurements, but the coverage gap itself is an **OUT-OF-SCOPE finding**:
   proposed follow-up spec in the standards repo (extend gate to `*.mjs`/`*.cjs`,
   decide `.lua` policy; add `**/*.mjs` to the ESLint complexity block — gate
   config is off-limits to pipeline agents). The 6 KISS_LINES observations above
   are the concrete output the extended gate would produce.
3. **Phase-2 prettier duty for stage 5b** (audit (g)): after `archive-spec.sh` and
   **AFTER appending the PR-record line**, run `prettier --write
docs/changes/004-auto-record-transcribe-insights.md` **before pushing** — the
   append breaks prettier's markdown formatting; spec-002 round 1 failed Lint &
   Format on exactly this.
4. **Live e2e proof deferred**: AC-004-50…53 (first-occupant trigger, consent
   boundary, real-dir chain, issue idempotency) are deferred to the post-PR e2e
   stage per the scenarios themselves; the in-suite guard test keeps traceability
   green meanwhile.

## Stage disposition

Mutation gate: skipped (mvp tier) — documented above.
Full suite: re-run by this stage, green (exit 0, 38/228).
Report verdict: **GREEN**. Stage 5b (PR Opener) may proceed.
This stage committed nothing, pushed nothing, opened nothing.
PR: https://github.com/RexiAI/rexiAI/pull/72
Commits: 11
