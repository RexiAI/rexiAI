// Microsoft Graph calendar adapter — the calendar implementation behind the
// provider-agnostic facade in calendar.ts. Talks to the signed-in user's own
// mailbox (/me/…) with a delegated access token from microsoftAuth.

import type { CalendarAdapter, CalendarClient, CalendarSlot } from './calendar.js'
import { getMicrosoftAccessToken } from './microsoftAuth.js'
import { zonedToUtc } from './time.js'

export const DEDUP_PROPERTY_ID =
  'String {00020329-0000-0000-C000-000000000046} Name rexi_booking_id'

const BASE = 'https://graph.microsoft.com/v1.0'

function defaultClient(client?: CalendarClient): CalendarClient {
  return client ?? { fetchImpl: fetch }
}

function eventsUrl(query: string): string {
  return `${BASE}/me/events?${query}`
}

/** Local-time end for a slot, with naive day-overflow handling. */
function localSlotEnd(
  date: string,
  startTime: string,
  hours: number
): { endDate: string; endTime: string } {
  const [h, m] = startTime.split(':').map(Number)
  const endMin = h * 60 + m + hours * 60
  const endH = String(Math.floor(endMin / 60) % 24).padStart(2, '0')
  const endM = String(endMin % 60).padStart(2, '0')
  let endDate = date
  if (endMin >= 24 * 60) {
    const d = new Date(date + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    endDate = d.toISOString().slice(0, 10)
  }
  return { endDate, endTime: `${endH}:${endM}` }
}

function bookingIdOf(prop: unknown): string | null {
  const p = prop as { id?: unknown; value?: unknown } | null
  if (p?.id !== DEDUP_PROPERTY_ID) return null
  if (typeof p.value !== 'string' || !p.value) return null
  return p.value
}

function pickBookingId(item: unknown): string | null {
  const props = (item as { singleValueExtendedProperties?: unknown[] } | null)
    ?.singleValueExtendedProperties
  if (!Array.isArray(props)) return null
  for (const p of props) {
    const id = bookingIdOf(p)
    if (id) return id
  }
  return null
}

function splitDateTime(raw: string): { date: string; time: string } | null {
  const sep = raw.indexOf('T')
  if (sep < 0) return null
  const date = raw.slice(0, sep)
  const time = raw.slice(sep + 1)
  if (!date || !time) return null
  return { date, time }
}

function toUtcOrNull(timezone: string, date: string, time: string): Date | null {
  try {
    return zonedToUtc(timezone, date, time)
  } catch {
    return null
  }
}

/** Graph event start/end ({ dateTime, timeZone }) → Date, or null when unusable. */
function parseGraphDateTime(dt: { dateTime?: string; timeZone?: string } | undefined): Date | null {
  const raw = dt ? dt.dateTime : null
  if (!raw) return null
  const parts = splitDateTime(raw)
  if (!parts) return null
  return toUtcOrNull(dt && dt.timeZone ? dt.timeZone : 'UTC', parts.date, parts.time.slice(0, 5))
}

function collectBusy(
  value: Array<{ start?: { dateTime?: string; timeZone?: string }; end?: { dateTime?: string; timeZone?: string } }> | undefined
): CalendarSlot[] {
  const busy: CalendarSlot[] = []
  for (const item of value ?? []) {
    const start = parseGraphDateTime(item.start)
    const end = parseGraphDateTime(item.end)
    if (start && end && end.getTime() > start.getTime()) busy.push({ start, end })
  }
  return busy
}

function mergeBusySlots(intervals: CalendarSlot[]): CalendarSlot[] {
  if (intervals.length === 0) return intervals
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: CalendarSlot[] = [{ ...sorted[0]! }]
  for (const next of sorted.slice(1)) {
    const last = merged[merged.length - 1]!
    if (next.start.getTime() <= last.end.getTime()) {
      if (next.end.getTime() > last.end.getTime()) last.end = next.end
    } else {
      merged.push({ ...next })
    }
  }
  return merged
}

export async function createGraphEvent(
  input: {
    bookingId: string
    email: string
    date: string
    startTime: string
    hours: number
    joinUrl?: string | null
    timezone?: string
  },
  client?: CalendarClient
): Promise<{ alreadyExists: boolean }> {
  const { fetchImpl } = defaultClient(client)
  const token = await getMicrosoftAccessToken(fetchImpl)

  // Dedup guard: a booking id already on the calendar means the webhook already
  // wrote this event (same contract as the previous provider implementations).
  const exists = await findEventByBookingId(input.bookingId, { fetchImpl })
  if (exists) return { alreadyExists: true }

  const timezone = input.timezone ?? 'Europe/Madrid'
  const startDateTime = `${input.date}T${input.startTime}:00`
  const { endDate, endTime } = localSlotEnd(input.date, input.startTime, input.hours)

  // No isOnlineMeeting/onlineMeetingProvider: meetings are Jitsi rooms (free,
  // personal-account compatible); the join link goes into the body only.
  const body: Record<string, unknown> = {
    subject: `Booking ${input.email}`,
    body: {
      contentType: 'HTML',
      content: `Client: ${input.email} - ${input.hours}h${input.joinUrl ? `<br/><a href="${input.joinUrl}">Join meeting: ${input.joinUrl}</a>` : ''}`,
    },
    start: { dateTime: startDateTime, timeZone: timezone },
    end: { dateTime: `${endDate}T${endTime}:00`, timeZone: timezone },
    attendees: [{ emailAddress: { address: input.email }, type: 'required' }],
    singleValueExtendedProperties: [{ id: DEDUP_PROPERTY_ID, value: input.bookingId }],
  }

  const res = await fetchImpl(`${BASE}/me/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Graph create event failed: ${res.status} ${text}`)
  }
  return { alreadyExists: false }
}

