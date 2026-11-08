# AC-019: Page assembly and section order

## AC-019-24 — Sections render in order with stable anchors

Given the landing page renders in English
When the document's top-level structure is read in DOM order
Then the order is: the `nav`, `#hero`, `#services`, `#proof`, `#about`, `#booking`, `#contact`, the `footer`
And `#proof` and `#about` both appear after `#services` and before `#booking`
And each of the ids `hero`, `services`, `proof`, `about`, `booking`, `contact` occurs exactly once

Given the same page
Then the nav contains exactly three in-page anchors, with `href` values `#services`, `#booking`, `#contact`
And the nav contains no `#proof` or `#about` link
And the nav contains the `RexiAI` brand link with `href="/"`
And the nav contains the language switcher with an `ES` and an `EN` button
And the footer contains `RexiAI`, the current year, `All rights reserved` and a link to `/privacy`

Given the site config reports `billingEnabled === false` and again `true`
When the landing page renders in each mode
Then the first element child of `.landing` is the `nav` in both modes
And the eight-part order above holds in both modes
