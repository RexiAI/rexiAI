import type { Dictionary } from '../../i18n/dictionary'

import { BookingConfirmation } from './BookingConfirmation'
import { DateField } from './fields/DateField'
import { DurationField } from './fields/DurationField'
import { EmailField } from './fields/EmailField'
import { SlotField } from './fields/SlotField'
import type { BookingFields } from './hooks/useBookingFields'

/**
 * Submit-button label, billing-aware (spec 003 Ask A). While the POST is in
 * flight a billing-enabled booking really is being redirected to Stripe, but
 * with billing disabled no redirect ever happens — the direct POST *is* the
 * booking — so the in-flight copy confirms the send and never names a payment
 * provider (15-design Task 4). The enabled keys/values are unchanged; the
 * neutral copy is a dictionary addition, never a hardcoded string here.
 */
function submitButtonLabel(dict: Dictionary, billingEnabled: boolean, submitting: boolean): string {
  if (submitting) {
    return billingEnabled ? dict.booking.form.submitting : dict.booking.form.submittingDirect
  }
  return billingEnabled ? dict.booking.form.submit : dict.freeMode.submit
}

export function BookingLayout({
  dict,
  billingEnabled,
  fields,
  slots,
  loading,
  handleSubmit,
}: {
  dict: Dictionary
  billingEnabled: boolean
  fields: BookingFields
  slots: string[]
  loading: boolean
  handleSubmit: (e: React.FormEvent) => void
}) {
  // Confirmation is terminal for the session: it replaces the pricing block
  // and the form inside the unchanged card chrome (15-design §Layout).
  if (fields.confirmation) {
    return (
      <div className="booking-card">
        <BookingConfirmation dict={dict} confirmation={fields.confirmation} />
      </div>
    )
  }

  return (
    <div className="booking-card">
      {billingEnabled ? (
        <>
          <p className="booking-pricing">{dict.booking.pricingRules}</p>
          <p className="booking-pricing-example">{dict.booking.pricingExample}</p>
        </>
      ) : (
        <>
          <p className="booking-pricing booking-pricing--free">
            <s className="booking-pricing__was">{dict.booking.pricingExample}</s>
            <span className="booking-pricing__free">{dict.freeMode.badge}</span>
          </p>
          <p className="booking-pricing-note">{dict.freeMode.pricingNote}</p>
        </>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <DateField date={fields.date} setDate={fields.setDate} error={fields.errors['date']} />
        <SlotField
          slots={slots}
          loading={loading}
          date={fields.date}
          selectedSlot={fields.selectedSlot}
          setSelectedSlot={fields.setSelectedSlot}
          error={fields.errors['slot']}
          conflictError={fields.conflictError}
        />
        <DurationField hours={fields.hours} setHours={fields.setHours} />
        <EmailField
          email={fields.email}
          setEmail={fields.setEmail}
          error={fields.errors['email']}
        />
        <button type="submit" disabled={fields.submitting} className="booking-submit">
          {submitButtonLabel(dict, billingEnabled, fields.submitting)}
        </button>
      </form>
    </div>
  )
}
