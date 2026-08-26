# AC-009: Google Calendar event creation

## AC-009-01 — Summer times convert through CEST correctly
Given a booking 2027-07-15 10:00–11:00 Europe/Madrid (CEST, UTC+2)
When the event is created
Then the event start/end instants are 2027-07-15T08:00Z–09:00Z

## AC-009-02 — Winter times convert through CET correctly
Given a booking 2027-12-15 10:00–11:00 Europe/Madrid (CET, UTC+1)
When the event is created
Then the event start/end instants are 2027-12-15T09:00Z–10:00Z

## AC-009-03 — Event carries the booking id property
Given a completed checkout session id `cs_test_123`
When the event is created
Then the event has extendedProperties.private.rexi_booking_id = "cs_test_123"

## AC-009-04 — Duplicate suppression
Given the calendar already contains an event whose rexi_booking_id matches the session id
When event creation runs for that session id
Then no second event is inserted and the operation reports "already exists"

## AC-009-05 — Calendar id and service-account credentials come from configuration
Given GOOGLE_CALENDAR_ID and GOOGLE_SERVICE_ACCOUNT_JSON are set in the environment
When the Calendar client is constructed and an event is created
Then authentication uses the configured service account and insertion targets the
configured calendar id
