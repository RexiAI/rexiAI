# AC-008: Webhook extracts the name and forwards it to the operator email

## AC-008-13 — Webhook forwards the metadata name to the operator email
Given a checkout session whose metadata contains `name` "Ana López"
And valid `email`, `date` and `start_time` metadata
When the checkout-session webhook processes a new booking
Then the operator email is sent with `clientName` "Ana López"

## AC-008-14 — Webhook tolerates a missing name
Given a checkout session whose metadata has no `name` key (legacy booking)
And valid `email`, `date` and `start_time` metadata
When the checkout-session webhook processes a new booking
Then the webhook does not error
And the operator email is sent without a `clientName` (the "Nombre" line is omitted)
