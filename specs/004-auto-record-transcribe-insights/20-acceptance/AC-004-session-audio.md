# AC-004: Session media collection + audio extraction (Task 2, Ask B part 1)

Unit: `scripts/recording/media.mjs` — pure/injectable, zero npm deps, no
side effects on import. Runner = injected execFile-like function.

## AC-004-23 — collectSessionMp4s returns every mp4 in chronological order
Given a Jibri session directory containing rexi-abc_2026-10-21-10-30-00.mp4, rexi-abc_2026-10-21-10-00-00.mp4, metadata.json, and marker files
When collectSessionMp4s runs on the directory
Then it returns exactly the two mp4 paths ordered oldest first (ascending filename order, which equals chronological order for Jibri's <room>_<timestamp>.mp4 naming)
And given a directory containing a single mp4 it returns a one-element array
And given a directory containing no mp4 it returns an empty array
And given a path that is itself an .mp4 file (one-off mode) it returns that file as the single element

## AC-004-24 — Audio extraction command carries -vn, every input in order, one output
Given collected mp4s [first.mp4, second.mp4] and audio output path out.wav
When buildAudioExtractCommand runs
Then the returned ffmpeg argv includes -vn (no video stream in the output)
And both inputs are covered in collection order (concatenation consumes first.mp4 then second.mp4)
And exactly one audio output path (out.wav) is present in the argv
And buildAudioExtractCommand is pure — it performs no I/O and invokes no runner

## AC-004-25 — Extraction failure propagates, nothing is marked
Given an injected runner that rejects (simulating non-zero ffmpeg exit)
When extractAudio runs
Then the failure propagates to the caller (the returned promise rejects or the function throws)
And the unit writes no marker files of any kind
