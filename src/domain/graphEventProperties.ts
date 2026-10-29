// What a booking event carries (spec 007 Task 2). Split out of microsoftGraph.ts
// so the adapter stays about talking to Graph and this file stays about the
// state a booking needs kept on its event — the property ids, the write shape,
// and the defensive read that turns one event back into a booking.
//
// There is no booking database: the billing-disabled path creates a UUID booking
// with no Stripe session at all, so the event is the record.
import type { BookingRescheduleState } from './calendar.js'
import { normalizeLocale } from './locale.js'
import { REAL_MEETING_HOST, roomFromJoinUrl } from './meetingUrl.js'

/**
 * Every property the adapter owns shares the same named-property GUID, which is
 * what makes them a set a calendar client can round-trip without a schema.
 */
const PROPERTY_PREFIX = 'String {00020329-0000-0000-C000-000000000046} Name '

function propertyId(name: string): string {
  return `${PROPERTY_PREFIX}${name}`
}

export const DEDUP_PROPERTY_ID = propertyId('rexi_booking_id')
export const RESCHEDULE_TOKEN_PROPERTY_ID = propertyId('rexi_reschedule_token')
export const RESCHEDULE_COUNT_PROPERTY_ID = propertyId('rexi_reschedule_count')
export const JOIN_URL_PROPERTY_ID = propertyId('rexi_join_url')
export const CLIENT_EMAIL_PROPERTY_ID = propertyId('rexi_client_email')
export const HOURS_PROPERTY_ID = propertyId('rexi_hours')
export const LOCALE_PROPERTY_ID = propertyId('rexi_locale')

export interface ExtendedProperty {
  id: string
  value: string
}

/** The reschedule state written on create and re-written on every move. */
export interface ReschedulePropertiesInput {
  bookingId: string
  email?: string | null
  hours: number
  joinUrl?: string | null
  locale?: unknown
  rescheduleToken?: string | null
  rescheduleCount: number
}

/**
 * Emitted whole on a PATCH rather than as a delta: the property set is what the
 * booking needs, and an omitted property is a property a later move can no
 * longer read. The dedup property stays FIRST because the dedup probe reads
 * index 0.
 */
export function rescheduleProperties(input: ReschedulePropertiesInput): ExtendedProperty[] {
  const properties: ExtendedProperty[] = [{ id: DEDUP_PROPERTY_ID, value: input.bookingId }]
  if (input.rescheduleToken) {
    properties.push({ id: RESCHEDULE_TOKEN_PROPERTY_ID, value: input.rescheduleToken })
  }
  properties.push({ id: RESCHEDULE_COUNT_PROPERTY_ID, value: String(input.rescheduleCount) })
  if (input.joinUrl) properties.push({ id: JOIN_URL_PROPERTY_ID, value: input.joinUrl })
  if (input.email) properties.push({ id: CLIENT_EMAIL_PROPERTY_ID, value: input.email })
  properties.push({ id: HOURS_PROPERTY_ID, value: String(input.hours) })
  properties.push({ id: LOCALE_PROPERTY_ID, value: normalizeLocale(input.locale) })
  return properties
}

function propertyOf(raw: unknown): ExtendedProperty | null {
  const p = raw as { id?: unknown; value?: unknown } | null
  if (typeof p?.id !== 'string') return null
  if (typeof p.value !== 'string') return null
  return { id: p.id, value: p.value }
}

function extendedPropertiesOf(item: unknown): unknown[] | undefined {
  return (item as { singleValueExtendedProperties?: unknown[] } | null)
    ?.singleValueExtendedProperties
}

/** Every well-formed property on an event, in the order the event lists them. */
function propertiesList(item: unknown): ExtendedProperty[] {
  const props = extendedPropertiesOf(item)
  if (!Array.isArray(props)) return []
  const out: ExtendedProperty[] = []
  for (const raw of props) {
    const property = propertyOf(raw)
    if (property) out.push(property)
  }
  return out
}

/** Every extended property on an event, as a plain map. */
export function propertiesOf(item: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const property of propertiesList(item)) out[property.id] = property.value
  return out
}

/** The booking id on an event, or null when it carries none. */
export function pickBookingId(item: unknown): string | null {
  const dedup = propertiesList(item).find((property) => property.id === DEDUP_PROPERTY_ID)
  return dedup ? dedup.value : null
}

/** The `location` value, or undefined when there is no branded join URL. */
export function brandedLocation(
  joinUrl: string | null | undefined
): { displayName: string } | undefined {
  if (!joinUrl) return undefined
  if (!roomFromJoinUrl(joinUrl)) return undefined
  try {
    // Decision D4: one link, one experience. The raw Jitsi room is never put in
    // a field a calendar client renders as the meeting's whereabouts.
    if (new URL(joinUrl).origin === REAL_MEETING_HOST) return undefined
  } catch {
    return undefined
  }
  return { displayName: joinUrl }
}

function intOr(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** `YYYY-MM-DDTHH:MM:SS` → its date and time halves, or null. */
export function splitDateTime(raw: string): { date: string; time: string } | null {
  const sep = raw.indexOf('T')
  if (sep < 0) return null
  const date = raw.slice(0, sep)
  const time = raw.slice(sep + 1)
  if (!date || !time) return null
  return { date, time }
}

/** The event's own start, split into a local date and time, or null. */
function startOf(item: unknown): { date: string; time: string } | null {
  const start = (item as { start?: { dateTime?: string } } | null)?.start?.dateTime
  return start ? splitDateTime(start) : null
}

/**
 * Reads the booking state a move needs out of one event, or null when the event
 * is not a usable booking (no booking id, or an unreadable start).
 */
export function toBookingState(
  item: unknown,
  properties: Record<string, string>
): BookingRescheduleState | null {
  const bookingId = properties[DEDUP_PROPERTY_ID]
  const start = startOf(item)
  if (!bookingId || !start) return null
  return {
    bookingId,
    email: properties[CLIENT_EMAIL_PROPERTY_ID] ?? '',
    date: start.date,
    startTime: start.time.slice(0, 5),
    hours: intOr(properties[HOURS_PROPERTY_ID], 1),
    joinUrl: properties[JOIN_URL_PROPERTY_ID] ?? null,
    locale: normalizeLocale(properties[LOCALE_PROPERTY_ID]),
    count: intOr(properties[RESCHEDULE_COUNT_PROPERTY_ID], 0),
  }
}
