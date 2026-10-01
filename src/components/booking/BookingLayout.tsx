import type { Dictionary } from '../../i18n/dictionary'

import { DateField } from './fields/DateField'
import { DurationField } from './fields/DurationField'
import { EmailField } from './fields/EmailField'
import { SlotField } from './fields/SlotField'
import type { BookingFields } from './hooks/useBookingFields'

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
          {fields.submitting
            ? dict.booking.form.submitting
            : billingEnabled
              ? dict.booking.form.submit
              : dict.freeMode.submit}
        </button>
      </form>
    </div>
  )
}
