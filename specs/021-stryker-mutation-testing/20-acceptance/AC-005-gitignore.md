# AC-005: Mutation artifacts gitignored

## AC-005-01 — Artifact paths ignored
Given `.gitignore`
When `git check-ignore reports/mutation/mutation.json reports/mutation/stryker-incremental.json .stryker-tmp/x` runs
Then all three paths are reported as ignored

## AC-005-02 — Nothing tracked after a run
Given a mutation run has completed
When `git status --porcelain` runs
Then no path under `reports/mutation/` or `.stryker-tmp/` is listed
