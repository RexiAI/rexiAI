# AC-019: Free banner deleted, nothing struck through

## AC-019-07 — The banner does not render in any mode

Given the site config reports `billingEnabled === false`
When the landing page renders
Then no element with the class `free-banner` or any class starting with `free-banner__` is in the document
And no element's exact text content is `FREE` or `GRATIS`
And the first element child of `.landing` is the `nav`

Given the site config reports `billingEnabled === true`
When the landing page renders
Then no element with the class `free-banner` or any class starting with `free-banner__` is in the document
And no element's exact text content is `FREE` or `GRATIS`
And the first element child of `.landing` is the `nav`

Given the source tree
Then `src/components/FreeModeBanner.tsx` does not exist
And no file under `src/` imports `FreeModeBanner`
And neither locale's dictionary has a `freeMode` key

## AC-019-08 — Nothing on the page is struck through, in either mode

Given the site config reports `billingEnabled === false`
When the landing page renders
Then the document contains no `<s>`, `<del>` or `<strike>` element
And no element's class name ends in `__was`
And the text `30 EUR/h` does not appear as a struck-through price

Given the site config reports `billingEnabled === true`
When the landing page renders
Then the document contains no `<s>`, `<del>` or `<strike>` element
And no element's class name ends in `__was`
