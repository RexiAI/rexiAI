# AC-019: Proof section — `Shipped, not slideshow`

## AC-019-11 — The section states the honesty line

Given the landing page renders in English
When the proof section (`#proof`) is read
Then its `<h2>` text content is exactly `Shipped, not slideshow`
And the paragraph immediately following the heading has text content exactly `No client logos yet. Everything below is live, built and run by me.`
And the section contains no `img` element and no `svg` element
And the section contains none of the words `trusted`, `clients love`, `testimonial`, `100%`, `500+`

Given the landing page renders in Spanish
Then the `<h2>` is exactly `Publicado, no presentación`
And the intro paragraph is exactly `Todavía no hay logos de clientes. Todo lo de abajo está en producción, construido y mantenido por mí.`

## AC-019-12 — Three real links, in order, with exact targets

Given the landing page renders in English
When the proof section's anchors are read in DOM order
Then there are exactly three `a` elements in the section
And anchor 1 has `href` exactly `https://github.com/RexiAI/tax-advisor` and its text contains `tax-advisor` and `AI tax guidance for Spanish freelancers.`
And anchor 2 has `href` exactly `https://github.com/RexiAI/pensions-system` and its text contains `pensions-system` and `Pension calculation, end to end.`
And anchor 3 has `href` exactly `https://github.com/RexiAI/my-engineering-standards` and its text contains `my-engineering-standards` and `The engineering standard everything above is built against: spec pipeline, CI gates, mutation-tested.`
And no anchor `href` has a trailing slash added or removed
And no anchor carries a `target` attribute

Given the landing page renders in Spanish
Then anchor 1's text contains `Asesoría fiscal con IA para autónomos en España.`
And anchor 2's text contains `Cálculo de pensiones, de principio a fin.`
And anchor 3's text contains `El estándar de ingeniería contra el que se construye todo lo anterior: pipeline de especificaciones, puertas de CI, con mutation testing.`
And all three `href` values are unchanged from the English rendering
