# AC-006: Manual advisory CI mutation job

## AC-006-01 — Manual trigger only
Given `.github/workflows/mutation.yml`
When its `on:` block is read
Then the only trigger is `workflow_dispatch` with an input `base` defaulting to `origin/main`

## AC-006-02 — Runs the wrapper, advisory
Given the mutation job
When its steps are read
Then it runs `npm ci` and `npm run mutation -- --base` with the `base` input
And the job has `continue-on-error: true`

## AC-006-03 — Checkout sufficient for diff scope
Given the checkout step
When its `with:` is read
Then `fetch-depth` is `0` and `submodules` is `true`

## AC-006-04 — Supply-chain hygiene
Given `.github/workflows/mutation.yml`
When every `uses:` line is read
Then each ref is a 40-char commit SHA followed by a version comment
And `permissions` is exactly `contents: read`
And the file contains no `secrets.` reference and no `vercel` string

## AC-006-05 — Existing CI untouched
Given the spec branch diff
When `.github/workflows/ci.yml` is compared with `main`
Then it is unchanged
