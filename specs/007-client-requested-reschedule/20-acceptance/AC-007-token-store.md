# AC-007: Persist and resolve booking reschedule state

## AC-007-04 — Create event writes the full reschedule state
Given a booking being created with email a@b.com, joinUrl https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es, hours 1, locale es, bookingId cs_test_123, and reschedule token T
When the calendar event is created
Then the event's single-value extended properties include rexi_booking_id = cs_test_123, rexi_reschedule_token = T, rexi_reschedule_count = "0", rexi_join_url = https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es, rexi_client_email = a@b.com, rexi_hours = "1", and rexi_locale = es

## AC-007-05 — A token resolves to its booking's current state
Given an event with rexi_reschedule_token = T, rexi_booking_id = cs_test_123, rexi_client_email = a@b.com, rexi_hours = "1", rexi_join_url = J, rexi_locale = en, rexi_reschedule_count = "0", and start at date D start S
When findBookingByRescheduleToken(T) is called
Then it returns bookingId cs_test_123, email a@b.com, date D, startTime S, hours 1, joinUrl J, locale en, and count 0

## AC-007-06 — An unknown token resolves to null
Given no calendar event carries the token T
When findBookingByRescheduleToken(T) is called
Then it returns null

## AC-007-07 — A rotated token no longer resolves
Given an event whose rexi_reschedule_token was T0 and was later moved so rexi_reschedule_token is now T1
When findBookingByRescheduleToken(T0) is called
Then it returns null
And findBookingByRescheduleToken(T1) still resolves to the booking
