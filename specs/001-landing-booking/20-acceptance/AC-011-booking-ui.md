# AC-011: Booking widget UI

## AC-011-01 — Selecting a date loads available slots
Given the booking widget is rendered
When the visitor selects the date 2027-03-01
Then GET /api/availability?date=2027-03-01 is requested and the returned slot starts are
displayed as selectable options

## AC-011-02 — Duration control offers whole hours 1 to 4 only
Given the booking widget is rendered
When the duration control is examined
Then exactly four selectable values exist: 1, 2, 3, and 4 hours

## AC-011-03 — Localized pricing rules are displayed
Given the widget is rendered in any active locale
When the pricing information is examined
Then it states that the first hour is free for new clients and additional hours cost
€30/hour, in the active locale

## AC-011-04 — Valid submit posts to the API and redirects to Stripe
Given the visitor has filled email, date, slot start, and duration with valid values
When the submit control is activated and POST /api/bookings responds with a checkoutUrl
Then the request body contains `{email, date, startTime, hours}` as entered and the
browser is redirected to the returned checkoutUrl

## AC-011-05 — Invalid email blocks submission without a request
Given the email field contains `"not-an-email"`
When the submit control is activated
Then inline feedback indicates the problem, no network request to /api/bookings is made,
and no redirect occurs

## AC-011-06 — Missing required fields block submission
Given one or more of date, slot start, duration, or email is empty
When the submit control is activated
Then inline feedback marks the missing fields, no request is sent, and no redirect occurs
