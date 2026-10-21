# AC-003 Task 3: Client confirmation email, billing-disabled variant

Zero billing language + professional restructure (layout and final copy from
`15-design.md`, service framing for the client) for the client email sent
best-effort from the direct path, with the billing-enabled output
byte-identical. Same banned billing set as Task 2 (AC-003-14). Unmodified
contracts that must stay green: `AC-018-billing-guards.test.ts` (AC-018-05
pins the enabled client wording through today's call shape),
`AC-002-direct-booking.test.ts` AC-002-05…15 (AC-002-06 pins the client call's
first argument exactly; AC-002-12 pins the best-effort policy).

## AC-003-21 — Disabled-mode client email carries zero billing language
Given billing is disabled and a client confirmation email is produced for clientEmail client@example.com, date 2027-03-01, startTime 10:00, hours 2, joinUrl https://meet.jit.si/rexi-cli
When the email subject, text part, and html part are captured (Resend payload via stubbed fetch)
Then none of the banned billing words (EUR, €, pro-rata, prorrateo, factur, cargo, cobr, pago, pagar, precio, tarifa, importe, stripe, reembols, gratis, gratuit, billing, charge) appears in any of the three, case-insensitively
And the strings 'Reserva sin cargo', '0,50 EUR/min', and '60 minutos gratis' appear in none of the three
And the email is entirely in Spanish (final copy per 15-design.md)

## AC-003-22 — Disabled-mode client email structure: facts first, service framing, both CTAs
Given the captured disabled-mode client email html for the AC-003-21 slot (Europe/Madrid resolved, no timezone env override)
When the html part is inspected
Then the key facts — date 2027-03-01, start time 10:00, the resolved timezone label Europe/Madrid, and duration 2 hours — appear in the html
And every fact occurrence appears before the first occurrence of the join CTA in document order (key facts at top)
And the html contains an anchor element whose href is exactly https://meet.jit.si/rexi-cli (primary CTA, button-styled per 15-design.md)
And the html contains an anchor whose visible text is exactly Añadir a Google Calendar
And that anchor's href starts with https://calendar.google.com/calendar/render?action=TEMPLATE (with & escaped as &amp; in the attribute) and contains dates=20270301T090000Z/20270301T110000Z
And the calendar link's details parameter, once percent-decoded, contains https://meet.jit.si/rexi-cli
And the layout is the single-column mobile-readable structure with the service framing copy specified in 15-design.md

## AC-003-23 — Client email escaping at every sink
Given billing is disabled and the client confirmation email is produced with clientEmail <img src=x onerror=alert(1)>@ev.il and a valid joinUrl
When the Resend payload is captured
Then the html part does not contain the substring <img anywhere (whatever the design renders, every client-controlled value passes escapeHtml at its sink)
And any escaped rendering of the address appears as &lt;img in the html
And the text part contains no &lt; and no &amp; (no double-escaping of any rendered value)
And the request is addressed to the client address itself (payload.to equals the hostile address string, unchanged)

## AC-003-24 — Falsy join URL: client email still sends, CTAs omitted
Given billing is disabled and the client confirmation email is produced with a falsy joinUrl (null, undefined, or empty string) and valid slot facts
When the email is built and sent against a 200 stub with a usable EMAIL_FROM
Then no exception is thrown and the Resend request is made
And the subject, text part, and html part contain the slot facts (date, time with timezone label, duration)
And the html part contains no join anchor and no calendar.google.com link (both CTAs omitted)
And none of the banned billing words appears

## AC-003-25 — Default client call is byte-identical to today (enabled-path guarantee)
Given the availability yaml fixture with timezone Europe/Madrid, no AVAILABILITY_TIMEZONE or TIMEZONE set, and a usable EMAIL_FROM (not @resend.dev)
And sendClientEmail is called with today's exact input shape { clientEmail: client@example.com, date: 2027-03-01, startTime: 10:00, hours: 1, joinUrl: https://teams.microsoft.com/l/meetup-join/xyz } — no billing-mode signal
When the Resend payload is captured
Then payload.subject is exactly Reserva confirmada: 2027-03-01 10:00
And payload.text is exactly the current seven lines joined by newlines: Tu reunión con RexiAI está confirmada. / Fecha: 2027-03-01 / Hora (Europe/Madrid): 10:00 / Duración: 1 horas / Enlace de la reunión: https://teams.microsoft.com/l/meetup-join/xyz / Reserva sin cargo: no se cobra nada al reservar. / Se factura después de la reunión a 0,50 EUR/min (30 EUR/hora), con los primeros 60 minutos gratis la primera vez.
And payload.html is exactly those same seven escaped lines joined by <br/> inside a single <p> element
And payload.to is client@example.com
And AC-018-billing-guards.test.ts passes unmodified (AC-018-05 pins this wording as the enabled-world contract)

## AC-003-26 — Sandbox-sender guard still blocks disabled-mode client sends
Given billing is disabled and EMAIL_FROM is onboarding@resend.dev (the Resend sandbox sender)
When the disabled-mode client confirmation email is sent
Then the send rejects with an error whose message matches /sandbox sender/ (assertClientSenderUsable applies to the disabled variant too)
And no Resend HTTP request is made (the stubbed fetch is never called)

## AC-003-27 — Direct-path e2e: the client email Resend receives is the disabled variant, to the client
Given BILLING_ENABLED=false, valid Resend env (EMAIL_FROM hola@rexi-ai.com, EMAIL_TO operator@example.com), the availability yaml fixture, a global fetch stub capturing every request, and calendar side effects stubbed to succeed
When POST /api/bookings is handled with body { email: client@example.com, date: 2027-03-01, startTime: 10:00, hours: 1 }
Then the response is 200 with body { checkoutUrl: null, joinUrl: <non-empty string>, billingDisabled: true }
And exactly one captured Resend request has body.to equal to client@example.com (never EMAIL_TO)
And that request's subject, text, and html contain none of the banned billing words
And its html contains an anchor with href equal to the response joinUrl and an anchor with text Añadir a Google Calendar whose href contains dates=20270301T090000Z/20270301T100000Z
And the best-effort policy remains exactly as pinned by unmodified AC-002-12: a failing client send is still logged and swallowed with the booking standing (not re-asserted here)
