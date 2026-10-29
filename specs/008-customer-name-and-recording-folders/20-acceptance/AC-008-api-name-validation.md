# AC-008: Validate the customer name at the API boundary

## AC-008-04 — Valid name is accepted and trimmed
Given a `POST /api/bookings` body with `name` equal to "  Ana López  "
And valid `email`, `date`, `startTime` and `hours`
When the booking input is prepared
Then validation passes
And the prepared input carries `name` equal to "Ana López" (leading and trailing whitespace removed)

## AC-008-05 — Missing name is rejected
Given a `POST /api/bookings` body with no `name` field
And valid `email`, `date`, `startTime` and `hours`
When the booking input is prepared
Then the response status is 400
And the response body is `{ "error": { "code": "INVALID_NAME", "message": "Name is required" } }`

## AC-008-06 — Blank name is rejected
Given a `POST /api/bookings` body with `name` equal to `""` or `"   "`
And valid `email`, `date`, `startTime` and `hours`
When the booking input is prepared
Then the response status is 400
And the response body is `{ "error": { "code": "INVALID_NAME", "message": "Name is required" } }`

## AC-008-21 — Name longer than 200 chars is rejected
Given a `POST /api/bookings` body with `name` of 201 characters
And valid `email`, `date`, `startTime` and `hours`
When the booking input is prepared
Then the response status is 400
And the response body is `{ "error": { "code": "INVALID_NAME", "message": "Name is too long" } }`
