import { useState } from 'react'

export function useBookingFields() {
  const [date, setDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [hours, setHours] = useState<number>(1)
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [conflictError, setConflictError] = useState('')
  // prettier-ignore
  return { date, setDate, selectedSlot, setSelectedSlot, hours, setHours, email, setEmail, errors, setErrors, submitting, setSubmitting, conflictError, setConflictError }
}

export type BookingFields = ReturnType<typeof useBookingFields>
