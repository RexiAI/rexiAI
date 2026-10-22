# AC-004: Processor rewiring — marker independence, optional attribution, containment, CLI (Task 6, Ask B part 3 + E)

`scripts/process-recording.mjs` stays the CLI entry and delegates stage
orchestration to an injectable unit (e.g. `scripts/recording/pipeline.mjs`).
Line anchors below cite the current 334-line script.

## AC-004-39 — .rexi-billed does not short-circuit transcription
Given a session directory containing .rexi-billed and one audio-bearing mp4 but no .rexi-transcribed
When the processor handles the directory (scan or one-off mode)
Then the transcription stage runs, producing transcript.json and .rexi-transcribed
And the billing stage is skipped with no recorded-billing POST (the .rexi-billed marker still guards billing exactly as today, line 286 semantics now per-stage)

## AC-004-40 — Missing STRIPE_SECRET_KEY no longer aborts the run
Given an environment without STRIPE_SECRET_KEY and a session directory with an audio-bearing mp4
When the processor is invoked for that directory
Then it does not exit(1) at startup (the hard gate at lines 297-300 is gone)
And the transcription and insight stages run to completion
And the billing stage is skipped with a clear log line, failing closed: no billing POST is attempted without credentials

## AC-004-41 — An unattributed recording still transcribes
Given STRIPE_SECRET_KEY is set but no Stripe session matches the room (the lookup returns null or throws an API error)
When the processor handles the directory
Then the recording is logged as unattributed and processing continues
And the transcription and insight stages run, with the brief's booking context stating the recording is unattributed
And the billing stage is skipped: no POST, no .rexi-billed marker

## AC-004-42 — The billing-enabled path is unchanged
Given STRIPE_SECRET_KEY and RECORDED_BILLING_TOKEN set, a matching reservation resolving to { bookingId, email }, a 90-minute newest-mp4, and the endpoint answering 200 with amountCents
When the processor handles the directory
Then it POSTs { bookingId, email, actualMinutes: 90 } to <APP_BASE_URL>/api/bookings/recorded-billing with header Authorization Bearer <RECORDED_BILLING_TOKEN>
And it writes .rexi-billed beside the recording after the 200
And the probed minutes come from ffprobe over the newest mp4 (findMp4 behavior preserved, lines 72-82 — the multi-mp4 collection is a transcription-only concern)

## AC-004-43 — Silent recording: existing warning, no transcription or insight markers
Given a recording whose ffprobe reports no audio stream
When the processor handles the directory
Then the existing WARNING log for the silent recording fires (current line 209 path)
And no .rexi-transcribed, no .rexi-analyzed, no transcript.json, no customer-brief.md is produced and no bl or gh call is made
And the billing stage behaves exactly as today (a billing-enabled deployment still bills the silent recording with the warning)

## AC-004-44 — Scan containment: one bad directory never kills the run
Given a recordings root with directories A, B, and C where A's stage runner throws and B and C are healthy
When --scan runs
Then B and C are fully processed in the same run
And A is logged with its path, receives no markers, and is counted in the run's failure summary
And the scan process exits 0 (per-directory stage failures are contained, never fatal to the sweep)
When --scan runs a second time
Then A is attempted again (it carries no marker) while B and C have their completed stages skipped via their markers

## AC-004-45 — MAX_MINUTES gates billing only
Given a recording whose probed duration exceeds 480 minutes, with attribution resolved in a billing-enabled world
When the processor handles the directory
Then the billing stage skips with the existing ceiling log (lines 230-233) and writes no .rexi-billed
And the transcription and insight stages still run and write their markers on success

## AC-004-46 — CLI surface preserved; --dry-run mutates nothing
Given the built processor
When it is invoked with --scan, with --jibri-dir <dir>, with --room <room> --recording <mp4|dir>, or with no arguments
Then each mode is accepted and behaves as before, and the no-argument invocation prints usage text listing all three modes and exits 2
When it is invoked with --dry-run for a healthy unprocessed directory
Then no billing POST, no bl invocation, and no gh invocation occurs
And no marker file, transcript.json, or customer-brief.md is written
And the log reports the actions that would have been taken
