# AC-003 Task 5: Confirmation panel without the join link (Ask D)

`src/components/booking/BookingConfirmation.tsx:38-47` renders an "Unirse a la
sesión" CTA when `confirmation.joinUrl` is truthy. Owner decision 2026-10-19:
the customer joins only via the email's Jitsi link — the panel shows the
booking facts and the sent-by-email note (final copy/layout from
`15-design.md`, es + en via dictionary). The API response shape
(`{checkoutUrl: null, joinUrl, billingDisabled: true}`) and the frontend state
contract (`ConfirmationState` carries `joinUrl`) are UNCHANGED — pinned by
unmodified AC-002-05, AC-002-16, and the untouched unit test 'billingDisabled
without a joinUrl still confirms and never navigates'. Owner-authorized test
modifications (record in the PR body): the join-link expectation in
`AC-002-frontend-confirmation.render.test.tsx` and the AC-002-17 dictionary
key list in `AC-002-frontend-confirmation.test.ts`. Traceability note:
AC-003-32…34 citations must live in `.ts` test files.

## AC-003-32 — Panel renders the facts and note, never the join link (es)
Given the SPA renders with /api/config stubbed to { billingEnabled: false } and the es locale
And a valid booking is submitted and POST /api/bookings answers { checkoutUrl: null, joinUrl: 'https://meet.jit.si/rexi-panel', billingDisabled: true }
When the confirmation panel has replaced the form
Then the panel (role="status") shows the dictionary title, the date value 2027-03-01 (or the submitted date), the time value (the submitted slot), and the sent-by-email note copy from the dictionary (final strings per 15-design.md)
And the panel contains no anchor element whose href is https://meet.jit.si/rexi-panel
And the panel text contains neither 'Unirse a la sesión' nor 'Join the session'
And no navigation occurred (window.location.href stays '' under the AC-011 location-stub pattern)

## AC-003-33 — Panel is dictionary-only and join-link-free in en
Given the same flow with the en locale stored
When the confirmation panel has replaced the form
Then the panel shows the en dictionary title, date value, time value, and en note copy
And the panel contains no anchor element whose href equals the response joinUrl
And every user-visible string in the panel equals its en dictionary value (no hardcoded copy, no Spanish leftovers)
And the panel textContent does not match /billing|stripe|disabled|checkout/i (invariant preserved from the existing render test)

## AC-003-34 — joinLink dictionary key removed; remaining confirmation keys intact
Given the dictionaries exported from src/i18n/dictionary.ts after Task 5
When es.booking.confirmation and en.booking.confirmation are inspected
Then neither defines a joinLink key (the sole consumer is gone — YAGNI)
And both still define title, dateLabel, timeLabel, and note as non-empty strings
And both locales still have identical key shape (the dictionary _check compile guard passes)
And the modified AC-002-17 test pins exactly this remaining key list, and both owner-authorized test modifications are listed in the PR body
