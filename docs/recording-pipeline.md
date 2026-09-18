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

`--dry-run` ffprobes + resolves the reservation but does **not** call billing.

Env (from `.env`): `STRIPE_SECRET_KEY`, `RECORDED_BILLING_TOKEN`,
`APP_BASE_URL` (where `api/` is served — `vercel dev` → `http://localhost:3000`,
or the deployed URL), optional `RECORDINGS_DIR`.

**Idempotency:** `recorded-billing` creates a new Checkout session per call (it
is not idempotent), so the processor writes a `.rexi-billed` marker beside each
processed recording and `--scan` skips marked ones. Prefer the Jibri
finalize-hook (fires exactly once per recording) over polling.

## Does this web need a backend?

**The web app already has one, and it is the right kind.** `api/*.ts` are Vercel
serverless functions covering everything request-driven: availability, booking
checkout, calendar sync, the Stripe webhook, and recorded-billing. Stripe is the
system of record. For the booking/billing/calendar/email flows there is **no need
for a traditional always-on server** — adding one would be YAGNI and a step back
from a clean serverless model.

**The recording pipeline is the one thing serverless cannot do**, for three
structural reasons:

| Serverless constraint | Why recording breaks it |
|---|---|
| Request-driven | A recording finishes on **Jibri's** schedule (a file appears), not on an inbound HTTP request. Nothing invokes a function when Jibri is done. |
| Ephemeral, isolated filesystem | The MP4 lives on the **Jitsi host's** disk. A Vercel function cannot see it. |
| No arbitrary host binaries | Measuring duration needs **ffprobe** on the Jitsi host. |

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
   on by default, which requires an *eligible* product tax code. RexiAI is **live
   1-1 coaching**, which Stripe categorically excludes from Managed Payments
   ("professional services" + "human intervention … doesn't qualify" — see
   docs.stripe.com/payments/managed-payments/eligibility). No tax code fixes it.
   **Fix applied:** `managed_payments: { enabled: false }` on both Checkout
   sessions (`checkout.ts`, `recorded-billing.ts`), plus `tax_code: PRODUCT_TAX_CODE`
   (`txcd_20060048` Consulting) for Stripe Tax. Without this, *no* Stripe session
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
   `--jibri-dir "$1"`. **Caveat:** the hook runs *inside* the jibri container,
   which has no node/repo/`.env` — so it must call out to the host (e.g. a tiny
   host listener, or write a marker the cron picks up). Given that, the cron
   `--scan` is simpler and already covers it.
3. **Sidecar container (production-clean):** a small container sharing the
   `storage/jibri` volume + the docker network, with node + the repo, running
   `--scan` on a loop. Avoids host-cron entirely; the natural shape on a VPS.

## Production deployment

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
- **Why not Cloudflare Tunnel / Tailscale Funnel:** they proxy TCP/HTTPS only —
  the JVB **UDP 10000** media path won't traverse them. They're fine for the
  signaling/web leg, but media needs the public UDP port (or a TURN server). For a
  single small VPS, opening UDP 10000 + `JVB_ADVERTISE_IPS=<public IP>` is the
  simplest correct setup.
- **Resend:** verify `rexi-ai.com` (DNS records) so customer emails deliver.
- **Stripe:** live keys + a tax registration for VAT.
