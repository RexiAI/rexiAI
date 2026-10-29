# AC-008: Persist the customer name in Stripe checkout metadata

## AC-008-07 — Name is written to checkout session metadata
Given a checkout booking with `name` equal to "Ana López"
And valid `email`, `date`, `startTime` and `hours`
When the Stripe Checkout Session is built
Then the session metadata includes `name` equal to "Ana López"
And the metadata still includes the existing `email`, `date`, `start_time`, `hours`, `quoted_hours`, `reservation` and `free_hour_applied` keys
