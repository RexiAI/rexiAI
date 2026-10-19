# AC-002: Direct booking when billing is disabled (Task 1 — backend)

Handler under test: `POST /api/bookings` (`api/bookings.ts` + new
`api/bookings/direct.ts`). "Zero Stripe calls" always means: `getStripe` never
constructs a client, and `checkout.sessions.create`, `customers.list`,
`isFreeHourAvailable`, `markFreeHourUsed` are never invoked. "Valid bookable
request" means a POST with a valid email, a future date holding an available
slot per the availability config, a valid `startTime`, and `hours = 1`, with
both slot-conflict probes reporting no conflict and meeting-link creation
succeeding. Env discipline: restore every touched `process.env` key
(`BILLING_ENABLED`, `STRIPE_SECRET_KEY`, `AVAILABILITY_TIMEZONE`, `TIMEZONE`,
`BOOKING_RATE_LIMIT`, …) after each test.

## AC-002-05 — Direct booking succeeds with the fixed response shape and zero Stripe calls
Given `BILLING_ENABLED` is `false`
And `STRIPE_SECRET_KEY` is absent from `process.env`
And a valid bookable request is made to POST /api/bookings
When the request is handled
Then the response status is 200
And the response body is exactly `{ checkoutUrl: null, joinUrl: <string>, billingDisabled: true }` — exactly these three keys, `joinUrl` being the non-empty meeting join URL created for this booking
And zero Stripe calls are made

## AC-002-06 — Side effects run synchronously in webhook order with one server-generated bookingId
Given billing is disabled
And a valid bookable request
And `findOverlappingBookingId` resolves to `null`
And `createCalendarEvent`, `sendOperatorEmail`, and `sendClientEmail` all succeed
When the request is handled
Then the side-effect calls occur in the order `findOverlappingBookingId` → `createCalendarEvent` → `sendOperatorEmail` → `sendClientEmail`
And the `bookingId` passed to `findOverlappingBookingId` equals the `bookingId` passed to `createCalendarEvent` and is a non-empty string
And a second direct booking handled in the same process passes a different `bookingId` to its side effects
And `createCalendarEvent` receives provider `getCalendarProvider()` plus this booking's `email`, `date`, `startTime`, `hours`, and the meeting `joinUrl`
And `sendOperatorEmail` receives `clientEmail`, `date`, `startTime`, `hours`, `amountCents: 0`, `joinUrl`, `kind: 'reservation'`, and NO `slotConflictWith`
And `sendClientEmail` receives `clientEmail`, `date`, `startTime`, `hours`, `joinUrl`

## AC-002-07 — Preflight still gates the direct branch: conflict answers 409 with zero side effects
Given billing is disabled
And the slot-conflict probe (`hasConflict`) reports a conflict
When a POST /api/bookings request with otherwise valid input is handled
Then the response status is 409 with error code `SLOT_CONFLICT`
And `findOverlappingBookingId`, `createCalendarEvent`, `sendOperatorEmail`, and `sendClientEmail` are never called
And zero Stripe calls are made

## AC-002-08 — Overlap backstop flags the operator email without blocking the booking
Given billing is disabled
And a valid bookable request
And `findOverlappingBookingId` resolves to `'other-booking-id'` (different from this request's generated bookingId)
When the request is handled
Then the response status is 200 with exactly the three-key body `{ checkoutUrl: null, joinUrl, billingDisabled: true }` — no conflict flag in the response
And the calendar event is created and the client email is sent
And `sendOperatorEmail` receives `slotConflictWith: 'other-booking-id'`

## AC-002-09 — Overlap probe failure is swallowed
Given billing is disabled
And a valid bookable request
And `findOverlappingBookingId` throws
When the request is handled
Then the response status is 200 with the exact success body
And `createCalendarEvent` and both emails run normally
And `sendOperatorEmail` receives NO `slotConflictWith`

## AC-002-10 — Calendar failure aborts with a static 500 before any email
Given billing is disabled
And a valid bookable request
And `createCalendarEvent` throws an error whose message contains the unique text `UPSTREAM-BOOM-DETAIL`
When the request is handled
Then the response status is 500 with error code `GCAL_ERROR`
And the response body's message is a static string that does NOT contain `UPSTREAM-BOOM-DETAIL`
And the full thrown error is logged server-side via `console.error`
And `sendOperatorEmail` and `sendClientEmail` are never called

## AC-002-11 — Operator-email failure returns a static 500, skips the client email, and does not roll back the calendar event
Given billing is disabled
And a valid bookable request
And `createCalendarEvent` succeeds
And `sendOperatorEmail` throws an error whose message contains the unique text `UPSTREAM-BOOM-DETAIL`
When the request is handled
Then the response status is 500 with error code `EMAIL_ERROR`
And the response body's message is a static string that does NOT contain `UPSTREAM-BOOM-DETAIL`
And the full thrown error is logged server-side via `console.error`
And `sendClientEmail` is never called
And the created calendar event is NOT rolled back: no calendar deletion or correction call is made

## AC-002-12 — Client-email failure is logged and swallowed; the booking still succeeds
Given billing is disabled
And a valid bookable request
And `createCalendarEvent` and `sendOperatorEmail` succeed
And `sendClientEmail` throws
When the request is handled
Then the response status is 200 with exactly the three-key success body
And the failure is logged server-side via `console.error`

## AC-002-13 — Invalid duration is rejected with zero Stripe calls and zero side effects
Given billing is disabled
And a POST /api/bookings request with `hours = 5` (a duration the preflight `priceCents` validator rejects) and otherwise valid input
When the request is handled
Then the response status is 400 with error code `INVALID_DURATION`
And zero Stripe calls are made
And `findOverlappingBookingId`, `createCalendarEvent`, `sendOperatorEmail`, and `sendClientEmail` are never called

## AC-002-14 — Calendar timezone resolution mirrors the webhook chain
Given billing is disabled
And neither `AVAILABILITY_TIMEZONE` nor `TIMEZONE` is set
When a direct booking completes
Then `createCalendarEvent` receives timezone `'Europe/Madrid'`
Given `TIMEZONE` is set to `'Europe/Lisbon'` and `AVAILABILITY_TIMEZONE` remains unset
When another direct booking completes
Then `createCalendarEvent` receives timezone `'Europe/Lisbon'`
Given `AVAILABILITY_TIMEZONE` is additionally set to `'America/New_York'`
When a third direct booking completes
Then `createCalendarEvent` receives timezone `'America/New_York'`

## AC-002-15 — Billing-enabled path is unchanged and the flag is consulted per request
Given `BILLING_ENABLED` is unset
And the Stripe module is mocked and `STRIPE_SECRET_KEY` is set
When a valid POST /api/bookings request is handled
Then `checkout.sessions.create` is called (the €0 reservation session)
And the response status is 200 with a body containing `checkoutUrl` (the session URL, a non-empty string) and NO `billingDisabled` key
And `findOverlappingBookingId`, `createCalendarEvent`, `sendOperatorEmail`, and `sendClientEmail` are NOT called from the handler
Given `BILLING_ENABLED` is then set to `false` in the same process
When another valid POST /api/bookings request is handled
Then that request takes the direct path: 200 with `billingDisabled: true` and zero Stripe calls for it — the flag is consulted per request, not cached
