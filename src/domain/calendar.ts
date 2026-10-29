// Provider-agnostic calendar facade. The rest of the app depends only on the
// CalendarAdapter contract and the functions below; resolveAdapter() picks the
// implementation (currently the Microsoft Graph adapter in microsoftGraph.ts).
// Adding a second provider = one new case in resolveAdapter().

import { microsoftGraph } from './microsoftGraph.js'
import { getCalendarProvider, type CalendarProvider } from './providers.js'

export interface CreateCalendarEventInput {
  provider?: CalendarProvider
  timezone: string
  date: string
  startTime: string
  hours: number
  email: string
  joinUrl: string | null
  bookingId: string
  /**
   * The booking's reschedule token (spec 007 Task 2). Omitted for a caller that
   * has none to offer — the rest of the reschedule state is still written, so
   * every booking, on both billing paths, is reschedulable from the start.
   */
  rescheduleToken?: string | null
  /** The booking's locale (`es`/`en`); stored so a move needs no other record. */
  locale?: string | null
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

/**
 * Everything a move needs about a booking, recovered from the calendar event
 * itself (spec 007 Task 2). There is no booking database: the billing-disabled
 * path has no Stripe session at all, so the event IS the record.
 */
export interface BookingRescheduleState {
  bookingId: string
  email: string
  /** The booking's CURRENT date, read from the event's start. */
  date: string
  /** The booking's CURRENT start time, read from the event's start. */
  startTime: string
  hours: number
  joinUrl: string | null
  locale: 'es' | 'en'
  /** How many reschedules have already happened. */
  count: number
}

/** A move to a new slot, carrying the state the event must keep. */
export interface MoveCalendarEventInput {
  provider?: CalendarProvider
  timezone: string
  bookingId: string
  /** The NEW date. */
  date: string
  /** The NEW start time; the duration stays `hours`. */
  startTime: string
  hours: number
  joinUrl?: string | null
  email?: string
  locale?: string | null
  /** The rotated token written to the event. */
  rescheduleToken: string
  /** The count written to the event (already incremented by the caller). */
  rescheduleCount: number
}

export interface CalendarAdapter {
  createEvent(
    input: CreateCalendarEventInput,
    client?: CalendarClient
  ): Promise<{ alreadyExists: boolean }>
  findEventByBookingId(bookingId: string, client?: CalendarClient): Promise<boolean>
  findOverlappingBookingId(input: SlotInput, client?: CalendarClient): Promise<string | null>
  getBusyIntervals(date: string, timezone: string, client?: CalendarClient): Promise<CalendarSlot[]>
  /** Resolves a reschedule token to its booking, or null when it is dead. */
  findBookingByRescheduleToken(
    token: string,
    client?: CalendarClient
  ): Promise<BookingRescheduleState | null>
  /** Moves the ONE existing event; the room and bookingId never change. */
  moveEvent(input: MoveCalendarEventInput, client?: CalendarClient): Promise<void>
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

export function findBookingByRescheduleToken(
  token: string,
  opts?: { fetchImpl?: typeof fetch }
): Promise<BookingRescheduleState | null> {
  return resolveAdapter().findBookingByRescheduleToken(
    token,
    opts?.fetchImpl ? { fetchImpl: opts.fetchImpl } : undefined
  )
}

export function moveCalendarEvent(
  input: MoveCalendarEventInput,
  opts?: { fetchImpl?: typeof fetch }
): Promise<void> {
  return resolveAdapter().moveEvent(
    input,
    opts?.fetchImpl ? { fetchImpl: opts.fetchImpl } : undefined
  )
}
