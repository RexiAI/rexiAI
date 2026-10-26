# AC-006: Missed meetings are visible when the machine is asleep

## AC-006-24 — Elapsed meeting with no recording is reported missed
Given a booked meeting whose window (start + hours) has fully elapsed
And no recording exists in RECORDINGS_DIR for its room
When the bot next evaluates the schedule
Then it emits a visible missed-meeting record that names the room

## AC-006-25 — Pending or in-progress meetings are not reported missed
Given a booked meeting whose window has not yet elapsed
When the bot evaluates the schedule
Then no missed-meeting record is emitted for it

## AC-006-26 — A recorded meeting is not reported missed
Given a booked meeting whose window elapsed
And a recording exists in RECORDINGS_DIR for its room
When the bot evaluates the schedule
Then no missed-meeting record is emitted for it
