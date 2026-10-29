# AC-008: Capture the customer name in the booking form

## AC-008-01 — Empty name blocks submit
Given a booking form with the date, slot, hours and email filled in
And an empty name field
When the form is submitted
Then no request is sent to `/api/bookings`
And the form shows the required-field error on the name field

## AC-008-02 — Whitespace-only name blocks submit
Given a booking form with the date, slot, hours and email filled in
And a name field containing only spaces
When the form is submitted
Then no request is sent to `/api/bookings`
And the form shows the required-field error on the name field

## AC-008-03 — Filled name is included in the POST body
Given a booking form with a name of "Ana López"
And the date, slot, hours, email and locale filled in
When the form is submitted
Then the POST body to `/api/bookings` contains `name` equal to "Ana López"
And the POST body still contains `email`, `date`, `startTime`, `hours` and `locale`

## AC-008-20 — Name longer than 200 chars is rejected client-side
Given a booking form with the date, slot, hours and email filled in
And a name field containing 201 characters (after trimming)
When the form is submitted
Then no request is sent to `/api/bookings`
And the form shows the name-too-long error on the name field
