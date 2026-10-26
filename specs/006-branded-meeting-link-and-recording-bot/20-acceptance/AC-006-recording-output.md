# AC-006: Recording output is pipeline-ready in RECORDINGS_DIR

## AC-006-18 — Recording lands under RECORDINGS_DIR as an .mp4
Given a session is recorded for room rexi-0123456789abcdef
And RECORDINGS_DIR is set to /tmp/rexi-recordings
When the recording is finalized
Then a .mp4 file exists under /tmp/rexi-recordings for that session

## AC-006-19 — The recording has an audio stream
Given a finalized recording file
When it is probed with ffprobe
Then it reports an audio stream (codec_type audio present)

## AC-006-20 — The room is derivable by the existing pipeline, unchanged
Given a finalized recording for room rexi-0123456789abcdef
When the existing pipeline (deriveRoom) resolves the room from the recording
Then it derives rexi-0123456789abcdef
And no change to process-recording.mjs or scripts/recording/* is required
