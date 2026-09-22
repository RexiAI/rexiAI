import fs from 'fs'
import path from 'path'

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

function matchesIanaPattern(tz: string): boolean {
  return /^[A-Za-z_]+\/[A-Za-z_/]+$/.test(tz)
}

function canFormatTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
    return true
  } catch {
    return false
  }
}

function isValidIanaTimezone(tz: string): boolean {
  if (!matchesIanaPattern(tz)) return false
  const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
  if (typeof anyIntl.supportedValuesOf === 'function') {
    const list = anyIntl.supportedValuesOf('timeZone') as string[]
    if (list.includes(tz)) return true
  }
  return canFormatTimezone(tz)
}

function validateTimezone(obj: Record<string, unknown>): void {
  if (!('timezone' in obj)) {
    throw new Error(
      'availability.yaml: timezone is required and must be a valid IANA timezone (e.g. "Europe/Madrid")'
    )
  }
  const tz = obj['timezone']
  if (typeof tz !== 'string' || !isValidIanaTimezone(tz)) {
    throw new Error(
      `availability.yaml: timezone must be a valid IANA timezone string (e.g. "Europe/Madrid"), got "${String(tz)}"`
    )
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
  if (sMin === null)
    throw new Error(`availability.yaml: invalid time value "${start}" in ${context}`)
  const eMin = parseMinutes(end)
  if (eMin === null) throw new Error(`availability.yaml: invalid time value "${end}" in ${context}`)
  if (eMin <= sMin) {
    throw new Error(
      `availability.yaml: window end must be after start in ${context}: ${start} - ${end}`
    )
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

function extractOptionalRecord(
  obj: Record<string, unknown>,
  key: string,
  errorMsg: string
): Record<string, unknown> | null {
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
  const rec = extractOptionalRecord(
    obj,
    'exceptions',
    'availability.yaml: exceptions must be an object'
  )
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
  return { timezone: obj['timezone'] as string, weekly, exceptions }
}

function assertEnvWindowSegments(part: string, segs: string[]): void {
  if (segs.length !== 2 || !segs[0] || !segs[1]) {
    throw new Error(`AVAILABILITY_HOURS: invalid window "${part}", expected "HH:MM-HH:MM"`)
  }
}

function assertEnvWindowMinutes(start: string, end: string, part: string): void {
  const sMin = parseMinutes(start)
  if (sMin === null)
    throw new Error(`AVAILABILITY_HOURS: invalid start time "${start}" in window "${part}"`)
  const eMin = parseMinutes(end)
  if (eMin === null)
    throw new Error(`AVAILABILITY_HOURS: invalid end time "${end}" in window "${part}"`)
  if (eMin <= sMin)
    throw new Error(`AVAILABILITY_HOURS: window end must be after start in "${part}"`)
}

function parseSingleEnvWindow(part: string): Window {
  const segs = part.split('-').map((s) => s.trim())
  assertEnvWindowSegments(part, segs)
  const start = segs[0]
  const end = segs[1]
  assertEnvWindowMinutes(start, end, part)
  return { start, end }
}

export function parseEnvHours(hoursStr: string): Window[] {
  if (!hoursStr || !hoursStr.trim()) throw new Error('AVAILABILITY_HOURS is empty')
  const parts = hoursStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) throw new Error('AVAILABILITY_HOURS must contain at least one window')
  return parts.map((p) => parseSingleEnvWindow(p))
}

function validateEnvDayName(d: string): void {
  if (!DAY_NAMES.includes(d)) {
    throw new Error(
      `AVAILABILITY_DAYS: invalid weekday "${d}", expected one of ${DAY_NAMES.join(', ')}`
    )
  }
}

function splitEnvDays(daysStr: string): string[] {
  const raw = daysStr
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (raw.length === 0) throw new Error('AVAILABILITY_DAYS must contain at least one weekday')
  return raw
}

function dedupeDays(days: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const d of days)
    if (!seen.has(d)) {
      seen.add(d)
      out.push(d)
    }
  return out
}

export function parseEnvDays(daysStr: string): string[] {
  if (!daysStr || !daysStr.trim()) throw new Error('AVAILABILITY_DAYS is empty')
  const raw = splitEnvDays(daysStr)
  for (const d of raw) validateEnvDayName(d)
  return dedupeDays(raw)
}

function hasEnvOverride(): boolean {
  const envTz = process.env['AVAILABILITY_TIMEZONE']
  const envHours = process.env['AVAILABILITY_HOURS']
  const envDays = process.env['AVAILABILITY_DAYS']
  return Boolean(
    (envTz && envTz.trim()) || (envHours && envHours.trim()) || (envDays && envDays.trim())
  )
}

function resolveEnvTimezone(): string {
  const envTz = process.env['AVAILABILITY_TIMEZONE']
  const tz = envTz && envTz.trim() ? envTz.trim() : 'Europe/Madrid'
  if (!isValidIanaTimezone(tz)) {
    throw new Error(`AVAILABILITY_TIMEZONE: invalid IANA timezone "${tz}"`)
  }
  return tz
}

function resolveEnvWindows(): Window[] {
  const envHours = process.env['AVAILABILITY_HOURS']
  const hoursStr = envHours && envHours.trim() ? envHours.trim() : '09:00-13:00'
  return parseEnvHours(hoursStr)
}

function resolveEnvDays(): string[] {
  const envDays = process.env['AVAILABILITY_DAYS']
  const daysStr =
    envDays && envDays.trim() ? envDays.trim() : 'monday,tuesday,wednesday,thursday,friday'
  return parseEnvDays(daysStr)
}

function buildEnvConfig(): AvailabilityConfig {
  const timezone = resolveEnvTimezone()
  const windows = resolveEnvWindows()
  const days = resolveEnvDays()
  const weekly: Record<string, Window[]> = {}
  for (const day of days) {
    weekly[day] = windows.map((w) => ({ ...w }))
  }
  return { timezone, weekly, exceptions: {} }
}

export function loadAvailabilityConfig(): AvailabilityConfig {
  if (hasEnvOverride()) return buildEnvConfig()
  const p = path.join(process.cwd(), 'config', 'availability.yaml')
  const yaml = fs.readFileSync(p, 'utf8')
  return parseAvailabilityYaml(yaml)
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

function weekdayForDate(dateStr: string, timezone: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone })
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
  const weekday = weekdayForDate(dateStr, config.timezone)
  const windows = config.weekly[weekday] ?? []
  return slotsFromWindows(windows)
}

export function todayInTimezone(timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

// Helper to get today string in Europe/Madrid — kept for backward compat
export function todayInMadrid(): string {
  return todayInTimezone('Europe/Madrid')
}

function resolveEffectiveTimezone(): string {
  const envTz = process.env['AVAILABILITY_TIMEZONE'] || process.env['TIMEZONE']
  if (envTz && envTz.trim()) return envTz.trim()
  try {
    const p = path.join(process.cwd(), 'config', 'availability.yaml')
    const yaml = fs.readFileSync(p, 'utf8')
    const cfg = parseAvailabilityYaml(yaml)
    return cfg.timezone
  } catch {
    return 'Europe/Madrid'
  }
}

export function isPastDate(dateStr: string): boolean {
  let effectiveTz = resolveEffectiveTimezone()
  if (!isValidIanaTimezone(effectiveTz)) effectiveTz = 'Europe/Madrid'
  const today = todayInTimezone(effectiveTz)
  return dateStr < today
}
