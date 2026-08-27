import { useEffect } from 'react'

import type { BookingFields } from './useBookingFields'

export function useResetOnDate(fields: BookingFields) {
  const { date, setConflictError, setSelectedSlot } = fields
  useEffect(() => {
    setSelectedSlot('')
    setConflictError('')
  }, [date, setConflictError, setSelectedSlot])
}
