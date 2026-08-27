import { parse } from 'yaml'

export interface Window {
  start: string
  end: string
}

export interface AvailabilityConfig {
  timezone: string
  weekly: Record<string, Window[]>
  exceptions: Record<string, Window[]>
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function parseMinutes(t: string): number | null {
  const m = TIME_RE.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h * 60 + min
}

function formatMinutes(mins: number): string {
  const h = String(Math.floor(mins / 60)).padStart(2, '0')
  const m = String(mins % 60).padStart(2, '0')
  return `${h}:${m}`
}

function parseRawYaml(yamlString: string): unknown {
  try {
    return parse(yamlString)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Failed to parse availability.yaml: ${msg}`, { cause: e })
  }
}

function ensureRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Failed to parse availability.yaml: expected object')
  }
  return raw as Record<string, unknown>
}

function validateTimezone(obj: Record<string, unknown>): void {
  if (!('timezone' in obj)) {
    throw new Error('availability.yaml: timezone is required and must be "Europe/Madrid"')
  }
  if (obj['timezone'] !== 'Europe/Madrid') {
    throw new Error('availability.yaml: timezone must be "Europe/Madrid"')
  }
}

function extractWindowBounds(win: unknown, context: string): { start: string; end: string } {
  if (!win || typeof win !== 'object' || Array.isArray(win)) {
    throw new Error(`availability.yaml: invalid window in ${context}`)
  }
  const w2 = win as Record<string, unknown>
  const start = w2['start']
  const end = w2['end']
  if (typeof start !== 'string' || typeof end !== 'string') {
    throw new Error(`availability.yaml: window start/end must be HH:mm strings in ${context}`)
  }
  return { start, end }
}

function validateTimes(start: string, end: string, context: string): void {
  const sMin = parseMinutes(start)
  if (sMin === null) throw new Error(`availability.yaml: invalid time value "${start}" in ${context}`)
  const eMin = parseMinutes(end)
  if (eMin === null) throw new Error(`availability.yaml: invalid time value "${end}" in ${context}`)
  if (eMin <= sMin) {
    throw new Error(`availability.yaml: window end must be after start in ${context}: ${start} - ${end}`)
  }
}

function validateSingleWindow(win: unknown, context: string): Window {
  const { start, end } = extractWindowBounds(win, context)
  validateTimes(start, end, context)
  return { start, end }
}

function validateWindowArray(windows: unknown, context: string): Window[] {
  if (!Array.isArray(windows)) {
    throw new Error(`availability.yaml: ${context} must be an array`)
  }
  const out: Window[] = []
  for (const win of windows) {
    out.push(validateSingleWindow(win, context))
  }
  return out
}

function assertValidDateKey(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`availability.yaml: exception key "${date}" must be YYYY-MM-DD`)
  }
}

function extractOptionalRecord(obj: Record<string, unknown>, key: string, errorMsg: string): Record<string, unknown> | null {
  const raw = obj[key]
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(errorMsg)
  }
  return raw as Record<string, unknown>
}

function parseWeeklySection(obj: Record<string, unknown>): Record<string, Window[]> {
  const rec = extractOptionalRecord(obj, 'weekly', 'availability.yaml: weekly must be an object')
  if (!rec) return {}
  const out: Record<string, Window[]> = {}
  for (const [day, windows] of Object.entries(rec)) {
    out[day.toLowerCase()] = validateWindowArray(windows, `weekly.${day}`)
  }
  return out
}

function parseExceptionsSection(obj: Record<string, unknown>): Record<string, Window[]> {
  const rec = extractOptionalRecord(obj, 'exceptions', 'availability.yaml: exceptions must be an object')
  if (!rec) return {}
  const out: Record<string, Window[]> = {}
  for (const [date, windows] of Object.entries(rec)) {
    assertValidDateKey(date)
    out[date] = validateWindowArray(windows, `exceptions["${date}"]`)
  }
  return out
}

export function parseAvailabilityYaml(yamlString: string): AvailabilityConfig {
  const raw = parseRawYaml(yamlString)
  const obj = ensureRecord(raw)
  validateTimezone(obj)
  const weekly = parseWeeklySection(obj)
  const exceptions = parseExceptionsSection(obj)
  return { timezone: 'Europe/Madrid', weekly, exceptions }
}

function slotsFromWindows(windows: Window[]): string[] {
  const slots: string[] = []
  for (const w of windows) {
    const s = parseMinutes(w.start)!
    const e = parseMinutes(w.end)!
    for (let t = s; t + 60 <= e; t += 60) {
      slots.push(formatMinutes(t))
    }
  }
  return slots.sort()
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function weekdayForDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Europe/Madrid' })
    const parts = fmt.format(d).toLowerCase()
    if (DAY_NAMES.includes(parts)) return parts
  } catch {
    // fallback
  }
  return DAY_NAMES[new Date(dateStr + 'T12:00:00Z').getUTCDay()]
}

export function computeSlotsForDate(config: AvailabilityConfig, dateStr: string): string[] {
  if (dateStr in config.exceptions) {
    return slotsFromWindows(config.exceptions[dateStr])
  }
  const weekday = weekdayForDate(dateStr)
  const windows = config.weekly[weekday] ?? []
  return slotsFromWindows(windows)
}

// Helper to get today string in Europe/Madrid
export function todayInMadrid(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

export function isPastDate(dateStr: string): boolean {
  const today = todayInMadrid()
  return dateStr < today
}
