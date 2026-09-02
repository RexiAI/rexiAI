# Microsoft 365 cutover checklist

Why this matters: with `CALENDAR_PROVIDER=google` the code path `teams.ts` →
`createTeamsMeeting()` returns `skipped`, so no Teams meeting is created, nothing is
recorded, no `actualMinutes` are ever produced, and `POST /api/bookings/recorded-billing`
is never called. Because the booking itself is now a €0 reservation, **the Google
configuration collects no money at all.** The Microsoft path is the only one that closes
the loop from meeting → recording → duration → charge.

## 1. Azure AD (Microsoft Entra ID) app registration

1. <https://portal.azure.com> → Microsoft Entra ID → App registrations → New registration.
   - Name: `RexiAI`
   - Supported account types: _Accounts in this organizational directory only_ (single tenant)
2. Copy **Application (client) ID** → `MICROSOFT_CLIENT_ID`.
3. Copy **Directory (tenant) ID** → `MICROSOFT_TENANT_ID`.
4. Certificates & secrets → New client secret → copy the **Value** (not the Secret ID)
   → `MICROSOFT_CLIENT_SECRET`. Note its expiry date and set a calendar reminder; the
   integration fails hard when it lapses.

## 2. Graph application permissions

API permissions → Add a permission → Microsoft Graph → **Application permissions**:

| Permission                       | Needed for                                                  |
| -------------------------------- | ----------------------------------------------------------- |
| `OnlineMeetings.ReadWrite.All`   | creating the Teams meeting (`teams.ts`)                     |
| `Calendars.ReadWrite`            | creating the calendar event (`calendar.ts`)                 |
| `Mail.Send`                      | operator + client email via Graph (`email.ts`)              |
| `OnlineMeetingArtifact.Read.All` | _optional_ — advisory duration check (`meetingDuration.ts`) |

Then **Grant admin consent** for the tenant. Without consent every call returns 403.

`OnlineMeetings.ReadWrite.All` additionally requires an application access policy so the
app may act on that user's behalf:

```powershell
Import-Module MicrosoftTeams
Connect-MicrosoftTeams
New-CsApplicationAccessPolicy -Identity RexiAI-Meetings `
  -AppIds "<MICROSOFT_CLIENT_ID>" -Description "RexiAI booking meetings"
Grant-CsApplicationAccessPolicy -PolicyName RexiAI-Meetings `
  -Identity "<MICROSOFT_USER_ID>"
```

## 3. Recording policy

Code sets `allowRecording: true`, but recording only actually happens if tenant policy
permits it:

```powershell
Set-CsTeamsMeetingPolicy -Identity Global `
  -AllowCloudRecording $true -RecordingStorageMode OneDriveForBusiness
```

Note: `recordAutomatically` is left `false`. Automatic recording requires a compliance
recording policy and a registered recording bot. **Until that exists, someone must press
Record.** An unrecorded meeting yields no duration and therefore no charge.

## 4. Sending domain (required for client email)

`EMAIL_FROM=onboarding@resend.dev` is Resend's sandbox sender and delivers **only** to
your own verified address. Client confirmation emails cannot work with it.

Either:

- **Resend**: add and verify `rexi-ai.com` (SPF + DKIM DNS records), then set
  `EMAIL_FROM=reservas@rexi-ai.com`; or
- **Graph**: set `EMAIL_PROVIDER=microsoft365` and send as the M365 mailbox, which is
  already domain-authenticated.

Add a DMARC record either way.

## 5. Environment variables

```bash
CALENDAR_PROVIDER=microsoft
EMAIL_PROVIDER=microsoft365
MICROSOFT_TENANT_ID=<tenant id>
MICROSOFT_CLIENT_ID=<client id>
MICROSOFT_CLIENT_SECRET=<secret value>
MICROSOFT_USER_ID=daniel@rexi-ai.com
EMAIL_FROM=reservas@rexi-ai.com
EMAIL_TO=daniel@rexi-ai.com
```

Set these in Vercel → Project Settings → Environment Variables (Production **and**
Preview), not only in the local `.env`.

Keep `GOOGLE_CALENDAR_ID` / `GOOGLE_SERVICE_ACCOUNT_JSON` in place during the transition
so a rollback is one variable flip (`CALENDAR_PROVIDER=google`).

## 6. Verification before trusting it with real bookings

1. Book a slot in Stripe **test mode**. Confirm the API response carries a `joinUrl` — if
   Teams creation fails the endpoint now returns `502 TEAMS_ERROR` and creates no Stripe
   session, so a silent failure is no longer possible.
2. Confirm the calendar event appears on the M365 calendar with the Teams link.
3. Confirm the operator email arrives, and that the client address receives the
   confirmation (this is the step that fails on the sandbox sender).
4. Join and record a short meeting; verify the recording lands in OneDrive.
5. Call the billing endpoint with the real duration:
   ```bash
   curl -X POST https://rexi-ai.vercel.app/api/bookings/recorded-billing \
     -H "Authorization: Bearer $RECORDED_BILLING_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"bookingId":"cs_test_...","email":"cliente@example.com","actualMinutes":90}'
   ```
   Expect 60 free minutes on a first-time client and 30 billable minutes → 1500 cents.
6. Confirm the free hour cannot be claimed twice — repeat with the same email and expect
   the full 90 minutes to be billable.

## 7. Known gaps that remain after cutover

- **Recording is not guaranteed by code.** Policy allows it; a human still starts it.
- **`actualMinutes` is caller-supplied**, bounded by the booked duration + 15 min grace.
  The Graph attendance-report check is advisory and frequently unavailable.
- **Rate limiting and slot-conflict detection are per-lambda / best-effort.** Closing
  either properly needs a transactional store (KV or Postgres).
- **Client secret expires.** Rotate before the expiry recorded in step 1.
