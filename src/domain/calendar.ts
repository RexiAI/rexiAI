// Provider-agnostic calendar facade. The rest of the app depends only on the
// CalendarAdapter contract and the functions below; resolveAdapter() picks the
// implementation (currently the Microsoft Graph adapter in microsoftGraph.ts).
// Adding a second provider = one new case in resolveAdapter().

import { getCalendarProvider, type CalendarProvider } from './providers.js'
import { microsoftGraph } from './microsoftGraph.js'

export interface CreateCalendarEventInput {
  provider?: CalendarProvider
  timezone: string
  date: string
  startTime: string
  hours: number
  email: string
  joinUrl: string | null
  bookingId: string
}

export interface CalendarSlot {
  start: Date
  end: Date
}

export interface CalendarClient {
  fetchImpl: typeof fetch
}

export interface SlotInput {
  bookingId: string
  date: string
  startTime: string
  hours: number
}

export interface CalendarAdapter {
  createEvent(
    input: CreateCalendarEventInput,
    client?: CalendarClient
  ): Promise<{ alreadyExists: boolean }>
  findEventByBookingId(bookingId: string, client?: CalendarClient): Promise<boolean>
  findOverlappingBookingId(input: SlotInput, client?: CalendarClient): Promise<string | null>
  getBusyIntervals(date: string, timezone: string, client?: CalendarClient): Promise<CalendarSlot[]>
}

function resolveAdapter(): CalendarAdapter {
  const provider = getCalendarProvider()
  switch (provider) {
    case 'microsoft':
      return microsoftGraph
    default:
      // Unreachable while CalendarProvider has one member; this switch is the
      // single registration point for a second provider.
      throw new Error(`Unsupported calendar provider: ${provider}`)
  }
}

export function createCalendarEvent(
  input: CreateCalendarEventInput,
  opts?: { fetchImpl?: typeof fetch }
): Promise<{ alreadyExists: boolean }> {
  return resolveAdapter().createEvent(
    input,
    opts?.fetchImpl ? { fetchImpl: opts.fetchImpl } : undefined
  )
}

export function findEventByBookingId(bookingId: string): Promise<boolean> {
  return resolveAdapter().findEventByBookingId(bookingId)
}

export function findOverlappingBookingId(input: SlotInput): Promise<string | null> {
  return resolveAdapter().findOverlappingBookingId(input)
}

export function getBusyIntervals(date: string, timezone: string): Promise<CalendarSlot[]> {
  return resolveAdapter().getBusyIntervals(date, timezone)
}
