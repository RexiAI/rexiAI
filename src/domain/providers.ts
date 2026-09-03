export type CalendarProvider = 'microsoft'
export type EmailProvider = 'gmail'

export function getCalendarProvider(): CalendarProvider {
  // Google Calendar support was removed in the Microsoft Graph migration; the
  // only calendar provider is Microsoft. Kept as a function so provider
  // resolution stays a single point when a second provider is ever added.
  return 'microsoft'
}

export function getEmailProvider(): EmailProvider {
  // Email is Resend-only (Godaddy mailbox). Graph mail was removed with the
  // Mail.Send permission; a stale microsoft365 EMAIL_PROVIDER value is
  // tolerated but always resolves to the Resend path.
  return 'gmail'
}