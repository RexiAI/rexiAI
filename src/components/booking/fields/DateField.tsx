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
      <p id="help-date" className="field-helper">
        {dict.booking.form.dateHelper}
      </p>
      <input
        id="booking-date"
        type="date"
        value={date}
        min={todayMadrid()}
        onChange={(e) => setDate(e.target.value)}
        aria-describedby={error ? 'err-date' : 'help-date'}
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
