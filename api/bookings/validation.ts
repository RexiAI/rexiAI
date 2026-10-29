import {
  computeSlotsForDate,
  isPastDate,
  type AvailabilityConfig,
} from '../../src/domain/availability.js'
import { normalizeLocale, type Locale } from '../../src/domain/locale.js'
import { priceCents } from '../../src/domain/pricing.js'
import { isValidEmail, NAME_MAX_LENGTH } from '../../src/domain/validation.js'
import type { ApiRequest, ApiResponse } from '../httpTypes.js'

import { getWindowsForDate, isCovered } from './calendar.js'
import { loadConfigOrError } from './config.js'

function validateEmail(email: string, res: ApiResponse): boolean {
  if (!isValidEmail(email)) {
    res.status(400).json({ error: { code: 'INVALID_EMAIL', message: 'Invalid email' } })
    return false
  }
  return true
}

/**
 * Name at the API boundary (spec 008 Task 2): required, trimmed, bounded — no
 * character allow-list, deliberately. A name becomes a directory name only in the
 * recording processor, which sanitises it there (Task 8); rejecting `<` or `/`
 * here would refuse real names for a path concern that never reaches this layer.
 */
function validateName(name: string, res: ApiResponse): boolean {
  if (name === '') {
    res.status(400).json({ error: { code: 'INVALID_NAME', message: 'Name is required' } })
    return false
  }
  if (name.length > NAME_MAX_LENGTH) {
    res.status(400).json({ error: { code: 'INVALID_NAME', message: 'Name is too long' } })
    return false
  }
  return true
}

function validateDate(date: string, res: ApiResponse): boolean {
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

function validateTime(startTime: string, res: ApiResponse): boolean {
  if (typeof startTime !== 'string' || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
    res.status(400).json({ error: { code: 'INVALID_TIME', message: 'Invalid startTime' } })
    return false
  }
  return true
}

function validateHours(raw: unknown, res: ApiResponse): number | null {
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
  config: AvailabilityConfig,
  date: string,
  startTime: string,
  hours: number,
  res: ApiResponse
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

function loadAndValidateSlot(
  date: string,
  startTime: string,
  hours: number,
  res: ApiResponse
): boolean {
  const config = loadConfigOrError(res)
  if (!config) return false
  return validateSlotCoverage(config, date, startTime, hours, res)
}

function extractBookingFields(body: unknown): {
  email: string
  name: string
  date: string
  startTime: string
  hoursRaw: unknown
  localeRaw: unknown
} {
  const b = (body ?? {}) as Record<string, unknown>
  const email = typeof b.email === 'string' ? b.email.trim() : ''
  // Same trim pattern as email: the trimmed name is the one that gets stored,
  // emailed and later turned into a folder name.
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  const date = typeof b.date === 'string' ? b.date : ''
  const startTime = typeof b.startTime === 'string' ? b.startTime : ''
  return { email, name, date, startTime, hoursRaw: b.hours, localeRaw: b.locale }
}

/**
 * The booking's UI locale (spec 006 Task 8). ADDITIVE: an absent field stays
 * `undefined` so the pre-existing payload shape is untouched, while any supplied
 * value is normalised — `'en'` is the only value that selects English and an
 * unrecognised one degrades to Spanish instead of rejecting the booking.
 */
function normalizeBookingLocale(raw: unknown): Locale | undefined {
  if (raw === undefined || raw === null) return undefined
  return normalizeLocale(raw)
}

/** The request-shape validators, in pin order (name after email, before date). */
function fieldsValid(raw: ReturnType<typeof extractBookingFields>, res: ApiResponse): boolean {
  if (!validateEmail(raw.email, res)) return false
  if (!validateName(raw.name, res)) return false
  if (!validateDate(raw.date, res)) return false
  return validateTime(raw.startTime, res)
}

function validateInput(
  body: unknown,
  res: ApiResponse
): {
  email: string
  name: string
  date: string
  startTime: string
  hours: number
  locale?: Locale
} | null {
  const raw = extractBookingFields(body)
  if (!fieldsValid(raw, res)) return null
  const hours = validateHours(raw.hoursRaw, res)
  if (hours === null) return null
  const { email, name, date, startTime } = raw
  const locale = normalizeBookingLocale(raw.localeRaw)
  return locale
    ? { email, name, date, startTime, hours, locale }
    : { email, name, date, startTime, hours }
}

export function prepareBookingInput(req: ApiRequest, res: ApiResponse) {
  const input = validateInput(req.body ?? {}, res)
  if (!input) return null
  if (!loadAndValidateSlot(input.date, input.startTime, input.hours, res)) return null
  return input
}
