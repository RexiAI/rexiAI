# AC-007: Reschedule validation (bounds, re-checked availability, limit)

## AC-007-14 — Cannot reschedule into a past date
Given a valid token for a future booking
And a requested new date that is in the past
When the reschedule is validated
Then it is rejected with a PAST_DATE result
And the calendar event is not moved

## AC-007-15 — Cannot reschedule a meeting that has already happened
Given a valid token for a booking whose meeting start time is already in the past
When the reschedule is validated
Then it is rejected as an expired token
And the calendar event is not moved

## AC-007-16 — Cannot move outside the availability windows
Given a valid token for a booking
And a requested new date/startTime whose slot is not within the availability windows for that date
When the reschedule is validated
Then it is rejected with a SLOT_UNAVAILABLE result

## AC-007-17 — Cannot move into a slot occupied by a different booking
Given a valid token for booking A
And a requested new slot already occupied by a different booking B
When the reschedule is validated
Then it is rejected with a SLOT_CONFLICT result
And the conflict check was run against the live calendar at submit time, not against a cached availability list

## AC-007-18 — The submit re-check catches the race between two clients
Given two bookings A and B both rescheduling into the same slot X
And booking A's move commits first
When booking B's reschedule re-checks slot X for conflict
Then B is rejected with a SLOT_CONFLICT result because A now occupies X

## AC-007-19 — A slot overlapping only one's own event is not a conflict
Given booking A rescheduling to a slot that overlaps only A's own current event and no other booking
When the conflict check runs
Then it returns no conflict (the booking's own id is excluded)

## AC-007-20 — Cannot exceed the reschedule limit
Given a booking whose reschedule count is already MAX_RESCHEDULES (3)
When a further reschedule is validated
Then it is rejected with a RESCHEDULE_LIMIT result
And the calendar event is not moved

## AC-007-21 — A reschedule within the limit succeeds and increments the count
Given a booking with reschedule count 0
When the reschedule is validated successfully
Then the count is incremented to 1
And the move is allowed to proceed
