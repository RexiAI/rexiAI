# AC-007: Calendar move operation and location field

## AC-007-08 — Move changes start and end, keeps the duration and booking id
Given a booking event at date D1, startTime S1, hours H, bookingId cs_test_123
When the event is moved to date D2, startTime S2 with the same hours H
Then the event's start is D2 S2 and its end is D2 (S2 + H hours)
And the event's rexi_booking_id is still cs_test_123

## AC-007-09 — Move releases the old slot
Given a booking event at date D1, startTime S1, hours H
When the event is moved to date D2, startTime S2
Then the event no longer occupies D1 S1 (its start/end are D2)
And findOverlappingBookingId for the old slot D1 S1 no longer returns this bookingId

## AC-007-10 — Location field carries the branded join URL on create
Given a booking created with joinUrl https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es
When the calendar event is created
Then the event's location field is https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es
And the location field is byte-identical to the join URL in the event body
And the location field is never the https://meet.jit.si/ room URL

## AC-007-11 — Location field carries the branded join URL on move
Given a booking event with joinUrl https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=en
When the event is moved to a new slot
Then the event's location field is https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=en
And the location field is byte-identical to the join URL in the event body

## AC-007-12 — The room never rotates on reschedule
Given a booking with joinUrl https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es
When the event is moved
Then the join URL and location still reference the room rexi-0123456789abcdef
And no new room name is generated during the move

## AC-007-13 — Move writes the new token and increments the count
Given a booking event with rexi_reschedule_token = T0 and rexi_reschedule_count = "0"
When the event is moved with a new token T1
Then the event's rexi_reschedule_token is T1
And the event's rexi_reschedule_count is "1"
