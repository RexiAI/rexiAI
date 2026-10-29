/**
 * One free-text field of the booking form: label -> helper -> input -> hidden
 * helper -> error. The rhythm used to be copied into a component per field
 * (email, then name), which meant the error markup had two owners; it has one
 * now, and a field is data (id/type/copy) rather than a file.
 *
 * Every element id is derived from `fieldId` — `booking-<id>` for the input,
 * `help-<id>` / `err-<id>` for what the input's `aria-describedby` points at —
 * so a field cannot end up describing itself with another field's error.
 */

type TextInputSpec = {
  type: string
  autoComplete?: string
  /** Last control before the submit button: keeps the 4px gap, not the 12px one. */
  last?: boolean
}

export function TextField({
  fieldId,
  value,
  onChange,
  error,
  input,
  copy,
}: {
  fieldId: string
  value: string
  onChange: (v: string) => void
  error?: string
  input: TextInputSpec
  copy: { label: string; helper: string }
}) {
  const inputClass = `booking-input${input.last ? ' booking-input--last' : ''}${
    error ? ' booking-input--error' : ''
  }`
  return (
    <>
      <label htmlFor={`booking-${fieldId}`} className="booking-label">
        {copy.label}
      </label>
      <p className="field-helper">{copy.helper}</p>
      <input
        id={`booking-${fieldId}`}
        type={input.type}
        autoComplete={input.autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={error ? `err-${fieldId}` : `help-${fieldId}`}
        className={inputClass}
      />
      <span id={`help-${fieldId}`} className="hidden-helper">
        {copy.helper}
      </span>
      {error ? (
        <p id={`err-${fieldId}`} className="field-error">
          {error}
        </p>
      ) : null}
    </>
  )
}
