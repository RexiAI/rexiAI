import { useState } from 'react'

/** Post-submit confirmation (direct booking, billing disabled). Values are the
 *  raw submitted strings; joinUrl is absent only if the response had none. */
export type ConfirmationState = { date: string; startTime: string; joinUrl?: string }

export function useBookingFields() {
  const [date, setDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [hours, setHours] = useState<number>(1)
  const [email, setEmail] = useState('')
  // The customer name (spec 008 Task 1): required, free-form, and the key the
  // recording processor later uses for the folder name.
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [conflictError, setConflictError] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null)
  // prettier-ignore
  return { date, setDate, selectedSlot, setSelectedSlot, hours, setHours, email, setEmail, name, setName, errors, setErrors, submitting, setSubmitting, conflictError, setConflictError, confirmation, setConfirmation }
}

export type BookingFields = ReturnType<typeof useBookingFields>
