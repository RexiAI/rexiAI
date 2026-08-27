import { google } from 'googleapis'

import { createCalendarAuth } from '../../src/domain/googleAuth.js'
import { madridToUtc } from '../../src/domain/time.js'

async function queryFreeBusy(calendarId: string, slotStart: Date, slotEnd: Date, auth: any) {
  const cal = google.calendar({ version: 'v3', auth } as any)
  const res: any = await (cal.freebusy as any).query({
    requestBody: {
      timeMin: slotStart.toISOString(),
      timeMax: slotEnd.toISOString(),
      items: [{ id: calendarId }],
    },
  })
  return (res.data.calendars?.[calendarId]?.busy ?? []) as { start: string; end: string }[]
}

function getCalendarEnv(): { calendarId: string; serviceJson: string } | null {
  const calendarId = process.env['GOOGLE_CALENDAR_ID']
  const serviceJson = process.env['GOOGLE_SERVICE_ACCOUNT_JSON']
  if (!calendarId) return null
  if (!serviceJson) return null
  if (serviceJson.includes('REPLACE_ME')) return null
  return { calendarId, serviceJson }
}

async function fetchConflictBusy(
  calendarId: string,
  serviceJson: string,
  date: string,
  startTime: string,
  hours: number
) {
  const auth = createCalendarAuth(serviceJson)
  const slotStart = madridToUtc(date, startTime)
  const slotEnd = new Date(slotStart.getTime() + hours * 3600000)
  return { slotStart, slotEnd, busy: await queryFreeBusy(calendarId, slotStart, slotEnd, auth) }
}

function isOverlapping(
  slotStart: Date,
  slotEnd: Date,
  busy: { start: string; end: string }[]
): boolean {
  for (const b of busy) {
    if (slotStart < new Date(b.end) && slotEnd > new Date(b.start)) return true
  }
  return false
}

export async function hasConflict(
  date: string,
  startTime: string,
  hours: number
): Promise<boolean> {
  const env = getCalendarEnv()
  if (!env) return false
  try {
    const { slotStart, slotEnd, busy } = await fetchConflictBusy(
      env.calendarId,
      env.serviceJson,
      date,
      startTime,
      hours
    )
    return isOverlapping(slotStart, slotEnd, busy)
  } catch {
    return false
  }
}

function getDowForDate(date: string): string {
  const d = new Date(date + 'T12:00:00Z')
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Europe/Madrid' })
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
