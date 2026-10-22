# 005-home-hosted-recording

> Spec pipeline archive. Original source: `specs/005-home-hosted-recording/` (deleted by this script).
> Archived: 2026-10-22

## Original ask

# 005 — Home-hosted recording on this WSL machine (no VPS)

## Goal (owner's words, 2026-10-22)

"I do not want to pay a VPS so we need to store the data in this WSL. Make all
arrangements to do that." All meeting recordings, transcripts, and customer
briefs live on this machine; the recording pipeline runs here unattended; and
there is a concrete, zero-monthly-cost path for real customer meetings to run
on this machine's Jitsi so they actually get recorded.

## Current state (verified on the host, 2026-10-22)

- WSL2 (kernel 6.18.33.2-microsoft-standard-WSL2), **systemd PID 1**
  (state `degraded` but functional), **Linger=yes** for `dbueno`,
  **passwordless sudo** available.
- Jitsi stack in Docker (web/jvb/jicofo/prosody/jibri) at
  `https://host.docker.internal:8443` (self-signed) + `:8000` (http) +
  `10000/udp`; compose project `~/docker-jitsi-meet`; auto-record prosody
  module live (spec 004, e2e-proven); recordings land in
  `/home/dbueno/rexi-recordings` (bind-verified, 19M used, **821G free** on /).
