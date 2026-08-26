# AC-007: Booking creation API + Stripe Checkout session

`POST /api/bookings` body: `{ email, date, startTime, hours }`.

## AC-007-01 — First-timer one-hour booking creates a zero-euro checkout session
Given email `first@example.com`, a free slot 2027-03-01 10:00 Europe/Madrid, hours = 1,
and no prior bookings for that email
When POST /api/bookings is called
Then a Stripe Checkout Session is created in test mode with currency EUR, mode payment,
amount 0 cents; metadata carries email, date, start_time, hours=1, free_hour_applied=true;
and the response is 200 with `{ "checkoutUrl": "<session url>" }`

## AC-007-02 — First-timer two-hour booking charges €30
Given a first-time client booking hours = 2 at a free slot
When POST /api/bookings is called
Then the created session amount is 3000 cents and metadata has free_hour_applied=true

## AC-007-03 — Returning client pays full price
Given a client whose free hour is already used booking hours = 2 at a free slot
When POST /api/bookings is called
Then the created session amount is 6000 cents and metadata has free_hour_applied=false

## AC-007-04 — Invalid email rejected without calling Stripe
Given body with email `"not-an-email"`
When POST /api/bookings is called
Then the response is 400 with an error body and no Stripe session was created

## AC-007-05 — Invalid durations rejected without calling Stripe
Given hours of 0, 5, or 2.5 (each tested)
When POST /api/bookings is called
Then each request responds 400 with an error body and creates no session

## AC-007-06 — Off-grid start time rejected
Given startTime `"09:15"` for a day whose slots are whole-hour aligned
When POST /api/bookings is called
Then the response is 400 with an error body and no session is created

## AC-007-07 — Start outside availability rejected
Given startTime `"18:00"` on a day whose availability ends before 19:00
When POST /api/bookings is called
Then the response is 400 with an error body and no session is created

## AC-007-08 — Conflicting existing booking rejected
Given an existing calendar event overlapping the requested window 2027-03-01 10:00–11:00
When POST /api/bookings requests that same window
Then the response is 409 with an error body and no session is created
