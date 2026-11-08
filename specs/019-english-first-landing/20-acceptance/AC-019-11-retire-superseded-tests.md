# AC-019: Retire the assertions this spec supersedes

## AC-019-23 — The suite is green with no stale references

Given the implementation of tasks 1–10 is complete
When `npx vitest run` is executed
Then it exits 0
And `npx tsc --noEmit` exits 0

Given the test directory `src/__tests__`
When searched for the retired dictionary keys
Then searching for `freeMode`, `carouselPrev`, `carouselNext`, `carouselPosition`, `carouselRole`, `pricingExample` and `pricingRules` returns no match
And searching for `FreeModeBanner` returns no match
And searching for `danielbueno76` returns no match

Given the six edited test files
Then every scenario ID that existed before the change still exists after it
And each of these assertions holds in its updated form:
- `AC-001-01` asserts the English hero by default and the Spanish hero after switching to ES
- `AC-001-05` keeps the en-dash ban and allows an em dash only inside `booking.narrativePaid`
- `AC-002-01` asserts the English hero by default and the Spanish hero after switching to ES
- `AC-002-02` expects exactly three services with the new ids
- `AC-002-03` expects `mailto:info@rexi-ai.com`
- `AC-002-04` expects `#hero`, `#services`, `#proof`, `#about`, `#booking`, `#contact`
- the free-mode in-flight-copy tests still assert the submit label before and during the POST, now read from `dict.booking.form.submitFree`
And no other test file was modified

Given a test fails after implementation
Then it is treated as a regression in tasks 1–10, never as licence to relax the assertion
