import { useI18n } from '../../../i18n/I18nContext'

function SlotPill({
  slot,
  selected,
  onSelect,
}: {
  slot: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <label className={`slot-chip${selected ? ' slot-chip--selected' : ''}`}>
      <input
        type="radio"
        name="slot"
        value={slot}
        checked={selected}
        onChange={onSelect}
        className="slot-chip__input"
      />
      {slot}
    </label>
  )
}

function SlotList({
  slots,
  selectedSlot,
  setSelectedSlot,
}: {
  slots: string[]
  selectedSlot: string
  setSelectedSlot: (s: string) => void
}) {
  return (
    <div className="slot-list">
      {slots.map((s) => (
        <SlotPill
          key={s}
          slot={s}
          selected={selectedSlot === s}
          onSelect={() => setSelectedSlot(s)}
        />
      ))}
    </div>
  )
}

type SlotFieldProps = {
  slots: string[]
  loading: boolean
  date: string
  selectedSlot: string
  setSelectedSlot: (s: string) => void
  error?: string
  conflictError: string
}

function getSlotBody(props: SlotFieldProps, dict: any): React.ReactNode {
  if (props.loading) return <p>{dict.booking.form.slotLoading}</p>
  if (props.slots.length === 0 && props.date) return <p>{dict.booking.form.slotEmpty}</p>
  if (props.slots.length > 0)
    return (
      <SlotList
        slots={props.slots}
        selectedSlot={props.selectedSlot}
        setSelectedSlot={props.setSelectedSlot}
      />
    )
  return null
}

export function SlotField(props: SlotFieldProps) {
  const { dict } = useI18n()
  const body = getSlotBody(props, dict)
  return (
    <fieldset className="booking-fieldset">
      <legend className="booking-legend">{dict.booking.form.slotLabel}</legend>
      {body}
      {props.error ? <p className="field-error--slot">{props.error}</p> : null}
      {props.conflictError ? (
        <p role="alert" className="field-error--slot">
          {props.conflictError}
        </p>
      ) : null}
    </fieldset>
  )
}
