# AC-022-01: Example rows wrap as an aligned block

## AC-022-01-01 — Label and text are separate boxes
Given the Services section rendered in ES
When an example cell is inspected
Then it contains a label element with text "antes" or "después"
And a separate text element holding the sentence

## AC-022-01-02 — Cell uses a two-box layout, not inline flow
Given src/App.css
When `.example-row__cell` and `.example-row__label` rules are read
Then the cell is `display: grid` or `display: flex`
And the label is not `display: inline-block`/`inline`

## AC-022-01-03 — Desktop media query keeps the block layout
Given the `@media (min-width: 641px)` rules
When read
Then no rule sets `.example-row__cell` back to `block`/`inline` flow

## AC-022-01-04 — EN labels preserved
Given the Services section rendered in EN
When example cells are inspected
Then labels read "before" and "after" and the arrow remains
