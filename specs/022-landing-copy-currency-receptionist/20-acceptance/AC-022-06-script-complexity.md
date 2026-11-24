# AC-022-06: Script complexity ≤6, behavior preserved

## AC-022-06-01 — Characterization before refactor
Given the unrefactored scripts listed in Task 6
When the AC-022-06 characterization tests (or reused existing tests) run
Then they pass, and each target function has at least one test per existing branch of its decision points

## AC-022-06-02 — parseArgs behavior pinned
Given `scripts/recording-bot.mjs` `parseArgs`
When called with no args, each supported flag, an unknown flag, and a flag missing its value
Then the returned options / error are identical before and after the refactor

## AC-022-06-03 — Session state machine pinned
Given `scripts/recording/bot/session.mjs` `nextStep` and `runSession` with injected fakes
When driven through each state transition including failure and stop paths
Then the step sequence, return values and emitted output are identical before and after the refactor

## AC-022-06-04 — Billing helpers pinned
Given `reservationFields` (billing.mjs) and `findRecordingForRoom` (test-billing-chain.mjs)
When called with inputs covering each branch (present/absent fields, match/no match)
Then outputs are identical before and after the refactor

## AC-022-06-05 — Zero complexity errors
Given `eslint.config.cjs` whose `files: ['**/*.mjs']` block sets rule `complexity` to `['error', 6]`
And the refactored tree with no `eslint-disable` comment for `complexity` in `scripts/` or `tests/`
When `npx eslint scripts tests` runs
Then it exits 0 and reports 0 errors from the `complexity` rule

## AC-022-06-06 — Scripts still parse
Given each of the 8 modified script files
When `node --check <file>` runs
Then it exits 0

## AC-022-06-07 — Suite stays green
Given the refactored tree
When `npm test` runs
Then all tests pass, including AC-006-* recording tests and AC-022-06 tests, with no characterization assertion edited after the refactor

## AC-022-06-08 — CLI surface unchanged
Given `scripts/recording-bot.mjs`, `scripts/m365-consent.mjs`, `scripts/dev-api-server.mjs`
When the diff is reviewed
Then flag names, defaults, output strings, exit codes and HTTP routes/status codes are unchanged

## AC-022-06-09 — Gate is live for .mjs
Given a probe file `probe.mjs` with one function of cyclomatic complexity 7, created in a temp dir (not committed)
When it is linted via ESLint's Node API (`new ESLint({ overrideConfigFile: <repo>/eslint.config.cjs, cwd: <repo> })`, `lintText(src, { filePath: <repo>/scripts/probe.mjs })` or equivalent) using the repo config
Then the result contains exactly one message with ruleId `complexity` and severity 2
