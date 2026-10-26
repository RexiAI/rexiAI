# AC-006: Recording starts and stops at the two-non-bot-humans threshold

## AC-006-13 — No recording below the threshold (0 or 1 non-bot human)
Given the bot is in the room and there are 0 non-bot humans
When the recording decision is evaluated
Then the decision is "do not record"
And the same holds when there is exactly 1 non-bot human

## AC-006-14 — Recording starts at exactly 2 non-bot humans
Given the bot is in the room and there are exactly 2 non-bot humans
When the recording decision is evaluated
Then the decision is "record"

## AC-006-15 — Recording continues above 2 non-bot humans
Given the bot is in the room and there are 3 non-bot humans
When the recording decision is evaluated
Then the decision is "record"

## AC-006-16 — Recording stops when non-bot humans drop below 2
Given a recording is in progress with 2 non-bot humans present
When the non-bot-human count drops to 1
Then the recording stops

## AC-006-17 — The bot's own join/leave never changes the decision
Given exactly 2 non-bot humans are present
When the bot joins (or leaves) the room
Then the recording decision is unchanged ("record")
