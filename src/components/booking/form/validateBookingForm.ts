import { NAME_MAX_LENGTH } from '../../../domain/validation'
import type { Dictionary } from '../../../i18n/dictionary'

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

/**
 * The name check trims BEFORE the emptiness test (spec 008 Task 1 / 15-design):
 * a whitespace-only name is empty, and `!v.name` alone would let it through. No
 * character allow-list — free-form names, sanitised only where they become a
 * path.
 */
function nameError(dict: Dictionary, name: string): string | undefined {
  const trimmed = name.trim()
  if (trimmed === '') return dict.booking.form.required
  if (trimmed.length > NAME_MAX_LENGTH) return dict.booking.form.nameTooLong
  return undefined
}

function emailError(dict: Dictionary, email: string): string | undefined {
  if (!email) return dict.booking.form.required
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return dict.booking.form.emailInvalid
  return undefined
}

/** Date and slot are both required; one place, so the form keeps one vocabulary. */
function requiredSelectionErrors(dict: Dictionary, v: { date: string; selectedSlot: string }) {
  const e: Record<string, string> = {}
  if (!v.date) e['date'] = dict.booking.form.required
  if (!v.selectedSlot) e['slot'] = dict.booking.form.required
  return e
}

export function validateBookingForm(
  dict: Dictionary,
  v: { date: string; selectedSlot: string; email: string; hours: number; name: string }
): Record<string, string> {
  const e = requiredSelectionErrors(dict, v)
  const emailErr = emailError(dict, v.email)
  if (emailErr) e['email'] = emailErr
  const nameErr = nameError(dict, v.name)
  if (nameErr) e['name'] = nameErr
  if (!isValidHours(v.hours)) e['hours'] = dict.booking.form.required
  return e
}
