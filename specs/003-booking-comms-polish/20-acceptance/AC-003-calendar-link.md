# AC-003 Task 1: Google Calendar TEMPLATE link builder

Builder for the "Añadir a Google Calendar" secondary CTA used by both
disabled-billing emails (Tasks 2-3). Times derive from the same env timezone
chain (`AVAILABILITY_TIMEZONE` → `TIMEZONE` → `Europe/Madrid`) and slot
resolution (`src/domain/time.ts` `slotIntervalUtc`/`zonedToUtc`) as the
direct-path calendar event — no second source of truth. Owner's URL template
(informal spec §C): `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<title>&dates=<UTCstart>/<UTCend>&details=<details>`.

## AC-003-10 — TEMPLATE URL shape, UTC dates from the slot, duration, and full encoding
Given the calendar-link builder for a slot on date 2027-03-01, start time 10:00, duration 2 hours
And neither AVAILABILITY_TIMEZONE nor TIMEZONE is set (the chain resolves to Europe/Madrid, CET = UTC+1 on that date)
And a caller-supplied event title and a details string containing the join URL https://meet.jit.si/rexi-cal
When the builder produces the link
Then the link is exactly https://calendar.google.com/calendar/render?action=TEMPLATE&text=<E>&dates=20270301T090000Z/20270301T110000Z&details=<D>
And <E> is the title passed through encodeURIComponent
And <D> is the details passed through encodeURIComponent
And decoding <D> yields a string containing https://meet.jit.si/rexi-cal
And the end timestamp equals the start timestamp plus exactly 2 hours

## AC-003-11 — Timezone env chain drives the conversion, same as the calendar event
Given a slot on date 2027-03-01, start time 10:00, duration 1 hour
When AVAILABILITY_TIMEZONE is America/New_York (EST = UTC-5 on that date)
Then the dates parameter is 20270301T150000Z/20270301T160000Z
When AVAILABILITY_TIMEZONE is unset and TIMEZONE is Europe/Lisbon (WET = UTC+0 on that date)
Then the dates parameter is 20270301T100000Z/20270301T110000Z
When AVAILABILITY_TIMEZONE is the empty string and TIMEZONE is Europe/Lisbon
Then the dates parameter is still 20270301T100000Z/20270301T110000Z (empty behaves as unset, truthiness parity with resolveCalendarTimezone in api/bookings/direct.ts)
When neither variable is set
Then the dates parameter is 20270301T090000Z/20270301T100000Z (Europe/Madrid default)

## AC-003-12 — Summer-time slots convert with the DST offset, never a fixed one
Given the calendar-link builder for a slot on date 2027-07-15, start time 10:00, duration 1 hour
And neither AVAILABILITY_TIMEZONE nor TIMEZONE is set (Europe/Madrid, CEST = UTC+2 on that date)
When the builder produces the link
Then the dates parameter is 20270715T080000Z/20270715T090000Z
And the conversion offset differs from the winter case (AC-003-10/11), proving no hardcoded UTC offset

## AC-003-13 — Hostile and special-character values are percent-encoded, separators stay structural
Given the calendar-link builder for any valid slot
And a title containing a double quote, an angle-bracket script fragment, an ampersand, a space, an equals sign, and an accented character (e.g. Reunión "urgente" <script>& x=1)
And a details string containing the join URL with its own query separators (e.g. Únete: https://meet.jit.si/rexi-abc?a=1&b=2#frag)
When the builder produces the link
Then the URL contains exactly 3 raw ampersand characters (the structural separators between action, text, dates, details)
And the URL contains exactly 4 raw equals signs (one per parameter) and no others (encoded values carry %3D)
And the URL contains no raw space, angle bracket, double quote, or single quote character
And the text parameter value equals encodeURIComponent of the title
And the details parameter value equals encodeURIComponent of the details string
And the dates parameter value matches the pattern YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ with a raw structural slash
