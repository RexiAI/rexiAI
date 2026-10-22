# Recording → Billing Pipeline

How a finished Jibri meeting recording becomes a pro-rata charge, and why one
piece of it cannot be a serverless function.

## The chain

```
Jitsi meeting (room rexi-<hex>)
   └─ Jibri records → MP4 on the Jitsi host
        ~/.jitsi-meet-cfg/storage/jibri/recordings/<session>/….mp4
   └─ scripts/process-recording.mjs  (HOST-SIDE worker — see "Backend" below)
        1. ffprobe the MP4 → actualMinutes (ceil)
        2. room → Stripe reservation session (metadata.join_url contains the room)
           → bookingId (= session.id) + email
        3. POST /api/bookings/recorded-billing  { bookingId, email, actualMinutes }
           (Bearer RECORDED_BILLING_TOKEN)
   └─ api/bookings/recorded-billing.ts  (serverless)
        bounds the charge to quotedHours*60 + 15min grace, applies the free hour,
        creates a Stripe Checkout session for the pro-rata amount
        → returns { amountCents, billableMinutes, checkoutUrl }
   └─ deliver checkoutUrl to the customer (Resend email — final wiring step)
```

The booking itself is a **€0 reservation** (`api/bookings/checkout.ts`); the only
charge is the recorded-billing one after the meeting. Bookings are Stripe
Checkout Sessions — there is no separate database.

## Running the processor

```bash
# Explicit (most reliable for testing) — room from the booking's join_url:
node scripts/process-recording.mjs --room rexi-<hex> --recording <mp4-or-dir> [--dry-run]

# Sweep all unprocessed recordings (cron/manual); skips ones already billed:
node scripts/process-recording.mjs --scan [--dry-run]

# Jibri finalize-script hook (auto, per recording):
node scripts/process-recording.mjs --jibri-dir <recording_dir>
```

`--dry-run` ffprobes + resolves the reservation but does **not** call billing —
and (spec 004) plans the whole chain WITHOUT mutating anything: no POST, no
`bl`/`gh` call, no files, no markers (decision 8: one meaning — plan, don't
mutate).

Env (from `.env`): `STRIPE_SECRET_KEY`, `RECORDED_BILLING_TOKEN`,
`APP_BASE_URL` (where `api/` is served — `vercel dev` → `http://localhost:3000`,
or the deployed URL), optional `RECORDINGS_DIR`; plus the spec-004 insight-chain
tools: `DASHSCOPE_API_KEY` (bl ASR/LLM auth — env, never argv), `GH_TOKEN` /
`GITHUB_TOKEN` (gh issue delivery — env, never argv), `REXI_ASR_LANGUAGE`
(ASR language hint, default `es`). The scan directory always comes from the
`RECORDINGS_DIR` env/flag — never hardcoded.

**Idempotency:** `recorded-billing` creates a new Checkout session per call (it
is not idempotent), so the processor writes a `.rexi-billed` marker beside each
processed recording and `--scan` skips marked ones. Prefer the Jibri
finalize-hook (fires exactly once per recording) over polling.

### The insight chain (spec 004)

Every finished recording also becomes a customer insight. Per session directory
the stages are:

```
Jibri MP4(s)
  ├─ BILLING (optional)        marker .rexi-billed      — unchanged contract (chain above)
  ├─ TRANSCRIPTION             marker .rexi-transcribed — audio extraction of ALL session
  │     mp4s in chronological order (Jibri <room>_<YYYY-MM-DD-HH-MM-SS>.mp4 naming;
  │     resumed meetings concatenate in true order) → ffmpeg -vn → audio.wav →
  │     `bl speech recognize --url audio.wav --diarization --language es --out
  │     transcript.json` (Spanish-primary hint via REXI_ASR_LANGUAGE, default es)
  └─ INSIGHT + DELIVERY        marker .rexi-analyzed    — transcript.json → `bl text chat`
        → customer-brief.md (fixed skeleton — Requirements, Pain points, Decisions,
        Commitments, Next steps, always all present) → GitHub issue delivery into
        RexiAI/rexiAI labeled `customer-insight`, idempotent via search-before-create
        (open AND closed issues whose title contains the room suppress creation) —
        the issue body carries the brief + the transcript path + the recording
        (session-dir) path. `.rexi-analyzed` is written only after the brief AND
        the delivery both succeed.
```

