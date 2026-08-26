import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/I18nContext'

function todayMadrid(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' })
  return fmt.format(new Date())
}

function isValidHours(h: number): boolean {
  return Number.isInteger(h) && h >= 1 && h <= 4
}

export function validateBookingForm(dict: any, v: { date: string; selectedSlot: string; email: string; hours: number }): Record<string, string> {
  const e: Record<string, string> = {}
  if (!v.date) e['date'] = dict.booking.form.required
  if (!v.selectedSlot) e['slot'] = dict.booking.form.required
  if (!v.email) e['email'] = dict.booking.form.required
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e['email'] = dict.booking.form.emailInvalid
  if (!isValidHours(v.hours)) e['hours'] = dict.booking.form.required
  return e
}

function useAvailability(date: string) {
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!date) {
      setSlots([])
      return
    }
    setLoading(true)
    fetch(`/api/availability?date=${encodeURIComponent(date)}`)
      .then(async (r) => {
        const j = await r.json()
        if (r.ok) setSlots(j.slots ?? [])
        else setSlots([])
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [date])
  return { slots, loading }
}

async function postBooking(payload: { email: string; date: string; startTime: string; hours: number }) {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({} as any))
  return { res, data }
}

function useBookingFields() {
  const [date, setDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [hours, setHours] = useState<number>(1)
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [conflictError, setConflictError] = useState('')
  return { date, setDate, selectedSlot, setSelectedSlot, hours, setHours, email, setEmail, errors, setErrors, submitting, setSubmitting, conflictError, setConflictError }
}

function useResetOnDate(fields: ReturnType<typeof useBookingFields>) {
  useEffect(() => {
    fields.setSelectedSlot('')
    fields.setConflictError('')
  }, [fields.date])
}

function handleBookingResponse(fields: ReturnType<typeof useBookingFields>, dict: any, res: any, data: any): boolean {
  if (res.status === 409) {
    fields.setConflictError(dict.booking.form.conflict)
    return true
  }
  if (!res.ok) {
    const msg = data && data.error ? data.error.message : 'Error'
    fields.setConflictError(msg)
    return true
  }
  const url = data.checkoutUrl as string
  if (url) window.location.href = url
  return false
}

function useBookingSubmit(fields: ReturnType<typeof useBookingFields>, dict: any) {
  return async (ev: React.FormEvent) => {
    ev.preventDefault()
    const v = validateBookingForm(dict, { date: fields.date, selectedSlot: fields.selectedSlot, email: fields.email, hours: fields.hours })
    fields.setErrors(v)
    if (Object.keys(v).length > 0) return
    fields.setSubmitting(true)
    fields.setConflictError('')
    try {
      const result = await postBooking({ email: fields.email, date: fields.date, startTime: fields.selectedSlot, hours: fields.hours })
      handleBookingResponse(fields, dict, result.res, result.data)
    } catch {
      fields.setConflictError('Error')
    } finally {
      fields.setSubmitting(false)
    }
  }
}

function DateField({ date, setDate, error }: { date: string; setDate: (v: string) => void; error?: string }) {
  const { dict } = useI18n()
  return (
    <>
      <label htmlFor="booking-date" style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#18181B', marginBottom: 4 }}>{dict.booking.form.dateLabel}</label>
      <p style={{ fontSize: 13, color: '#52525B', marginBottom: 4 }}>{dict.booking.form.dateLabel} helper</p>
      <input id="booking-date" type="date" value={date} min={todayMadrid()} onChange={(e) => setDate(e.target.value)} aria-describedby={error ? 'err-date' : undefined} style={{ width: '100%', padding: '8px 12px', borderRadius: 12, border: '1px solid #E4E4E7', marginBottom: 12 }} />
      {error ? <p id="err-date" style={{ color: '#B91C1C', fontSize: 13, marginBottom: 8 }}>{error}</p> : null}
    </>
  )
}

function SlotPill({ slot, selected, onSelect }: { slot: string; selected: boolean; onSelect: () => void }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 9999, border: selected ? '1px solid #18181B' : '1px solid #E4E4E7', background: selected ? '#18181B' : '#fff', color: selected ? '#fff' : '#18181B', cursor: 'pointer', fontSize: 14, transition: 'background 150ms' }}>
      <input type="radio" name="slot" value={slot} checked={selected} onChange={onSelect} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      {slot}
    </label>
  )
}

