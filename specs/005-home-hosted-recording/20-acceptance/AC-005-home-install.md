# AC-005 Task 1 — Home install script (`deploy/home/install-recording-host.sh`)

Implemented as content/contract assertions on the script source (repo precedent:
`AC-013-deployment-config.test.ts`, `AC-004-runbook.test.ts`); live install proof
is AC-005-49/50 (Task 9).

## AC-005-06 — Script contract: syntax, strict mode, no secret echoing
Given the file `deploy/home/install-recording-host.sh` in the repo
When it is checked with `bash -n` and its source is inspected
Then the syntax check passes
And the source contains `set -euo pipefail`
And the file is executable (mode bit)
And no command in the source prints the contents or values of `/etc/rexi-recording.env` (no `cat`/`echo` of the env file or its variables' values)

## AC-005-07 — Units are repo-derived; shipped VPS artifacts stay untouched
Given the install script source
When its generated systemd service text is inspected
Then `WorkingDirectory=` and `ExecStart=` are built from a repo root resolved at runtime from the script's own location (a `BASH_SOURCE`-relative resolution)
And `ExecStart` points at `<repo>/scripts/recording-cron.sh`
And the string `/opt/rexiAI` appears nowhere in the home script
And the script writes units only to `/etc/systemd/system/` — never into `deploy/production/`
And `deploy/production/rexi-recording.service` still contains `WorkingDirectory=/opt/rexiAI` and `deploy/production/rexi-recording.timer` still contains `OnUnitActiveSec=5min` and `Persistent=true` (frozen VPS contract, unmodified by this spec)

## AC-005-08 — Env file: exactly three home values, mode 0600, no secret keys
Given the install script source (the `/etc/rexi-recording.env` it writes)
When the env-file template is inspected
Then it sets `RECORDINGS_DIR=/home/dbueno/rexi-recordings`
And it sets `APP_BASE_URL=https://rexi-ai.com`
And it sets `MEETING_BASE_URL=https://meet.jit.si`
And the file is created with mode `0600` (an `install -m 600`/`chmod 600` path in the source)
And the keys `STRIPE_SECRET_KEY`, `RECORDED_BILLING_TOKEN`, `GH_TOKEN`, and `DASHSCOPE_API_KEY` appear nowhere in the written env content

## AC-005-09 — Unit contract: dbueno, PATH to the tools, timer semantics preserved
Given the install script source
When the generated service and timer text is inspected
Then the service contains `User=dbueno`
And the service contains an `Environment=PATH=` line assembled at install time from the directory of `command -v node` plus `/usr/local/bin:/usr/bin:/bin`
And no literal nvm version path (e.g. `v24`) is hardcoded in the script source
And the service contains `EnvironmentFile=/etc/rexi-recording.env`, `Type=oneshot`, and `TimeoutStartSec=300`
And the timer preserves `OnBootSec=2min`, `OnUnitActiveSec=5min`, `Persistent=true`, `RandomizedDelaySec=30`, and `WantedBy=timers.target`

## AC-005-10 — Disk pre-flight refuses before any mutation
Given free space on the `RECORDINGS_DIR` filesystem below `REXI_MIN_FREE_GB` (default 20)
When the install script runs
Then it exits non-zero with a message naming the free-space figure and the threshold
And the free-space check (a `df`-based check gated on `REXI_MIN_FREE_GB`) appears in the script flow BEFORE every env-file write, unit-file write, and `systemctl enable`/`start` invocation

## AC-005-11 — Install never touches prod config or the guarded switch
Given the install script source
When it is inspected for external mutation surface
Then it contains no invocation of `switch-meeting-base-url.sh`
And it contains no invocation of `vercel`
And the only `MEETING_BASE_URL` value it writes is `https://meet.jit.si`

## AC-005-12 — First scan cycle is verified via journalctl before success
Given the units installed and the timer enabled
When the install script completes its verification step
Then it triggers exactly one immediate service run (`systemctl start rexi-recording.service`)
And it queries `journalctl -u rexi-recording.service` for scan-cycle evidence — the `[recording-cron]` line or the `Scanning` line
And it declares success (exit 0) only when that evidence is found, otherwise exits non-zero and prints a journal tail
And processor stage failures inside the scan (e.g. the ASR 401 expected until spec 006) are NOT treated as verification failure — the criterion is that the scan cycle ran, not that every stage succeeded