**The three markers are independent.** Each stage skips only its own marker: a
directory that already has `.rexi-billed` is still transcribed and analyzed; a
failed stage leaves no marker, so the next scan retries exactly that stage.
`MAX_MINUTES` (480) gates the **billing** stage only — a long recording still
transcribes and analyzes (the ceiling protects charge integrity, not insight
quality).

**Transcription and insight never depend on Stripe.** The stages are Stripe-free
end to end: no attribution, no reservation, no `STRIPE_SECRET_KEY` required — with billing credentials absent
the billing stage skips with a clear fail-closed log (never a POST), and the
recording is processed fully. An unattributed recording still produces
`transcript.json` + `customer-brief.md` + the insight issue; its booking-context
section states the recording is unattributed (an email is never fabricated).

**Auto-record:** booking rooms (`rexi-<hex>`) start recording by themselves —
`deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua` fires the
Jibri start for the first human occupant of any room whose name starts with
`REXI_AUTO_RECORD_PREFIX` (default `rexi-`). No human UI action is required;
non-prefixed rooms never reach the recording-start path (consent boundary).

### Trigger — per-directory containment

`--scan` processes every session directory inside its own try/catch: one broken
recording (unreadable mp4, failed `bl`, failed `gh`) is logged with its path,
counted in the run's failure summary, and left unmarked for the next scan — the
sweep itself exits 0 (decision 13). Only an unreadable recordings root is fatal.

## Does this web need a backend?

**The web app already has one, and it is the right kind.** `api/*.ts` are Vercel
serverless functions covering everything request-driven: availability, booking
checkout, calendar sync, the Stripe webhook, and recorded-billing. Stripe is the
system of record. For the booking/billing/calendar/email flows there is **no need
for a traditional always-on server** — adding one would be YAGNI and a step back
from a clean serverless model.

**The recording pipeline is the one thing serverless cannot do**, for three
structural reasons:

| Serverless constraint          | Why recording breaks it                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Request-driven                 | A recording finishes on **Jibri's** schedule (a file appears), not on an inbound HTTP request. Nothing invokes a function when Jibri is done. |
| Ephemeral, isolated filesystem | The MP4 lives on the **Jitsi host's** disk. A Vercel function cannot see it.                                                                  |
| No arbitrary host binaries     | Measuring duration needs **ffprobe** on the Jitsi host.                                                                                       |

So the recording→billing bridge must run **on the Jitsi host**, co-located with
Jibri + the recordings + ffprobe. That is `scripts/process-recording.mjs`.

**But "host-side worker" ≠ "the web needs a backend server."** It is a small
**batch/job runner**, not a web backend:

- It can be a **cron job / systemd timer** (`--scan` every few minutes) — no
  daemon, no new framework, no new database.
- Or Jibri's **`finalize-script`** can trigger it once per recording (the
  in-container hook pings the host worker, because the worker needs Node +
  `stripe` + `.env` that the Jibri container does not have).
- It calls the **existing** serverless `recorded-billing` endpoint over HTTPS.

### Recommended topology

> **Spec-005 status:** the recommended topology below is realized today with
> the "Jitsi host" being the home WSL2 box (PRIMARY, see §Deployment topology)
> instead of a VPS — the VPS line is the alternative.

- **Web app:** Vercel (Vite SPA + serverless `api/`). Unchanged.
- **Jitsi + Jibri + recording processor:** one VPS (the Jitsi host), exposed to
  clients via Cloudflare Tunnel or Tailscale Funnel (free).
- The processor on the VPS calls the Vercel `recorded-billing` endpoint with the
  Bearer token.
