# Microsoft Graph cutover — calendar on a personal account, meetings on Jitsi

The calendar lives on a **personal Microsoft account** (`buenopachecodani@hotmail.es`)
via Microsoft Graph **delegated** auth. Meetings are **Jitsi rooms** (free,
personal-account compatible — Microsoft Graph `onlineMeetings` is work/school
only, and Godaddy does not include M365 for the domain). Email stays on
**Resend** with the Godaddy mailbox (`info@rexi-ai.com`). The three are
deliberately separate.

Google Calendar support was removed entirely in this migration
(`gcal.ts`, `googleAuth.ts`, the `googleapis` dependency, and the freebusy
lookups in `api/bookings/calendar.ts` + `api/availability.ts` are gone).

## Account split

| Concern | Account | Mechanism |
| --- | --- | --- |
| Calendar (booking events, dedup, overlap, availability) | `buenopachecodani@hotmail.es` (personal MSA) | Microsoft Graph delegated, `/me/events` |
| Meetings (client join link) | none — Jitsi room | `MEETING_BASE_URL` + random room per booking |
| Email (operator + client notifications) | `info@rexi-ai.com` (Godaddy) | Resend (`EMAIL_PROVIDER=gmail`) |

## 1. Azure app registration (personal accounts)

1. https://portal.azure.com → Microsoft Entra ID → App registrations → **RexiAI**.
2. **Authentication** → **Supported account types** →
   *Accounts in any organizational directory and personal Microsoft accounts*.
   If saving fails with `Property api.requestedAccessTokenVersion is invalid`,
   first set **Manifest** → `api.requestedAccessTokenVersion: 2` and save.
3. **API permissions** → Add a permission → Microsoft Graph →
   **Delegated permissions** → `Calendars.ReadWrite` (not `ReadWrite.All`).
   Remove the old `Mail.Send` / `OnlineMeetings.ReadWrite.All` (application)
   permissions — neither is used anymore. No admin consent is needed: personal
   accounts consent for themselves.

## 2. Delegated consent (one-time)

The app authenticates with its **client secret** (confidential Web-platform
client — every token call sends `client_secret`, the v2.0 endpoint rejects it
otherwise) and holds a **refresh token** from the account owner's consent:

1. Run the app's `composeM365OauthUrl()` (or hit
   `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize` with
   `client_id`, `response_type=code`, `redirect_uri`, `scope=Calendars.ReadWrite offline_access`).
2. Sign in as `buenopachecodani@hotmail.es`, approve.
3. Exchange the returned `code` via `exchangeCodeForRefreshToken(code)`.
4. Paste the refresh token into `MICROSOFT_REFRESH_TOKEN` (local `.env` and
   Vercel env vars).

Personal-account refresh tokens expire after ~90 days of inactivity. When Graph
calls start failing with token errors, re-run the consent flow.

## 3. Meetings — Jitsi

- Every booking gets `https://<MEETING_BASE_URL>/rexi-<16-hex>` (default
  `https://meet.jit.si`). The URL lands in the Stripe session metadata
  (`join_url`), the calendar event body and both emails.
- Public `meet.jit.si` does **not** record. Automatic recording requires the
  self-hosted Jitsi + Jibri stack (section 5).

## 4. Environment variables

```bash
CALENDAR_PROVIDER=microsoft
EMAIL_PROVIDER=gmail            # Resend path — Godaddy mailbox, not Graph mail
MICROSOFT_CLIENT_ID=<client id>
MICROSOFT_REFRESH_TOKEN=<from consent>
MEETING_BASE_URL=https://meet.rexi-ai.com   # once Jitsi+Jibri is up
EMAIL_FROM=info@rexi-ai.com     # after verifying the domain in Resend
EMAIL_TO=daniel@rexi-ai.com
```

Set in Vercel → Project Settings → Environment Variables (Production **and**
Preview). There is no Google configuration anymore — no rollback variable.

## 5. Recording pipeline (required for automatic charging)

The business loop closes only when the meeting is recorded: duration →
`POST /api/bookings/recorded-billing` → automatic charge. Without a recording
the operator must submit `actualMinutes` by hand.

Stack (free, self-hosted on an always-on machine — VPS or Linux PC):

1. **Jitsi Meet + Jibri** — Jibri auto-joins every `rexi-*` room as a hidden
   recorder and writes an MP4 per meeting to `/jibri/recordings/<room>/`.
2. **Organize + upload** — a script moves each MP4 to
   `Bookings/<YYYY-MM-DD>/<bookingId>/recording.mp4` (room → booking via the
   Stripe `join_url` metadata) and uploads to the personal OneDrive
   (`buenopachecodani@hotmail.es`, Graph delegated `/me/drive`) — or, if Jitsi
   runs on the PC, records straight into the OneDrive sync folder.
3. **Auto-charge** — `ffprobe` the MP4 for the duration, then
   `POST /api/bookings/recorded-billing` with `actualMinutes`. The endpoint
   already bounds the charge to quoted hours + 15 min grace.

`meetingDuration.ts` (the old Teams attendance-report lookup) is a no-op stub
until this pipeline feeds it a duration store.

## 6. Verification before trusting it with real bookings

1. Book a slot in Stripe **test mode**; the response carries a `joinUrl`
   (Jitsi room) — the 502 `MEETING_ERROR` guard still fires if creation fails.
2. Confirm the calendar event appears on the hotmail calendar with the Jitsi
   link.
3. Confirm the operator email arrives, and the client confirmation (this is
   the step that fails on the Resend sandbox sender — verify `info@rexi-ai.com`
   first).
4. With Jibri up: join a short meeting, confirm the recording lands in
   OneDrive under the booking folder, then confirm the auto-charge posts.

## 7. Known gaps

- **Recording is not guaranteed by code until the Jitsi+Jibri machine runs.**
  Until then `actualMinutes` is manual.
- **`actualMinutes` is caller-supplied**, bounded by booked duration + 15 min
  grace. The recording pipeline supplies it automatically once wired.
- **Refresh token expires** after ~90 days idle — re-consent (section 2).
- **Rate limiting and slot-conflict detection are per-lambda / best-effort.**
- **Personal-account limits:** Graph app-only and Teams `onlineMeetings` are
  unavailable; recording is Jibri-based, not Teams-recording-based.