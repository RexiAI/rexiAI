# AC-004: Runbook + env example + pipeline docs (Task 7, Ask F + D limitation + A local install)

Docs-only task. Verified as content-assertion tests (repo pattern:
`AC-002-env-docs-cleanup.test.ts`). The actual VPS deployment is NOT in
spec 004's code scope — the runbook is.

## AC-004-47 — recording-pipeline.md documents the insight chain and the sidecar limitation
Given docs/recording-pipeline.md
When it is read
Then it describes the extended chain: audio extraction over ALL session mp4s in chronological order, bl speech recognize (--diarization, Spanish-primary hint) producing transcript.json + .rexi-transcribed, bl text chat producing customer-brief.md, and GitHub issue delivery (customer-insight label, idempotent search-before-create) completing .rexi-analyzed
And it states the three markers are independent — a .rexi-billed directory is still transcribed, and transcription never depends on Stripe attribution
And it documents the sidecar-container limitation: the container image lacks gh, so issue delivery is host-timer-mode only and container delivery is a follow-up

## AC-004-48 — The deploy README carries the revival runbook
Given deploy/production/README.md
When it is read
Then it contains the revive steps for meet.rexi-ai.com via setup-jitsi-host.sh and deploy-jitsi.sh (noting deploy-jitsi.sh now provisions the auto-record module and runs its luac syntax gate)
And it instructs setting MEETING_BASE_URL=https://meet.rexi-ai.com in the Vercel production env
And it instructs provisioning /etc/rexi-recording.env with RECORDINGS_DIR, DASHSCOPE_API_KEY (for bl), and GH_TOKEN (for gh), and enabling rexi-recording.timer
And it points to the documented local-stack auto-record install steps (docs/local-e2e-testing.md) used by the e2e oracle
And it states that the actual VPS deployment is out of scope for spec 004 (runbook only)

## AC-004-49 — The env example carries the new tool credentials
Given deploy/production/rexi-recording.env.example
When it is read
Then it contains a DASHSCOPE_API_KEY entry documented as bl's ASR/LLM auth (env mechanism confirmed via bl auth status)
And a GH_TOKEN entry documented as the issue-delivery credential (read by gh from env; never logged)
And a REXI_ASR_LANGUAGE entry documented with default es
And the REXI_ARCHIVE_DIR entry remains commented and unimplemented (unchanged, line 26)
And no entry contains a real secret value (placeholders only)
