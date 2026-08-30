import { google } from 'googleapis'

import { loadAvailabilityConfig } from './availability.js'
import { createCalendarAuth } from './googleAuth.js'
import { zonedToUtc } from './time.js'

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

function getTimezone(): string {
  try {
    const cfg = loadAvailabilityConfig()
    return cfg.timezone
  } catch {
    return process.env['AVAILABILITY_TIMEZONE'] || process.env['TIMEZONE'] || 'Europe/Madrid'
  }
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

  const timezone = getTimezone()
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

// Export for testing the auth construction
export function _testGetCalendarConfig() {
  return getCalendarConfig()
}
