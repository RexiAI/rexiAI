import { google } from 'googleapis'

import { createCalendarAuth } from './googleAuth.js'
import { getConfiguredTimezone, zonedToUtc } from './time.js'

export interface GCalEventInput {
  bookingId: string
  email: string
  date: string
  startTime: string
  hours: number
}

function getCalendarConfig(): { calendarId: string; serviceJson: string } {
  const calendarId = process.env['GOOGLE_CALENDAR_ID']
  const serviceJson = process.env['GOOGLE_SERVICE_ACCOUNT_JSON']
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not set')
  if (!serviceJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  return { calendarId, serviceJson }
}

function buildAuth(serviceJson: string) {
  return createCalendarAuth(serviceJson)
}

function getCalendarClient() {
  const { serviceJson } = getCalendarConfig()
  const auth = buildAuth(serviceJson)
  return google.calendar({ version: 'v3', auth } as any)
}

export async function findEventByBookingId(
  bookingId: string,
  client?: ReturnType<typeof getCalendarClient>
): Promise<boolean> {
  const cal = client ?? getCalendarClient()
  const { calendarId } = getCalendarConfig()
  // Use list with privateExtendedProperty filter
  const res: any = await (cal.events as any).list({
    calendarId,
    privateExtendedProperty: `rexi_booking_id=${bookingId}`,
    maxResults: 10,
    singleEvents: true,
  })
  const items = (res.data.items ?? []) as unknown[]
  return items.length > 0
}

export async function createGCalEvent(
  input: GCalEventInput,
  client?: ReturnType<typeof getCalendarClient>
): Promise<{ alreadyExists: boolean }> {
  const cal = client ?? getCalendarClient()
  const { calendarId } = getCalendarConfig()

  const exists = await findEventByBookingId(input.bookingId, cal)
  if (exists) return { alreadyExists: true }

  const timezone = getConfiguredTimezone()
  const start = zonedToUtc(timezone, input.date, input.startTime)
  const end = new Date(start.getTime() + input.hours * 3600000)

  await (cal.events as any).insert({
    calendarId,
    requestBody: {
      summary: `Booking ${input.email}`,
      description: `Client: ${input.email} - ${input.hours}h`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      extendedProperties: {
        private: { rexi_booking_id: input.bookingId },
      },
    },
  })
  return { alreadyExists: false }
}

function eventBookingId(item: any): string | null {
  const id = item?.extendedProperties?.private?.rexi_booking_id
  return typeof id === 'string' && id ? id : null
}

function pickForeignBookingId(items: any[], bookingId: string): string | null {
  for (const item of items) {
    const other = eventBookingId(item)
    if (other && other !== bookingId) return other
  }
  return null
}

/**
 * The bookingId of an already-scheduled event overlapping [start, start+hours),
 * excluding this booking's own event — or null when the slot is clear.
 *
 * BEST-EFFORT, NOT A GUARANTEE: this is a read against the calendar, so two
 * webhooks racing for the same slot can both read "clear" before either
 * inserts. Without a transactional store there is no way to close that window
 * from here; the check narrows it and makes the common case visible to the
 * operator instead of silently double-booking.
 */
export async function findOverlappingBookingId(
  input: { bookingId: string; date: string; startTime: string; hours: number },
  client?: ReturnType<typeof getCalendarClient>
): Promise<string | null> {
  const cal = client ?? getCalendarClient()
  const { calendarId } = getCalendarConfig()
  const timezone = getConfiguredTimezone()
  const start = zonedToUtc(timezone, input.date, input.startTime)
  const end = new Date(start.getTime() + input.hours * 3600000)
  const res: any = await (cal.events as any).list({
    calendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    maxResults: 50,
  })
  return pickForeignBookingId((res?.data?.items ?? []) as any[], input.bookingId)
}

// Export for testing the auth construction
export function _testGetCalendarConfig() {
  return getCalendarConfig()
}
