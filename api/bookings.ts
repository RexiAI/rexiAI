import fs from 'fs'
import path from 'path'
import { parseAvailabilityYaml, computeSlotsForDate, isPastDate } from '../src/domain/availability.js'
import { priceCents } from '../src/domain/pricing.js'
import { isFreeHourAvailable } from '../src/domain/freeHour.js'
import { isValidEmail } from '../src/domain/validation.js'
import { madridToUtc } from '../src/domain/time.js'
import { getStripe } from '../src/domain/stripeClient.js'
import { createCalendarAuth } from '../src/domain/googleAuth.js'
import { google } from 'googleapis'

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function loadConfig() {
  const p = path.join(process.cwd(), 'config', 'availability.yaml')
  const yaml = fs.readFileSync(p, 'utf8')
  return parseAvailabilityYaml(yaml)
}

function loadConfigOrError(res: any) {
  try {
    return loadConfig()
  } catch (e) {
    res.status(500).json({ error: { code: 'CONFIG_ERROR', message: errMsg(e) } })
    return null
  }
}

async function queryFreeBusy(calendarId: string, slotStart: Date, slotEnd: Date, auth: any) {
  const cal = google.calendar({ version: 'v3', auth } as any)
  const res: any = await (cal.freebusy as any).query({
    requestBody: { timeMin: slotStart.toISOString(), timeMax: slotEnd.toISOString(), items: [{ id: calendarId }] },
  })
  return (res.data.calendars?.[calendarId]?.busy ?? []) as { start: string; end: string }[]
}

async function hasConflict(date: string, startTime: string, hours: number): Promise<boolean> {
  const calendarId = process.env['GOOGLE_CALENDAR_ID']
  const serviceJson = process.env['GOOGLE_SERVICE_ACCOUNT_JSON']
  if (!calendarId || !serviceJson || serviceJson.includes('REPLACE_ME')) return false
  try {
    const auth = createCalendarAuth(serviceJson)
    const slotStart = madridToUtc(date, startTime)
    const slotEnd = new Date(slotStart.getTime() + hours * 3600000)
    const busy = await queryFreeBusy(calendarId, slotStart, slotEnd, auth)
    for (const b of busy) if (slotStart < new Date(b.end) && slotEnd > new Date(b.start)) return true
    return false
  } catch {
    return false
  }
}

function getWindowsForDate(config: any, date: string) {
  if (date in config.exceptions) return config.exceptions[date] as { start: string; end: string }[]
  const d = new Date(date + 'T12:00:00Z')
  let dow = ''
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Europe/Madrid' })
    dow = fmt.format(d).toLowerCase()
  } catch {
    dow = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(date + 'T12:00:00Z').getUTCDay()]
  }
  return (config.weekly[dow] ?? []) as { start: string; end: string }[]
}

function isCovered(startMin: number, endMin: number, windows: { start: string; end: string }[]): boolean {
  for (const w of windows) {
    const s = parseInt(w.start.split(':')[0], 10) * 60 + parseInt(w.start.split(':')[1], 10)
    const e = parseInt(w.end.split(':')[0], 10) * 60 + parseInt(w.end.split(':')[1], 10)
    if (startMin >= s && endMin <= e) return true
  }
  return false
}

function validateEmail(email: string, res: any): boolean {
  if (!isValidEmail(email)) {
    res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Invalid email' } })
    return false
  }
  return true
}

function validateDate(date: string, res: any): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: { code: 'INVALID_DATE', message: 'Invalid date' } })
    return false
  }
  if (Number.isNaN(new Date(date + 'T00:00:00Z').getTime())) {
    res.status(400).json({ error: { code: 'INVALID_DATE', message: 'Invalid date' } })
    return false
  }
  const iso = new Date(date + 'T00:00:00Z').toISOString().slice(0, 10)
  if (iso !== date) {
    res.status(400).json({ error: { code: 'INVALID_DATE', message: 'Invalid date' } })
    return false
  }
  if (isPastDate(date)) {
    res.status(400).json({ error: { code: 'PAST_DATE', message: 'Date is in the past' } })
    return false
  }
  return true
}

function validateTime(startTime: string, res: any): boolean {
  if (typeof startTime !== 'string' || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
    res.status(400).json({ error: { code: 'INVALID_TIME', message: 'Invalid startTime' } })
    return false
  }
  return true
}

