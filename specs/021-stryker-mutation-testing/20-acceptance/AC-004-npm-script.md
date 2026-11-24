# AC-004: npm run mutation via bounded wrapper

## AC-004-01 — Script calls the wrapper
Given `package.json`
When `scripts.mutation` is read
Then it invokes `.standards/scripts/run-mutation.sh`
And it does not contain `stryker run`, `--all`, or `--budget`

## AC-004-02 — Args forward to the wrapper
Given `stryker.config.json` exists at the repo root
And a clean working tree (no tracked changes against `HEAD`)
When `npm run mutation -- --base HEAD` runs
Then the wrapper prints `no changed files against 'HEAD' — nothing to mutate (skip)`
And exits 2 (skip), not 3 (tooling failure: config not found / base unresolved)
