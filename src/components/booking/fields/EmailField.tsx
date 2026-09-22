import { useI18n } from '../../../i18n/I18nContext'

export function EmailField({
  email,
  setEmail,
  error,
}: {
  email: string
  setEmail: (v: string) => void
  error?: string
}) {
  const { dict } = useI18n()
  return (
    <>
      <label htmlFor="booking-email" className="booking-label">
        {dict.booking.form.emailLabel}
      </label>
      <p className="field-helper">{dict.booking.form.emailHelper}</p>
      <input
        id="booking-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-describedby={error ? 'err-email' : 'help-email'}
        className={`booking-input booking-input--email${error ? ' booking-input--error' : ''}`}
      />
      <span id="help-email" className="hidden-helper">
        {dict.booking.form.emailHelper}
      </span>
      {error ? (
        <p id="err-email" className="field-error">
          {error}
        </p>
      ) : null}
    </>
  )
}