function validateHours(raw: unknown, res: any): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    // also handles fractional
    const priceCheck = priceCents(Number(raw), true)
    if (!priceCheck.ok) {
      res.status(400).json({ error: { code: 'INVALID_DURATION', message: priceCheck.error.message } })
      return null
    }
    res.status(400).json({ error: { code: 'INVALID_DURATION', message: 'durations must be whole hours' } })
    return null
  }
  const hours = Number(raw)
  const priceCheck = priceCents(hours, true)
  if (!priceCheck.ok) {
    res.status(400).json({ error: { code: 'INVALID_DURATION', message: priceCheck.error.message } })
    return null
  }
  return hours
}

function validateSlotCoverage(config: any, date: string, startTime: string, hours: number, res: any): boolean {
  const slots = computeSlotsForDate(config, date)
  if (!slots.includes(startTime)) {
    res.status(400).json({ error: { code: 'SLOT_UNAVAILABLE', message: 'Start time not in available slots' } })
    return false
  }
  const startMin = parseInt(startTime.split(':')[0], 10) * 60 + parseInt(startTime.split(':')[1], 10)
  const endMin = startMin + hours * 60
  const windows = getWindowsForDate(config, date)
  if (!isCovered(startMin, endMin, windows)) {
    res.status(400).json({ error: { code: 'SLOT_UNAVAILABLE', message: 'Booking exceeds availability window' } })
    return false
  }
  return true
}

function loadAndValidateSlot(date: string, startTime: string, hours: number, res: any): boolean {
  const config = loadConfigOrError(res)
  if (!config) return false
  return validateSlotCoverage(config, date, startTime, hours, res)
}

function validateInput(body: any, res: any): { email: string; date: string; startTime: string; hours: number } | null {
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const date = typeof body.date === 'string' ? body.date : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime : ''
  const hoursRaw = body.hours
  if (!validateEmail(email, res)) return null
  if (!validateDate(date, res)) return null
  if (!validateTime(startTime, res)) return null
  const hours = validateHours(hoursRaw, res)
  if (hours === null) return null
  return { email, date, startTime, hours }
}

function prepareBookingInput(req: any, res: any) {
  const input = validateInput(req.body ?? {}, res)
  if (!input) return null
  if (!loadAndValidateSlot(input.date, input.startTime, input.hours, res)) return null
  return input
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } })
  }
  const input = prepareBookingInput(req, res)
  if (!input) return
  if (await hasConflict(input.date, input.startTime, input.hours)) {
    return res.status(409).json({ error: { code: 'SLOT_CONFLICT', message: 'Slot already booked' } })
  }
  const checkout = await createCheckout(input.email, input.date, input.startTime, input.hours, req, res)
  if (!checkout) return
  return res.status(200).json({ checkoutUrl: checkout.url })
}

async function getFreeAvailable(email: string, res: any): Promise<boolean | null> {
  try {
    return await isFreeHourAvailable(email)
  } catch (e) {
    res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errMsg(e) } })
    return null
  }
}

function getBaseUrl(req: any): string {
  const host = req.headers?.host
  const h = host ? host : 'example.com'
  const protocol = req.headers?.['x-forwarded-proto']
  const p = protocol ? protocol : 'https'
  return `${p}://${h}`
}

type SessionOpts = { email: string; date: string; startTime: string; hours: number; freeAvailable: boolean; cents: number; req: any; res: any }

async function createSession(opts: SessionOpts) {
  try {
    const stripe = getStripe()
    const baseUrl = getBaseUrl(opts.req)
    return await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'eur',
      line_items: [{ price_data: { currency: 'eur', product_data: { name: `Booking ${opts.date} ${opts.startTime} (${opts.hours}h)` }, unit_amount: opts.cents }, quantity: 1 }],
      customer_email: opts.email,
      metadata: { email: opts.email, date: opts.date, start_time: opts.startTime, hours: String(opts.hours), free_hour_applied: String(opts.freeAvailable) },
      success_url: `${baseUrl}/booking/success`,
      cancel_url: `${baseUrl}/booking/cancel`,
    })
  } catch (e) {
    opts.res.status(500).json({ error: { code: 'STRIPE_ERROR', message: errMsg(e) } })
    return null
  }
}

async function createCheckout(email: string, date: string, startTime: string, hours: number, req: any, res: any) {
  const freeAvailable = await getFreeAvailable(email, res)
  if (freeAvailable === null) return null
  const priceRes = priceCents(hours, freeAvailable)
  if (!priceRes.ok) {
    res.status(400).json({ error: { code: 'INVALID_DURATION', message: priceRes.error.message } })
    return null
  }
  return createSession({ email, date, startTime, hours, freeAvailable, cents: priceRes.cents, req, res })
}
