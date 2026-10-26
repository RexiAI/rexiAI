# Home-hosted recording (`deploy/home/`) — runbook

Spec 005: the recording→transcription→insights pipeline runs on **this WSL2
machine** — no VPS. These scripts adapt the shipped production units and
exposure docs to the home topology. The full architecture lives in
`docs/recording-pipeline.md` (home-hosted is now the PRIMARY topology; the VPS
route is the documented alternative).

## Prerequisites (verified state of this host)

- WSL2 with **systemd as PID 1** (`/etc/wsl.conf` `[boot] systemd=true`).
- `Linger=yes` for `dbueno` (`loginctl show-user dbueno | grep Linger`) so
  timers survive logout.
- Passwordless sudo for `dbueno` (the installer writes `/etc` files).
- The `docker-jitsi-meet` stack running from `~/docker-jitsi-meet`
  (web on `:8000`/`:8443`, jibri recording into
  `/home/dbueno/rexi-recordings` via the stack env's `RECORDINGS_DIR`).
- Tools on PATH for the `dbueno` user: `node` (nvm), `bl` (Bailian CLI — uses
  the host auth profile, no env key), `ffmpeg`, `ffprobe`, `gh` (keyring auth
  via `gh auth login`, no env token).

## Install — `install-recording-host.sh`

```bash
./deploy/home/install-recording-host.sh
```

What it does (idempotent — safe to re-run; a second run exits 0):

1. **Disk pre-flight** — refuses (before any mutation) when the recordings
   filesystem has less than `REXI_MIN_FREE_GB` (default 20) GB free.
2. **`/etc/rexi-recording.env`** — mode **0600**, exactly three keys:
   `RECORDINGS_DIR=/home/dbueno/rexi-recordings`,
   `APP_BASE_URL=https://rexi-ai.com`,
   `MEETING_BASE_URL=https://meet.jit.si` (placeholder until the guarded
   switch below). No secret values live in this file.
3. **Adapted systemd units** — `rexi-recording.service` + `rexi-recording.timer`
   written to `/etc/systemd/system/` with the same unit names and the same
   timer semantics as the shipped VPS artifacts (`OnBootSec=2min`,
   `OnUnitActiveSec=5min`, `Persistent=true`, `RandomizedDelaySec=30`), but
   `WorkingDirectory`/`ExecStart` derived from this repo checkout,
   `User=dbueno`, and an install-time `PATH` pointing at the real tool
   directory. The shipped units under `deploy/production/` are never modified.
4. **Enable + verify** — the timer is enabled, ONE immediate run is triggered,
   and success is declared only when a scan cycle appears in
   `journalctl -u rexi-recording.service` (the `[recording-cron]` line or the
   `Scanning` line). **Stage failures inside the scan — the ASR 401 until
   spec 006's whisper fallback lands — do NOT fail the install**: the
   criterion is scan-cycle evidence, not stage success.

**Always-on caveat:** the machine must be powered on both to host meetings and
to run the timer; `Persistent=true` catches up missed scans after downtime.
Details: `docs/recording-pipeline.md`.

## The recording bot — `rexi-recording-bot*.{service,timer}`

The processor above only bills recordings that already exist. The **bot** is what
makes one exist: it joins the booked room as a participant and records it.

Three units ship in this directory. Install them after the processor's:

```bash
sudo install -m 644 deploy/home/rexi-recording-bot.service \
  deploy/home/rexi-recording-bot.timer \
  deploy/home/rexi-recording-bot-watch.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rexi-recording-bot.timer rexi-recording-bot-watch.service
```

| Unit                                                      | Mode                        | What it does                                                                                                                                                                    |
| --------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rexi-recording-bot-watch.service`                        | `Type=simple` (always on)   | Follows the schedule file and, for each live booked window, joins the room and records once two non-bot humans are present.                                                     |
| `rexi-recording-bot.timer` → `rexi-recording-bot.service` | `Type=oneshot`, every 5 min | Compares elapsed booked windows against `RECORDINGS_DIR` and writes a durable `.<room>.rexi-missed` record for each room that produced no recording ("the machine was asleep"). |

Both resolve node through `scripts/recording-bot-cron.sh`, read
`RECORDINGS_DIR`/`MEETING_BASE_URL` from `/etc/rexi-recording.env` (one shared
knob, no second config file), and write nothing into `RECORDINGS_DIR` until a
capture has stopped and been finalized.

**Schedule file** (`BOT_SCHEDULE_FILE`, default
`~/.rexi-recording-bot/schedule.json`) — the bot cannot be woken from outside
(carrier NAT), so it reads its windows from here:

```json
[{ "room": "rexi-0123456789abcdef", "startsAt": "2026-10-26T16:00:00Z", "hours": 1 }]
```

`startsAt` must already be an instant: the booking's wall time (`date` +
`start_time` in `AVAILABILITY_TIMEZONE`) is resolved by whoever writes this file
— the booking side, which owns that timezone setting — so the bot stays
timezone-free. An ad-hoc meeting needs no file at all:
`scripts/recording-bot-cron.sh --watch --room rexi-<16hex>`.

**Host requirements**, all pre-installed on this machine: a Chrome/Chromium
binary (`BOT_CHROME_PATH`, else system Chrome, else a Playwright build under
`~/.cache/ms-playwright`), `pulseaudio`+`pactl`, and `ffmpeg`/`ffprobe`. A
missing browser or sound server is a loud failure in the journal — never a
silently empty recording.

**meet.jit.si caveat:** a room there now requires a signed-in moderator to
start ("The conference has not yet started because no moderators have yet
arrived"). The bot never starts a conference — it joins rooms the booked humans
have already opened — but a booking whose client never opens the room produces
no recording, and the missed-meeting timer reports it.

## Exposure — two paths, one decision

`docs/recording-pipeline.md` carries the full **A-vs-B decision matrix**.
Summary:

### Path A — Tailscale Funnel (`expose-funnel.sh`)

Zero router/DNS work, valid Let's Encrypt TLS on the `ts.net` hostname — but
**funnel is HTTPS-only proxying**: the web page and XMPP signaling traverse,
**media does not** (upstream Jitsi removed colibri-websocket; see the loud
banner the script prints). Useful for your own tailnet-internal devices and
page+signaling access, **not** for customer meetings with media.

The script never changes anything: it prints the exact `PUBLIC_URL` edit and
restart command for `~/docker-jitsi-meet/.env` and stops at the one-time
**owner consent** boundary if the tailnet has not enabled Funnel — completing
that step is a **manual browser action by the tailnet owner** (the URL is
surfaced from the CLI output). Exit status 3 at that boundary is the expected
first-use outcome, not a failure.

### Path B — `meet.rexi-ai.com` → this machine (`expose-path-b.sh`)

**Path B is the customer-meeting-capable path**: it is the only exposure that
gives external clients the direct UDP 10000 reachability WebRTC media needs.
Three owner-side layers, each printed verbatim by the helper (which itself
executes nothing):

1. **GoDaddy DNS** — an A record `meet → <live public IP>` (fetched at
   runtime; residential IP is dynamic — re-run or add DDNS).
2. **Router port-forwards** — `443/tcp` and `10000/udp` to the Windows host.
3. **Windows → WSL2 relay** — admin PowerShell `netsh interface portproxy`
   (TCP-only, truthfully noted) + firewall rules for 443; UDP 10000 needs
   **WSL2 mirrored networking** (`networkingMode=mirrored` in `.wslconfig`)
   or a router-forward direct to the current WSL IP.

Then the stack's Let's Encrypt option (`ENABLE_LETSENCRYPT=1`,
`LETSENCRYPT_DOMAIN=meet.rexi-ai.com`) gives the web container a real cert.

### After exposure: the prod switch

```bash
# OWNER-EXECUTED, MANUALLY — this script is never run automatically by any
# script or timer in the repo (the installer and both exposure helpers never
# touch Vercel):
./deploy/home/switch-meeting-base-url.sh https://<final-public-url>
```

It health-gates the URL first (TLS validity without `-k`, web root 200, and
the probe room page `rexi-probe-switch-check` loading HTML), and only when all
three gates pass does it replace the Vercel production `MEETING_BASE_URL`
(`--force` overwrite — an existing value is replaced, never an abort) and
trigger a production redeploy. Any failed gate changes nothing at all.
Until it is run, production keeps the `https://meet.jit.si` default.

## Troubleshooting

### jibri logs `SEVERE … Failed to run finalize script` / `Cannot run program "/path/to/finalize"`

This is the **known harmless placeholder**: the stack env sets
`JIBRI_FINALIZE_RECORDING_SCRIPT_PATH=/path/to/finalize` (a docker-jitsi-meet
default that points nowhere). Recording processing is driven by the **timer
scan**, not by the finalize hook — proven end to end (issue #75) — so the
SEVERE costs nothing but log noise.

To silence it (a **host-side change, not a repo change**): unset
`JIBRI_FINALIZE_RECORDING_SCRIPT_PATH` in `~/docker-jitsi-meet/.env` and
recreate the jibri container (`docker compose up -d --force-recreate jibri`).
