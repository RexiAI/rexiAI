# AC-006: Single configurable recordings location

## AC-006-21 — One setting drives both the bot and the processor
Given RECORDINGS_DIR is set to /data/recordings
When the bot resolves its write directory
And the processor resolves its scan directory
Then both resolve to /data/recordings

## AC-006-22 — Reconfiguring the one setting moves both
Given the recordings location is reconfigured to /data/new-recordings
When the bot resolves its write directory
And the processor resolves its scan directory
Then both resolve to /data/new-recordings
And no second configuration file or variable must be edited

## AC-006-23 — Unset setting yields one shared default, not two fallbacks
Given RECORDINGS_DIR is unset
When the bot resolves its write directory
And the processor resolves its scan directory
Then both resolve to the same single default (~/.jitsi-meet-cfg/storage/jibri/recordings)
