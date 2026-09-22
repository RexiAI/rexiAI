import { DateField } from './fields/DateField'
import { DurationField } from './fields/DurationField'
import { EmailField } from './fields/EmailField'
import { SlotField } from './fields/SlotField'
import type { BookingFields } from './hooks/useBookingFields'

export function BookingLayout({
  dict,
  fields,
  slots,
  loading,
  handleSubmit,
}: {
  dict: any
  fields: BookingFields
  slots: string[]
  loading: boolean
  handleSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div className="booking-card">
      <p className="booking-pricing">{dict.booking.pricingRules}</p>
      <p className="booking-pricing-example">{dict.booking.pricingExample}</p>
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
          {fields.submitting ? dict.booking.form.submitting : dict.booking.form.submit}
        </button>
      </form>
    </div>
  )
}
