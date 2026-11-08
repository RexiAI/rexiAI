import type { Dictionary } from '../../i18n/dictionary'

import { BookingConfirmation } from './BookingConfirmation'
import { DateField } from './fields/DateField'
import { DurationField } from './fields/DurationField'
import { SlotField } from './fields/SlotField'
import { TextField } from './fields/TextField'
import type { BookingFields } from './hooks/useBookingFields'

/**
 * Submit-button label, billing-aware (spec 003 Ask A). While the POST is in
 * flight a billing-enabled booking really is being redirected to Stripe, but
 * with billing disabled no redirect ever happens — the direct POST *is* the
 * booking — so the in-flight copy confirms the send and never names a payment
 * provider (15-design Task 4). Since spec 019 the idle free label is its own key
 * (`form.submitFree`: "Book the free hour"), not a "free" variant of the paid
 * one. The enabled keys/values are unchanged.
 */
function submitButtonLabel(dict: Dictionary, billingEnabled: boolean, submitting: boolean): string {
  if (submitting) {
    return billingEnabled ? dict.booking.form.submitting : dict.booking.form.submittingDirect
  }
  return billingEnabled ? dict.booking.form.submit : dict.booking.form.submitFree
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
      {/* One money statement per mode (spec 019 Task 7): the free card states
          that nothing is charged, the paid card states the ladder — never both,
          and nothing is struck through. */}
      <p className="booking-pricing">
        {billingEnabled ? dict.booking.priceLine : dict.booking.freeNote}
      </p>
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
        {/* Free mode books the first hour only, so the 1h/2h/3h/4h selector is
            not rendered at all — an empty fieldset or a display:none control
            would still reach the accessibility tree. `hours` stays 1 in the
            request (useBookingFields' default), so the API contract is
            unchanged. */}
        {billingEnabled && <DurationField hours={fields.hours} setHours={fields.setHours} />}
        <TextField
          fieldId="email"
          value={fields.email}
          onChange={fields.setEmail}
          error={fields.errors['email']}
          input={{ type: 'email' }}
          copy={{ label: dict.booking.form.emailLabel, helper: dict.booking.form.emailHelper }}
        />
        <TextField
          fieldId="name"
          value={fields.name}
          onChange={fields.setName}
          error={fields.errors['name']}
          input={{ type: 'text', autoComplete: 'name', last: true }}
          copy={{ label: dict.booking.form.nameLabel, helper: dict.booking.form.nameHelper }}
        />
        <button type="submit" disabled={fields.submitting} className="booking-submit">
          {submitButtonLabel(dict, billingEnabled, fields.submitting)}
        </button>
      </form>
    </div>
  )
}
