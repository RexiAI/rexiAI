# AC-004: GitHub issue delivery unit (Task 5, Ask D)

Unit: `scripts/recording/deliver.mjs` — wraps the `gh` CLI through an injected
runner (argv arrays only). Target repo is the fixed constant RexiAI/rexiAI.
Label absence verified live (gh label list has no customer-insight). gh reads
its token from env (GH_TOKEN/GITHUB_TOKEN) — the unit never passes it.

## AC-004-34 — One labeled issue is created when the room has none
Given an injected gh runner whose label list contains customer-insight and whose issue search returns no match
When deliverInsightIssue runs for room rexi-abc123, recording date 2026-10-21, with brief content, transcript path, and session-dir path
Then exactly one gh issue create call is issued against RexiAI/rexiAI
And its title is "Customer insight: rexi-abc123 2026-10-21"
And its body contains the brief content, the transcript path, and the recording (session-dir) path
And the label customer-insight is attached to the create call

## AC-004-35 — An existing open or closed issue for the room suppresses creation
Given the issue search over open AND closed issues (state=all) for the room id in the title returns a match
When deliverInsightIssue runs for that room
Then no gh issue create call is issued
And the existing issue (open or closed alike) counts as the match

## AC-004-36 — Missing label is created; existing label is not re-created
Given the gh label list lacks customer-insight
When the label-ensure step runs
Then exactly one gh label create call for customer-insight is issued
And given the label list already contains customer-insight
Then no label create call is issued

## AC-004-37 — The token never appears in argv or output
Given env GH_TOKEN is set to a distinctive recognizable string
When any delivery function runs with an injected runner and captured console output
Then no argv array handed to the runner contains the token value
And the captured stdout/stderr does not contain the token value

## AC-004-38 — gh failures propagate, never swallowed
Given any gh call in the chain (label list, label create, issue search, or issue create) fails with a non-zero exit
When the delivery unit runs
Then the failure propagates to the caller (throws/rejects)
And the unit does not report success and does not continue past the failed call