- **Locally (WSL):** both run on one machine — `vercel dev` serves `api/`, the
  processor runs against `http://localhost:3000`.

### The alternative (and why we didn't take it)

A recording-capable SaaS (cloud Jitsi/Jibri, or a Daily.co/Whereby-style
recording API) would let everything stay serverless: the provider hosts the
recording and a **webhook** hits an `api/` function — no host worker at all. We
chose self-hosted Jitsi+Jibri instead (recording is mandatory, must work with the
personal Microsoft account, and must cost nothing). The host-side worker is the
direct, accepted consequence of that choice — and it is a ~250-line script, not a
backend platform.

**Bottom line:** the web does **not** need a new always-on backend. It needs one
small host-side job runner for recordings, which the serverless model structurally
cannot provide. Keep serverless for the web; run the processor beside Jibri.

## Status

- ✅ Jitsi + Jibri stack runs (Docker/WSL); Jibri records successfully.
- ✅ **Audio capture proven** — a real recording has a non-silent aac stereo stream
  (mean −28.5 dB). The blocker was Jibri's in-container Chrome loading
  `https://localhost:8443` (loopback = jibri itself → `ERR_CONNECTION_REFUSED`).
  Fixed in the Jitsi `.env`: `PUBLIC_URL=https://host.docker.internal:8443`
  (resolves from both the Windows browser and jibri), `JVB_ADVERTISE_IPS=127.0.0.1,<LAN-IP>`
  (multi-candidate ICE: browser uses loopback, jibri uses the LAN IP for UDP media),
  `IGNORE_CERTIFICATE_ERRORS=1` (jibri accepts the self-signed cert).
- ✅ **Billing chain proven end to end** (`scripts/test-billing-chain.mjs`, real
  Stripe test mode): reservation → processor (ffprobe + room→reservation) →
  `recorded-billing` → a real €0.50 Stripe Checkout link.