function SlotList({ slots, selectedSlot, setSelectedSlot }: { slots: string[]; selectedSlot: string; setSelectedSlot: (s: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {slots.map((s) => (
        <SlotPill key={s} slot={s} selected={selectedSlot === s} onSelect={() => setSelectedSlot(s)} />
      ))}
    </div>
  )
}

type SlotFieldProps = { slots: string[]; loading: boolean; date: string; selectedSlot: string; setSelectedSlot: (s: string) => void; error?: string; conflictError: string }

function getSlotBody(props: SlotFieldProps, dict: any): React.ReactNode {
  if (props.loading) return <p>{dict.booking.form.slotLoading}</p>
  if (props.slots.length === 0 && props.date) return <p>{dict.booking.form.slotEmpty}</p>
  if (props.slots.length > 0) return <SlotList slots={props.slots} selectedSlot={props.selectedSlot} setSelectedSlot={props.setSelectedSlot} />
  return null
}

function SlotField(props: SlotFieldProps) {
  const { dict } = useI18n()
  const body = getSlotBody(props, dict)
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px 0' }}>
      <legend style={{ fontSize: 14, fontWeight: 500, color: '#18181B', marginBottom: 8 }}>{dict.booking.form.slotLabel}</legend>
      {body}
      {props.error ? <p style={{ color: '#B91C1C', fontSize: 13, marginTop: 6 }}>{props.error}</p> : null}
      {props.conflictError ? <p role="alert" style={{ color: '#B91C1C', fontSize: 13, marginTop: 6 }}>{props.conflictError}</p> : null}
    </fieldset>
  )
}

function DurationField({ hours, setHours }: { hours: number; setHours: (h: number) => void }) {
  const { dict } = useI18n()
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px 0' }}>
      <legend style={{ fontSize: 14, fontWeight: 500, color: '#18181B', marginBottom: 8 }}>{dict.booking.form.durationLabel}</legend>
      <div role="group" aria-label={dict.booking.form.durationLabel} style={{ display: 'inline-flex', border: '1px solid #E4E4E7', borderRadius: 9999, overflow: 'hidden', padding: 2 }}>
        {[1, 2, 3, 4].map((h) => (
          <button key={h} type="button" aria-pressed={hours === h} onClick={() => setHours(h)} style={{ padding: '6px 14px', borderRadius: 9999, border: 'none', cursor: 'pointer', background: hours === h ? '#18181B' : 'transparent', color: hours === h ? '#fff' : '#18181B', fontSize: 14 }}>{h}h</button>
        ))}
      </div>
    </fieldset>
  )
}

function EmailField({ email, setEmail, error }: { email: string; setEmail: (v: string) => void; error?: string }) {
  const { dict } = useI18n()
  return (
    <>
      <label htmlFor="booking-email" style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#18181B', marginBottom: 4 }}>{dict.booking.form.emailLabel}</label>
      <p style={{ fontSize: 13, color: '#52525B', marginBottom: 4 }}>{dict.booking.form.emailHelper}</p>
      <input id="booking-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={error ? 'err-email' : 'help-email'} style={{ width: '100%', padding: '8px 12px', borderRadius: 12, border: error ? '1px solid #B91C1C' : '1px solid #E4E4E7', marginBottom: 4 }} />
      <span id="help-email" style={{ display: 'none' }}>{dict.booking.form.emailHelper}</span>
      {error ? <p id="err-email" style={{ color: '#B91C1C', fontSize: 13, marginBottom: 8 }}>{error}</p> : null}
    </>
  )
}

function BookingLayout({ dict, fields, slots, loading, handleSubmit }: { dict: any; fields: ReturnType<typeof useBookingFields>; slots: string[]; loading: boolean; handleSubmit: (e: React.FormEvent) => void }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <p style={{ fontSize: 13, color: '#52525B', marginBottom: 8 }}>{dict.booking.pricingRules}</p>
      <p style={{ fontSize: 12, color: '#71717A', marginBottom: 16 }}>{dict.booking.pricingExample}</p>
      <form onSubmit={handleSubmit} noValidate>
        <DateField date={fields.date} setDate={fields.setDate} error={fields.errors['date']} />
        <SlotField slots={slots} loading={loading} date={fields.date} selectedSlot={fields.selectedSlot} setSelectedSlot={fields.setSelectedSlot} error={fields.errors['slot']} conflictError={fields.conflictError} />
        <DurationField hours={fields.hours} setHours={fields.setHours} />
        <EmailField email={fields.email} setEmail={fields.setEmail} error={fields.errors['email']} />
        <button type="submit" disabled={fields.submitting} style={{ width: '100%', marginTop: 16, padding: '12px 24px', borderRadius: 9999, border: 'none', background: '#18181B', color: '#fff', fontSize: 14, fontWeight: 600, cursor: fields.submitting ? 'not-allowed' : 'pointer', opacity: fields.submitting ? 0.7 : 1 }}>{fields.submitting ? dict.booking.form.submitting : dict.booking.form.submit}</button>
      </form>
    </div>
  )
}

export function BookingWidget() {
  const { dict } = useI18n()
  const fields = useBookingFields()
  const { slots, loading } = useAvailability(fields.date)
  useResetOnDate(fields)
  const handleSubmit = useBookingSubmit(fields, dict)
  return <BookingLayout dict={dict} fields={fields} slots={slots} loading={loading} handleSubmit={handleSubmit} />
}
