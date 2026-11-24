import { useSiteConfig } from '../hooks/useSiteConfig'
import { useI18n } from '../i18n/I18nContext'

// One money story per mode (spec 019 Task 7): the same `billingEnabled` the
// booking card consumes decides both the narrative and the step list, so the
// section can never describe one mode while the card books the other.
export function BookingSteps() {
  const { dict } = useI18n()
  const { billingEnabled } = useSiteConfig()
  const narrative = billingEnabled ? dict.booking.narrativePaid : dict.booking.narrativeFree
  const steps = billingEnabled ? dict.booking.stepsPaid : dict.booking.stepsFree
  return (
    <>
      <p className="booking__narrative">{narrative}</p>
      <ol className="booking-steps">
        {steps.map((step, i) => (
          <li key={i} className="booking-steps__item">
            {step}
          </li>
        ))}
      </ol>
    </>
  )
}
