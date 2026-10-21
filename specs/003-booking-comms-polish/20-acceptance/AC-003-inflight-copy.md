# AC-003 Task 4: Billing-aware in-flight submit copy (Ask A)

While the booking POST is in flight, the submit button label
(`src/components/booking/BookingLayout.tsx:68-74`) currently shows
`dict.booking.form.submitting` ('Redirigiendo a Stripe...' es / 'Redirecting to
Stripe...' en — `src/i18n/dictionary.ts:74,187`) regardless of `billingEnabled`.
With billing disabled no redirect ever happens. The neutral confirming copy
(final strings from `15-design.md`) is dictionary-driven, es + en, and reuses
the existing `useSiteConfig` `/api/config` fetch. Unmodified contracts that
must stay green: `AC-001-i18n.test.tsx` (incl. AC-001-05 no em/en dashes in
the dictionary JSON), `billing-free-mode.test.tsx`, `AC-011-booking-ui.test.tsx`.
Traceability note: AC-003-28…31 citations must live in `.ts` test files (the
gate does not scan `.tsx`).

## AC-003-28 — Billing disabled: in-flight label is the neutral dictionary copy (es)
Given the SPA renders with /api/config stubbed to { billingEnabled: false } and the es locale
And a valid booking form is submitted so the submit button enters the submitting state (the POST held in flight)
When the button label is read
Then it equals the new neutral Spanish in-flight copy from the dictionary (the exact string 15-design.md specifies)
And it does not match /stripe/i
And it is not 'Redirigiendo a Stripe...'
And the dictionary defines the new copy as a non-empty string in BOTH es and en
And JSON.stringify of both dictionaries contains no '—' and no '–' (AC-001-05 stays green unmodified)

## AC-003-29 — Billing enabled: in-flight label stays 'Redirigiendo a Stripe...'
Given the SPA renders with /api/config stubbed to { billingEnabled: true } and a valid booking form is submitted into the submitting state
When the button label is read in the es locale
Then it equals dict.booking.form.submitting, exactly 'Redirigiendo a Stripe...'
And when read in the en locale
Then it equals dict.booking.form.submitting, exactly 'Redirecting to Stripe...'
And the dictionary values at booking.form.submitting are unchanged from today (dictionary.ts:74,187)

## AC-003-30 — Billing disabled, en locale: in-flight label is the en neutral copy
Given the SPA renders with /api/config stubbed to { billingEnabled: false } and the en locale stored
And a valid booking form is submitted into the submitting state
When the button label is read
Then it equals the new neutral English in-flight copy from the dictionary (the exact string 15-design.md specifies)
And it does not match /stripe/i
And it contains no hardcoded component string (the rendered label is a dictionary value in both locales)

## AC-003-31 — No extra network requests for the billing-aware copy
Given the SPA renders with /api/config stubbed to { billingEnabled: false } and a counting fetch stub
When the page loads, a date is picked, and a valid booking is submitted through to the confirmation panel
Then exactly one fetch whose URL contains '/api/config' was issued in total (the existing single page-load fetch via useSiteConfig's cache/dedupe — the billing-aware copy adds no request of any kind)
