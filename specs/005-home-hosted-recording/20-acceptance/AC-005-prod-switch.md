# AC-005 Task 5 — Guarded prod switch (`deploy/home/switch-meeting-base-url.sh`)

PATH-shim tests: shimmed `curl`/`vercel` append every invocation to a call log;
gate ordering and refusal-before-mutation are asserted on that log. No test
touches the network or real Vercel state. Live negative proof against the
NXDOMAIN URL is AC-005-52 (Task 9).

## AC-005-33 — Usage validation: no argument, no action
Given the file `deploy/home/switch-meeting-base-url.sh` (bash -n clean, `set -euo pipefail`, executable, bare-name tool invocations)
When it is invoked with no URL argument under shims
Then it prints a usage message naming `<public-url>`
And it exits non-zero
And the shim call log is empty (zero external invocations)

## AC-005-34 — Happy path: all three gates pass, then and only then Vercel mutates
Given shimmed `curl` answering success for all three gates (TLS-valid root 200, probe room page 200 HTML) and a shimmed `vercel` accepting env operations
When the script runs with `https://good.example`
Then the call log shows, in order: gate 1 — a `curl` TLS check WITHOUT `-k`/`--insecure` against the URL root; gate 2 — root reachability (HTTP 200); gate 3 — a GET of the probe room page `https://good.example/rexi-probe-switch-check` (HTTP 200, HTML body)
And the FIRST `vercel` invocation in the log occurs only after all three gate checks
And the env mutation is `vercel env add MEETING_BASE_URL https://good.example production`
And a production redeploy is then triggered via the `vercel` CLI
And the script prints a rollback command and exits 0

## AC-005-35 — TLS gate failure: refuse, change nothing
Given shimmed `curl` failing the certificate-validity check on the root URL (non-zero exit, as an invalid or untrusted cert produces)
When the script runs with that URL
Then it exits non-zero
And the failure message names the TLS gate
And the call log records ZERO `vercel` invocations
And no rollback or redeploy output is printed

## AC-005-36 — Reachability gate failure: refuse, change nothing
Given shimmed `curl` passing TLS but returning a non-200 status (or connection failure) for the root URL
When the script runs
Then it exits non-zero with a message naming the reachability gate
And the call log records ZERO `vercel` invocations

## AC-005-37 — Probe-room gate failure: refuse, change nothing
Given shimmed `curl` passing gates 1–2 but returning non-200 (or a non-HTML body) for the probe room page
When the script runs
Then it exits non-zero with a message naming the probe-room gate
And the call log records ZERO `vercel` invocations

## AC-005-38 — Existing variable is replaced, never an abort
Given shimmed `vercel` reporting that `MEETING_BASE_URL` already exists in the production environment when `env add` is attempted (or on a pre-check)
And all gates passing
When the script runs
Then the final shim log shows the replacement path executed (remove-then-add, or an add with an overwrite flag — mechanism is the Coder's choice)
And the script exits 0 with the new URL as the effective production value
And an "already exists" condition never aborts the switch or leaves the old value in place

## AC-005-39 — Never invoked automatically by any other script
Given every `*.sh` file in the repo (excluding `.standards/` and `node_modules/`)
When the sources are searched for call sites
Then no script other than `deploy/home/switch-meeting-base-url.sh` itself executes `switch-meeting-base-url.sh` (textual mentions in docs/runbook prose are allowed; executable invocations are not)
And no script under `deploy/home/` other than the switch script contains a `vercel env` mutation command
