# AC-007: Reschedule notifications (operator + client)

## AC-007-29 — Operator is notified with old and new slot, bookingId, and count
Given a successful reschedule from slot D1 S1 to slot D2 S2 for booking cs_test_123 with client a@b.com and joinUrl J
When the operator notification is sent
Then it includes the client email a@b.com, the old slot D1 S1, the new slot D2 S2, the bookingId cs_test_123, the locale-free join URL, and the new reschedule count

## AC-007-30 — Operator email is locale-free and never carries the consent notice
Given a reschedule for an English-locale booking
When the operator notification is sent
Then its join URL has no ?lang= parameter
And the operator email contains no consent-notice text

## AC-007-31 — Client confirmation carries the new slot, notice, and join link
Given a successful reschedule to slot D2 S2 for an English-locale booking
When the client confirmation is sent
Then it includes the new slot D2 S2, the join URL carrying ?lang=en, and the English consent notice
And the consent notice appears before the join link

## AC-007-32 — Client confirmation carries the new rotated token
Given a successful reschedule that rotated the token from T0 to T1
When the client confirmation is sent
Then it includes a reschedule link carrying T1
And that link is absent of T0

## AC-007-33 — Operator is notified when the limit blocks a further reschedule
Given a booking at the reschedule limit
And a client attempts a further reschedule that is refused
When the refusal is handled
Then the operator is notified that a reschedule attempt was blocked

## AC-007-34 — An operator-notification failure surfaces loudly and never rolls back the move
Given a successful calendar move whose operator notification then fails
When the reschedule endpoint finishes
Then the endpoint returns a 5xx (never a silent success)
And the move stands — it is not rolled back
And no compensating action is attempted
And the operator-notification failure is logged/alerted

## AC-007-49 — A client-confirmation failure is logged and the move stands
Given a successful calendar move whose client confirmation email then fails
When the reschedule endpoint finishes
Then the endpoint returns success (200), not a 5xx
And the move stands — it is not rolled back
And no compensating action is attempted
And the client-confirmation failure is logged

## AC-007-50 — The client reschedule confirmation is Spanish-body with only the notice localised
Given a successful reschedule for an English-locale booking
When the client confirmation is built
Then the subject, heading, fact labels, help line, and CTA labels are Spanish
And the consent notice is English (the only localised line)
And the join URL carries ?lang=en
