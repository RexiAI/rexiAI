import {
  loadAvailabilityConfig,
  computeSlotsForDate,
  isPastDate,
} from '../src/domain/availability.js'
import { getBusyIntervals as getCalendarBusyIntervals } from '../src/domain/calendar.js'
import { zonedToUtc } from '../src/domain/time.js'

async function getBusyIntervals(
  dateStr: string,
  timezone: string
): Promise<{ start: Date; end: Date }[]> {
  try {
    return await getCalendarBusyIntervals(dateStr, timezone)
  } catch {
    // A calendar outage degrades availability to "all slots open" rather than
    // hiding the whole endpoint; the slot-conflict backstop still catches
    // double bookings at the webhook.
    return []
  }
}

function filterSlotsByBusy(
  slots: string[],
  dateStr: string,
  busy: { start: Date; end: Date }[],
  timezone = 'Europe/Madrid'
): string[] {
  if (busy.length === 0) return slots
  return slots.filter((s) => {
    const slotStart = zonedToUtc(timezone, dateStr, s)
    const slotEnd = new Date(slotStart.getTime() + 3600000)
    for (const b of busy) if (slotStart < b.end && slotEnd > b.start) return false
    return true
  })
}

function isValidDateFormat(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (Number.isNaN(new Date(date + 'T00:00:00Z').getTime())) return false
  const iso = new Date(date + 'T00:00:00Z').toISOString().slice(0, 10)
  return iso === date
}

function validateDateParam(req: any, res: any): string | null {
  const date = req.query?.date as string | undefined
  if (!date) {
    res.status(400).json({ error: { code: 'MISSING_DATE', message: 'Missing date parameter' } })
    return null
  }
  if (!isValidDateFormat(date)) {
    res.status(400).json({
      error: { code: 'INVALID_DATE', message: 'Invalid date format, expected YYYY-MM-DD' },
    })
    return null
  }
  if (isPastDate(date)) {
    res.status(400).json({ error: { code: 'PAST_DATE', message: 'Date is in the past' } })
    return null
  }
  return date
}

function loadConfigOrError(res: any) {
  try {
    return loadAvailabilityConfig()
  } catch (e) {
    res.status(500).json({
      error: { code: 'CONFIG_ERROR', message: e instanceof Error ? e.message : String(e) },
    })
    return null
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
  }
  const date = validateDateParam(req, res)
  if (!date) return
  const config = loadConfigOrError(res)
  if (!config) return
  const slots = computeSlotsForDate(config, date)
  const busy = await getBusyIntervals(date, config.timezone).catch(
    () => [] as { start: Date; end: Date }[]
  )
  const filtered = filterSlotsByBusy(slots, date, busy, config.timezone)
  return res.status(200).json({ date, slots: filtered })
}

// Export for tests
export { filterSlotsByBusy, getBusyIntervals }
