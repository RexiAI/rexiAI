import { getBusyIntervals } from '../../src/domain/calendar.js'
import { getConfiguredTimezone, zonedToUtc } from '../../src/domain/time.js'

function isOverlapping(
  slotStart: Date,
  slotEnd: Date,
  busy: { start: Date; end: Date }[]
): boolean {
  for (const b of busy) {
    if (slotStart < b.end && slotEnd > b.start) return true
  }
  return false
}

export async function hasConflict(
  date: string,
  startTime: string,
  hours: number
): Promise<boolean> {
  const timezone = getConfiguredTimezone()
  const slotStart = zonedToUtc(timezone, date, startTime)
  const slotEnd = new Date(slotStart.getTime() + hours * 3600000)
  try {
    const busy = await getBusyIntervals(date, timezone)
    return isOverlapping(slotStart, slotEnd, busy)
  } catch {
    // A calendar outage must never block a booking; the webhook's overlap
    // detection is the backstop that surfaces conflicts after the fact.
    return false
  }
}

function getDowForDate(date: string): string {
  const timezone = getConfiguredTimezone()
  const d = new Date(date + 'T12:00:00Z')
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone })
    return fmt.format(d).toLowerCase()
  } catch {
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      d.getUTCDay()
    ]
  }
}

export function getWindowsForDate(config: any, date: string) {
  if (date in config.exceptions) return config.exceptions[date] as { start: string; end: string }[]
  const dow = getDowForDate(date)
  return (config.weekly[dow] ?? []) as { start: string; end: string }[]
}

export function isCovered(
  startMin: number,
  endMin: number,
  windows: { start: string; end: string }[]
): boolean {
  for (const w of windows) {
    const s = parseInt(w.start.split(':')[0], 10) * 60 + parseInt(w.start.split(':')[1], 10)
    const e = parseInt(w.end.split(':')[0], 10) * 60 + parseInt(w.end.split(':')[1], 10)
    if (startMin >= s && endMin <= e) return true
  }
  return false
}
