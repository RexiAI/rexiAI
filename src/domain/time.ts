import { loadAvailabilityConfig } from './availability.js'

/**
 * Single source of truth for "which timezone is this deployment operating in".
 * The config loader already folds AVAILABILITY_TIMEZONE in, so it is tried
 * first; the env/default chain is the fallback for a missing or invalid
 * config/availability.yaml. email.ts, teams.ts and gcal.ts all call this —
 * they previously each carried a byte-identical private copy.
 */
export function getConfiguredTimezone(): string {
  try {
    return loadAvailabilityConfig().timezone
  } catch {
    return process.env['AVAILABILITY_TIMEZONE'] || process.env['TIMEZONE'] || 'Europe/Madrid'
  }
}

function formatToPartsInTimezone(timezone: string, date: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  })
  const parts = fmt.formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  return map
}

function buildTzEpoch(map: Record<string, string>): number {
  const y = Number(map['year'])
  const mo = Number(map['month'])
  const d = Number(map['day'])
  const h = Number(map['hour'])
  const mi = Number(map['minute'])
  const s = Number(map['second'])
  if ([y, mo, d, h, mi, s].some((n) => Number.isNaN(n))) {
    throw new Error('Failed to format date')
  }
  return Date.UTC(y, mo - 1, d, h, mi, s)
}

function wrapTimezoneError(timezone: string, e: unknown): never {
  if (e instanceof Error && e.message.startsWith('Invalid timezone')) throw e
  const msg = e instanceof Error ? e.message : String(e)
  throw new Error(`Invalid timezone "${timezone}": ${msg}`, { cause: e })
}

export function timezoneOffsetMinutes(timezone: string, date: Date): number {
  try {
    const map = formatToPartsInTimezone(timezone, date)
    const tzEpoch = buildTzEpoch(map)
    return Math.round((tzEpoch - date.getTime()) / 60000)
  } catch (e) {
    if (e instanceof RangeError) {
      throw new Error(`Invalid timezone "${timezone}": ${e.message}`, { cause: e })
    }
    wrapTimezoneError(timezone, e)
  }
}

export function madridOffsetMinutes(date: Date): number {
  return timezoneOffsetMinutes('Europe/Madrid', date)
}

function validateTimezoneOrThrow(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date())
  } catch (e) {
    throw new Error(
      `Invalid timezone "${timezone}": ${e instanceof Error ? e.message : String(e)}`,
      {
        cause: e,
      }
    )
  }
}

function resolveZonedGuess(timezone: string, wallUtc: number): number {
  let guess = wallUtc
  const offset = timezoneOffsetMinutes(timezone, new Date(guess))
  guess = wallUtc - offset * 60000
  const offset2 = timezoneOffsetMinutes(timezone, new Date(guess))
  if (offset2 === offset) return guess
  guess = wallUtc - offset2 * 60000
  const offset3 = timezoneOffsetMinutes(timezone, new Date(guess))
  if (offset3 === offset2) return guess
  return wallUtc - offset3 * 60000
}

export function zonedToUtc(timezone: string, dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  if ([y, mo, d, h, mi].some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid date or time: ${dateStr} ${timeStr}`)
  }
  validateTimezoneOrThrow(timezone)
  const wallUtc = Date.UTC(y, mo - 1, d, h, mi, 0)
  const guess = resolveZonedGuess(timezone, wallUtc)
  return new Date(guess)
}

export function madridToUtc(dateStr: string, timeStr: string): Date {
  return zonedToUtc('Europe/Madrid', dateStr, timeStr)
}

export function getEnvTimezone(): string {
  const env = process.env['AVAILABILITY_TIMEZONE'] || process.env['TIMEZONE']
  if (env && env.trim()) return env.trim()
  return 'Europe/Madrid'
}

export function slotIntervalUtc(
  dateStr: string,
  timeStr: string,
  hours: number
): { start: Date; end: Date } {
  const timezone = getEnvTimezone()
  const start = zonedToUtc(timezone, dateStr, timeStr)
  const end = new Date(start.getTime() + hours * 3600000)
  return { start, end }
}

export function slotIntervalUtcForTimezone(
  timezone: string,
  dateStr: string,
  timeStr: string,
  hours: number
): { start: Date; end: Date } {
  const start = zonedToUtc(timezone, dateStr, timeStr)
  const end = new Date(start.getTime() + hours * 3600000)
  return { start, end }
}
