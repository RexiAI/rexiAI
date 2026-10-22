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
