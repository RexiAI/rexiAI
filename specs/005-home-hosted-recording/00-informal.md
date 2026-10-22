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
