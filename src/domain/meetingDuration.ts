import { getMicrosoftAccessToken, getMicrosoftConfig } from './microsoftAuth.js'
import { getCalendarProvider } from './providers.js'

/**
 * Advisory observed-duration lookup for a Teams meeting.
 *
 * WHY ADVISORY AND NEVER AUTHORITATIVE: the real elapsed time of a Teams
 * meeting is only visible through attendance reports (and, for some tenants,
 * callRecords), both of which are permission-heavy — attendance reports need
 * OnlineMeetingArtifact.Read.All, callRecords needs CallRecords.Read.All plus
 * an active change-notification subscription. Reports also materialize
 * asynchronously after the meeting ends, so a lookup run minutes later
 * legitimately returns nothing. Every one of those cases must be a no-op, not
 * a billing failure: this function returns null and the caller must treat null
 * as "no opinion".
 *
 * Consequence for callers: never hard-fail billing on this. Use it to flag a
 * mismatch for a human, nothing more.
 */

const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0'

interface AttendanceReport {
  meetingStartDateTime?: string
  meetingEndDateTime?: string
}

function isConfigured(): boolean {
  return getCalendarProvider() === 'microsoft' && getMicrosoftConfig() !== null
}

async function graphGet(url: string, token: string, fetchImpl: typeof fetch): Promise<unknown> {
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  return (await res.json()) as unknown
}

function firstValue(payload: unknown): Record<string, unknown> | null {
  const value = (payload as { value?: unknown[] } | null)?.value
  if (!Array.isArray(value) || value.length === 0) return null
  return value[0] as Record<string, unknown>
}

function looksLikeJoinUrl(ref: string): boolean {
  return ref.startsWith('http://') || ref.startsWith('https://')
}

/** Graph OData string literals escape a single quote by doubling it. */
function odataQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

async function resolveMeetingId(
  ref: string,
  userId: string,
  token: string,
  fetchImpl: typeof fetch
): Promise<string | null> {
  if (!looksLikeJoinUrl(ref)) return ref
  const filter = encodeURIComponent(`JoinWebUrl eq ${odataQuote(ref)}`)
  const url = `${GRAPH_ROOT}/users/${encodeURIComponent(userId)}/onlineMeetings?$filter=${filter}`
  const meeting = firstValue(await graphGet(url, token, fetchImpl))
  const id = meeting?.['id']
  return typeof id === 'string' ? id : null
}

function minutesBetween(report: AttendanceReport): number | null {
  const start = report.meetingStartDateTime
  const end = report.meetingEndDateTime
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return null
  return Math.round(ms / 60_000)
}

async function fetchObservedMinutes(
  meetingId: string,
  userId: string,
  token: string,
  fetchImpl: typeof fetch
): Promise<number | null> {
  const url = `${GRAPH_ROOT}/users/${encodeURIComponent(userId)}/onlineMeetings/${encodeURIComponent(meetingId)}/attendanceReports`
  const report = firstValue(await graphGet(url, token, fetchImpl))
  if (!report) return null
  return minutesBetween(report as AttendanceReport)
}

/**
 * Observed meeting length in whole minutes, or null when unknown.
 *
 * @param ref either the Teams joinUrl or a Graph onlineMeeting id.
 */
export async function getRecordedMinutes(
  ref: string,
  fetchImpl: typeof fetch = fetch
): Promise<number | null> {
  if (!ref || !isConfigured()) return null
  try {
    return await lookupMinutes(ref, fetchImpl)
  } catch {
    // Permission errors, throttling and transient Graph outages are all
    // "no opinion" — never a billing signal. See the module doc comment.
    return null
  }
}

async function lookupMinutes(ref: string, fetchImpl: typeof fetch): Promise<number | null> {
  const cfg = getMicrosoftConfig()
  if (!cfg) return null
  const token = await getMicrosoftAccessToken(fetchImpl)
  const meetingId = await resolveMeetingId(ref, cfg.userId, token, fetchImpl)
  if (!meetingId) return null
  return fetchObservedMinutes(meetingId, cfg.userId, token, fetchImpl)
}
