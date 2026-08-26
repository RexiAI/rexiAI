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

const VALID_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

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

export function parseAvailabilityYaml(yamlString: string): AvailabilityConfig {
  let raw: unknown
  try {
    raw = parse(yamlString)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Failed to parse availability.yaml: ${msg}`)
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Failed to parse availability.yaml: expected object')
  }
  const obj = raw as Record<string, unknown>

  if (!('timezone' in obj)) {
    throw new Error('availability.yaml: timezone is required and must be "Europe/Madrid"')
  }
  if (obj['timezone'] !== 'Europe/Madrid') {
    throw new Error('availability.yaml: timezone must be "Europe/Madrid"')
  }

  const weekly: Record<string, Window[]> = {}
  if ('weekly' in obj && obj['weekly'] !== undefined && obj['weekly'] !== null) {
    const w = obj['weekly']
    if (typeof w !== 'object' || Array.isArray(w) || w === null) {
      throw new Error('availability.yaml: weekly must be an object')
    }
    const wRec = w as Record<string, unknown>
    for (const [day, windows] of Object.entries(wRec)) {
      if (!VALID_DAYS.includes(day as (typeof VALID_DAYS)[number])) {
        // allow but still validate
      }
      if (!Array.isArray(windows)) {
        throw new Error(`availability.yaml: weekly.${day} must be an array`)
      }
      const validated: Window[] = []
      for (const win of windows) {
        if (!win || typeof win !== 'object' || Array.isArray(win)) {
          throw new Error(`availability.yaml: invalid window in weekly.${day}`)
        }
        const w2 = win as Record<string, unknown>
        const start = w2['start']
        const end = w2['end']
        if (typeof start !== 'string' || typeof end !== 'string') {
          throw new Error(`availability.yaml: window start/end must be HH:mm strings in weekly.${day}`)
        }
        const sMin = parseMinutes(start)
        const eMin = parseMinutes(end)
        if (sMin === null) throw new Error(`availability.yaml: invalid time value "${start}" in weekly.${day}`)
        if (eMin === null) throw new Error(`availability.yaml: invalid time value "${end}" in weekly.${day}`)
        if (eMin <= sMin) {
          throw new Error(`availability.yaml: window end must be after start in weekly.${day}: ${start} - ${end}`)
        }
        validated.push({ start, end })
      }
      weekly[day.toLowerCase()] = validated
    }
  }

  const exceptions: Record<string, Window[]> = {}
  if ('exceptions' in obj && obj['exceptions'] !== undefined && obj['exceptions'] !== null) {
    const ex = obj['exceptions']
    if (typeof ex !== 'object' || Array.isArray(ex) || ex === null) {
      throw new Error('availability.yaml: exceptions must be an object')
    }
    const exRec = ex as Record<string, unknown>
    for (const [date, windows] of Object.entries(exRec)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`availability.yaml: exception key "${date}" must be YYYY-MM-DD`)
      }
      if (!Array.isArray(windows)) {
        throw new Error(`availability.yaml: exceptions["${date}"] must be an array`)
      }
      const validated: Window[] = []
      for (const win of windows) {
        if (!win || typeof win !== 'object' || Array.isArray(win)) {
          throw new Error(`availability.yaml: invalid window in exceptions["${date}"]`)
        }
        const w2 = win as Record<string, unknown>
        const start = w2['start']
        const end = w2['end']
        if (typeof start !== 'string' || typeof end !== 'string') {
          throw new Error(`availability.yaml: window start/end must be HH:mm strings in exceptions["${date}"]`)
        }
        const sMin = parseMinutes(start)
        const eMin = parseMinutes(end)
        if (sMin === null) throw new Error(`availability.yaml: invalid time value "${start}" in exceptions["${date}"]`)
        if (eMin === null) throw new Error(`availability.yaml: invalid time value "${end}" in exceptions["${date}"]`)
        if (eMin <= sMin) {
          throw new Error(`availability.yaml: window end must be after start in exceptions["${date}"]: ${start} - ${end}`)
        }
        validated.push({ start, end })
      }
      exceptions[date] = validated
    }
  }

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
  // parse as UTC to avoid local timezone drift, but we need weekday in Europe/Madrid.
  // Use Intl to get weekday in Madrid for that date at noon to avoid DST edge.
  const d = new Date(dateStr + 'T12:00:00')
  // Use UTC date to get nominal weekday if Intl not available
  // Safer: use Date getUTCDay after constructing correctly.
  // But to respect Madrid, we check Madrid weekday.
  // Construct a Date at 12:00 Madrid wall time -> we need offset, but for weekday determination,
  // using UTC noon is fine for most dates, but around midnight could shift.
  // Instead use Intl.
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Europe/Madrid' })
    // d is 12:00 UTC; we want Madrid weekday for that YYYY-MM-DD wall date.
    // Better to parse components directly: create date at 12:00 Madrid via madridToUtc inverse?
    // Simpler: use the dateStr's weekday via computing from known date.
    // Use d's UTC day as approximation then correct via Intl on Madrid noon.
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
