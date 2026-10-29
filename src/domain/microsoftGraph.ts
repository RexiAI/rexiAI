// Microsoft Graph calendar adapter — the calendar implementation behind the
// provider-agnostic facade in calendar.ts. Talks to the signed-in user's own
// mailbox (/me/…) with a delegated access token from microsoftAuth.
//
// What a booking event CARRIES (its extended properties, and the read back into
// a booking) lives in graphEventProperties.ts: this file is only about the
// requests.

import type {
  BookingRescheduleState,
  CalendarAdapter,
  CalendarClient,
  CalendarSlot,
  CreateCalendarEventInput,
  MoveCalendarEventInput,
} from './calendar.js'
import {
  DEDUP_PROPERTY_ID,
  RESCHEDULE_TOKEN_PROPERTY_ID,
  brandedLocation,
  pickBookingId,
  propertiesOf,
  rescheduleProperties,
  splitDateTime,
  toBookingState,
} from './graphEventProperties.js'
import { getMicrosoftAccessToken } from './microsoftAuth.js'
import { isValidRescheduleToken } from './rescheduleToken.js'
import { zonedToUtc } from './time.js'

// Re-exported so the adapter module keeps its documented surface: the property
// ids are part of the contract other modules and tests refer to.
export {
  CLIENT_EMAIL_PROPERTY_ID,
  DEDUP_PROPERTY_ID,
  HOURS_PROPERTY_ID,
  JOIN_URL_PROPERTY_ID,
  LOCALE_PROPERTY_ID,
  RESCHEDULE_COUNT_PROPERTY_ID,
  RESCHEDULE_TOKEN_PROPERTY_ID,
} from './graphEventProperties.js'

const BASE = 'https://graph.microsoft.com/v1.0'

/**
 * The create shape with its optional fields genuinely optional: callers that
 * predate spec 006/007 (a booking with no room, no locale, no token) still call
 * this directly, and an omitted field must stay omitted rather than become null.
 */
export type GraphEventInput = Omit<CreateCalendarEventInput, 'joinUrl' | 'timezone'> & {
  joinUrl?: string | null
  timezone?: string
}

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

function toUtcOrNull(timezone: string, date: string, time: string): Date | null {
  try {
    return zonedToUtc(timezone, date, time)
  } catch {
    return null
  }
}

/** Graph event start/end ({ dateTime, timeZone }) → Date, or null when unusable. */
function parseGraphDateTime(dt: { dateTime?: string; timeZone?: string } | undefined): Date | null {
  // `||`, not `??`: Graph can send an empty timeZone, and both an empty string
  // and a missing one must fall back to UTC rather than reach zonedToUtc and throw.
  const raw = dt ? dt.dateTime : null
  if (!raw) return null
  const parts = splitDateTime(raw)
  if (!parts) return null
  return toUtcOrNull(dt?.timeZone || 'UTC', parts.date, parts.time.slice(0, 5))
}

