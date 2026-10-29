# AC-008: Recording pipeline resolves the customer name and meeting date from the reservation

## AC-008-15 — Reservation name and date are resolved and carried into the session context
Given a Stripe reservation for a room whose metadata contains `name` "Ana López" and `date` "2026-10-28"
And the reservation carries a `join_url` matching the room
When the recording pipeline resolves attribution for that room
Then the resolved attribution includes `name` "Ana López" and `date` "2026-10-28"
And the insight context carries `clientName` "Ana López"

## AC-008-16 — Missing reservation name does not break attribution
Given a Stripe reservation for a room whose metadata has no `name` key
And the reservation carries a `join_url` matching the room
When the recording pipeline resolves attribution for that room
Then the resolved attribution has `name` undefined or empty
And attribution, billing and transcription proceed without throwing
