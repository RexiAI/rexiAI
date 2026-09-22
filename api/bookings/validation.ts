import { computeSlotsForDate, isPastDate } from '../../src/domain/availability.js'
import { priceCents } from '../../src/domain/pricing.js'
import { isValidEmail } from '../../src/domain/validation.js'

import { getWindowsForDate, isCovered } from './calendar.js'
import { loadConfigOrError } from './config.js'

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
    const priceCheck = priceCents(Number(raw), true)
    if (!priceCheck.ok) {
      res
        .status(400)
        .json({ error: { code: 'INVALID_DURATION', message: priceCheck.error.message } })
      return null
    }
    res
      .status(400)
      .json({ error: { code: 'INVALID_DURATION', message: 'durations must be whole hours' } })
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

function validateSlotCoverage(
  config: any,
  date: string,
  startTime: string,
  hours: number,
  res: any
): boolean {
  const slots = computeSlotsForDate(config, date)
  if (!slots.includes(startTime)) {
    res
      .status(400)
      .json({ error: { code: 'SLOT_UNAVAILABLE', message: 'Start time not in available slots' } })
    return false
  }
  const startMin =
    parseInt(startTime.split(':')[0], 10) * 60 + parseInt(startTime.split(':')[1], 10)
  const endMin = startMin + hours * 60
  const windows = getWindowsForDate(config, date)
  if (!isCovered(startMin, endMin, windows)) {
    res
      .status(400)
      .json({ error: { code: 'SLOT_UNAVAILABLE', message: 'Booking exceeds availability window' } })
    return false
  }
  return true
}

function loadAndValidateSlot(date: string, startTime: string, hours: number, res: any): boolean {
  const config = loadConfigOrError(res)
  if (!config) return false
  return validateSlotCoverage(config, date, startTime, hours, res)
}

function extractBookingFields(body: any): {
  email: string
  date: string
  startTime: string
  hoursRaw: unknown
} {
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const date = typeof body.date === 'string' ? body.date : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime : ''
  return { email, date, startTime, hoursRaw: body.hours }
}

function validateInput(
  body: any,
  res: any
): { email: string; date: string; startTime: string; hours: number } | null {
  const { email, date, startTime, hoursRaw } = extractBookingFields(body)
  if (!validateEmail(email, res)) return null
  if (!validateDate(date, res)) return null
  if (!validateTime(startTime, res)) return null
  const hours = validateHours(hoursRaw, res)
  if (hours === null) return null
  return { email, date, startTime, hours }
}

export function prepareBookingInput(req: any, res: any) {
  const input = validateInput(req.body ?? {}, res)
  if (!input) return null
  if (!loadAndValidateSlot(input.date, input.startTime, input.hours, res)) return null
  return input
}
