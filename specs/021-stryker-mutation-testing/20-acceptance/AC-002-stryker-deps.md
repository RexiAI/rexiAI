# AC-002: Stryker dev dependencies

## AC-002-01 — Both packages are devDependencies
Given `package.json`
When `devDependencies` is parsed
Then it has keys `@stryker-mutator/core` and `@stryker-mutator/vitest-runner`
And `dependencies` has neither key

## AC-002-02 — Same major version
Given both Stryker entries in `devDependencies`
When their version specifiers are compared
Then their major versions are equal

## AC-002-03 — Lockfile resolves both
Given `package-lock.json`
When `packages` is parsed
Then `node_modules/@stryker-mutator/core` and `node_modules/@stryker-mutator/vitest-runner` exist with a concrete `version`
