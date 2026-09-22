import { useI18n } from '../../i18n/I18nContext'
import '../BookingWidget.css'

import { BookingLayout } from './BookingLayout'
import { useAvailability } from './hooks/useAvailability'
import { useBookingFields } from './hooks/useBookingFields'
import { useBookingSubmit } from './hooks/useBookingSubmit'
import { useResetOnDate } from './hooks/useResetOnDate'

export function BookingWidget() {
  const { dict } = useI18n()
  const fields = useBookingFields()
  const { slots, loading } = useAvailability(fields.date)
  useResetOnDate(fields)
  const handleSubmit = useBookingSubmit(fields, dict)
  return (
    <BookingLayout
      dict={dict}
      fields={fields}
      slots={slots}
      loading={loading}
      handleSubmit={handleSubmit}
    />
  )
}
