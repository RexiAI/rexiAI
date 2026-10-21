// Google Calendar TEMPLATE link builder (spec 003 Task 1). Pure URL construction
// for the "Añadir a Google Calendar" secondary CTA in the billing-disabled
// emails. Slot times run through the SAME env timezone chain the direct-path
// calendar event uses (AVAILABILITY_TIMEZONE → TIMEZONE → Europe/Madrid, DST
// correct via zonedToUtc) — no second conversion, no fixed UTC offset.
//
// Parameter contract (10-tasks Decision 7): exactly action, text, dates, details
// in that order, everything dynamic through encodeURIComponent, the slash in
// `dates` raw and structural. Byte-deterministic output on purpose — mutation
// testing and the AC-003-10…13 scenarios pin exact strings.
import { slotIntervalUtc } from './time.js'

export interface CalendarLinkSlot {
  date: string
  startTime: string
  hours: number
  title: string
  details: string
}

const RENDER_BASE = 'https://calendar.google.com/calendar/render'

/** UTC 'YYYYMMDDTHHMMSSZ' — toISOString keeps the Zulu frame; drop the
 *  separators and the milliseconds, keep the structural T. */
function formatUtcStamp(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`
}

export function buildCalendarTemplateUrl(slot: CalendarLinkSlot): string {
  const { start, end } = slotIntervalUtc(slot.date, slot.startTime, slot.hours)
  const dates = `${formatUtcStamp(start)}/${formatUtcStamp(end)}`
  return (
    `${RENDER_BASE}?action=TEMPLATE` +
    `&text=${encodeURIComponent(slot.title)}` +
    `&dates=${dates}` +
    `&details=${encodeURIComponent(slot.details)}`
  )
}
