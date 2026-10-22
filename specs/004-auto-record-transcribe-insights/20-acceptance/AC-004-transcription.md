# AC-004: ASR transcription stage (Task 3, Ask B part 2)

Unit: `scripts/recording/transcribe.mjs` — wraps `bl speech recognize`
(flags verified against bl 2.4.0 help: `--url` accepts a local file path,
`--diarization`, `--language <hint>`, `--out <json>`). Stripe-free by
construction: the unit imports nothing Stripe-related and reads no
STRIPE_* env.

## AC-004-26 — ASR command targets bl with diarization and the Spanish-primary hint
Given audio path <sessionDir>/audio.wav, session directory <sessionDir>, and default environment
When buildAsrCommand runs
Then the argv is: bl speech recognize --url <sessionDir>/audio.wav --diarization --language es --out <sessionDir>/transcript.json
And given env REXI_ASR_LANGUAGE=en the --language value in the argv is en

## AC-004-27 — Successful transcription writes transcript.json and .rexi-transcribed
Given a session directory with one audio-bearing mp4 and an injected runner that succeeds for both ffmpeg and bl (bl produces the --out file)
When transcribe completes
Then <sessionDir>/transcript.json exists
And <sessionDir>/.rexi-transcribed exists
And the runner received exactly the commands built by buildAudioExtractCommand and buildAsrCommand (no other external calls)

## AC-004-28 — ASR failure leaves the directory unmarked and surfaces the error
Given an injected runner whose bl invocation fails (non-zero exit)
When transcribe runs
Then the error propagates to the caller (not swallowed)
And no .rexi-transcribed marker exists in the session directory
And no script-level retry loop wraps the bl call (retry semantics stay bl's own defaults)
