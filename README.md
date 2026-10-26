# RexiAI — Landing + Booking

React 19 + Vite + TypeScript SPA on Vercel with serverless booking APIs.

## Env setup

1. Copy `.env.example` to `.env` and fill values.
2. Required vars:
   - `STRIPE_SECRET_KEY` — Stripe test/live secret
   - `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard → Developers → Webhooks → endpoint `https://<your-domain>/api/stripe-webhook`
   - `MICROSOFT_CLIENT_ID` — Entra app registration (personal-accounts enabled)
   - `MICROSOFT_CLIENT_SECRET` — required: the app is a confidential (Web) client
   - `MICROSOFT_REFRESH_TOKEN` — from the one-time consent flow (see `.env.example`)
   - `RESEND_API_KEY` — Resend API key for operator emails
   - `EMAIL_FROM` — sender address (Godaddy mailbox, e.g. `info@rexi-ai.com`)
   - `EMAIL_TO` — operator inbox
   - `MEETING_BASE_URL` — Jitsi base for meeting links. **Unset falls back to
     the public `https://meet.jit.si`, where nothing is recorded** — the room
     then lives on a server you do not own. Set it to your self-hosted
     instance for any booking that must be recorded.

   Calendar + meetings run on Microsoft Graph (delegated) against the personal
   hotmail account (`buenopachecodani@hotmail.es`); email runs on Resend against
   the Godaddy mailbox. They are deliberately separate.

3. Add same vars to Vercel project env (Dashboard → Settings → Environment Variables).

## Availability

Edit `config/availability.yaml` — weekly windows + per-date exceptions. Redeploy after edits. Timezone must remain `Europe/Madrid`.

## Local dev

```
npm install
npm run dev
```

APIs run as Vercel functions under `api/` (GET /api/availability, POST /api/bookings, POST /api/stripe-webhook).

Locally they need a plain-Node host — `vite dev` serves only the SPA and
proxies `/api/*` to port 3000:

```
npx -y tsx scripts/dev-api-server.mjs     # terminal A — loads .env, :3000
npm run dev                               # terminal B — :5173
```

## Recording pipeline (self-hosted Jitsi)

Meetings are Jitsi rooms named `rexi-<hex>`, minted from `MEETING_BASE_URL`
(`src/domain/meeting.ts`). A room whose name starts with `rexi-` is
auto-recorded: `mod_rexi_auto_record` promotes the first human occupant to
moderator and asks Jicofo for a Jibri file recording. The `rexi-` prefix is the
consent boundary — no other room name ever reaches the recording path.

```
booking → join link → Jitsi room (rexi-<hex>) → Jibri records MP4
   → scripts/recording-cron.sh (systemd timer, every 5 min)
   → ffprobe → recording→reservation billing (billing-enabled only)
   → ffmpeg audio → faster-whisper transcript → ollama customer brief
   → GitHub issue
```

Full architecture and status: `docs/recording-pipeline.md`. Host install and
exposure paths: `deploy/home/README.md`.

### Hosting reality — this line cannot accept inbound connections

Measured, not assumed. The connection is behind carrier-grade NAT:

- the router's own WAN address is in `10.0.9.x` (traceroute hop 2 is `10.0.9.112`, a _private_ next hop)
- the public egress `79.116.220.40` reverse-resolves to `digimobil.es` and is shared
- four independent external vantage points cannot reach a forwarded port; inbound IPv6 is firewalled too (tested from a phone on mobile data)
- the forwarding rules on the router are correct and carry nothing — there is no inbound path to this machine

So self-hosted Jitsi is a **test-only** topology. What replaced it (spec 006):

| Piece              | Reality                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Client-facing link | `https://meet.rexi-ai.com/rexi-<hex>?lang=es\|en` — branded host. **DNS and hosting for that host are not deployed yet** |
| The call           | `meet.jit.si` — public, valid cert, needs no inbound                                                                     |
| Recording          | local bot, outbound only: joins the room, records once two **non-bot** humans are present                                |
| Processor          | `rexi-recording.timer` scans `~/rexi-recordings` exactly as before                                                       |

`MEETING_BASE_URL` must be the branded host. Since spec 006 it **fails loud**
when unset instead of silently falling back to public Jitsi — that silent
fallback is what produced unrecorded meetings.

### Local stack (test only)

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep jitsi      # 5 containers
curl -k -sS -o /dev/null -w '%{http_code}\n' https://localhost:8443/   # 200
```

`jibri` is defined in the third compose file, so start _and_ stop with all three
— a plain `docker compose up -d` leaves it on stale env:

```bash
cd ~/docker-jitsi-meet && docker compose \
  -f docker-compose.yml -f jibri.yml \
  -f /home/dbueno/projects/rexiAI/deploy/production/docker-compose.recordings.yml \
  up -d --force-recreate jibri
# tear down with the same three files and `down`
```

Joining a `rexi-*` room on this stack records with Jibri; the processor picks the
MP4 up on its next scan:

```bash
systemctl start rexi-recording.service
journalctl -u rexi-recording.service --since '10 min ago' | tail -40
```

Expect `duration: N min | audio stream: yes`, then `.rexi-transcribed`,
`transcript.json`, `customer-brief.md`, `.rexi-analyzed` and a GitHub issue.
`Unattributed recording … billing skipped` is correct while `BILLING_ENABLED=false`
— transcription and insight do not depend on Stripe.

This proves the local pipeline. It does **not** prove the client path: that needs
the branded host from spec 006, which is not deployed yet.

| Symptom                | First thing to check                                                           |
| ---------------------- | ------------------------------------------------------------------------------ |
| Page loads, call fails | JVB media: `docker logs docker-jitsi-meet-jvb-1 \| grep -i candidate`          |
| Jibri never starts     | `docker logs docker-jitsi-meet-jicofo-1 \| grep -i 'Accepted jibri'`           |
| MP4 is silent          | Processor prints `audio stream: no` — Jibri's Chrome never played remote audio |

### Rollback of a topology change

`.env` backups are written beside each file as `.env.bak-rexi-<timestamp>`
(both the app `.env` and `~/docker-jitsi-meet/.env`). Restore, then recreate the
containers with the three-file compose command above.
