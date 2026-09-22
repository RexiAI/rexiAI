export function todayMadrid(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

export function isValidHours(h: number): boolean {
  return Number.isInteger(h) && h >= 1 && h <= 4
}

export function validateBookingForm(
  dict: any,
  v: { date: string; selectedSlot: string; email: string; hours: number }
): Record<string, string> {
  const e: Record<string, string> = {}
  if (!v.date) e['date'] = dict.booking.form.required
  if (!v.selectedSlot) e['slot'] = dict.booking.form.required
  if (!v.email) e['email'] = dict.booking.form.required
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e['email'] = dict.booking.form.emailInvalid
  if (!isValidHours(v.hours)) e['hours'] = dict.booking.form.required
  return e
}