function collectBusy(
  value:
    | Array<{
        start?: { dateTime?: string; timeZone?: string }
        end?: { dateTime?: string; timeZone?: string }
      }>
    | undefined
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

/** One GET against /me/events, with the label that makes a failure diagnosable. */
async function listEvents(
  query: URLSearchParams,
  fetchImpl: typeof fetch,
  errorLabel: string
): Promise<unknown[]> {
  const token = await getMicrosoftAccessToken(fetchImpl)
  const res = await fetchImpl(eventsUrl(query.toString()), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${errorLabel}: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { value?: unknown[] }
  return data.value ?? []
}

/**
 * Every event the mailbox holds, with its single-value extended properties
 * expanded. The 100-event ceiling is the same one the dedup probe has always
 * had; a mailbox that outgrows it needs a server-side extended-property filter,
 * not a bigger number here.
 */
function listEventsWithProperties(fetchImpl: typeof fetch): Promise<unknown[]> {
  return listEvents(
    new URLSearchParams({ $expand: 'singleValueExtendedProperties', $top: '100' }),
    fetchImpl,
    'Graph list events failed'
  )
}

/** The event carrying `bookingId`, or undefined. */
function findEventItem(items: unknown[], bookingId: string): unknown {
  return items.find((item) => pickBookingId(item) === bookingId)
}

/** The Graph id of the event for a booking, or a loud failure (never a stray write). */
function requireGraphId(items: unknown[], bookingId: string): string {
  const item = findEventItem(items, bookingId)
  const graphId = (item as { id?: unknown } | undefined)?.id
  // Nothing to move. Throwing beats writing a second event for the same booking,
  // which would leave two rooms for one client.
  if (!item || typeof graphId !== 'string' || !graphId) {
    throw new Error(`Graph event not found for booking ${bookingId}`)
  }
  return graphId
}

/** The PATCH body: new slot, whole reschedule state, branded location. */
function movePatch(input: MoveCalendarEventInput): Record<string, unknown> {
  const timezone = input.timezone ?? 'Europe/Madrid'
  const { endDate, endTime } = localSlotEnd(input.date, input.startTime, input.hours)
  const location = brandedLocation(input.joinUrl)
  return {
    start: { dateTime: `${input.date}T${input.startTime}:00`, timeZone: timezone },
    end: { dateTime: `${endDate}T${endTime}:00`, timeZone: timezone },
    singleValueExtendedProperties: rescheduleProperties({
      bookingId: input.bookingId,
      email: input.email,
      hours: input.hours,
      joinUrl: input.joinUrl,
      locale: input.locale,
      rescheduleToken: input.rescheduleToken,
      rescheduleCount: input.rescheduleCount,
    }),
    ...(location ? { location } : {}),
  }
}

/** The POST body for a new booking event: facts, join link, reschedule state. */
function createBody(input: GraphEventInput, timezone: string): Record<string, unknown> {
  const { endDate, endTime } = localSlotEnd(input.date, input.startTime, input.hours)
  const location = brandedLocation(input.joinUrl)
  // No isOnlineMeeting/onlineMeetingProvider: meetings are Jitsi rooms (free,
  // personal-account compatible); the join link goes into the body and, since
  // decision D4, into `location` as well (the branded URL, never the room).
  return {
    subject: `Booking ${input.email}`,
    body: {
      contentType: 'HTML',
      content: `Client: ${input.email} - ${input.hours}h${input.joinUrl ? `<br/><a href="${input.joinUrl}">Join meeting: ${input.joinUrl}</a>` : ''}`,
    },
    start: { dateTime: `${input.date}T${input.startTime}:00`, timeZone: timezone },
    end: { dateTime: `${endDate}T${endTime}:00`, timeZone: timezone },
    attendees: [{ emailAddress: { address: input.email }, type: 'required' }],
    singleValueExtendedProperties: rescheduleProperties({
      bookingId: input.bookingId,
      email: input.email,
      hours: input.hours,
      joinUrl: input.joinUrl,
      locale: input.locale,
      rescheduleToken: input.rescheduleToken,
      rescheduleCount: 0,
    }),
    ...(location ? { location } : {}),
  }
}

export async function createGraphEvent(
  input: GraphEventInput,
  client?: CalendarClient
): Promise<{ alreadyExists: boolean }> {
  const { fetchImpl } = defaultClient(client)
  const token = await getMicrosoftAccessToken(fetchImpl)

  // Dedup guard: a booking id already on the calendar means the webhook already
  // wrote this event (same contract as the previous provider implementations).
  const exists = await findEventByBookingId(input.bookingId, { fetchImpl })
  if (exists) return { alreadyExists: true }

  const body = createBody(input, input.timezone ?? 'Europe/Madrid')
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
  const items = await listEvents(
    new URLSearchParams({
      $expand: `singleValueExtendedProperties($filter=id eq '${DEDUP_PROPERTY_ID}')`,
      $top: '100',
    }),
    fetchImpl,
    'Graph find event failed'
  )
  return items.some((item) => pickBookingId(item) === bookingId)
}

/**
 * A dead token (wrong, rotated, or never issued) resolves to null, and a
 * malformed candidate resolves to null WITHOUT a Graph call (AC-007-06): a
 * forwarded or truncated link must not cost a calendar request.
 */
export async function findBookingByRescheduleToken(
  token: string,
  client?: CalendarClient
): Promise<BookingRescheduleState | null> {
  if (!isValidRescheduleToken(token)) return null
  const { fetchImpl } = defaultClient(client)
  const items = await listEventsWithProperties(fetchImpl)
  for (const item of items) {
    const properties = propertiesOf(item)
    if (properties[RESCHEDULE_TOKEN_PROPERTY_ID] !== token) continue
    return toBookingState(item, properties)
  }
  return null
}

/**
 * Moves the ONE existing event: a PATCH of its start/end, so the old slot is
 * released, and the Graph id, body, attendees, subject and room all survive.
 */
export async function moveGraphEvent(
  input: MoveCalendarEventInput,
  client?: CalendarClient
): Promise<void> {
  const { fetchImpl } = defaultClient(client)
  const accessToken = await getMicrosoftAccessToken(fetchImpl)
  const items = await listEventsWithProperties(fetchImpl)
  const graphId = requireGraphId(items, input.bookingId)

  const res = await fetchImpl(`${BASE}/me/events/${encodeURIComponent(graphId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(movePatch(input)),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Graph move event failed: ${res.status} ${text}`)
  }
}

/**
 * The first OTHER booking overlapping the slot, or null. Excluding the caller's
 * own bookingId is what makes "move my meeting by an hour, overlapping where it
 * is right now" a legal move rather than a self-conflict (AC-007-19).
 */
export async function findOverlappingBookingId(
  input: { bookingId: string; date: string; startTime: string; hours: number },
  client?: CalendarClient
): Promise<string | null> {
  const { fetchImpl } = defaultClient(client)
  const { endDate, endTime } = localSlotEnd(input.date, input.startTime, input.hours)
  const startLocal = `${input.date}T${input.startTime}:00`
  const endLocal = `${endDate}T${endTime}:00`
  const items = await listEvents(
    new URLSearchParams({
      $filter: `end/dateTime gt '${startLocal}' and start/dateTime lt '${endLocal}'`,
      $expand: `singleValueExtendedProperties($filter=id eq '${DEDUP_PROPERTY_ID}')`,
      $top: '50',
    }),
    fetchImpl,
    'Graph find overlap failed'
  )
  for (const item of items) {
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
    value?: Array<{
      start?: { dateTime?: string; timeZone?: string }
      end?: { dateTime?: string; timeZone?: string }
    }>
  }
  return mergeBusySlots(collectBusy(data.value))
}

/** The Microsoft Graph implementation of the CalendarAdapter contract. */
export const microsoftGraph: CalendarAdapter = {
  createEvent: createGraphEvent,
  findEventByBookingId,
  findOverlappingBookingId,
  getBusyIntervals,
  findBookingByRescheduleToken,
  moveEvent: moveGraphEvent,
}
