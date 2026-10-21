# AC-003 Task 2: Operator reservation email, billing-disabled variant

Zero billing language + professional restructure (layout and final copy from
`15-design.md`) for the operator email sent from the direct path
(`api/bookings/direct.ts`), with the billing-enabled output byte-identical.
Banned billing set (case-insensitive, checked against subject, text part, and
html part): EUR, €, pro-rata, prorrateo, factur, cargo, cobr, pago, pagar,
precio, tarifa, importe, stripe, reembols, gratis, gratuit, billing, charge.
Unmodified contracts that must stay green: `AC-016-email-safety.test.ts`
(default-shape wording/escaping/timezone label), `AC-002-direct-booking.test.ts`
AC-002-05…15 (call sites, order, failure policy), `AC-018-billing-guards.test.ts`.

## AC-003-14 — Disabled-mode operator email carries zero billing language
Given billing is disabled and an operator reservation email is produced for clientEmail client@example.com, date 2027-03-01, startTime 10:00, hours 2, joinUrl https://meet.jit.si/rexi-op
When the email subject, text part, and html part are captured (Resend payload via stubbed fetch)
Then none of the banned billing words appears in the subject, the text part, or the html part, case-insensitively
And the strings 'Reserva sin cargo', 'pro-rata', '0,50 EUR/min', 'Importe cobrado', and the character € appear in none of the three
And the email is entirely in Spanish (final copy per 15-design.md)

## AC-003-15 — Disabled-mode operator email structure: facts first, join CTA, calendar CTA
Given the captured disabled-mode operator email html for the AC-003-14 slot (Europe/Madrid resolved, no timezone env override)
When the html part is inspected
Then each key fact — the date 2027-03-01, the start time 10:00, the resolved timezone label Europe/Madrid, the duration 2 hours, and the client identity client@example.com — appears in the html
And every fact occurrence appears before the first occurrence of the join CTA (html.indexOf(fact) < html.indexOf of the join anchor href) in document order
And the html contains an anchor element whose href is exactly https://meet.jit.si/rexi-op (the primary CTA, button-styled per 15-design.md)
And the html contains an anchor whose visible text is exactly Añadir a Google Calendar
And that anchor's href starts with https://calendar.google.com/calendar/render?action=TEMPLATE (with & escaped as &amp; in the attribute) and contains dates=20270301T090000Z/20270301T110000Z
And the calendar link's details parameter, once percent-decoded, contains https://meet.jit.si/rexi-op
And the layout is the single-column mobile-readable structure specified in 15-design.md

## AC-003-16 — Operator email escaping: hostile clientEmail inert in html, raw in text
Given billing is disabled and the operator reservation email is produced with clientEmail <img src=x onerror=alert(1)>@ev.il and a valid joinUrl
When the Resend payload is captured
Then the html part does not contain the substring <img
And the html part contains &lt;img
And the html part does not contain onerror=alert(1)> in raw form
And the text part contains the raw address <img src=x onerror=alert(1)>@ev.il
And the text part contains neither &lt; nor &amp; (no double-escaping — AC-016-02 parity)
And the send completes successfully against a 200 stub

## AC-003-17 — Slot-conflict warning survives the restructure, named and billing-free
Given billing is disabled and the operator reservation email is produced with slotConflictWith set to other-booking-id
When the Resend payload is captured
Then both the text part and the html part contain other-booking-id
And the conflict warning is rendered with the prominence 15-design.md specifies (it is the only surface for the overlap backstop)
And none of the banned billing words appears (in particular no refund/reembols wording, since nothing was charged)

## AC-003-18 — Falsy join URL: operator email still sends, CTAs omitted
Given billing is disabled and the operator reservation email is produced with a falsy joinUrl (null, undefined, or empty string) and valid slot facts
When the email is built and sent against a 200 stub
Then no exception is thrown and the Resend request is made
And the subject, text part, and html part contain the slot facts (date, time with timezone label, duration, client identity)
And the html part contains no anchor with a join href and no calendar.google.com link (both CTAs omitted — the calendar details could not carry a join link)
And none of the banned billing words appears

## AC-003-19 — Default operator call is byte-identical to today (enabled-path guarantee)
Given the availability yaml fixture with timezone Europe/Madrid and no AVAILABILITY_TIMEZONE or TIMEZONE set
And sendOperatorEmail is called with today's exact input shape { clientEmail: client@example.com, date: 2027-03-01, startTime: 10:00, hours: 1, amountCents: 0 } — no kind, no joinUrl, no billing-mode signal
When the Resend payload is captured
Then payload.subject is exactly Nueva reserva: client@example.com - 2027-03-01 10:00
And payload.text is exactly the five current lines joined by newlines: Cliente: client@example.com / Fecha: 2027-03-01 / Hora (Europe/Madrid): 10:00 / Duración: 1 horas / Reserva sin cargo — se factura tras la reunión (pro-rata 0,50 EUR/min)
And payload.html is exactly those same five escaped lines joined by <br/> inside a single <p> element
And AC-016-email-safety.test.ts passes unmodified (it additionally pins the charge-line rendering, the timezone label under env override, and the escaping behavior of this default path)

## AC-003-20 — Direct-path e2e: the operator email Resend receives is the disabled variant
Given BILLING_ENABLED=false, valid Resend env (EMAIL_FROM not a @resend.dev sandbox sender, EMAIL_TO operator@example.com), the availability yaml fixture, and a global fetch stub capturing every request
And calendar side effects are stubbed to succeed (module mock or Graph-level stub — the AC-002 pattern)
When POST /api/bookings is handled with body { email: client@example.com, date: 2027-03-01, startTime: 10:00, hours: 1 }
Then the response is 200 with body { checkoutUrl: null, joinUrl: <non-empty string>, billingDisabled: true }
And exactly one captured Resend request has body.to equal to operator@example.com
And that request's subject, text, and html contain none of the banned billing words
And its html contains an anchor with href equal to the response joinUrl and an anchor with text Añadir a Google Calendar whose href contains dates=20270301T090000Z/20270301T100000Z
And the side-effect order and failure policy remain exactly as pinned by unmodified AC-002-06 and AC-002-11 (not re-asserted here)
