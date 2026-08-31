import { loadAvailabilityConfig } from './availability.js'
import { getMicrosoftAccessToken, getMicrosoftConfig } from './microsoftAuth.js'
import { getCalendarProvider } from './providers.js'
import { zonedToUtc } from './time.js'

function getTimezone(): string {
  try {
    const cfg = loadAvailabilityConfig()
    return cfg.timezone
  } catch {
    return process.env['AVAILABILITY_TIMEZONE'] || process.env['TIMEZONE'] || 'Europe/Madrid'
  }
}

export interface TeamsMeetingInput {
  date: string
  startTime: string
  hours: number
  subject: string
}

// eslint-disable-next-line complexity
export async function createTeamsMeeting(
  input: TeamsMeetingInput,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  if (getCalendarProvider() !== 'microsoft') return null
  const cfg = getMicrosoftConfig()
  if (!cfg) return null
  let token: string
  try {
    token = await getMicrosoftAccessToken(fetchImpl)
  } catch {
    return null
  }
  const timezone = getTimezone()
  let startUtc: Date
  let endUtc: Date
  try {
    startUtc = zonedToUtc(timezone, input.date, input.startTime)
    endUtc = new Date(startUtc.getTime() + input.hours * 3600000)
  } catch {
    return null
  }
  const body = {
    startDateTime: startUtc.toISOString(),
    endDateTime: endUtc.toISOString(),
    subject: input.subject,
    allowedPresenters: 'everyone',
    isEntryExitAnnounced: true,
    allowMeetingChat: 'enabled',
    // Recording is controlled by Teams meeting policy (AllowCloudRecording).
    // Owner must enable policy: Set-CsTeamsMeetingPolicy -Identity Global -AllowCloudRecording $true
    // We request recording capability where Graph supports it:
    allowRecording: true,
    recordAutomatically: false,
  }
  try {
    const res = await fetchImpl(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.userId)}/onlineMeetings`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { joinUrl?: string; joinWebUrl?: string }
    return data.joinUrl || data.joinWebUrl || null
  } catch {
    return null
  }
}
