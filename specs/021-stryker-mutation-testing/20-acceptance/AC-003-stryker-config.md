# AC-003: stryker.config.json

## AC-003-01 — Vitest runner and report path
Given `stryker.config.json`
When it is parsed
Then `testRunner` is `"vitest"`
And `coverageAnalysis` is `"perTest"`
And `jsonReporter.fileName` is `"reports/mutation/mutation.json"`

## AC-003-02 — Incremental cache
Given `stryker.config.json`
When it is parsed
Then `incremental` is `true`
And `incrementalFile` is `"reports/mutation/stryker-incremental.json"`

## AC-003-03 — Thresholds from template
Given `stryker.config.json`
When `thresholds` is read
Then `high` is 90, `low` is 80, `break` is 80

## AC-003-04 — Production code is mutated
Given the `mutate` globs
When matched against `src/domain/pricing.ts`, `src/App.tsx`, `api/_lib/routeGuards.ts`
Then each file is included

## AC-003-05 — Tests, copy and data excluded
Given the `mutate` globs
When matched against `src/__tests__/x.test.ts`, `src/domain/pricing.test.ts`, `src/vite-env.d.ts`, `src/i18n/locales/<any file>`, `src/content/privacy.ts`, `tests/<any file>`, `e2e.config.ts`, `.standards/<any file>`
Then none is included

## AC-003-06 — Filename discoverable by the wrapper
Given the repo root
When it is listed
Then `stryker.config.json` exists
And `stryker.conf.json` does not exist
