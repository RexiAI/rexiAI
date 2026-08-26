# AC-003: Availability config loader + slot computation

All times are Europe/Madrid local. A slot start `t` requires `t + 1h <= window end`;
slots align to whole hours.

## AC-003-01 — Slots from weekly schedule
Given availability YAML where monday has window `{start: "09:00", end: "13:00"}`
When slots are computed for a monday date
Then the slot starts are exactly ["09:00", "10:00", "11:00", "12:00"]

## AC-003-02 — Weekday without an entry yields no slots
Given availability YAML that defines monday only
When slots are computed for a sunday date
Then the result is an empty list

## AC-003-03 — Blackout exception empties the day
Given weekly monday windows exist and exceptions maps `"2027-03-01"` (a monday) to `[]`
When slots are computed for 2027-03-01
Then the result is an empty list despite the weekly schedule

## AC-003-04 — Override exception replaces weekly slots
Given weekly monday window 09:00–13:00 and exception `"2027-03-08"` with window
16:00–19:00
When slots are computed for 2027-03-08
Then the slot starts are exactly ["16:00", "17:00", "18:00"] and no morning slots appear

## AC-003-05 — Window shorter than one hour yields no slots
Given a window `{start: "09:00", end: "09:30"}`
When slots are computed for that date
Then no slot start is produced from that window

## AC-003-06 — Malformed YAML fails the load
Given an `availability.yaml` that is not valid YAML
When the config loader runs
Then it raises an error describing the parse failure and naming the file

## AC-003-07 — Window with end not after start fails the load
Given a window `{start: "14:00", end: "14:00"}` (or end before start)
When the config loader validates the config
Then it raises an error identifying the invalid window

## AC-003-08 — Missing or mismatched timezone fails the load
Given YAML whose `timezone` key is absent or is not `"Europe/Madrid"`
When the config loader validates the config
Then it raises an error stating the timezone requirement

## AC-003-09 — Malformed time value fails the load
Given a window with a time that is not valid `HH:mm` (e.g. `"9am"` or `"25:00"`)
When the config loader validates the config
Then it raises an error identifying the offending time value
