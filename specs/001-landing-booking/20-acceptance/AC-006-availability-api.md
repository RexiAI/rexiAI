# AC-006: Availability API endpoint

`GET /api/availability?date=YYYY-MM-DD` → `{ "date": "...", "slots": ["HH:mm", ...] }`.
Busy intervals come from Google Calendar free/busy over the Madrid-local day.

## AC-006-01 — Open day returns YAML slots
Given availability YAML granting monday 09:00–13:00 and a monday date with no bookings
When GET /api/availability is called for that date
Then response is 200 and slots are exactly ["09:00", "10:00", "11:00", "12:00"]

## AC-006-02 — Exact busy interval removes its slots
Given an existing calendar event 10:00–12:00 on the requested day
When GET /api/availability is called for that day
Then slots 10:00 and 11:00 are absent and ["09:00", "12:00"] remain

## AC-006-03 — Partial-hour busy overlap blocks both touched slots
Given an existing calendar event 09:30–11:00 on the requested day
When GET /api/availability is called for that day
Then slots 09:00 and 10:00 are absent (both overlap) and 11:00, 12:00 remain

## AC-006-04 — Blackout exception day returns empty
Given exceptions map the requested date to `[]`
When GET /api/availability is called for that date
Then response is 200 with an empty slots list

## AC-006-05 — Past dates rejected
Given a date earlier than today in Europe/Madrid
When GET /api/availability is called with that date
Then the response is 400 with an error body of shape `{ "error": { "code", "message" } }`

## AC-006-06 — Malformed date rejected
Given `date=31-12-2027` (not YYYY-MM-DD)
When GET /api/availability is called
Then the response is 400 with an error body

## AC-006-07 — Missing date parameter rejected
Given no `date` query parameter
When GET /api/availability is called
Then the response is 400 with an error body