- ✅ `scripts/process-recording.mjs` — ffprobe + room→reservation (room read from
  Jibri's `metadata.json` `meeting_url`) + recorded-billing call.

### Two real bugs found by live-API testing (mock tests missed both)

1. **Stripe Managed Payments incompatibility.** The account has Managed Payments
   on by default, which requires an _eligible_ product tax code. RexiAI is **live
   1-1 coaching**, which Stripe categorically excludes from Managed Payments
   ("professional services" + "human intervention … doesn't qualify" — see
   docs.stripe.com/payments/managed-payments/eligibility). No tax code fixes it.
   **Fix applied:** `managed_payments: { enabled: false }` on both Checkout
   sessions (`checkout.ts`, `recorded-billing.ts`), plus `tax_code: PRODUCT_TAX_CODE`
   (`txcd_20060048` Consulting) for Stripe Tax. Without this, _no_ Stripe session
   could be created — bookings were broken in production, not just recording.
2. **`.mjs` scripts failed lint** (`no-undef` on `process`/`console`/`fetch`) —
   the eslint globals block excluded `.mjs`. Fixed with a Node-globals override.

### Remaining

- ✅ **Stripe Tax enabled in code** — `automatic_tax: { enabled: true }` on both
  sessions; live status `requires_location_inputs` (Checkout collects the billing
  address, then Stripe calculates). **Action required (dashboard, cannot be done in
  code): the account has 0 tax registrations**, so VAT calculates to 0 until you
  add one — Stripe Dashboard → Tax → Registrations → add your Spanish/EU VAT
  number. Account default `tax_behavior: exclusive` → customers pay price **+** VAT;
  switch to inclusive if your €30/h is meant to be VAT-inclusive. Confirm
  `PRODUCT_TAX_CODE` (`txcd_20060048`, Consulting) with the accountant.
- ✅ **Auto-email the payment link** — `recorded-billing` now emails the customer
  the `checkoutUrl` via `sendPaymentLinkEmail` (best effort: a delivery failure
  logs and never undoes the charge). **Blocked on a verified Resend domain:**
  `EMAIL_FROM=onboarding@resend.dev` (sandbox) can only email the account owner,
  so `assertClientSenderUsable` refuses customer sends. Verify `rexi-ai.com` in
  Resend and set `EMAIL_FROM=no-reply@rexi-ai.com` (or similar) to go live.
- ✅ **Trigger** — `scripts/recording-cron.sh` runs `process-recording.mjs --scan`
  (idempotent via the `.rexi-billed` marker). See §Trigger below.
- ⬜ **Production exposure** — see §Production deployment below.
- ⬜ Optional: processor writes `recorded_minutes` to the reservation session
  metadata so the endpoint's advisory `getRecordedMinutes` cross-check has a
  source (currently a null no-op stub).

## Trigger

The processor must run on the Jitsi host (recordings + ffprobe + node + `.env`
live there). Three options, in order of preference:

1. **Cron / systemd timer (recommended, built):**
   ```cron
   */5 * * * * NODE_BIN=$(command -v node) /home/dbueno/projects/rexiAI/scripts/recording-cron.sh >> /home/dbueno/rexi-recording.log 2>&1
   ```
   `recording-cron.sh` resolves node, `cd`s to the repo, and runs `--scan`.
   Idempotent — the `.rexi-billed` marker means overlapping runs never
   double-charge (the endpoint itself is not idempotent, so this marker is the
   guard). Cron's PATH is minimal, so pin `NODE_BIN`.
2. **Jibri `finalize-script`** (event-driven, fires once per recording): set
   `JIBRI_FINALIZE_RECORDING_SCRIPT_PATH` to a script that calls the processor with
   `--jibri-dir "$1"`. **Caveat:** the hook runs _inside_ the jibri container,
   which has no node/repo/`.env` — so it must call out to the host (e.g. a tiny
   host listener, or write a marker the cron picks up). Given that, the cron
   `--scan` is simpler and already covers it.
3. **Sidecar container (production-clean):** a small container sharing the
   `storage/jibri` volume + the docker network, with node + the repo, running
   `--scan` on a loop. Avoids host-cron entirely; the natural shape on a VPS.
   **Spec-004 limitation:** the sidecar image (`deploy/production/recording-processor/`)
   ships node + ffmpeg but **lacks `gh`** (and `bl`), so the insight stages
   cannot complete there — issue delivery is **host-timer-mode only**. A
   container-mode `--scan` still bills, and the transcription/insight stage
   failures are per-directory contained (logged, unmarked, never fatal to the
   sweep). Adding `bl` + `gh` to the image (container-mode delivery) is a
   documented follow-up for a later spec (Ask D).

## Deployment topology (spec 005)

**PRIMARY: home-hosted on WSL2 (this machine).** Jitsi + Jibri + the recording
processor all run on one home server: the WSL2 guest under Windows. This is
the topology in production use today — the VPS route below survives as the
documented **alternative** (it costs a monthly bill and is only worth it if
the home box's residential IP or uptime stops being acceptable).

- **Storage layout on this machine:** the session directory, `transcript.json`,
  and `customer-brief.md` all live under `RECORDINGS_DIR` =
  `/home/dbueno/rexi-recordings` (Jibri writes the MP4 there; the processor
  writes its sidecars beside it). Customer-insight GitHub issues are delivered
  to the **PRIVATE repo** `RexiAI/rexiAI` — transcripts and briefs never land
  in a public repository.
- **Always-on caveat:** the machine must be powered on both for meetings AND
  for the processor timer. `Persistent=true` on the timer catches up missed
  scans after downtime, so recordings made before a reboot are still
  processed. Consent boundary is unchanged: only rooms prefixed `rexi-`
  auto-record (`mod_rexi_auto_record`).
- **Install:** `deploy/home/install-recording-host.sh` (adapted systemd units,
  0600 `/etc/rexi-recording.env`, first-scan journal verification) — see
  `deploy/home/README.md`.
- **Retention (manual for now):** there is no automated deletion and
  `REXI_ARCHIVE_DIR` remains documented-but-unimplemented. Measured sizing is
  approximately 3 MB per minute of recording; the filesystem currently has
  ~821 GB free ≈ months of headroom. Revisit (or implement the archive dir)
  when a scan cycle starts warning via the disk guard
  (`REXI_MIN_FREE_GB` / `REXI_HARD_MIN_FREE_GB`).

### Exposure decision matrix — path A vs path B vs VPS

|                            | A: Tailscale Funnel                      | B: `meet.rexi-ai.com` → home                                                    | VPS alternative      |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------- | -------------------- |
| Cost                       | zero monthly cost                        | zero (DNS already owned)                                                        | monthly cost (VPS)   |
| Setup work                 | zero router/DNS work                     | GoDaddy A record + router forwards `443/tcp` + `10000/udp` + Windows→WSL2 relay | full server bring-up |
| TLS                        | valid Let's Encrypt on the `ts.net` host | Let's Encrypt via the stack's `ENABLE_LETSENCRYPT`                              | real cert            |
| Media for external clients | **NO** — page + XMPP signaling only      | **full media path** (direct UDP 10000 reachability)                             | full media path      |
| Caveats                    | HTTPS-only proxy                         | dynamic residential IP (DDNS caveat)                                            | the bill             |

**Why path A cannot carry media (honest current truth):** Tailscale Funnel is
an HTTPS-only proxy. It carries the Jitsi web app and the XMPP signaling, so
clients can load the page and join the conference, but WebRTC media and the
SCTP bridge channel ride the ICE transport — they need **direct UDP 10000
reachability**, which only path B's router forward (or LAN/tailnet-local
clients) provides. The old escape hatch — colibri-websocket over TCP 443 — was
**removed upstream** (jitsi/docker-jitsi-meet #2285, 2026-07): the rendered
nginx config on this host has no `/colibri-ws` location and no setting
re-enables it. `deploy/home/expose-funnel.sh` prints this limitation as a loud
banner before it configures anything. Path B stays the customer-meeting path;
`deploy/home/expose-path-b.sh` prints its exact three layers.

## Production deployment (alternative: the VPS route)

`host.docker.internal` is a Docker-Desktop-local alias — it does not exist for
real clients. For production:

- **Web app:** Vercel (Vite SPA + serverless `api/`). Set the deployed URL as
  `APP_BASE_URL` so the processor calls the real `recorded-billing`.
- **Jitsi + Jibri + processor:** one VPS with a **public IP** and a domain
  (e.g. `meet.rexi-ai.com`):
  - `PUBLIC_URL=https://meet.rexi-ai.com` (real Let's Encrypt cert, not self-signed
    → drop `IGNORE_CERTIFICATE_ERRORS`).
  - `JVB_ADVERTISE_IPS=<VPS public IP>` so external clients **and** jibri reach JVB.
  - **UDP 10000 open** on the VPS firewall/security-group (JVB media).
  - Reverse proxy (nginx/Traefik/Caddy) terminating TLS → web:8443.
  - The processor runs on the VPS (cron or sidecar), calling the Vercel endpoint.
- **Why not Cloudflare Tunnel / Tailscale Funnel:** (spec 005 update — this is
  now the full, honest truth, see §Exposure decision matrix) they proxy
  TCP/HTTPS only — the JVB **UDP 10000** media path won't traverse them. They
  carry the web app and XMPP signaling, but WebRTC media and the SCTP bridge
  channel need direct UDP reachability (or a TURN server). The one historical
  TCP-443 media escape hatch, colibri-websocket, was removed upstream
  (jitsi/docker-jitsi-meet #2285), so no configuration puts media on a funnel.
  For a single small VPS, opening UDP 10000 + `JVB_ADVERTISE_IPS=<public IP>`
  remains the simplest correct setup.
- **Resend:** verify `rexi-ai.com` (DNS records) so customer emails deliver.
- **Stripe:** live keys + a tax registration for VAT.