export async function findEventByBookingId(
  bookingId: string,
  client?: CalendarClient
): Promise<boolean> {
  const { fetchImpl } = defaultClient(client)
  const token = await getMicrosoftAccessToken(fetchImpl)
  const query = new URLSearchParams({
    $expand: `singleValueExtendedProperties($filter=id eq '${DEDUP_PROPERTY_ID}')`,
    $top: '100',
  })
  const res = await fetchImpl(eventsUrl(query.toString()), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Graph find event failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { value?: unknown[] }
  return (data.value ?? []).some((item) => pickBookingId(item) === bookingId)
}

export async function findOverlappingBookingId(
  input: { bookingId: string; date: string; startTime: string; hours: number },
  client?: CalendarClient
): Promise<string | null> {
  const { fetchImpl } = defaultClient(client)
  const token = await getMicrosoftAccessToken(fetchImpl)
  const { endDate, endTime } = localSlotEnd(input.date, input.startTime, input.hours)
  const startLocal = `${input.date}T${input.startTime}:00`
  const endLocal = `${endDate}T${endTime}:00`
  const query = new URLSearchParams({
    $filter: `end/dateTime gt '${startLocal}' and start/dateTime lt '${endLocal}'`,
    $expand: `singleValueExtendedProperties($filter=id eq '${DEDUP_PROPERTY_ID}')`,
    $top: '50',
  })
  const res = await fetchImpl(eventsUrl(query.toString()), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Graph find overlap failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { value?: unknown[] }
  for (const item of data.value ?? []) {
    const other = pickBookingId(item)
    if (other && other !== input.bookingId) return other
  }
  return null
}

/**
 * Busy intervals for a day, from the operator's own calendar. Every event on
 * the calendar counts as occupied (any event = the slot is taken).
 */
export async function getBusyIntervals(
  date: string,
  timezone: string,
  client?: CalendarClient
): Promise<CalendarSlot[]> {
  const { fetchImpl } = defaultClient(client)
  const token = await getMicrosoftAccessToken(fetchImpl)
  const dayStart = zonedToUtc(timezone, date, '00:00')
  const endOfDay = new Date(dayStart.getTime() + 24 * 3600000)
  const query = new URLSearchParams({
    startDateTime: dayStart.toISOString(),
    endDateTime: endOfDay.toISOString(),
    $select: 'start,end',
    $top: '100',
  })
  const res = await fetchImpl(`${BASE}/me/calendar/calendarView?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Graph calendarView failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as {
    value?: Array<{ start?: { dateTime?: string; timeZone?: string }; end?: { dateTime?: string; timeZone?: string } }>
  }
  return mergeBusySlots(collectBusy(data.value))
}

/** The Microsoft Graph implementation of the CalendarAdapter contract. */
export const microsoftGraph: CalendarAdapter = {
  createEvent: createGraphEvent,
  findEventByBookingId,
  findOverlappingBookingId,
  getBusyIntervals,
}