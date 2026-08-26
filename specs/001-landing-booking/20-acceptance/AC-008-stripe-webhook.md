# AC-008: Stripe webhook orchestration (idempotent)

`POST /api/stripe-webhook`. Signature verified against `STRIPE_WEBHOOK_SECRET`.
Idempotency key: GCal event with `extendedProperties.private.rexi_booking_id =
<checkout session id>`.

## AC-008-01 — Completed payment triggers all three side effects once
Given a valid, signed `checkout.session.completed` event for a first-time client's booking
When the webhook processes the event
Then the free-hour flag is marked used for that email, exactly one Google Calendar event
is created for the booked window, exactly one operator email is sent, and the response
is 200

## AC-008-02 — Replayed event causes no duplicate side effects
Given the same signed `checkout.session.completed` event is delivered a second time and
the first delivery already created the calendar event
When the webhook processes the replay
Then no additional calendar event is created, no additional email is sent, and the
response is 200

## AC-008-03 — Invalid signature rejected with zero side effects
Given a POST body whose Stripe signature does not verify
When the webhook processes the request
Then the response is 400 and none of the three side effects occur

## AC-008-04 — Unrelated event types ignored
Given a valid signed event of an unrelated type (e.g. `invoice.paid`)
When the webhook processes it
Then the response is 200 and no side effects occur

## AC-008-05 — Calendar failure yields retryable response without email
Given Google Calendar event creation fails for a valid completion event
When the webhook processes it
Then the response is 5xx (Stripe will retry), no email has been sent, and the free-hour
flag state does not block a later successful retry from completing all side effects

## AC-008-06 — Email failure after calendar success yields retryable response
Given calendar creation succeeds but the email send fails on attempt one
When the webhook responds 5xx and Stripe retries the same event
Then the retry detects the existing calendar event by booking id, sends the missing
email exactly once, and responds 200
