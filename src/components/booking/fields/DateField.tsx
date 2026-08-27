import { useI18n } from '../../../i18n/I18nContext'
import { todayMadrid } from '../form/validateBookingForm'

export function DateField({
  date,
  setDate,
  error,
}: {
  date: string
  setDate: (v: string) => void
  error?: string
}) {
  const { dict } = useI18n()
  return (
    <>
      <label htmlFor="booking-date" className="booking-label">
        {dict.booking.form.dateLabel}
      </label>
      <p className="field-helper">{dict.booking.form.dateLabel} helper</p>
      <input
        id="booking-date"
        type="date"
        value={date}
        min={todayMadrid()}
        onChange={(e) => setDate(e.target.value)}
        aria-describedby={error ? 'err-date' : undefined}
        className="booking-input"
      />
      {error ? (
        <p id="err-date" className="field-error">
          {error}
        </p>
      ) : null}
    </>
  )
}
