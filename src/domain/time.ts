export function madridOffsetMinutes(date: Date): number {
  // Returns offset in minutes for Europe/Madrid at given UTC instant.
  // CEST = UTC+2 (120 min), CET = UTC+1 (60 min)
  // DST: last Sunday in March 01:00 UTC to last Sunday in October 01:00 UTC
  const year = date.getUTCFullYear()
  const marchLastSunday = lastSundayOfMonth(year, 2) // March = 2 (0-indexed)
  const octLastSunday = lastSundayOfMonth(year, 9) // October =9
  const dstStart = Date.UTC(year, 2, marchLastSunday, 1, 0, 0)
  const dstEnd = Date.UTC(year, 9, octLastSunday, 1, 0, 0)
  const t = date.getTime()
  if (t >= dstStart && t < dstEnd) return 120
  return 60
}

function lastSundayOfMonth(year: number, month: number): number {
  // month 0-indexed
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  for (let d = lastDay; d >= 1; d--) {
    const dow = new Date(Date.UTC(year, month, d)).getUTCDay()
    if (dow === 0) return d
  }
  return lastDay
}

export function madridToUtc(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  // We want UTC instant where Madrid wall time = y-mo-d h:mi
  // First, assume CET offset to get initial UTC guess
  // Iterate to resolve: compute offset for guessed UTC, then adjust
  // Since offset is either 60 or 120, we can compute directly:
  // Try both offsets and see which maps back to same wall time?
  // Simpler: compute UTC as wall time minus offset, check offset at that UTC.
  // If mismatch, adjust.
  let offset = 60
  // Guess UTC = wall -60
  let guess = Date.UTC(y, mo - 1, d, h, mi) - offset * 60000
  let actualOffset = madridOffsetMinutes(new Date(guess))
  if (actualOffset !== offset) {
    offset = actualOffset
    guess = Date.UTC(y, mo - 1, d, h, mi) - offset * 60000
    // verify again (DST transition edge at 02:00 -> 03:00, but bookings not at 02:00 typically)
    const secondOffset = madridOffsetMinutes(new Date(guess))
    if (secondOffset !== offset) {
      // handle gap: use second
      offset = secondOffset
      guess = Date.UTC(y, mo - 1, d, h, mi) - offset * 60000
    }
  }
  return new Date(guess)
}

export function slotIntervalUtc(dateStr: string, timeStr: string, hours: number): { start: Date; end: Date } {
  const start = madridToUtc(dateStr, timeStr)
  const end = new Date(start.getTime() + hours * 3600000)
  return { start, end }
}
