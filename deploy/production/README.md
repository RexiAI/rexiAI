# Production deployment — RexiAI Jitsi + Jibri + recording→billing

## Topology (two boxes, both cheap)

```
                         ┌────────────────────────────────────────────┐
  customer browser ─────▶│ VPS (Docker): docker-jitsi-meet            │  meet.rexi-ai.com
   (WebRTC UDP 10000)    │   web, prosody, jicofo, jvb, jibri         │  A → VPS public IP
                         │   └─ recordings → ~/.jitsi-meet-cfg/…      │
                         │ rexi-recording.timer (host) or sidecar      │  reads recordings,
                         └───────────────┬─────────────────────────────┘  POSTs below
                                          │ https
                                          ▼
   customer browser ─────▶  Vercel: api/bookings/*  (Stripe, Resend)     rexi-ai.com
```

- **VPS** (Hetzner CX22 ≈ €4–8/mo, ≥4 GB RAM — Jibri records in a containerised Chrome):
  runs Jitsi + Jibri + the **recording processor** (host timer or sidecar).
- **Vercel**: the existing SPA + serverless `api/` (Stripe, Resend, Graph, booking).
- Processor is the bridge: Jibri MP4 → ffprobe → room→reservation → `POST /api/bookings/recorded-billing` → payment link (emailed by the endpoint).

> Why a separate box / why not all serverless: the processor must read Jibri's
> files + run ffprobe + be triggered on Jibri's schedule — none of which a Vercel
> function can do. See `docs/recording-pipeline.md`.

## One-time VPS setup

```bash
ssh root@VPS
git clone <deploy repo or scp deploy/production> ; cd deploy/production
bash setup-jitsi-host.sh \
     --domain meet.rexi-ai.com \
     --email you@rexi-ai.com \
     --repo git@github.com:RexiAI/<app>.git \
     --public-ip 203.0.113.10
```

Installs Docker + compose plugin, `node` (for the timer path) + `ffmpeg`, ensures ≥6 GB
effective RAM (adds a 4 GB swapfile if short), opens **80, 443, 4443/tcp + 10000/udp** in
ufw, clones `docker-jitsi-meet` (→ `/opt/docker-jitsi-meet`) and the RexiAI app (→ `/opt/rexiAI`).
**Cloud security group must also open the same ports** (ufw alone isn't enough on a cloud VM).

## Deploy / update (re-runnable)

```bash
# once as the deploy user, after filling secrets:
sudo tee /etc/rexi-recording.env >/dev/null <<'EOF'   # mode 0600, edit values
APP_BASE_URL=https://rexi-ai.com
MEETING_BASE_URL=https://meet.rexi-ai.com
STRIPE_SECRET_KEY=sk_live_…
RECORDED_BILLING_TOKEN=$(openssl rand -hex 32)       # must match the Vercel env
EOF
sudo chmod 600 /etc/rexi-recording.env

bash deploy-jitsi.sh --domain meet.rexi-ai.com --public-ip 203.0.113.10 --email you@rexi-ai.com \
     --app-base-url https://rexi-ai.com
```

It renders `.env` (only if absent) from `jitsi.env.example`, generates XMPP passwords,
starts the stack + Jibri, installs + starts `rexi-recording.timer`, then prints verification.
Idempotent: re-run after `git pull` in `/opt/rexiAI` to update the processor or images.

## Trigger — two ways (pick one)

- **Host systemd timer (default):** `rexi-recording.service` + `.timer` → `recording-cron.sh`
  → `process-recording.mjs --scan` every 5 min. `Persistent=true` catches up after downtime.
  Idempotent (writes `.rexi-billed` markers; the endpoint itself is not idempotent, so the
  marker is the guard). The processor is dependency-free node + the system ffprobe.
- **Docker sidecar (alternative):** `docker-compose.recording.yml` (Dockerfile in
  `recording-processor/`) mounts the recordings dir + runs the scan loop in a container — no
  host cron. Use if you prefer everything in Docker.
- A `jibri-finalize.sh` stub is included for the in-container finalize hook, but the hook can't
  reach the host on a plain bridge — it's documented, not the default.

## Let's Encrypt / TLS

`jitsi.env.example` ships with `ENABLE_LETSENCRYPT=1` + `LETSENCRYPT_USE_STAGING=1` so the
first run can't hit the 5-per-week prod limit. Confirm a cert was issued in
`~/.jitsi-meet-cfg/web/letsencrypt/`, then set `LETSENCRYPT_USE_STAGING=0` and `docker compose
-f docker-compose.yml -f jibri.yml up -d web`. Ports 80+443 must be reachable for the challenge.

## Media / reachability (the part that broke locally)

- JVB advertises **`JVB_ADVERTISE_IPS=<VPS public IP>`** so both browsers and Jibri's in-container
  Chrome reach the media. Locally that used `127.0.0.1`/`host.docker.internal` — **do not copy the
  local `.env` to prod.**
- **4443/tcp** = ICE-TCP fallback for clients that can't UDP; **10000/udp** = the media port.
- Tunnels (Cloudflare/Tailscale Funnel) proxy TCP/HTTPS only → they do NOT carry the UDP media.
  A public VPS with UDP open is the simple correct answer. For very restrictive client networks,
  add a TURN (see `jitsi.env.example`).

## Verify

```bash
bash verify-jitsi.sh --domain meet.rexi-ai.com
journalctl -u rexi-recording.service -f        # processor runs
docker compose -f docker-compose.yml -f jibri.yml logs -f jibri   # recording session
```

## Rollback / update

- Update Jitsi images: `cd /opt/docker-jitsi-meet && git pull && docker compose -f docker-compose.yml -f jibri.yml pull && docker compose -f docker-compose.yml -f jibri.yml up -d`.
- Update the processor: `cd /opt/rexiAI && git pull && systemctl restart rexi-recording.service`.
- Full stop: `docker compose -f docker-compose.yml -f jibri.yml down`.

## Secrets checklist (never committed — this dir only has *.example)

| Where                            | Keys                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/etc/rexi-recording.env` (0600) | `STRIPE_SECRET_KEY`, `RECORDED_BILLING_TOKEN`, `APP_BASE_URL`, `MEETING_BASE_URL`                             |
| docker-jitsi-meet `.env`         | the six XMPP passwords (`./gen-passwords.sh`)                                                                 |
| Vercel                           | `STRIPE_SECRET_KEY`(live), `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RECORDED_BILLING_TOKEN`, `MICROSOFT_*` |
| Resend dashboard                 | verify `rexi-ai.com` → set `EMAIL_FROM` to a verified sender (else customer/payment emails are refused)       |

> The processor never stores the `checkoutUrl` beyond the billing response; the
> `recorded-billing` endpoint emails it to the customer. Until a Resend verified
> domain is set, that email fails best-effort and the charge still stands (the
> link is printed in the service log for manual sending).