- Processor (`scripts/process-recording.mjs` + `scripts/recording/*`) works on
  this host: scan/one-off modes, containment, markers, brief + gh issue
  delivery (e2e-proven through issue #75). ASR stage blocked by provider-side
  `bl` upload-policy 401 (D5b) — the whisper fallback is **spec 006, separate
  PR**, not this one.
- Shipped systemd units `deploy/production/rexi-recording.{service,timer}`
  assume the VPS layout: `WorkingDirectory=/opt/rexiAI`,
  `EnvironmentFile=/etc/rexi-recording.env`, 5-min timer with
  `Persistent=true`. Nothing is installed yet on this machine.
- Exposure facts: `meet.rexi-ai.com` = **NXDOMAIN**; `rexi-ai.com` →
  216.198.79.1 (Vercel); Vercel prod has **no MEETING_BASE_URL** → prod
  bookings currently create meet.jit.si rooms (never recorded). Public IP is
  79.117.136.26 (not CGNAT; residential, likely dynamic). **Tailscale is
  installed and logged in** (node `pcdanimoudo-1`, tailnet `pucelano-95@`);
  `tailscale funnel` has no serve config yet (first use needs a one-time
  owner consent at the login server).
- Repo hygiene: `runs.jsonl` (pipeline telemetry) is untracked and unwanted in
  git; jibri logs a harmless SEVERE for the placeholder finalize script path.

## Ask

### A. Home-host install (the "arrangements", executable + idempotent)

`deploy/home/install-recording-host.sh`: adapts the shipped units to this
machine (repo checkout path as WorkingDirectory — no /opt assumption; keep
`deploy/production/*` working unchanged for the VPS path), writes
`/etc/rexi-recording.env` (0600) with the real home values (RECORDINGS_DIR,
APP_BASE_URL=https://rexi-ai.com, MEETING_BASE_URL=https://meet.jit.si until
the guarded switch in Ask E runs; STRIPE/billing vars deliberately ABSENT —
billing-disabled is the standing mode and the processor is attribution-safe
without them), ensures the service runs as `dbueno` with a PATH that finds
`node`, `bl`, `ffmpeg`/`ffprobe`, `gh` (gh is already authenticated via the
user keyring — no GH_TOKEN needed in the env file), pre-flights disk free
space, installs + enables + starts the 5-min timer, and verifies the first
scan cycle (journalctl evidence) before declaring success. Re-running must be
a no-op-safe update. No secret values ever printed.

### B. Processor disk guard

Scan mode checks free space on the RECORDINGS_DIR filesystem:
below `REXI_MIN_FREE_GB` (default 20) → loud warning in the run log; below a
hard floor (`REXI_HARD_MIN_FREE_GB`, default 5) → skip processing entirely
with a clear per-run error, exit still contained (0 for --scan per the
containment decision). Small injectable unit (df stat via execFile), tested.

### C. Exposure path A — Tailscale Funnel (zero cost, zero router/DNS)

`deploy/home/expose-funnel.sh` + runbook: pre-checks (tailscale up, node
name, funnel availability), configures serve/funnel HTTPS 443 → local Jitsi
web (http :8000), verifies colibri-websocket fallback is enabled in the stack
(media must flow over TCP 443 through funnel — UDP 10000 does not pass), and
emits the exact jitsi `.env` changes (PUBLIC_URL = funnel URL) with a restart
helper. The one-time `tailscale funnel` owner consent (browser) is a
documented manual step; the script must detect "consent pending" and say so
instead of failing cryptically. TLS via funnel is valid Let's Encrypt → also
fixes the Brave camera/self-signed-cert class of problems for the public URL.

### D. Exposure path B — meet.rexi-ai.com → home (professional URL)

Runbook + helper emitting exact commands for the three owner-side layers:
GoDaddy DNS A record `meet` → current public IP (helper prints the current IP
and the record to create; optional DDNS refresh note), router port-forward
443/tcp + 10000/udp → the Windows host, and Windows→WSL2 relay
(`netsh interface portproxy` + firewall rules — helper prints the exact
admin-PowerShell lines; WSL2 IP is NAT'd behind Windows). Cert strategy for
the jitsi web container documented (LE option in docker-jitsi-meet). No code
touches the router/DNS — this ask is scripts-that-print-truth + docs.

### E. Guarded prod switch

`deploy/home/switch-meeting-base-url.sh <public-url>`: health-gates BEFORE
touching Vercel — TLS valid, Jitsi web reachable, a probe room page loads —
then and only then `vercel env add MEETING_BASE_URL <url> production`
(replacing if present) and triggers a prod redeploy; prints the rollback
command. Refuses and changes nothing on any failed gate. Never run
automatically by any other script; owner executes it (the runbooks say so).

### F. Docs rework

`docs/recording-pipeline.md`: home-hosted-on-WSL becomes the primary
deployment (VPS demoted to alternative); storage layout on this machine
(recordings/transcripts/briefs under RECORDINGS_DIR; issues in the private
repo), always-on caveat (machine must be powered on for meetings AND for the
timer; `Persistent=true` catches up missed scans), consent note (only `rexi-`
rooms record), retention guidance (manual for now; sizes measured: ~3MB/min
observed → 821G ≈ months). Include the exposure decision matrix (A vs B).

### G. Sanctioned chores (same PR, separate commit)

- `.gitignore`: add `runs.jsonl` (pipeline telemetry scratch stays local).
- Document the harmless jibri finalize-placeholder SEVERE + how to silence it
  (unset `JIBRI_FINALIZE_RECORDING_SCRIPT_PATH` in the local stack env) in the
  home runbook — host-side change, not repo.

## Constraints

- No new npm dependencies; processor stays zero-dep style (injectable
  execFile/fetch); shell scripts pass `bash -n` and shellcheck-style hygiene
  (quoted expansions, set -euo pipefail, no secret echoing).
- `deploy/production/**` VPS artifacts keep working unchanged (home install
  adapts copies or parameterizes — do not break the shipped units' contract).
- Nothing may point prod `MEETING_BASE_URL` at an unverified host (Ask E is
  the only switch; health-gated).
- Local Jitsi stack keeps working at `host.docker.internal:8443` for dev/e2e
  regardless of exposure path (exposure adds a public face; it does not break
  the local one).
- Secrets: env file 0600; scripts read but never print values; gh uses the
  existing user auth.
- The whisper ASR fallback is spec 006 (separate PR/conversation per owner) —
  005 must not implement it; until 006 lands, the installed timer's scan
  cycles will fail-contained at ASR (that is expected, not a regression).

## Acceptance shape (live, on this machine — e2e stage proves it)

- Install script run: timer listed by `systemctl list-timers`, first scan
  cycle in journalctl, env file present 0600 with no secrets in logs.
- Disk guard: threshold behavior observable via env override + unit test.
- Funnel script: reaches the owner-consent boundary with clear instructions
  (or completes if consent already given); path-B helper prints correct
  current IP + exact netsh/DNS lines.
- Switch script: refuses a dead URL (negative proof) and changes nothing.
- Suite green; existing 004 behavior untouched.

## Out of scope

- Whisper fallback (spec 006). Executing the prod switch (owner-gated, after
  an exposure path is actually live). Router/DNS/Windows-side changes
  themselves (owner hands; scripts only print truth). VPS anything.

## Tasks

# 10-tasks.md — Spec 005: Home-hosted recording on this WSL machine (no VPS)

Stage 1 (Specifier) artifact. Input: `00-informal.md` (2026-10-22, asks A–G).
Branch: `spec/005-home-hosted-recording`.

## Scenario ID range & collision avoidance

- Spec-001 used per-TASK numbering; its archive (`docs/changes/001-landing-booking.md`)
  owns headings **AC-005-01 … AC-005-05** (free-hour eligibility task), still cited by
  `src/__tests__/AC-005-free-hour.test.ts:25-71` (verified by grep, 2026-10-22).
- This spec therefore starts at **AC-005-06** — the first clean ID. No other source in
  this repo cites any `AC-005-*` ID (verified: `grep -rn "AC-005-" src/ scripts/ tests/
  deploy/ docs/` yields only the 001 archive + free-hour test; `.standards/docs/changes/`
  hits are the standards repo's own numbering and are excluded from the reference scan
  by the gate's `--exclude-dir=.standards`).
- Range used: **AC-005-06 … AC-005-52** — 47 scenarios, 9 task files, contiguous,
  zero intersection with the archived 01–05 block.
- Precedent: spec-002 started at AC-002-05 (001 owns 01–04), spec-003 at AC-003-10
  (001 owns 01–09), spec-004 at AC-004-20 (001 owns 01–06, buffer deliberate).
  005 takes the first clean ID per the stage-1 instruction; no buffer is reserved
  because spec-001 is archived and frozen — its per-task numbering can never grow.
- Mechanical evidence — see §Traceability verification record at the bottom.

## OPEN QUESTION (one — human answer required before /build completes Task 3)

**Q: Ask C's media premise is factually stale — what should path A promise?**

The informal spec says the funnel script "verifies colibri-websocket fallback is
enabled in the stack (media must flow over TCP 443 through funnel — UDP 10000 does
not pass)". Verified against the live host and upstream on 2026-10-22:

1. The live web container has **no `/colibri-ws` location** — grepped the rendered
   nginx config (`docker exec docker-jitsi-meet-web-1 grep colibri
   /run/web/config/nginx/meet.conf` → empty; only `/xmpp-websocket` signaling exists).
2. Upstream **removed colibri-websocket support entirely**: jitsi/docker-jitsi-meet
   commit "feat(web,jvb): remove deprecated colibri websocket support (#2285)"
   (2026-07-29) — the bridge channel now uses SCTP datachannels (always on), the
   JVB ws server (port 9090) is gone, and setting `ENABLE_COLIBRI_WEBSOCKET` now
   only produces a deprecation warning. There is no version to upgrade to that
   re-enables it.
3. SCTP datachannels and SRTP media ride the ICE transport (UDP 10000 or ICE-TCP),
   which Tailscale Funnel — an HTTPS-only proxy — cannot carry. The repo's own
   `docs/recording-pipeline.md:263-267` already says exactly this about funnels.

Consequence: **path A (funnel alone) can expose the web app + XMPP signaling with
valid LE TLS, but external-client media will not flow** without direct UDP 10000
reachability (path B's router forward) or LAN/tailnet-local clients.

**Default resolution written into these artifacts (option a):** `expose-funnel.sh`
performs the colibri-ws/media-transport check, and when absent (current reality)
prints a loud, explicit warning that the funnel carries web+signaling only and that
media needs path B's UDP 10000 forward or LAN/tailnet clients — then **continues**
to the consent boundary, because the informal spec's acceptance shape requires the
script to "reach the owner-consent boundary with clear instructions" *on this
machine*, where colibri-ws is absent. Scenario AC-005-25 pins this behavior.

Alternatives the human may choose instead:
- **(b)** hard-gate: the script refuses to configure the funnel while no TCP-443
  media transport exists (AC-005-25 and AC-005-51 would flip to refusal).
- **(c)** defer/drop path A until a working media-over-HTTPS transport exists;
  path B becomes the only public-exposure route (Task 3 shrinks to docs).

Answer before stage 2 if (b) or (c); otherwise the Coder implements (a).

## Global constraints (apply to every task)

- **No new npm dependencies anywhere.** `scripts/recording/*` stays zero-dep:
  node builtins + external binaries only; every side-effecting function takes an
  injected execFile-like `runner` (and injected `fetch` where HTTP), per the
  spec-004 harness contract (`src/__tests__/recording-harness.ts:11-29`).
  Importing any `scripts/recording/*.mjs` must stay side-effect-free.
- **Frozen spec-004 processor contracts:** per-directory containment (`--scan`
  exits 0 even with failed dirs — `scripts/recording/cli.mjs:63-66`), the three
  independent markers (`.rexi-billed`, `.rexi-transcribed`, `.rexi-analyzed`),
  the CLI modes (`--scan`, `--jibri-dir`, `--room/--recording`, `--dry-run`,
  usage exit 2), billing fail-closed without credentials. The ONLY permitted
  behavior insertion is the Task 2 disk guard on the scan path.
- **Frozen VPS artifacts:** `deploy/production/**` is not modified by this spec
  (the shipped `rexi-recording.service` keeps `WorkingDirectory=/opt/rexiAI`,
  `ExecStart=/opt/rexiAI/scripts/recording-cron.sh`; the timer keeps
  `OnBootSec=2min`, `OnUnitActiveSec=5min`, `Persistent=true`,
  `RandomizedDelaySec=30` — verified by reading the files, 2026-10-22). The home
  install ADAPTS copies at install time; it never edits the shipped units.
- **Local stack stays reachable:** `https://host.docker.internal:8443` (and
  `:8000`) keep serving regardless of exposure work; no repo artifact changes
  docker-compose port mappings (live-verified: web publishes 8000+8443, jvb
  publishes 10000/udp).
- **Prod `MEETING_BASE_URL` changes ONLY via the health-gated switch script
  (Task 5), executed manually by the owner.** No other script may call `vercel
  env` mutations or the switch script. (Current prod has NO `MEETING_BASE_URL` —
  informal spec, host-verified.)
- **Secrets:** the home env file is mode 0600 and carries NO secret values; no
  script ever echoes an env value, token, or key to stdout/stderr or into a
  journal; `gh` uses the existing user auth (no `GH_TOKEN` in the env file).
- **Shell hygiene (all four new `deploy/home/*.sh`):** pass `bash -n`; start
  `set -euo pipefail`; quote expansions; invoke external tools (`curl`, `vercel`,
  `tailscale`, `docker`, `systemctl`, `journalctl`, `df`, `netsh`-printing) by
  **bare PATH-resolved name** — never an absolute path — so vitest can shim them
  via a prepended PATH dir (the Task 5 ordering tests depend on this).
- **Shell-logic test pattern:** in-suite tests spawn `bash <script>` with
  `PATH=<tmp-shim-dir>:<minimal>` and a scenario-scripted shim set that appends
  `"<cmd> <args>"` lines to a call log and exits per scenario. Refusal-before-
  mutation and gate ordering are asserted on the call log. Content/contract
  assertions on script and doc sources follow the repo precedents
  (`src/__tests__/AC-004-runbook.test.ts`, `AC-013-deployment-config.test.ts`).
- **Test files:** `src/__tests__/AC-005-<topic>.test.ts`, scenario ID in the test
  name (`it("AC-005-NN: …")`, docs/SPEC_PIPELINE.md §Scenario format). Disk-guard
  unit tests use the spec-004 harness (`makeRunner`, `captureLog`, `mkTmpDir`).
- **Whisper ASR fallback is spec 006 — OUT.** Until 006 lands, installed scan
  cycles fail-contained at the ASR stage (provider-side `bl` upload-policy 401,
  informal D5b); every scenario that observes a scan cycle treats stage failure
  as expected and asserts only the scan-cycle evidence, never stage success.
- Cyclomatic complexity ≤6 per function; files <500 lines; commit per task
  (conventional commits), chores (Task 8) as their own commit per Ask G.

## Tasks

### Task 1 — Home install script (Ask A)

Scenarios: `20-acceptance/AC-005-home-install.md` (AC-005-06 … AC-005-12)
Tests: `src/__tests__/AC-005-home-install.test.ts` (content/contract assertions)

Files: new `deploy/home/install-recording-host.sh`.

Acceptance criteria:

- Installs adapted copies of the shipped units to `/etc/systemd/system/
  rexi-recording.{service,timer}` (same unit names — decision 4): service keeps
  `Type=oneshot`, `EnvironmentFile=/etc/rexi-recording.env`, `TimeoutStartSec=300`;
  timer keeps `OnBootSec=2min`, `OnUnitActiveSec=5min`, `Persistent=true`,
  `RandomizedDelaySec=30`, `WantedBy=timers.target`. Only paths/user/PATH differ
  from the shipped units; `deploy/production/**` is never written to.
- `WorkingDirectory` and `ExecStart` derive from the repo checkout resolved at
  runtime from the script's own location (`BASH_SOURCE` pattern, as
  `scripts/recording-cron.sh:21`); `ExecStart=<repo>/scripts/recording-cron.sh`;
  no `/opt/rexiAI` literal anywhere in the home script.
- Writes `/etc/rexi-recording.env` mode 0600 with exactly:
  `RECORDINGS_DIR=/home/dbueno/rexi-recordings` (live-verified: exists, session
  dirs present, owner dbueno, `~/docker-jitsi-meet/.env:269` sets the same value),
  `APP_BASE_URL=https://rexi-ai.com`, `MEETING_BASE_URL=https://meet.jit.si`
  (placeholder until the Task 5 guarded switch). Keys `STRIPE_SECRET_KEY`,
  `RECORDED_BILLING_TOKEN`, `GH_TOKEN`, `DASHSCOPE_API_KEY` are ABSENT
  (billing-disabled standing mode; gh uses the user keyring auth).
- Generated service carries `User=dbueno` and an `Environment=PATH=` line built
  at install time from `dirname $(command -v node)` (covers node + bl + vercel —
  live-verified all in `~/.nvm/versions/node/v24.21.0/bin`) plus `/usr/local/bin:
  /usr/bin:/bin` (ffmpeg, ffprobe, gh, tailscale live-verified in `/usr/bin`).
  No hardcoded nvm version string in the script source.
- Pre-flight: checks free GB on the `RECORDINGS_DIR` filesystem (`df`) against
  `REXI_MIN_FREE_GB` (default 20 — decision 5); below threshold → non-zero exit
  with a clear message BEFORE any file write or `systemctl` mutation.
- Installs + enables + starts the timer (`systemctl daemon-reload`, `enable --now
  rexi-recording.timer`), then triggers ONE immediate service run and verifies
  scan-cycle evidence in `journalctl -u rexi-recording.service` (the
  `[recording-cron]` line, `scripts/recording-cron.sh:37`, or the `Scanning`
  line, `scripts/recording/pipeline.mjs:228`). Success is declared only when
  evidence is found; otherwise non-zero exit with a journal tail. Stage-level
  failures (ASR 401 — expected until spec 006) do NOT fail verification.
- Idempotent: re-running is a no-op-safe update (overwrites the same targets,
  reloads, re-verifies); second run exits 0 (live-proven by AC-005-50).
- Never prints secret or env-file values; never invokes `vercel` or
  `switch-meeting-base-url.sh`; the only `MEETING_BASE_URL` it writes is
  `https://meet.jit.si`.

### Task 2 — Processor disk guard (Ask B)

Scenarios: `20-acceptance/AC-005-disk-guard.md` (AC-005-13 … AC-005-20)
Tests: `src/__tests__/AC-005-disk-guard.test.ts` (injectable-runner unit tests,
spec-004 harness)

Files: new `scripts/recording/disk.mjs`; edit `scripts/recording/pipeline.mjs`
(`scanAll` only).

Acceptance criteria:

- New zero-dep unit `scripts/recording/disk.mjs`: measures free GB on a
  directory's filesystem via `df` executed through the INJECTED runner
  (execFile-style `(cmd, args) → {stdout}` — the established contract), parses
  an integer GB figure, and returns a verdict
  (`ok | warn | skip`) against two thresholds read ONLY from the passed `env`
  object (never `process.env` — repo pattern, `scripts/recording/transcribe.mjs:36-41`):
  `REXI_MIN_FREE_GB` default 20, `REXI_HARD_MIN_FREE_GB` default 5.
- Wired into `scanAll` (`scripts/recording/pipeline.mjs:227`) after the
  recordings-root existence check and BEFORE any session dir is processed.
  Scan mode only: one-off (`--room/--recording`, `--jibri-dir`) never invokes it.
- Below soft min (free < `REXI_MIN_FREE_GB`), at/above hard floor → loud warning
  via `log.warn` naming free GB and the threshold; processing continues.
- Below hard floor (free < `REXI_HARD_MIN_FREE_GB`) → `log.error` with a clear
  per-run message; ZERO session dirs processed (no ffprobe calls); `scanAll`
  returns normally and `runCli --scan` still exits 0 (containment frozen).
- Boundaries are strict "below": free == 20 → silent; free == 5 → warn-only.
- df failure or unparseable output (incl. empty stdout) → loud
  "cannot determine free space" warning, processing CONTINUES (fail-open —
  decision 3; forced by the frozen 004 suite whose fake runners answer every
  unmatched command with empty stdout).
- `--dry-run --scan` applies the same guard verdicts (decision 6 — dry-run must
  report what a real run would do); no separate scenario pins it.
- Existing spec-004 scan tests pass UNMODIFIED (their `scanAll`/`runCli --scan`
  calls with `env: {}` hit the fail-open path; only extra warn lines appear, and
  no 004 assertion depends on log-line exactness or runner call-list exactness
  for scan — verified: the single `argvList(...).toEqual` is in the transcription
  unit test, which never reaches `scanAll`).

### Task 3 — Exposure path A: Tailscale Funnel script (Ask C) — see OPEN QUESTION

Scenarios: `20-acceptance/AC-005-expose-funnel.md` (AC-005-21 … AC-005-27)
Tests: `src/__tests__/AC-005-expose-funnel.test.ts` (PATH-shim + content assertions)

Files: new `deploy/home/expose-funnel.sh`.

Acceptance criteria:

- Pre-checks, in order, refusing before any configuration on failure: tailscale
  installed and up (`tailscale status`; node name reported — live-verified
  `pcdanimoudo-1`, tailnet `pucelano-95@`), funnel feature availability
  (live-verified: `tailscale funnel status` → "No serve config", i.e. first use).
- Detects the one-time owner-consent-pending state (funnel not enabled on the
  tailnet / consent required at the login server) and prints the manual browser
  step + the enable/consent URL from the CLI output — a distinct, clearly-worded
  stop, never a cryptic failure, never a retry loop.
- Configures serve/funnel so public HTTPS 443 on the funnel hostname proxies to
  the local Jitsi web at `http://127.0.0.1:8000` (backend live-verified:
  web container publishes `0.0.0.0:8000->8000`, HTTP 200).
- Media-transport check (OPEN QUESTION default (a)): inspects the live web
  container's rendered nginx config for a `/colibri-ws` proxy (`docker exec`
  against `/run/web/config/nginx/meet.conf` — path live-verified; nginx runs
  `-c /run/web/config/nginx/nginx.conf`). Absent (current reality; deprecated
  upstream #2285) → loud warning that the funnel carries web+signaling only and
  media needs path B's UDP 10000 forward or LAN/tailnet clients, then CONTINUES.
- Emits (prints; does NOT apply) the exact jitsi `.env` change
  `PUBLIC_URL=https://<funnel-hostname>` for `~/docker-jitsi-meet/.env` plus the
  restart-helper command; never rewrites the stack `.env` itself.
- Makes no change to docker-compose port mappings and stops/recreates no
  container itself; `https://host.docker.internal:8443` keeps serving (live
  re-check in AC-005-51).

### Task 4 — Exposure path B: DNS/port-forward truth-printer (Ask D)

Scenarios: `20-acceptance/AC-005-path-b-helper.md` (AC-005-28 … AC-005-32)
Tests: `src/__tests__/AC-005-path-b-helper.test.ts`

Files: new `deploy/home/expose-path-b.sh` (name — decision 7).

Acceptance criteria:

- A read-only "prints truth" script: performs NO mutation of any kind — no DNS
  provider API call, no `netsh` execution (it runs inside WSL and only PRINTS
  admin-PowerShell lines), no file writes beyond stdout.
- Fetches the current public IP at runtime (live lookup, e.g. an IP-echo HTTPS
  endpoint) and prints it with the exact GoDaddy record to create: type A, host
  `meet`, value = fetched IP (→ `meet.rexi-ai.com`; live-verified NXDOMAIN today),
  plus a DDNS caveat (residential IP, likely dynamic — re-run to refresh).
  No IP literal hardcoded in the source (79.117.136.26 is today's value only).
- Prints the router layer: forward `443/tcp` and `10000/udp` → the Windows host.
- Prints the Windows→WSL2 relay layer as exact admin-PowerShell lines:
  `netsh interface portproxy add v4tov4` for 443/tcp with the WSL2 IP resolved at
  runtime (`hostname -I` first address — live-verified 172.27.113.121), matching
  `New-NetFirewallRule` lines, and — for UDP 10000 — the truthful note that
  `netsh portproxy` is TCP-only, with the current WSL IP printed for the
  owner-chosen UDP path (mirrored networking or router→WSL direct) — decision 8.
- Prints the cert-strategy pointer for the jitsi web container: docker-jitsi-meet
  LE option (`ENABLE_LETSENCRYPT=1`, `LETSENCRYPT_DOMAIN`, `LETSENCRYPT_EMAIL` —
  live-verified in `~/docker-jitsi-meet/env.example:61-67`).

### Task 5 — Guarded prod switch (Ask E)

Scenarios: `20-acceptance/AC-005-prod-switch.md` (AC-005-33 … AC-005-39)
Tests: `src/__tests__/AC-005-prod-switch.test.ts` (PATH-shim ordering tests)

Files: new `deploy/home/switch-meeting-base-url.sh`.

Acceptance criteria:

- Usage: `switch-meeting-base-url.sh <public-url>`. Missing/empty arg → usage
  text, non-zero exit, ZERO external command invocations.
- Health gates, in this order, ALL passing before any Vercel mutation:
  1. TLS valid — `curl` WITHOUT `-k`/`--insecure` against the URL root succeeds;
  2. Jitsi web reachable — root returns HTTP 200;
  3. Probe room page loads — GET `<url>/rexi-probe-switch-check` returns HTTP 200
     with an HTML body (room name is a fixed non-persistent probe).
- Only after all three: `vercel env add MEETING_BASE_URL <url> production`,
  REPLACING an existing value (rm-then-add or `--force` — mechanism is the
  Coder's choice; observable contract: the final prod state carries exactly the
  new URL and an "already exists" condition never aborts the switch), then
  triggers a production redeploy via the `vercel` CLI, then prints the rollback
  command (restore previous value / remove the var + redeploy).
- Any failed gate → non-zero exit, message naming the failed gate, ZERO `vercel`
  invocations recorded (refusal-before-mutation, asserted on the shim call log),
  nothing printed as rollback/redeploy.
- Never invoked automatically: no executable call site in any repo `*.sh` other
  than itself; runbooks (Tasks 6, 7) state the owner executes it manually.
- External commands invoked by bare PATH-resolved name (shim contract, global
  constraints) so vitest can assert ordering without network.

### Task 6 — Home runbook (Ask C runbook + Ask D runbook + Ask G note)

Scenarios: `20-acceptance/AC-005-home-runbook.md` (AC-005-40 … AC-005-42)
Tests: `src/__tests__/AC-005-home-runbook.test.ts` (content assertions)

Files: new `deploy/home/README.md`.

Acceptance criteria:

- Documents prerequisites (WSL2 + systemd PID 1, `Linger=yes` — live-verified,
  passwordless sudo, running docker-jitsi-meet stack, node/bl/ffmpeg/ffprobe/gh
  present), install usage (`install-recording-host.sh`), what it installs
  (adapted units, 0600 env file, 5-min timer with `Persistent=true`), and the
  always-on caveat pointer.
- Exposure runbook: path A walkthrough incl. the one-time funnel owner consent as
  an explicit manual browser step; path B three-layer walkthrough (GoDaddy DNS →
  router forwards → Windows netsh/firewall) referencing `expose-path-b.sh`
  output; explicit statement that `switch-meeting-base-url.sh` is owner-executed
  manually and never run automatically by any script; pointer to the A-vs-B
  decision matrix in `docs/recording-pipeline.md`.
- Documents the harmless jibri finalize-placeholder SEVERE (live-verified in
  `docker-jitsi-meet-jibri-1` logs: `JibriServiceFinalizeCommandRunner.doFinalize
  … Failed to run finalize script` / `Cannot run program "/path/to/finalize"`),
  why it is harmless (processing is timer-scan-driven, e2e-proven through issue
  #75), and how to silence it: unset `JIBRI_FINALIZE_RECORDING_SCRIPT_PATH` in
  the local stack env and recreate the jibri container — marked as a host-side
  change, not a repo change.

### Task 7 — Pipeline docs rework (Ask F)

Scenarios: `20-acceptance/AC-005-pipeline-docs.md` (AC-005-43 … AC-005-47)
Tests: `src/__tests__/AC-005-pipeline-docs.test.ts` (content assertions)

Files: edit `docs/recording-pipeline.md`.

Acceptance criteria:

- Home-hosted-on-WSL becomes the PRIMARY deployment topology; the VPS route is
  kept but explicitly demoted to alternative (the existing §Production deployment
  VPS content survives, relabeled).
- Storage layout on this machine: recordings, `transcript.json`, and
  `customer-brief.md` under `RECORDINGS_DIR` (`/home/dbueno/rexi-recordings`);
  customer-insight issues in the PRIVATE repo (`RexiAI/rexiAI`).
- Always-on caveat: the machine must be powered on for meetings AND for the
  timer; `Persistent=true` catches up missed scans after downtime. Consent note:
  only `rexi-` prefixed rooms record (`mod_rexi_auto_record` boundary).
- Retention guidance: manual for now; measured ~3 MB/min; 821 GB free ≈ months of
  headroom; no automated deletion (`REXI_ARCHIVE_DIR` remains documented-but-
  unimplemented).
- Exposure decision matrix A vs B vs VPS, honest about the funnel media
  limitation (HTTPS-only proxy: web+signaling traverse; WebRTC media and the SCTP
  bridge channel need direct UDP 10000 reachability → path B forwards or
  LAN/tailnet clients; colibri-websocket deprecated upstream, #2285). The
  existing "Why not Cloudflare Tunnel / Tailscale Funnel" paragraph
  (`docs/recording-pipeline.md:263-267`) is updated to this current truth, not
  silently deleted.

### Task 8 — Sanctioned chores (Ask G, separate commit)

Scenarios: `20-acceptance/AC-005-gitignore.md` (AC-005-48)
Tests: `src/__tests__/AC-005-gitignore.test.ts`

Files: edit `.gitignore`.

Acceptance criteria:

- `.gitignore` gains a `runs.jsonl` entry (pipeline gate telemetry stays local —
  live-verified: `runs.jsonl` exists untracked at repo root, no `.gitignore`
  entry today). Committed as its own conventional commit (`chore:`), separate
  from feature commits, per Ask G.

### Task 9 — E2E live proofs + in-suite traceability guard (acceptance shape)

Scenarios: `20-acceptance/AC-005-e2e-journeys.md` (AC-005-49 … AC-005-52)
Journeys: `tests/e2e/home-timer-scan.e2e.ts`, `tests/e2e/funnel-consent-boundary.e2e.ts`,
`tests/e2e/switch-refusal.e2e.ts` (names pinned); guard:
`src/__tests__/AC-005-e2e-journeys.test.ts`.

Acceptance criteria (004 decision-③ pattern, `AC-004-e2e-journeys.test.ts`):

- Journeys are self-contained scripts executable by plain node with ZERO npm
  imports (004 D4 contract), picked up by the existing `e2e.config.ts` glob
  `tests/**/*.e2e.ts` (live-verified), and executed post-PR against THIS host by
  the e2e/arrangements stage — not by `npm test`.
- `*.e2e.ts` is invisible to `check-scenario-traceability.sh` (its include
  patterns cover `*.test.ts`/`*.spec.ts` only), so the in-suite guard test cites
  AC-005-49…52 and asserts each journey file exists and embeds its scenario IDs.
  The guard is pure file assertion — no Docker, no systemctl, no network, no
  vercel — keeping `npm test` green in a bare checkout.
- Journey coverage (live proofs; details in the scenario file): timer installed +
  first scan cycle in journalctl (ASR fail-contained tolerated); env file 0600 +
  no secret-looking dumps in the journal + idempotent re-run; funnel script
  reaches the owner-consent boundary with clear instructions and local `:8443`
  survives; switch refuses the NXDOMAIN `https://meet.rexi-ai.com` and Vercel
  production env is provably unchanged.

## Documented decisions (resolved by the Specifier, not open)

1. **Scenario IDs start at AC-005-06** — spec-001's per-task numbering owns
   AC-005-01…05 (archive headings + `AC-005-free-hour.test.ts` citations);
   first clean ID per the stage-1 instruction. `check-scenario-traceability.sh`
   resolves by exact ID against BOTH live specs and archives, so the legacy
   free-hour citations stay green while this spec is in flight and after it
   archives. Precedent: 002 → 05, 003 → 10, 004 → 20.
2. **Install pre-flight threshold reuses `REXI_MIN_FREE_GB` (default 20)** —
   the informal spec names no installer threshold; reusing the Task 2 knob keeps
   one vocabulary. Below it the installer refuses before mutating (refusal-
   before-mutation doctrine, same as Task 5).
3. **Disk guard fails OPEN (loud warning) when free space cannot be determined**
   (df throws or output unparseable, incl. empty stdout). Forced by the frozen
   004 suite: its fake runners answer every unmatched command with `{stdout:''}`
   (`recording-harness.ts:16-29`) and its scan tests call `scanAll`/`runCli
   --scan` directly (`AC-004-processor-rewiring.test.ts:290,335`) — a fail-closed
   guard would skip processing and redden frozen tests, which this spec may not
   modify. The informal spec leaves df-failure behavior unstated; a real
   disk-full still surfaces as contained per-dir write failures.
4. **Adapted units keep the shipped names** `rexi-recording.{service,timer}` —
   the VPS units are never installed on this machine (live-verified: no rexi
   units in `systemctl list-unit-files`), so no name collision exists, and the
   runbook/journalctl vocabulary matches the production docs.
5. **Env file carries exactly three keys** (RECORDINGS_DIR, APP_BASE_URL,
   MEETING_BASE_URL). No `DASHSCOPE_API_KEY`/`GH_TOKEN`: informal names gh's
   user-keyring auth explicitly and lists only these values; ASR is blocked
   provider-side until spec 006 anyway, and bl's host-level auth profile is out
   of this spec's scope. `bl`/`gh` under systemd run as dbueno with HOME set —
   live behavior proven by the e2e stage, not pinned here.
6. **`--dry-run --scan` applies the same guard verdicts** (plan-don't-mutate
   semantics, 004 decision 8: dry-run reports what a real run would do). No
   scenario pins it — deliberately untested surface, prune over invent.
7. **Path-B helper filename `deploy/home/expose-path-b.sh`** — the informal spec
   names no file; this parallels `expose-funnel.sh`.
8. **UDP 10000 relay truth**: `netsh interface portproxy` is TCP-only, so the
   helper prints exact portproxy+firewall lines for 443/tcp and, for UDP 10000,
   the firewall line + a truthful limitation note + the runtime WSL IP for the
   owner-chosen UDP path. Printing a non-working UDP portproxy line would
   violate the ask's own "scripts-that-print-truth" contract. Router/Windows
   changes stay owner-side (out of scope, informal §Out of scope).
9. **Switch probe room is a fixed literal** `rexi-probe-switch-check` — a
   non-persistent room name; loading its page proves the web app serves rooms at
   the public URL. It carries the `rexi-` prefix so, should a recording start,
   it lands in the same consent boundary as real bookings (no new exception).
10. **Funnel script prints, never applies, the `PUBLIC_URL` change** — informal
    says "emits the exact jitsi .env changes … with a restart helper"; applying
    stack-env edits automatically would risk the frozen local-`:8443` contract.
11. **Install first-scan verification accepts scan-cycle evidence, not stage
    success** — until spec 006 lands, ASR fails contained (expected per informal
    §Constraints); requiring a green chain would make the installer unpassable
    on this host by design.

## Traceability verification record (stage 1, pre-Coder)

Commands run from the repo root on 2026-10-22 (this spec's artifacts only change
`specs/**`; no test cites AC-005-06…52 yet — tests are the stage-2 Coder deliverable):

1. **Baseline, before writing any artifact:**
   `bash .standards/scripts/check-scenario-traceability.sh` → **exit 0**
   (`Scenario IDs found: 0 live, 143 archived` — every existing citation resolved).
2. **Post-write, check 2 (collision/dangling gate — the mechanical risk for this spec):**
   see the appended result below.
3. **Post-write, full run:** see the appended result below.

**Appended results (post-write, 2026-10-22):**

2. `bash .standards/scripts/check-scenario-traceability.sh --checks 2` → **exit 0**
   (`Scenario IDs found: 47 live, 143 archived`; `✔ every scenario traced, every
   reference resolves`). The legacy AC-005-01…05 citations in
   `src/__tests__/AC-005-free-hour.test.ts` still resolve via the 001 archive;
   nothing dangles; the new 06–52 range introduces no collision.
3. Full run → **exit 1 with exactly 47 FAIL lines, one per new ID AC-005-06…52**
   (all of kind `scenario defined … but no test references it`; the FAIL ID set
   diffs identical against `seq -f "AC-005-%02g" 6 52`), zero other violations,
   zero PASS lines. This is the structural stage-1 state: check 1 can only pass
   once the Coder's tests cite the IDs, which the stage-4 Verifier re-runs.
   Specs 002–004 were in the identical position at their stage 1.

## Acceptance scenarios

## AC-005-06 — Script contract: syntax, strict mode, no secret echoing
## AC-005-07 — Units are repo-derived; shipped VPS artifacts stay untouched
## AC-005-08 — Env file: exactly three home values, mode 0600, no secret keys
## AC-005-09 — Unit contract: dbueno, PATH to the tools, timer semantics preserved
## AC-005-10 — Disk pre-flight refuses before any mutation
## AC-005-11 — Install never touches prod config or the guarded switch
## AC-005-12 — First scan cycle is verified via journalctl before success
## AC-005-13 — Ample free space: silent, normal processing
## AC-005-14 — Below soft minimum: loud warning, processing continues
## AC-005-15 — Boundary: free space exactly at the soft minimum is not "below"
## AC-005-16 — Boundary: free space exactly at the hard floor warns but processes
## AC-005-17 — Below hard floor: whole run skipped, exit still contained
## AC-005-18 — Env overrides, read only from the passed env object
## AC-005-19 — Undeterminable free space fails open with a loud warning
## AC-005-20 — One-off modes never invoke the guard
## AC-005-21 — Script contract
## AC-005-22 — Pre-checks refuse before any configuration
## AC-005-23 — Consent-pending is detected and explained, not cryptic
## AC-005-24 — Funnel target: public HTTPS 443 → local Jitsi web :8000
## AC-005-25 — Media-transport check reports the colibri-ws reality loudly (OPEN QUESTION default (a))
## AC-005-26 — PUBLIC_URL change is emitted, never applied
## AC-005-27 — Local stack untouched
## AC-005-28 — Script contract
## AC-005-29 — DNS layer: live IP lookup, exact GoDaddy record, DDNS caveat
## AC-005-30 — Router layer: both forwards printed
## AC-005-31 — Windows→WSL2 relay: exact admin-PowerShell lines, runtime WSL IP, UDP truth
## AC-005-32 — Read-only truth-printer with cert-strategy pointer
## AC-005-33 — Usage validation: no argument, no action
## AC-005-34 — Happy path: all three gates pass, then and only then Vercel mutates
## AC-005-35 — TLS gate failure: refuse, change nothing
## AC-005-36 — Reachability gate failure: refuse, change nothing
## AC-005-37 — Probe-room gate failure: refuse, change nothing
## AC-005-38 — Existing variable is replaced, never an abort
## AC-005-39 — Never invoked automatically by any other script
## AC-005-40 — Install runbook
## AC-005-41 — Exposure runbook and the owner-executed switch
## AC-005-42 — Jibri finalize-placeholder SEVERE documented
## AC-005-43 — Home-hosted WSL is the primary deployment; VPS demoted
## AC-005-44 — Storage layout on this machine
## AC-005-45 — Always-on caveat and consent note
## AC-005-46 — Retention guidance
## AC-005-47 — Exposure decision matrix (A vs B vs VPS), funnel media truth
## AC-005-48 — runs.jsonl is ignored
## AC-005-49 — Timer installed, first scan cycle proven in the journal
## AC-005-50 — Env file permissions, journal secrecy, idempotent re-run
## AC-005-51 — Funnel script reaches the owner-consent boundary; local stack survives
## AC-005-52 — Switch refuses a dead URL and Vercel prod is provably unchanged

## Verification

# 25-verification.md — Spec 005: Home-hosted recording on this WSL machine

Stage 4 (Verifier) artifact. Attempt 1, phase 1 (no phase-1 or phase-2 retries yet).
Verified against `10-tasks.md` + `20-acceptance/` only. `00-informal.md` was not read.

Branch: `spec/005-home-hosted-recording`. Verdict: **PASS** (see §Design-principles
adjudication for one out-of-scope, non-blocking FAIL recorded per the Stop-and-Ask
matrix).

---

## Evidence: scenario traceability

command: bash .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-10-22T14:12:40Z

{
  "checks": [1, 2],
  "passes": ["AC-005-06 — traced to a test", "AC-005-07 — traced to a test", "AC-005-08 — traced to a test", "AC-005-09 — traced to a test", "AC-005-10 — traced to a test", "AC-005-11 — traced to a test", "AC-005-12 — traced to a test", "AC-005-13 — traced to a test", "AC-005-14 — traced to a test", "AC-005-15 — traced to a test", "AC-005-16 — traced to a test", "AC-005-17 — traced to a test", "AC-005-18 — traced to a test", "AC-005-19 — traced to a test", "AC-005-20 — traced to a test", "AC-005-21 — traced to a test", "AC-005-22 — traced to a test", "AC-005-23 — traced to a test", "AC-005-24 — traced to a test", "AC-005-25 — traced to a test", "AC-005-26 — traced to a test", "AC-005-27 — traced to a test", "AC-005-28 — traced to a test", "AC-005-29 — traced to a test", "AC-005-30 — traced to a test", "AC-005-31 — traced to a test", "AC-005-32 — traced to a test", "AC-005-33 — traced to a test", "AC-005-34 — traced to a test", "AC-005-35 — traced to a test", "AC-005-36 — traced to a test", "AC-005-37 — traced to a test", "AC-005-38 — traced to a test", "AC-005-39 — traced to a test", "AC-005-40 — traced to a test", "AC-005-41 — traced to a test", "AC-005-42 — traced to a test", "AC-005-43 — traced to a test", "AC-005-44 — traced to a test", "AC-005-45 — traced to a test", "AC-005-46 — traced to a test", "AC-005-47 — traced to a test", "AC-005-48 — traced to a test", "AC-005-49 — traced to a test", "AC-005-50 — traced to a test", "AC-005-51 — traced to a test", "AC-005-52 — traced to a test"],
  "fails": []
}

Result: 47/47 scenario IDs (AC-005-06 … AC-005-52) traced to a test, 0 fails, exit 0.
PASS.

---

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-22T14:12:40Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  47 passed (47)
      Tests  287 passed (287)
   Start at  16:11:01
   Duration  10.87s (environment 69%, tests 15%, setup 7%, transform 5%, import 3%, worker 1%)

Environment  jsdom was created 47 times · 69.51s total, 69% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

Result: 47 test files passed, 287 tests passed, exit 0. No skipped/disabled tests.
PASS.

---

## Evidence: complexity gate

command: npm run lint
exit: 0
at: 2026-10-22T14:12:40Z

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

Result: ESLint `complexity: ['error', 6]` (eslint.config.cjs:51) produced 0 errors
(no cyclomatic-complexity violations anywhere in the changed files), 10 `no-console`
warnings confined to the three Task-9 e2e journey files (journeys print to stdout by
design). Exit 0. PASS.

---

## Evidence: design-principles gate

command: bash .standards/scripts/check-code-principles.sh --json
exit: 1
at: 2026-10-22T14:12:40Z

{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [{ "message": "Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }],
  "warns": [{ "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "45" }, { "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "101" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "93" }, { "message": "Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75", "file": "./src/pages/Landing.tsx", "line": "13" }, { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22", "file": "./src/components/ServicesCarousel.tsx", "line": "32" }, { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79", "file": "./src/components/ServicesCarousel.tsx", "line": "54" }, { "message": "Method body >20 lines (node): ./api/bookings/recorded-billing.ts:222:244:?:KISS_LINES=24", "file": "./api/bookings/recorded-billing.ts", "line": "222" }, { "message": "Possible duplication (9x identical 4-line block, first at ./api/bookings/checkout.ts:26): date: string /startTime: string /hours: number /email: string", "file": "./api/bookings/checkout.ts", "line": "26" }, { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:304): startTime: string /hours: number /joinUrl?: string | null /date: string", "file": "./api/stripe-webhook.ts", "line": "304" }, { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:138): email: string /date: string /startTime: string /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "138" }, { "message": "Possible duplication (3x identical 4-line block, first at ./src/domain/microsoftGraph.ts:178): }) /if (!res.ok) { /const text = await res.text().catch(() => '') /headers: { Authorization: `Bearer ${token}` },", "file": "./src/domain/microsoftGraph.ts", "line": "178" }, { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: \"problem\", /docs: { /description: /meta: {", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "115" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:140): startTime: string /hours: number /amountTotal: number /date: string", "file": "./api/stripe-webhook.ts", "line": "140" }, { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "132" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:13): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {", "file": "./api/bookings.ts", "line": "13" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:116): .status(400) /.json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } }) /return false /res", "file": "./api/stripe-webhook.ts", "line": "116" }, { "message": "Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "133" }, { "message": "Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30", "file": "./.standards/ci/templates/archunit/OutboxArchRules.java", "line": "30" }, { "message": "Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33", "file": "./.standards/ci/templates/archunit/SagaArchRules.java", "line": "33" }, { "message": "SRP: possible god file (node) — ./api/stripe-webhook.ts: 621 lines, 14 methods (split by responsibility)", "file": "./api/stripe-webhook.ts", "line": "" }, { "message": "LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)", "file": "./src/domain/time.ts", "line": "" }]
}

### Design-principles adjudication (out-of-scope finding — non-blocking)

Raw gate exit code is 1, transcribed above verbatim. The single FAIL and all 22
WARNs are **out-of-scope** for this spec, independently confirmed:

- (a) The FAIL is genuinely in `.standards/`, not any spec-005 file:
  `./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10` —
  a pre-existing example file inside the standards submodule.
- (b) `.standards/` is untouched by this branch:
  `git diff --stat .standards/` → empty (exit 0);
  `git status --porcelain .standards/` → empty (exit 0). The file is committed in
  the submodule's own history (submodule HEAD `30bec2d`).
- (c) Every WARN file is either under `.standards/` or a pre-existing, untouched
  source file (`src/pages/Landing.tsx`, `src/components/ServicesCarousel.tsx`,
  `api/bookings/*`, `api/stripe-webhook.ts`, `src/domain/*`). The branch's only
  tracked modifications are `.gitignore`, `docs/recording-pipeline.md`,
  `scripts/recording/pipeline.mjs` — none of which appear in any FAIL/WARN line.

Per the Stop-and-Ask decision matrix ("Out-of-scope finding → record it; do not
fix; propose a follow-up"), this is recorded, not fixed, and does not stop the
pipeline: the spec-005 deliverable (all new + modified files) has **0 FAILs and
0 WARNs** under the design-principles gate.

- **Follow-up proposal:** lower the cyclomatic complexity of
  `.standards/skills/hallmark/site/examples/cobalt-01/script.js` (CC=10) in the
  standards repository itself — a change outside this spec's scope, and outside
  the child repo entirely.

PASS (spec-005 scope clean; 1 FAIL + 22 WARNs all out-of-scope/pre-existing).

---

## Evidence: scenario-to-behavior spot check

command: manual read — specs/005-home-hosted-recording/20-acceptance/AC-005-disk-guard.md + src/__tests__/AC-005-disk-guard.test.ts; specs/005-home-hosted-recording/20-acceptance/AC-005-prod-switch.md + src/__tests__/AC-005-prod-switch.test.ts
exit: 0 (no assertion mismatches found)
at: 2026-10-22T14:12:40Z

Verified the tests assert what their scenarios describe (not merely same-named passing tests):

- AC-005-13 (ample free space): scenario → no warning + processed==1; test asserts `r.processed===1`, warn/error logs absent. Match.
- AC-005-14 (below soft min): scenario → warn naming free GB + threshold, continues; test asserts `processed===1`, warn matches `/10 GB/` and `/REXI_MIN_FREE_GB=20|20 GB/`. Match.
- AC-005-17 (below hard floor): scenario → error naming GB + floor, processed==0, zero ffprobe, contained exit 0; test asserts err matches `/2 GB/` and `/REXI_HARD_MIN_FREE_GB=5|hard floor/i`, `processed===0`, `runCli --scan` exit 0, zero ffprobe calls. Match.
- AC-005-18 (env overrides only from passed env): scenario → warn + no `process.env` read; test asserts warn `/45 GB/` and `/REXI_MIN_FREE_GB=50/`, and disk.mjs source contains no `process.env` property access. Match.
- AC-005-19 (undeterminable fails open): scenario → loud warning + continues; test asserts `/cannot determine free space/i` + `processed===1` for throw, empty stdout, and garbage output. Match.
- AC-005-33 (usage validation): scenario → usage msg + non-zero + zero external calls; test asserts out contains `<public-url>`, code != 0, calls length 0. Match.
- AC-005-34 (happy path ordering): scenario → three gates in order, vercel only after all three, env add, redeploy, rollback printed; test asserts curls[0] no `-k/--insecure`, curls[1] `%{http_code}`, curls[2] probe URL, first vercel after last gate, `env add` contains MEETING_BASE_URL/URL/production, `deploy --prod`, rollback output. Match.
- AC-005-35 (TLS gate failure): scenario → non-zero, names TLS, zero vercel, no rollback; test asserts code != 0, `/TLS/i`, zero vercel calls, no rollback. Match.
- AC-005-36 (reachability failure): scenario → non-zero, names reachability, zero vercel; test asserts code != 0, `/reachab/i`, zero vercel. Match.
- AC-005-37 (probe-room failure): scenario → non-zero, names probe-room, zero vercel; test asserts code != 0, `/probe/i`, zero vercel for both non-200 and non-HTML. Match.
- AC-005-38 (existing var replaced): scenario → replace path, exit 0, no abort; test asserts code 0, `env add` contains `--force` + URL, deploy --prod ran. Match.

Result: spot check passed — the tests genuinely assert their scenarios' Given/When/Then behavior.
PASS.

---

## No unaccounted behavior

Skimmed the full diff. Every changed/added file traces to a task or is pipeline scratch:

- `.gitignore` (+`runs.jsonl`) → Task 8.
- `docs/recording-pipeline.md` → Task 7.
- `scripts/recording/pipeline.mjs` (+disk-guard wiring in `scanAll` only) → Task 2.
- `scripts/recording/disk.mjs` (new) → Task 2.
- `deploy/home/{install-recording-host.sh,expose-funnel.sh,expose-path-b.sh,switch-meeting-base-url.sh,README.md}` → Tasks 1, 3, 4, 5, 6.
- `src/__tests__/AC-005-*.test.ts` (9 files) → acceptance tests per task topics.
- `src/__tests__/shell-harness.ts` → test helper for PATH-shim shell tests (legitimate).
- `tests/e2e/{home-timer-scan,funnel-consent-boundary,switch-refusal}.e2e.ts` → Task 9 journeys (names pinned in 10-tasks.md).
- `specs/` → pipeline scratch.

No logic found that does not trace back to a task or scenario.

---

## Overall verdict

**PASS** — every Verifier check ran and produced no in-scope findings:

| Check | Result | Exit |
|---|---|---|
| scenario traceability | PASS | 0 |
| full test suite | PASS (287/287) | 0 |
| complexity gate | PASS (0 errors) | 0 |
| design-principles gate | PASS for spec-005 scope; 1 out-of-scope FAIL + 22 out-of-scope WARNs recorded | 1 (raw, out-of-scope) |
| scenario-to-behavior spot check | PASS | n/a |
| no unaccounted behavior | clean | n/a |

Architect may proceed. The single design-principles FAIL is a pre-existing
`CC=10` in the standards submodule's hallmark example (`.standards/` untouched by
this branch), recorded per the Stop-and-Ask matrix as an out-of-scope finding with
a follow-up proposal — it is not a defect in the spec-005 deliverable and routes
to neither the Coder nor the Refactorer.

## Quality gates

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

PR: https://github.com/RexiAI/rexiAI/pull/76
Commits: 12
