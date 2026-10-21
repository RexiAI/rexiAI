import { useEffect, useRef } from 'react'

import type { Dictionary } from '../../i18n/dictionary'

import type { ConfirmationState } from './hooks/useBookingFields'

/**
 * Post-submit state for a direct booking (billing disabled): the widget swaps
 * the form for this panel inside the same .booking-card chrome. Every visible
 * string comes from dict.booking.confirmation — no hardcoded copy, no internal
 * state words. The h3 takes focus once so a keyboard user whose Enter submit
 * unmounted the form does not lose the tab order (15-design §Semantics/a11y).
 *
 * Spec 003 Ask D: the panel deliberately renders NO join link — the customer
 * joins only via the email's link. ConfirmationState keeps joinUrl (the API
 * contract, AC-002-16); only this rendering stopped consuming it.
 */
export function BookingConfirmation({
  dict,
  confirmation,
}: {
  dict: Dictionary
  confirmation: ConfirmationState
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <div className="booking-confirmation" role="status">
      <h3 className="booking-confirmation__title" tabIndex={-1} ref={titleRef}>
        {dict.booking.confirmation.title}
      </h3>
      <dl className="booking-confirmation__details">
        <dt className="booking-confirmation__term">{dict.booking.confirmation.dateLabel}</dt>
        <dd className="booking-confirmation__value">{confirmation.date}</dd>
        <dt className="booking-confirmation__term">{dict.booking.confirmation.timeLabel}</dt>
        <dd className="booking-confirmation__value">{confirmation.startTime}</dd>
      </dl>
      <p className="booking-confirmation__note">{dict.booking.confirmation.note}</p>
    </div>
  )
}
