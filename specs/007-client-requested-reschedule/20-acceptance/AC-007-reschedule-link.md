# AC-007: Reschedule link in the booking confirmation emails

## AC-007-35 — Enabled client email carries the reschedule link
Given a billing-enabled booking with token T and locale en
When the client confirmation email is built
Then it includes a link to https://meet.rexi-ai.com/reschedule/T?lang=en

## AC-007-36 — Disabled (direct) client email carries the reschedule link
Given a billing-disabled booking with token T and locale es
When the client confirmation email is built
Then it includes a link to https://meet.rexi-ai.com/reschedule/T?lang=es

## AC-007-37 — The reschedule URL reveals nothing beyond the token
Given a reschedule link in either client email variant
Then the path segment after /reschedule/ is exactly the opaque 64-hex token
And the URL contains no email address, bookingId, room name, date, or time

## AC-007-38 — The operator email carries no reschedule link
Given the operator notification email for a booking
When the email body is inspected
Then it does not contain a /reschedule/ link or the reschedule token
