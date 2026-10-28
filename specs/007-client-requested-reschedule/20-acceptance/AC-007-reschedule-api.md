# AC-007: Reschedule API endpoints (resolve + submit)

## AC-007-22 — GET resolves a valid token to the current slot and reschedule eligibility
Given a valid token T for a booking at date D, startTime S, hours H, with a reschedule count below MAX_RESCHEDULES and a meeting start in the future
When GET /api/reschedule?token=T is called
Then the response is 200 with body { date: D, startTime: S, hours: H, canReschedule: true }
And the body contains no other fields (no email, no bookingId, no joinUrl, no count)

## AC-007-23 — GET does not reveal email, bookingId, or join URL
Given a valid token T
When GET /api/reschedule?token=T is called
Then the response body does not contain the client email, the bookingId, or the join URL

## AC-007-24 — POST moves the meeting and returns the unchanged join URL
Given a valid token T for a booking with joinUrl J and a free new slot (date D2, startTime S2)
When POST /api/reschedule with body { token: T, date: D2, startTime: S2 } is called
Then the event is moved to D2 S2
And the response is 200 with body { date: D2, startTime: S2, hours: <stored hours>, joinUrl: J }
And J is byte-identical to the booking's pre-existing join URL

## AC-007-25 — A wrong, expired, or already-used token returns one generic error
Given a token that is wrong, or expired (meeting already happened), or already rotated by a prior reschedule
When POST /api/reschedule is called with that token
Then the response is 404 with code INVALID_RESCHEDULE_TOKEN and a static message
And the three cases produce byte-identical error responses (no distinction)
And no calendar event is moved

## AC-007-26 — Reschedule is rate-limited independently of booking
Given a client that has exhausted the reschedule rate limit
When POST /api/reschedule is called again from that client
Then the response is 429
And the response does not consume the booking endpoint's separate rate limit

## AC-007-27 — Wrong method is rejected
Given a request to /api/reschedule with a method other than GET or POST
When the request is handled
Then the response is 405

## AC-007-28 — Reschedule works without a Stripe session (billing-disabled parity)
Given a booking created via the direct path whose bookingId is a UUID stored only in the calendar event (no Stripe session)
When GET /api/reschedule and POST /api/reschedule are called with its token
Then resolution and the move succeed by reading the calendar event only, never Stripe

## AC-007-48 — GET reports canReschedule false at the limit or after the meeting
Given a valid token T for a booking whose reschedule count is at MAX_RESCHEDULES (or whose meeting has already happened)
When GET /api/reschedule?token=T is called
Then the response is 200 with canReschedule: false
And the body still contains no email, no bookingId, no joinUrl, and no count
