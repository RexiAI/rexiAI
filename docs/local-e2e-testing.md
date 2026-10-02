# Local end-to-end test guide — book → meet → record → bill

Test the **whole RexiAI flow on this laptop's WSL**, playing both roles: the
**operator** (you) and a **customer** (a second email you control). Everything
runs locally and Stripe is in **test mode** — no real money, no real emails.

**What you'll prove:** a customer books a slot → a €0 reservation is created →
they join the Jitsi room and record the meeting → the recording processor
measures it and produces the pro-rata **payment link** (the actual charge).

---

## 0. The two identities

| Role               | Who                                                                                                              | Used for                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Operator (you)** | calendar `buenopachecodani@hotmail.es` (Microsoft Graph); notifications → `EMAIL_TO` (`danielbueno76@gmail.com`) | owns the calendar; receives operator emails |
| **Customer**       | any **second email** you control (a spare Gmail, etc.)                                                           | books the session; "pays" in test mode      |

> **Emails won't reach the customer** while `EMAIL_FROM=onboarding@resend.dev`
> (Resend sandbox only delivers to the account owner). That's expected — you'll
> read the **join link** and the **payment link** from the terminal / Stripe
> instead. See [§7 Emails](#7-emails-sandbox-limitation).

---

## 1. Prerequisites (one-time)

1. **Docker Desktop** running, WSL integration enabled for `Ubuntu-24.04`.
2. Repo `.env` (`~/projects/rexiAI/.env`) containing at least:
   ```dotenv
   STRIPE_SECRET_KEY=sk_test_...            # test mode
   RECORDED_BILLING_TOKEN=<openssl rand -hex 32>
   MEETING_BASE_URL=https://host.docker.internal:8443
   APP_BASE_URL=http://localhost:3000
   # optional (calendar event + busy-check); booking still works without it:
   MICROSOFT_CLIENT_ID=... ; MICROSOFT_CLIENT_SECRET=... ; MICROSOFT_REFRESH_TOKEN=...
   ```
3. The Jitsi stack configured at `~/docker-jitsi-meet/.env`
   (`PUBLIC_URL=https://host.docker.internal:8443`,
   `JVB_ADVERTISE_IPS=127.0.0.1,<your-LAN-IP>`, `ENABLE_RECORDING=1`,
   `IGNORE_CERTIFICATE_ERRORS=1`). **Already done on this machine.**
   If your laptop's LAN IP changed, update `JVB_ADVERTISE_IPS` (the second IP):
   ```bash
   grep host.docker.internal /mnt/c/Windows/System32/drivers/etc/hosts   # shows the current LAN IP
   ```

Every terminal below needs Docker + node on PATH:

```bash
export PATH="/mnt/c/Program Files/Docker/Docker/resources/bin:$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"
```

---

## 2. Start the three pieces (three terminals)

**Terminal A — Jitsi + Jibri (Docker):**

```bash
cd ~/docker-jitsi-meet
docker compose -f docker-compose.yml -f jibri.yml up -d
# wait ~20s, then verify all 5 are Up:
docker compose -f docker-compose.yml -f jibri.yml ps
```

**Terminal B — the API (serverless handlers, locally):**

```bash
cd ~/projects/rexiAI
npx -y tsx scripts/dev-api-server.mjs        # listens on http://localhost:3000
```

**Terminal C — the frontend (Vite, proxies /api → :3000):**

```bash
cd ~/projects/rexiAI
npm run dev                                  # opens http://localhost:5173
```

> To test **free mode** instead (everything free + the promo banner), start
> Terminal B with `BILLING_ENABLED=false npx -y tsx scripts/dev-api-server.mjs`
> and see [§6](#6-optional-test-free-mode).

---

## 3. Book a session (as the customer)

1. Open **http://localhost:5173**.
2. In the booking widget pick:
   - **Date:** any **future weekday (Mon–Fri)** — availability is
     **09:00–13:00 Europe/Madrid** (`config/availability.yaml`).
   - **Slot:** for a 1-hour booking, a start of **09:00, 10:00, 11:00 or 12:00**
     (the session must fit before 13:00). Duration 1–4 h.
   - **Email:** your **second (customer) email**.
3. Click **Reservar y pagar / Book and pay** → you're redirected to **Stripe
   Checkout (test mode)** for a **€0.00 reservation**.
4. Confirm the €0 checkout (no card needed for €0). You land back on
   **`/booking/success`** ("Reserva recibida").

The reservation now exists in Stripe with the Jitsi room in its metadata.

---

## 4. Get the meeting (join) link

The customer email is sandbox-blocked, so read the room from Stripe. In any
terminal (repo root):

```bash
cd ~/projects/rexiAI
source <(grep -E '^STRIPE_SECRET_KEY=' .env)
curl -s "https://api.stripe.com/v1/checkout/sessions?limit=10" -u "$STRIPE_SECRET_KEY:" \
 | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{for(const s of JSON.parse(d).data){const m=s.metadata||{};if(m.join_url)console.log(m.date,m.start_time,m.email,"->",m.join_url)}})'
```

Find the line for your booking → copy the **`https://host.docker.internal:8443/rexi-…`**
join URL. (Alternatively: Stripe Dashboard → test mode → Checkout sessions →
your reservation → Metadata → `join_url`. With the webhook wired (§8), it's also
on the operator's calendar event + operator email.)

---

## 5. Meet + record, then bill

**5a. Join + record (Windows browser, as the customer):**

1. Open the **join URL** from §4. Accept the self-signed-cert warning
   (Advanced → Proceed).
2. Enter a name → **Join** → **Allow microphone** → **unmute and talk**
   (a recording of silence is flagged but still bills).
3. Click **⏺ Start recording** → it should say "Recording started".
4. Talk **~30–60 s** → **Stop recording** → wait ~20 s (Jibri finalizes the MP4).

**5b. Bill it (any terminal, repo root):**

```bash
cd ~/projects/rexiAI
node scripts/process-recording.mjs --scan
```

Expected output:

```
--- recording: …/recordings/<session>/rexi-…_….mp4
    duration: 1 min | audio stream: yes
    room: rexi-…
    reservation: cs_test_… | <customer email> | quoted 1h
    BILLED: 50 cents (1 billable min, 0 free min applied)
    checkoutUrl: https://checkout.stripe.com/c/pay/cs_test_…
```

> **First short session bills €0** — a brand-new customer email gets **60 free
> minutes once** (`rexi_free_hour_used`). To see a **non-zero** charge, either
> record >60 min, or pre-burn the free hour for the customer email:
>
> ```bash
> source <(grep -E '^STRIPE_SECRET_KEY=' .env)
> curl -s https://api.stripe.com/v1/customers -u "$STRIPE_SECRET_KEY:" \
>   -d "email=CUSTOMER_EMAIL" -d "metadata[rexi_free_hour_used]=1" >/dev/null \
>   && echo "free hour burned for CUSTOMER_EMAIL"
> ```
>
> Then re-run the processor on a fresh recording.

**5c. Pay the link (optional, proves the charge):**
Open the printed **`checkoutUrl`** → Stripe test Checkout → card
**4242 4242 4242 4242**, any future expiry, any CVC/ZIP → Pay. The pro-rata
amount (e.g. €0.50) is captured in **test mode**.

The processor writes a `.rexi-billed` marker beside each MP4 it bills, so
`--scan` never double-charges. To re-bill the same recording, delete that marker.

---

## 6. Optional: test free mode

Proves the `BILLING_ENABLED` kill-switch + the promo banner.

1. Start Terminal B with **`BILLING_ENABLED=false npx -y tsx scripts/dev-api-server.mjs`**.
2. Reload **http://localhost:5173** → a dark banner appears: green **GRATIS/FREE**
   pill, **~~30 EUR/h~~** struck through, "Todas las charlas y análisis, GRATIS",
   limited-time copy, and fine print that **custom builds are still quoted**.
   The booking card's prices are struck through; the button reads
   **"Reservar (gratis)"**.
3. Record + run the processor → it prints
   `billing DISABLED (BILLING_ENABLED=false): session is free, nothing charged`
   (no Stripe charge, no payment link).
4. Set `BILLING_ENABLED=true` (or unset) + restart Terminal B to go back to paid.

---

## 7. Emails (sandbox limitation)

`EMAIL_FROM=onboarding@resend.dev` is the **Resend sandbox**: it only delivers to
the Resend **account owner**. So:

- **Customer emails** (booking confirmation, payment link) are **refused** by
  design (`assertClientSenderUsable`) — you'll see
  `payment-link email failed: … sandbox sender` in Terminal B. The **charge still
  succeeds**; the link is printed by the processor.
- **Operator emails** (to `EMAIL_TO`) arrive **only if** `EMAIL_TO` is the Resend
  account owner's address.

To make real customer emails work: verify `rexi-ai.com` in Resend (add its DNS
records at Godaddy), then set `EMAIL_FROM=no-reply@rexi-ai.com` in `.env` **and**
in Vercel. No code change needed.

---

## 8. Optional: full webhook (calendar event + emails)

By default the local flow skips the Stripe **webhook**, so the calendar event and
the confirmation emails don't fire (the booking, recording and billing all still
work). To exercise the webhook too:

1. Forward Stripe events to the local API (Stripe CLI). Either install the CLI,
   or run it via Docker:
   ```bash
   docker run --rm -it stripe/stripe-cli listen \
     --forward-to host.docker.internal:3000/api/stripe-webhook \
     --api-key "$STRIPE_SECRET_KEY"
   ```
   It prints a **`whsec_...`** webhook signing secret.
2. Put that secret in `.env` as **`STRIPE_WEBHOOK_SECRET=whsec_...`**, then
   **restart Terminal B** (the dev-api-server reads `.env` at start).
3. Re-do a booking (§3) and complete the €0 checkout → the webhook fires →
   the dev-api-server creates the **calendar event** on the operator's hotmail
   calendar (needs a valid `MICROSOFT_REFRESH_TOKEN`) and attempts the emails.

> If the calendar event doesn't appear, the Microsoft refresh token may have
> expired — re-consent with `node scripts/m365-consent.mjs` (see
> `docs/microsoft-cutover.md`). A Graph outage never blocks a booking
> (availability degrades to "all slots open"; the conflict backstop still runs).

---

## 9. Verification checklist

| Step                | How to confirm                                                                     |
| ------------------- | ---------------------------------------------------------------------------------- |
| Stack healthy       | `docker compose … ps` → 5 Up; `curl -sk https://localhost:8443` → 200              |
| Jibri ready         | `docker compose … logs jibri \| grep jibribrewery` → "Joined MUC"                  |
| API up              | `curl -s localhost:3000/api/config` → `{"billingEnabled":true}`                    |
| Booking             | Stripe test Dashboard → a €0 Checkout session with `reservation=1` + `join_url`    |
| Recording           | `ls ~/.jitsi-meet-cfg/storage/jibri/recordings/<session>/*.mp4` exists             |
| Recording has audio | `ffprobe -v error -select_streams a -show_entries stream=codec_name <mp4>` → `aac` |
| Billing             | processor prints `BILLED: <cents>` + a `checkoutUrl`                               |
| Charge              | open the `checkoutUrl`, pay with `4242…` → Stripe shows a paid test charge         |

---

## 10. Teardown

```bash
cd ~/docker-jitsi-meet
docker compose -f docker-compose.yml -f jibri.yml down   # stops Jitsi (keeps config + recordings)
# Ctrl-C the dev-api-server (B) and vite (C).
```

Recordings + config persist under `~/.jitsi-meet-cfg/`. Delete a recording's
`.rexi-billed` marker to re-bill it; delete the session folder to start clean.

---

## Troubleshooting

- **`/api/config` 404 / SPA can't reach the API** — Terminal B (dev-api-server)
  isn't running, or Vite wasn't restarted after a config change.
- **Record button missing / "Recording failed"** — confirm `ENABLE_RECORDING=1`
  and Jibri "Joined MUC: jibribrewery"; see `docs/recording-pipeline.md`.
- **Recording is silent** — you joined muted, or the JVB media candidate is
  wrong; check `JVB_ADVERTISE_IPS` includes `127.0.0.1` and your current LAN IP.
- **`SKIP: no Stripe reservation found for room …`** — you recorded a room that
  wasn't booked (e.g. `/rexitest`). Record the **booked** room from §4.
- **`BILLING FAILED: HTTP 401/503`** — `RECORDED_BILLING_TOKEN` missing or
  mismatched between `.env` (processor) and the dev-api-server's env.
- **Processor can't reach the API** — `APP_BASE_URL` must be
  `http://localhost:3000` and Terminal B must be up.
