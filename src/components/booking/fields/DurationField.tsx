import { useI18n } from '../../../i18n/I18nContext'

export function DurationField({
  hours,
  setHours,
}: {
  hours: number
  setHours: (h: number) => void
}) {
  const { dict } = useI18n()
  return (
    <fieldset className="booking-fieldset">
      <legend className="booking-legend">{dict.booking.form.durationLabel}</legend>
      <div role="group" aria-label={dict.booking.form.durationLabel} className="duration-group">
        {[1, 2, 3, 4].map((h) => (
          <button
            key={h}
            type="button"
            aria-pressed={hours === h}
            onClick={() => setHours(h)}
            className={`duration-btn${hours === h ? ' duration-btn--active' : ''}`}
          >
            {h}h
          </button>
        ))}
      </div>
    </fieldset>
  )
}
