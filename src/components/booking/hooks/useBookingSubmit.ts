import type { Dictionary } from '../../../i18n/dictionary'
import { validateBookingForm } from '../form/validateBookingForm'

import type { BookingFields } from './useBookingFields'

/** Shape of POST /api/bookings responses (success carries checkoutUrl, errors carry error.message). */
type BookingResponse = { error?: { message?: string }; checkoutUrl?: string }

async function postBooking(payload: {
  email: string
  date: string
  startTime: string
  hours: number
}) {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as BookingResponse
  return { res, data }
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
    fields.setConflictError(data.error?.message ?? 'Error')
    return true
  }
  const url = data.checkoutUrl
  if (url) window.location.href = url
  return false
}

async function doSubmit(fields: BookingFields, dict: Dictionary) {
  const result = await postBooking({
    email: fields.email,
    date: fields.date,
    startTime: fields.selectedSlot,
    hours: fields.hours,
  })
  handleBookingResponse(fields, dict, result.res, result.data)
}

export function useBookingSubmit(fields: BookingFields, dict: Dictionary) {
  // prettier-ignore
  return async (ev: React.FormEvent) => { ev.preventDefault(); const v = validateBookingForm(dict, { date: fields.date, selectedSlot: fields.selectedSlot, email: fields.email, hours: fields.hours }); fields.setErrors(v); if (Object.keys(v).length > 0) return; fields.setSubmitting(true); fields.setConflictError(''); try { await doSubmit(fields, dict) } catch { fields.setConflictError('Error') } finally { fields.setSubmitting(false) } }
}
