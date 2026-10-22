# AC-004: E2E full-chain acceptance (Task 8, Ask G — executed post-PR by the e2e-runner)

These scenarios run against the LIVE local stack (the e2e oracle):
`https://host.docker.internal:8443`, `ENABLE_RECORDING=1`, Jibri session dirs
under the stack's `RECORDINGS_DIR` (`/home/dbueno/rexi-recordings` per
`~/docker-jitsi-meet/.env:269` and repo `.env:51`). Journeys live at
`tests/e2e/*.e2e.ts` (e2e-runner standard); because `*.e2e.ts` is invisible to
`check-scenario-traceability.sh`'s test-file patterns, the in-suite guard test
`src/__tests__/AC-004-e2e-journeys.test.ts` cites AC-004-50…53 and asserts each
journey file exists and embeds its scenario IDs (10-tasks.md decision 3).
Each run uses a freshly generated unique room, so cross-run issue-search
idempotency stays sound.

## AC-004-50 — Auto-recording fires for the first occupant without any UI action, exactly once
Given the local stack provisioned with the auto-record module (documented local install steps)
And a customer audio clip synthesized via bl speech synthesize stating the scripted Spanish asks — a pricing-page requirement ("necesito una página de precios") and one pain point
When a Playwright client joins a freshly generated rexi-<16hex> room at https://host.docker.internal:8443 launched with --use-fake-device-for-media-capture and --use-file-for-fake-audio-capture=<clip>, the certificate warning accepted, and no recording UI control is ever touched
Then a Jibri session directory containing that room's recording appears under the stack's RECORDINGS_DIR without any human or UI recording action
When a second occupant joins the same room
Then no additional Jibri session directory is created for that room (one session per meeting — module idempotency)

## AC-004-51 — A non-rexi room is never auto-recorded (consent boundary)
Given the same provisioned stack
When a Playwright client joins a room whose name does not start with the configured prefix (e.g. e2eprobe-<random>)
Then no Jibri session directory appears for that room under RECORDINGS_DIR

## AC-004-52 — One-off processing of the REAL session dir yields transcript and brief carrying the scripted content
Given the meeting has ended (clients left) and the Jibri session directory holds the finished recording
When node scripts/process-recording.mjs --room <room> --recording <sessionDir> runs against the real session directory
Then the run completes successfully (exit 0)
And <sessionDir>/transcript.json exists and carries the gist of the scripted asks — the pricing-page requirement and the pain point are recognizable in the transcript text (judge/keyword assertion, tolerant of ASR variance)
And <sessionDir>/customer-brief.md exists and its requirements section mentions the scripted pricing-page requirement

## AC-004-53 — One labeled issue per recording; the second run is idempotent
Given the one-off run of AC-004-52 completed
When RexiAI/rexiAI issues are searched for the room id across open and closed state
Then exactly one issue exists, titled "Customer insight: <room> <date>", carrying the customer-insight label, whose body contains the brief content plus the transcript and recording paths
When the identical one-off processor command runs a second time
Then the search still returns exactly one issue for the room (no duplicate created)
And transcript.json and customer-brief.md were not regenerated (their .rexi-transcribed / .rexi-analyzed markers short-circuited the stages)
