export type CalendarProvider = 'google' | 'microsoft'
export type EmailProvider = 'gmail' | 'microsoft365'

export function getCalendarProvider(): CalendarProvider {
  const raw = (process.env['CALENDAR_PROVIDER'] || '').trim().toLowerCase()
  if (raw === 'microsoft' || raw === 'microsoft365' || raw === 'm365' || raw === 'outlook')
    return 'microsoft'
  return 'google'
}

export function getEmailProvider(): EmailProvider {
  const raw = (process.env['EMAIL_PROVIDER'] || '').trim().toLowerCase()
  if (raw === 'microsoft365' || raw === 'microsoft' || raw === 'm365' || raw === 'outlook')
    return 'microsoft365'
  return 'gmail'
}
