import { getMicrosoftAccessToken, getMicrosoftConfig } from './microsoftAuth.js'
import { getCalendarProvider } from './providers.js'
import { getConfiguredTimezone, zonedToUtc } from './time.js'

export interface TeamsMeetingInput {
  date: string
  startTime: string
  hours: number
  subject: string
}

export type TeamsMeetingResult =
  { status: 'skipped' } | { status: 'ok'; joinUrl: string } | { status: 'error'; message: string }

function buildMeetingBody(input: TeamsMeetingInput, startUtc: Date, endUtc: Date) {
  return {
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
}

type Window = { startUtc: Date; endUtc: Date }

function resolveWindow(input: TeamsMeetingInput): Window | null {
  try {
    const startUtc = zonedToUtc(getConfiguredTimezone(), input.date, input.startTime)
    return { startUtc, endUtc: new Date(startUtc.getTime() + input.hours * 3600000) }
  } catch {
    return null
  }
}

async function postOnlineMeeting(
  userId: string,
  token: string,
  body: unknown,
  fetchImpl: typeof fetch
): Promise<TeamsMeetingResult> {
  const res = await fetchImpl(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/onlineMeetings`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) return { status: 'error', message: `Graph responded ${res.status}` }
  const data = (await res.json()) as { joinUrl?: string; joinWebUrl?: string }
  const joinUrl = data.joinUrl || data.joinWebUrl
  if (!joinUrl) return { status: 'error', message: 'Graph response had no joinUrl' }
  return { status: 'ok', joinUrl }
}

async function getToken(fetchImpl: typeof fetch): Promise<string | null> {
  try {
    return await getMicrosoftAccessToken(fetchImpl)
  } catch {
    return null
  }
}

type Ready = { userId: string; token: string; window: Window }

async function prepare(
  input: TeamsMeetingInput,
  fetchImpl: typeof fetch
): Promise<Ready | TeamsMeetingResult> {
  if (getCalendarProvider() !== 'microsoft') return { status: 'skipped' }
  const cfg = getMicrosoftConfig()
  if (!cfg) return { status: 'skipped' }
  const token = await getToken(fetchImpl)
  if (!token) return { status: 'error', message: 'Could not obtain a Microsoft access token' }
  const window = resolveWindow(input)
  if (!window) return { status: 'error', message: 'Invalid meeting date or start time' }
  return { userId: cfg.userId, token, window }
}

function isReady(v: Ready | TeamsMeetingResult): v is Ready {
  return !('status' in v)
}

export async function createTeamsMeeting(
  input: TeamsMeetingInput,
  fetchImpl: typeof fetch = fetch
): Promise<TeamsMeetingResult> {
  const ready = await prepare(input, fetchImpl)
  if (!isReady(ready)) return ready
  const body = buildMeetingBody(input, ready.window.startUtc, ready.window.endUtc)
  try {
    return await postOnlineMeeting(ready.userId, ready.token, body, fetchImpl)
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}
