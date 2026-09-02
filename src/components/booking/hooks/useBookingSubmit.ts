import { validateBookingForm } from '../form/validateBookingForm'

import type { BookingFields } from './useBookingFields'

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
  const data = await res.json().catch(() => ({}) as any)
  return { res, data }
}

function handleBookingResponse(fields: BookingFields, dict: any, res: any, data: any): boolean {
  if (res.status === 409) {
    fields.setConflictError(dict.booking.form.conflict)
    return true
  }
  if (!res.ok) {
    const msg = data && data.error ? data.error.message : 'Error'
    fields.setConflictError(msg)
    return true
  }
  const url = data.checkoutUrl as string
  if (url) window.location.href = url
  return false
}

async function doSubmit(fields: BookingFields, dict: any) {
  const result = await postBooking({
    email: fields.email,
    date: fields.date,
    startTime: fields.selectedSlot,
    hours: fields.hours,
  })
  handleBookingResponse(fields, dict, result.res, result.data)
}

export function useBookingSubmit(fields: BookingFields, dict: any) {
  // prettier-ignore
  return async (ev: React.FormEvent) => { ev.preventDefault(); const v = validateBookingForm(dict, { date: fields.date, selectedSlot: fields.selectedSlot, email: fields.email, hours: fields.hours }); fields.setErrors(v); if (Object.keys(v).length > 0) return; fields.setSubmitting(true); fields.setConflictError(''); try { await doSubmit(fields, dict) } catch { fields.setConflictError('Error') } finally { fields.setSubmitting(false) } }
}
