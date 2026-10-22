# 004 — Auto-record every meeting, transcribe it, and extract what the customer wants

## Goal (owner's words, 2026-10-21)

All meetings should be recorded. The engineering-standards video/audio AI
toolchain (the `media-voice` family — Bailian `bl` CLI) should obtain the
transcript of each meeting and use it to understand what the customer wants.
Must be e2e-tested with the e2e agent.

## Problem / current state (verified 2026-10-21)

- **Recording is manual.** The local Jitsi stack (Docker: web/jvb/jicofo/
  prosody/jibri at `host.docker.internal:8443`, `ENABLE_RECORDING=1`) only
  records when a participant clicks *Start recording*. No auto-start mechanism
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
