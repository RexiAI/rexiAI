# Design Spec: 022-landing-copy-currency-receptionist

Scope: frontend tasks 1, 2, 5 (layout fix, euro copy, 4th example row). Tasks 3, 4 are test/content-only (out of scope). Inherits all global tokens and theme from spec 020 (`docs/changes/020-neighborhood-business-landing.md`); nothing new is introduced.

## Design Read
Small bugfix on an existing warm neighborhood-business landing: repair text alignment in before→after rows, keep the visual language untouched.

## Dial Values
- DESIGN_VARIANCE: 2 — fix only, keep the existing layout family.
- MOTION_INTENSITY: 1 — static; no motion added or changed.
- VISUAL_DENSITY: 4 — a 4th row is added to the existing 3-up grid at the same density.

## Design System / Foundation
Existing spec-020 stylesheet (`src/App.css`) and its CSS variables. No install, no new dependency.

## Global Tokens
Unchanged from spec 020: existing font, accent, neutral base, corner radius, theme and icon set. Use only existing `var(--…)` tokens; no new hex or px literals except the cell's label column width, which must reuse the token or value already used by `.example-row__label` `min-width`.

## Design Laws

| Task | Law | Applies to | Concrete consequence | How a reviewer checks it |
|---|---|---|---|---|
| 1 | Gestalt (Proximity, Common Region) | label + text in a cell | Label and text sit in one cell as two boxes; the text block stays beside/below its own label, with a larger gap between cells than inside a cell | Visual check at 375 px and 1280 px, ES and EN: wrapped lines start at the same x as line 1 |
| 1 | Prägnanz | wrapped text | Hanging indent: text is a block box, so lines 2–3 align with line 1 | Computed style: the text element is block-level inside a grid/flex cell |
| 1 | Fitts's | any tappable element in the section | Existing 44×44 rules unchanged; the fix adds no new targets and shrinks none | Diff shows no change to 44px rules |
| 2 | Jakob's | prices | ES uses the Spanish convention `1.200 €`, EN keeps `$1,200` | Rendered text per locale |
| 2 | Gestalt (Proximity) | price figure | NBSP (U+00A0) between number and `€` (and before `€/mes`) so the symbol never orphans onto its own line | Narrow viewport: `€` is never alone at the start of a line |
| 5 | Miller's | examples list | 4 items per group, within chunk limits; the receptionist row is last, in the same markup and rhythm as the others | Count 4 rows, same structure |
| 5 | Serial Position | 4th row | Last position is acceptable; no extra emphasis | No special class on the new row |

**Deliberate violations:** none.

**Judged inapplicable:** Hick's (no new choices), Doherty (no interaction or async), Tesler's (no hidden complexity), Von Restorff (no accent added), Peak-End (not a flow).

## Per-Task Directives

### Task 1: Example rows wrap as an aligned block
- Layout: each `.example-row__cell` uses `display: grid` (or flex) with two boxes: label column (auto/fixed existing min-width) and `.example-row__text` as a block box in the remaining column. Same rule applies at the mobile 1-col layout and the `min-width: 641px` 3-col layout. No `@media` rule restores inline label+text flow.
- Components: existing `.example-row`, `.example-row__pair`, `.example-row__cell`, `.example-row__label`, new `.example-row__text` span/div.
- Typography: unchanged sizes and weights, via existing tokens.
- Motion: static.
- A11y: keep the visible `antes`/`después` (`before`/`after`) labels and the arrow exactly as they are; semantic markup is unchanged, and no `aria-hidden` on labels. Contrast is unchanged.
- Anti-patterns: `display: inline-block` label flowing with the text; `padding-left`/`text-indent` hacks with magic numbers; new inline `style=` props; `!important`.
- Watch items: check the longest ES string ("Aviso automático cuando algo se va a acabar.") at 320, 375, 641, 1024 px; the label column must not stretch the row; the arrow stays aligned.

### Task 2: Euros in ES
- Layout: none changed.
- Components: copy strings only (`es.ts`).
- Typography: unchanged.
- A11y: NBSP keeps the amount and symbol read as a unit; screen readers read it normally.
- Anti-patterns: a regular space before `€`; converting numbers; a third price; `$` surviving in ES.
- Watch items: price wraps at narrow widths (pricing card, FAQ, contact line): `€` must not orphan.

### Task 5: 4th example row (receptionist)
- Layout: the same row component, 4th in order; in the 3-col desktop layout confirm the grid still reads cleanly with 4 rows (rows stack vertically, each row has its three-column pair).
- Components: the existing example-row markup, no link, no icon or digit added.
- Typography: unchanged.
- Motion: static.
- A11y: same antes/después labels; plain text only.
- Anti-patterns: a special-case class, badge, link, price, client claim or metric on this row.
- Watch items: the long "after" text (~75 chars) wraps in 3+ lines in EN at 375 px; the hanging indent from Task 1 must hold.

## Out-of-scope tasks
- Task 3 (price tests), Task 4 (remove pensions-system from Proof: data/test only).
