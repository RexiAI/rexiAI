# AC-002: Frontend confirmation state when billing is disabled (Task 2)

Surface under test: `src/components/booking/hooks/useBookingSubmit.ts` (submit
behavior), the state holder it writes to, the render path
(`BookingLayout.tsx` / `BookingWidget.tsx`), and `src/i18n/dictionary.ts`.
Hook-level assertions must live in a `*.test.ts` file citing these IDs (the
traceability gate does not scan `.tsx`); supplementary `.tsx` render tests may
cite the same IDs. The enabled-path redirect stays guarded by the existing,
unmodified `AC-011-04` test — no AC-002 scenario duplicates it.

## AC-002-16 — A billingDisabled response sets a confirmation state without navigation
Given the booking form holds valid values: date `2027-03-01`, selected slot `10:00`, a valid email, hours `1`
And `fetch('/api/bookings')` resolves with `ok: true`, status 200, and body `{ checkoutUrl: null, joinUrl: 'https://meet.jit.si/rexi-test', billingDisabled: true }`
When the booking submit handler runs
Then `window.location.href` is never assigned
And no error state is set
And the hook's confirmation state is non-null and equals `{ date: '2027-03-01', startTime: '10:00', joinUrl: 'https://meet.jit.si/rexi-test' }` — date and startTime taken from the submitted field values, joinUrl from the response

## AC-002-17 — Confirmation panel replaces the form with dictionary copy in both locales
Given the confirmation state is set to `{ date: '2027-03-01', startTime: '10:00', joinUrl: 'https://meet.jit.si/rexi-test' }`
When the booking widget renders
Then a confirmation panel renders inline INSTEAD OF the booking form — no route change and no `/booking/success` navigation
And the panel displays the active dictionary's `booking.confirmation.title`
And the panel displays the booked date value `2027-03-01` and the booked start time `10:00`
And the panel renders an `<a>` whose `href` equals `https://meet.jit.si/rexi-test`, labeled with the active dictionary's `booking.confirmation.joinLink`
And every user-facing string in the panel equals a value from the active dictionary — no hardcoded literals in the component
And both the `es` and the `en` dictionaries define `booking.confirmation.title` and `booking.confirmation.joinLink` as non-empty strings
