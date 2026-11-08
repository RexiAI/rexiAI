# AC-019: Hero rewrite

## AC-019-04 — Hero headline and subtext are the new offer

Given the landing page renders in English
When the hero section (`#hero`) is read
Then its `<h1>` text content is exactly `Your business runs on a spreadsheet only one person understands.`
And its subtext paragraph text content is exactly `I replace it with software that runs itself: internal tools, SaaS products and web apps. Scoped in one call, fixed price, shipped in weeks. You own the code.`
And the document contains neither `Forget your Excel. Let's automate, with or without AI.` nor `Olvídate de tu Excel. Automatiza, con o sin IA.`
And no dictionary string in either locale contains `Excel`

## AC-019-05 — Both CTAs carry the specified labels and targets

Given the landing page renders in English
When the hero's call-to-action area is read
Then the primary CTA anchor has `href="#booking"`
And its text content matches `^Book a free hour\s*→$` (the label exactly `Book a free hour`, followed by the arrow the page already renders)
And the secondary CTA anchor has text content exactly `Email me`
And the secondary CTA anchor's `href` is exactly `mailto:info@rexi-ai.com`
And `dict.hero.ctaBooking` equals `Book a free hour` with no arrow and no trailing space

Given the landing page renders in Spanish
When the same anchors are read
Then the primary CTA label is `Reserva una hora gratis` followed by `→`
And the secondary CTA text content is exactly `Escríbeme`
And its `href` is exactly `mailto:info@rexi-ai.com`

## AC-019-06 — Microcopy sits directly under the buttons

Given the landing page renders in English
When the hero section's children are read in DOM order
Then a paragraph whose text content is exactly `You leave with a one-page plan and a fixed price.` exists inside `#hero`
And that paragraph follows the container holding both CTA anchors (it is not before the `<h1>` and not nested inside either anchor)
And the same paragraph is the last child element of `#hero`

Given the landing page renders in Spanish
Then the corresponding paragraph text content is exactly `Te llevas un plan de una página y un precio fijo.`
