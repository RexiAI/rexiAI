# AC-005 Task 2 — Processor disk guard (`scripts/recording/disk.mjs` + `scanAll` wiring)

Injectable-runner unit tests using the spec-004 harness (`makeRunner`,
`captureLog`, `mkTmpDir` — `src/__tests__/recording-harness.ts`). Thresholds
default to `REXI_MIN_FREE_GB=20` (soft) and `REXI_HARD_MIN_FREE_GB=5` (hard);
"below" is strict (`<`).

## AC-005-13 — Ample free space: silent, normal processing
Given a recordings root containing one processable session directory
And an injected runner whose `df` call reports 100 GB available
And an env object with no `REXI_MIN_FREE_GB`/`REXI_HARD_MIN_FREE_GB` keys
When `scanAll` runs
Then no free-space warning is logged
And the session directory is processed (`processed` is 1)

## AC-005-14 — Below soft minimum: loud warning, processing continues
Given a recordings root with one processable session directory
And an injected runner whose `df` call reports 10 GB available
When `scanAll` runs with default thresholds
Then a warning is logged via `log.warn` naming the free GB figure and the soft threshold
And the session directory is still processed (`processed` is 1)

## AC-005-15 — Boundary: free space exactly at the soft minimum is not "below"
Given an injected runner whose `df` call reports exactly 20 GB available
When `scanAll` runs with default thresholds
Then no free-space warning is logged
And processing proceeds normally

## AC-005-16 — Boundary: free space exactly at the hard floor warns but processes
Given an injected runner whose `df` call reports exactly 5 GB available
When `scanAll` runs with default thresholds
Then a warning is logged (below the soft minimum)
And no run-skipping error is logged
And processing proceeds normally

## AC-005-17 — Below hard floor: whole run skipped, exit still contained
Given a recordings root with one processable session directory
And an injected runner whose `df` call reports 2 GB available
When `scanAll` runs with default thresholds
Then a clear per-run error is logged via `log.error` naming the free GB figure and the hard floor
And no session directory is processed (`processed` is 0 and the runner records zero `ffprobe` calls)
And `scanAll` returns normally (does not throw)
And `runCli` with `--scan` exits 0 (the spec-004 containment contract is unchanged)

## AC-005-18 — Env overrides, read only from the passed env object
Given an env object with `REXI_MIN_FREE_GB=50` and `REXI_HARD_MIN_FREE_GB=40`
And an injected runner whose `df` call reports 45 GB available
When `scanAll` runs
Then a warning is logged (below the overridden soft minimum, above the overridden floor)
And processing continues
And the disk unit reads thresholds exclusively from the passed env parameter — its source contains no `process.env` read

## AC-005-19 — Undeterminable free space fails open with a loud warning
Given an injected runner whose `df` call throws, or returns unparseable output (e.g. an empty stdout)
When `scanAll` runs
Then a loud warning stating that free space could not be determined is logged
And processing CONTINUES (the frozen spec-004 suite depends on this: its fake runners answer unmatched commands with empty stdout and its scan tests must pass unmodified)

## AC-005-20 — One-off modes never invoke the guard
Given a healthy one-off invocation (`runCli` with `--room`/`--recording`, or `--jibri-dir`)
When the CLI runs
Then the injected runner records zero `df` calls
And the one-off exit-code semantics are unchanged from spec-004 (0 on success, 1 on stage failure or missing mp4, 2 on usage)
