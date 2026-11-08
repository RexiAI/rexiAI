import { useI18n } from '../../../i18n/I18nContext'
import { todayMadrid } from '../form/validateBookingForm'

/** Locale-formatted echo of the native control's ISO value. */
function selectedDate(date: string, locale: 'es' | 'en'): string {
  if (!date) return ''
  const value = new Date(`${date}T00:00:00`)
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value)
}

export function DateField({
  date,
  setDate,
  error,
}: {
  date: string
  setDate: (v: string) => void
  error?: string
}) {
  const { dict, locale } = useI18n()
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
        lang={locale}
        value={date}
        min={todayMadrid()}
        onChange={(e) => setDate(e.target.value)}
        aria-describedby={error ? 'err-date' : 'help-date'}
        className="booking-input"
      />
      {date ? (
        <p className="field-helper field-helper--selected">
          {dict.booking.form.dateSelected}: {selectedDate(date, locale)}
        </p>
      ) : null}
      {error ? (
        <p id="err-date" className="field-error">
          {error}
        </p>
      ) : null}
    </>
  )
}
