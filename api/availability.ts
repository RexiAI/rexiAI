import fs from 'fs'
import path from 'path'

import { google } from 'googleapis'

import { parseAvailabilityYaml, computeSlotsForDate, isPastDate } from '../src/domain/availability.js'
import { createCalendarAuth } from '../src/domain/googleAuth.js'
import { madridToUtc } from '../src/domain/time.js'

function loadConfig() {
  const p = path.join(process.cwd(), 'config', 'availability.yaml')
  const yaml = fs.readFileSync(p, 'utf8')
  return parseAvailabilityYaml(yaml)
}

async function queryBusy(calendarId: string, dayStart: Date, endOfDay: Date, auth: any) {
  const cal = google.calendar({ version: 'v3', auth } as any)
  const res: any = await (cal.freebusy as any).query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: endOfDay.toISOString(),
      items: [{ id: calendarId }],
    },
  })
  const busy = (res.data.calendars?.[calendarId]?.busy ?? []) as { start: string; end: string }[]
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
}

async function getBusyIntervals(dateStr: string): Promise<{ start: Date; end: Date }[]> {
  const calendarId = process.env['GOOGLE_CALENDAR_ID']
  const serviceJson = process.env['GOOGLE_SERVICE_ACCOUNT_JSON']
  if (!calendarId || !serviceJson || serviceJson.includes('REPLACE_ME')) return []
  try {
    const auth = createCalendarAuth(serviceJson)
    const dayStart = madridToUtc(dateStr, '00:00')
    const endOfDay = new Date(dayStart.getTime() + 24 * 3600000)
    return await queryBusy(calendarId, dayStart, endOfDay, auth)
  } catch {
    return []
  }
}

function filterSlotsByBusy(
  slots: string[],
  dateStr: string,
  busy: { start: Date; end: Date }[],
): string[] {
  if (busy.length === 0) return slots
  return slots.filter((s) => {
    const slotStart = madridToUtc(dateStr, s)
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
    res.status(400).json({ error: { code: 'INVALID_DATE', message: 'Invalid date format, expected YYYY-MM-DD' } })
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
    return loadConfig()
  } catch (e) {
    res.status(500).json({ error: { code: 'CONFIG_ERROR', message: e instanceof Error ? e.message : String(e) } })
    return null
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
  }
  const date = validateDateParam(req, res)
  if (!date) return
  const config = loadConfigOrError(res)
  if (!config) return
  const slots = computeSlotsForDate(config, date)
  const busy = await getBusyIntervals(date).catch(() => [] as { start: Date; end: Date }[])
  const filtered = filterSlotsByBusy(slots, date, busy)
  return res.status(200).json({ date, slots: filtered })
}

// Export for tests
export { filterSlotsByBusy, getBusyIntervals }
