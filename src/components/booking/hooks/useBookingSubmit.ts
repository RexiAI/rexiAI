import type { Dictionary, Locale } from '../../../i18n/dictionary'
import { useI18n } from '../../../i18n/I18nContext'
import { validateBookingForm } from '../form/validateBookingForm'

import type { BookingFields } from './useBookingFields'

/** Fallback copy shown when neither the server body nor the fetch gives a message. */
const GENERIC_ERROR_MESSAGE = 'Error'

/** Shape of POST /api/bookings responses. checkoutUrl carries the Stripe
 *  session URL; when billing is disabled the API answers
 *  { checkoutUrl: null, joinUrl, billingDisabled: true } instead. */
type BookingResponse = {
  error?: { message?: string }
  checkoutUrl?: string | null
  billingDisabled?: boolean
  joinUrl?: string
}

async function postBooking(payload: {
  name: string
  email: string
  date: string
  startTime: string
  hours: number
  locale: Locale
}) {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as BookingResponse
  return { res, data }
}

function errorMessage(data: BookingResponse): string {
  const message = data.error?.message
  if (message) return message
  return GENERIC_ERROR_MESSAGE
}

// Direct booking (billing disabled): the API already completed the booking.
// No navigation, no error — the widget swaps to the confirmation panel. Branch
// runs BEFORE the checkoutUrl redirect and leaves the enabled path untouched.
function applyDirectConfirmation(fields: BookingFields, data: BookingResponse): boolean {
  if (data.billingDisabled !== true) return false
  fields.setConfirmation({
    date: fields.date,
    startTime: fields.selectedSlot,
    joinUrl: data.joinUrl,
  })
  return true
}

function handleBookingResponse(
  fields: BookingFields,
  dict: Dictionary,
  res: Response,
  data: BookingResponse
): boolean {
  if (res.status === 409) {
    fields.setConflictError(dict.booking.form.conflict)
    return true
  }
  if (!res.ok) {
    fields.setConflictError(errorMessage(data))
    return true
  }
  if (applyDirectConfirmation(fields, data)) return false
  const url = data.checkoutUrl
  if (url) window.location.href = url
  return false
}

async function doSubmit(fields: BookingFields, dict: Dictionary, locale: Locale) {
  const result = await postBooking({
    // Trimmed before it leaves the browser (15-design Task 1): the value the user
    // sees is the value that gets stored, emailed and turned into a folder name.
    // The API trims again, so this is parity, not the correctness guarantee.
    name: fields.name.trim(),
    email: fields.email,
    date: fields.date,
    startTime: fields.selectedSlot,
    hours: fields.hours,
    // Additive field (spec 006 Task 8): the locale the visitor is reading the
    // form in, captured at submit time so the API can localise the notice.
    locale,
  })
  handleBookingResponse(fields, dict, result.res, result.data)
}

/** validate → guard → submit. Split from useBookingSubmit's returned handler so
 *  neither function grows past the method-length guideline; the handler's only
 *  extra concern is preventDefault. */
async function runBookingSubmit(
  fields: BookingFields,
  dict: Dictionary,
  locale: Locale
): Promise<void> {
  const v = validateBookingForm(dict, {
    date: fields.date,
    selectedSlot: fields.selectedSlot,
    email: fields.email,
    hours: fields.hours,
    name: fields.name,
  })
  fields.setErrors(v)
  if (Object.keys(v).length > 0) return
  fields.setSubmitting(true)
  fields.setConflictError('')
  try {
    await doSubmit(fields, dict, locale)
  } catch {
    fields.setConflictError(GENERIC_ERROR_MESSAGE)
  } finally {
    fields.setSubmitting(false)
  }
}

export function useBookingSubmit(fields: BookingFields, dict: Dictionary) {
  // The SPA already knows the visitor's locale; it is the booking's language.
  const { locale } = useI18n()
  return async function submitBooking(ev: React.FormEvent): Promise<void> {
    ev.preventDefault()
    await runBookingSubmit(fields, dict, locale)
  }
}
