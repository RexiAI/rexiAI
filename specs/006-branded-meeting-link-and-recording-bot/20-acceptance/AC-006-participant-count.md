# AC-006: Participant count excludes the bot

## AC-006-10 — Bot alone counts as zero non-bot humans
Given a participant list containing only the bot's own identity
When non-bot humans are counted
Then the count is 0

## AC-006-11 — Bot plus humans counts only the humans
Given a participant list containing the bot plus two humans
When non-bot humans are counted
Then the count is 2

## AC-006-12 — A human sharing the bot's display name is still counted
Given the bot's own identity has display name "Rexi Recorder"
And a distinct human participant also has display name "Rexi Recorder"
And a participant list containing the bot plus that human
When non-bot humans are counted
Then the count is 1
And the bot is excluded by identity, not by name
