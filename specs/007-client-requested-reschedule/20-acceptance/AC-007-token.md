# AC-007: Opaque reschedule token

## AC-007-01 — Token is 32 random bytes hex-encoded, lowercase, 64 chars
Given a reschedule token is generated
When the token value is inspected
Then the token matches /^[0-9a-f]{64}$/
And the token is exactly 64 characters long
And the token contains only lowercase hex characters

## AC-007-02 — Generation is independent of booking data and random
Given two bookings with different email, bookingId, join URL, date, and startTime
When a reschedule token is generated for each booking
Then the generation function takes no booking field as input
And the two tokens are different values
And neither token contains either booking's email, bookingId, room name, date, or startTime as a substring

## AC-007-03 — A malformed token is rejected without a calendar call
Given a candidate token that is not 64 lowercase hex characters (empty string, 32 hex chars, 64 uppercase hex chars, or a value containing "/", "_", "+", or any non-hex character)
When isValidRescheduleToken is evaluated on that candidate
Then the result is false
And no calendar/Graph request is made for that candidate
