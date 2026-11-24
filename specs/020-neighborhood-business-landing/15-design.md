# Design Spec: 020-neighborhood-business-landing

Mixed surface. In scope for design: Tasks 1, 2, 3, 5, 6, 7, 8 (rendered landing
copy and layout). Out of scope: Task 4 (head meta, non-visual), Task 9 (locale
parity, content shape), Task 10 (E2E script), and the booking widget's
functionality (Stripe, slots, duration selector, consent), which is unchanged.

## Design Read

Reading this as: a one-offer service landing for non-technical Miami small-business owners (Spanish first), with a plainspoken, trust-first, type-led language, leaning toward native CSS + the project's existing Geist/zinc token system, zero decorative motion.

## Dial Values

- DESIGN_VARIANCE: 4 — trust-first audience, not a design award. Owners judge the page by whether they recognise their own trade and their own price, not by composition risk. The dial table's trust-first row (3-4) fits better than the landing default (7-9); the existing page is already near-symmetric, and this spec is a message redesign, not a visual overhaul.
- MOTION_INTENSITY: 2 — the page has no animation layer today; adding one would be motion for show. Only feedback transitions (hover, focus, anchor scroll) are allowed, because the buyer is often on a mid-range phone over cellular data.
- VISUAL_DENSITY: 4 — enough room for pricing, three before-to-after examples, a bio and four FAQ answers without turning into a brochure; held at 4 so nothing is hidden behind tabs or accordions.

## Design System / Foundation

No external system is named or warranted. Foundation stays the existing project
system: plain CSS modules/sheets over CSS custom properties in `src/index.css`,
plus `src/App.css` section classes. No install command. Do not introduce
Tailwind, shadcn, Radix Themes or a component library for this spec; a
one-offer landing with seven sections does not repay the dependency or the
second design system.

Honest label: native CSS + project tokens, Geist, zinc neutrals.

## Global Tokens

- Font: Geist (400 / 600 / 700), already loaded; system-ui fallback. Do not add Inter.
- Accent color: `#18181b` (`--color-zinc-900`), near-black, used for exactly one filled element (the primary CTA). No second accent is introduced; this spec adds no new color.
- Neutral base: zinc (`#18181b` / `#52525b` / `#71717a` / `#e4e4e7` / `#fafafa` / `#ffffff`).
- Corner-radius system: soft, pills for actions (`--radius-full`) and `--radius-md` 12px for content blocks. Keep those two values only; do not add a third radius.
- Theme: light, locked for the whole page. No section inverts.
- Icon library: none. The page ships zero icon dependency today and this spec needs no icon. The before-to-after relationship is rendered as a text arrow glyph in the markup, not a hand-rolled SVG path. If a later task genuinely needs an icon, Phosphor is the only permitted addition.

Copy-mechanics constraint that overrides taste: the em-dash (`—`) is banned
outright, including in Spanish copy where it is idiomatic. Use a period or a
comma. Hyphen only.

## Design Laws

| Task | Law | Applies to | Concrete consequence | How a reviewer checks it |
|---|---|---|---|---|
| 1 | Fitts's | primary CTA | Primary CTA is a full-height pill of at least 44×44 CSS px and sits before the WhatsApp link in reading order; the padding-based height today lands near 43px, so add `min-height: 44px`. WhatsApp secondary gets the same minimum height but no fill. | Measure computed height/width of `.hero-cta--primary` and `.hero-cta--secondary` in the built page; both >= 44px on both axes. |
| 1 | Hick's | hero action set | Exactly two hero actions: book-a-call primary, WhatsApp secondary. No third hero link, no email link in the hero, no CTA inside the eyebrow or headline. | Count anchors inside `.hero-ctas`: must be 2. Assert no `mailto:` in the hero. |
| 1 | Von Restorff | visual emphasis | The primary CTA is the only filled, high-contrast element above the fold. WhatsApp renders as a quiet outline or text link (zinc-600 text on white, no fill, no accent border) and must not read as a second button of equal weight. | Screenshot the hero greyscaled: exactly one high-contrast filled block. Check the secondary's background is transparent/white. |
| 1 | Jakob's | vocabulary | Subtext names trades in the owner's words (`plomeros`, `clínicas`, `contratistas`, `tiendas`, `salones`) and the jobs (`presupuestos`, `citas`, `pedidos`, `stock`). No category nouns ("SaaS", "herramientas internas", "soluciones digitales"). | Read the rendered ES and EN subtext against the banned-term list in `10-tasks.md`; a grep for the banned jargon returns zero hits. |
| 1 | Miller's | hero stack | Hero holds at most four text elements: eyebrow, headline, subtext, CTA pair. The "first call free" and "the code is yours" promises live inside the subtext sentence pair, not as a micro-strip under the buttons. | Count text nodes inside `.hero` above `.hero-ctas`: eyebrow + headline + subtext = 3, plus the CTA pair. No `.hero-cta-microcopy` element rendered. |
| 1 | Doherty Threshold | primary CTA response | The CTA is an in-page anchor to `#booking`; the scroll must begin on the same frame as the click and finish inside 400ms. No spinner, no deferred state. Under `prefers-reduced-motion` the jump is instant. | Click the CTA with network throttled; time from click to `#booking` in viewport. Assert < 400ms and no intermediate loading state. |
| 2 | Miller's | examples | Three examples, one per trade, never more. Each is a before-to-after pair, so the reader holds two facts per row, not a paragraph. | Count example rows in `#services`: 3. |
| 2 | Gestalt (Proximity, Common Region) | before-to-after pairs | Within each example, the before state and after state sit in one bounded row and the gap inside a pair is smaller than the gap between pairs, so each pair reads as one unit and the three do not merge into a list. | Measure vertical gap inside a pair vs between pairs; inside < between. |
| 2 | Jakob's | offer shape | One offer card, not three: the card describes replacing the spreadsheet/paper/WhatsApp process, which is what the owner already calls their problem. The retired three-offer cards (`Herramientas internas` / `Productos SaaS` / `Webs y aplicaciones`) are gone from both locales. | Count offer cards in `#services`: exactly 1. Grep both dictionaries for the retired copy: zero hits. |
| 3 | Tesler's | proof section | The section absorbs the "can I trust this person" question by stating the honest line once and showing verifiable facts, and it does not compensate by inventing logos, testimonials or metrics. The remaining uncertainty (a real customer would be better proof) stays visible as an honest statement rather than being papered over. | Read `#proof`: honesty line present; zero logos, zero testimonials, zero numeric metrics; no link to `my-engineering-standards`. |
| 5 | Hick's | pricing block | Two numbers only: `desde $1,200` and `desde $600/mes`. No tier table, no toggle, no range slider, no third number. | Count currency figures on the page: exactly `$1,200` and `$600`, plus zero others. |
| 5 | Tesler's | pricing clarity | The system absorbs the confusing part by pairing each figure with what it buys (setup vs monthly) in the same visual block; the part it cannot absorb (final per-project price) is stated in plain words in the same block, not deferred to a hidden FAQ link. | Read the pricing block: both figures carry an inline label, and the per-project sentence is visible without interaction. |
| 5 | Jakob's | price formatting | US-market convention: `$` before the number, comma thousands separator, `/mes` in ES and `/month` in EN. No `EUR`, no `€`, no `por hora`. | Grep rendered DOM for `EUR`, `€`, `hora`, `hour`, `1h`: zero hits. |
| 6 | Serial Position | about bio | The bio is the section where the founder is named as a person, placed after proof and before booking, so the last text block before the ask is human rather than technical. Its last sentence is the plain-language one (live in Salamanca, works with Miami clients remotely), not the credential list. | Read the section order in the rendered DOM: about follows proof and precedes booking; last sentence of `about.bio` names Salamanca and remote work with Miami. |
| 6 | Jakob's | no-photo layout | A photo-less bio is laid out as a readable column with real spacing, not as an empty photo slot or a grey placeholder box. A missing-asset frame is a defect, not a neutral state. | Screenshot `#about`: no `<img>`, no empty bordered box, no "photo coming soon" affordance. |
| 7 | Miller's | FAQ count | Exactly four question/answer pairs, one column, all answers visible expanded by default. No accordion: an owner on a phone should not need a tap per answer to learn what happens if the app breaks. | Count rendered pairs in the FAQ section: 4; all answers have non-zero rendered height without interaction. |
| 7 | Hick's | FAQ disclosure | Answers are not behind progressive disclosure, so the choice at paint is "read four answers", not "choose which answer to open". Nothing in the section competes with the booking CTA above it. | Inspect the section: no `<details>`, no accordion toggle, no `aria-expanded` control. |
| 8 | Jakob's | nav convention | The nav anchor keeps pointing at `#booking` and only its label changes (`Hablemos` / `Let's talk`). Nav keeps the existing single-line desktop layout at 80px max height, with no new items added. | Measure nav height at 1280px width: <= 80px, one row. Assert the anchor href is still `#booking`. |
| 8 | Von Restorff | nav vs hero | The nav item is a text link, never a filled button. Recognising "Hablemos" must not compete with the hero's single filled CTA. | Grep nav styles for background fill on `.nav-link`: none. |

**Deliberate violations** (reason + compensating control):
- None. No core law is knowingly departed from on this spec.

**Judged inapplicable for this spec** (so omissions are visible):
- Zeigarnik / Goal-Gradient — the only multi-step flow is the booking widget, which is out of scope and unchanged; the landing itself has no sequence to complete.
- Parkinson's / Flow — nothing on the page is time-bounded or paced by a timer; the page is read, not performed.
- Peak-End — the end of the *page* is a footer without an ask, and the booking confirmation is a widget state outside this spec, so there is no in-scope peak-state to design. Serial Position covers the ordering concern that remains.
- Aesthetic-Usability — not used as an argument anywhere. If the page looks calm and still asks the owner to trust an unverifiable claim, the claim gets removed, not restyled.
- Choice Overload — no set on the page exceeds four options, so Hick's Law already covers every decision point; citing both would be duplicate enforcement.
- Pareto — the page has one offer; there is no 80/20 trade-off to reason about.
- Doherty beyond the CTA — the page is static content with no data fetch on the critical path. Applying a feedback budget to content that renders with the document would be decoration.

## Per-Task Directives

### Task 1: Hero: eyebrow, exact headline, Miami trades, one outcome, CTAs
- Layout: Editorial Manifesto Hero. Type does the work, no asset, no fake product screenshot (there is no photo and no product to photograph). Keep the existing centered-left stack; do not add a hero image slot.
- Components: eyebrow span, `h1.hero-title`, `p.hero-subtext`, `.hero-ctas` with `a.hero-cta--primary` (href `#booking`) and `a.hero-cta--secondary` (WhatsApp). Remove `.hero-cta-microcopy` from the hero.
- Typography: keep `--text-hero` 48px at desktop and the existing clamp behaviour; headline is two sentences and must break at the period, never mid-clause. Subtext stays `--text-lg` with a max measure of ~60ch so it does not run edge to edge at 1280px.
- Motion: static. Only the anchor scroll (instant under reduced motion). No entrance animation on the headline.
- A11y: eyebrow must be a `p`/`span`, not an `h2` (single `h1` on the page). Primary CTA text zinc-900 fill with white text stays well above 4.5:1; the secondary outline must keep zinc-600 on white (>= 4.5:1), not zinc-500. WhatsApp link needs a visible focus ring and an accessible name that includes WhatsApp.
- Anti-patterns to avoid: em-dash anywhere in the ES headline or subtext; a micro-tagline under the CTAs; a third hero link; email/`mailto:` in the hero; "soluciones digitales", "transforma tu negocio", "eleva", "potencia" style filler; `software` in product copy; an icon beside the CTA that competes with the single-accent rule.
- Watch items (Coder must check): (1) the current padded CTA height is ~43px, so `min-height: 44px` is a real change, not a no-op; (2) ES subtext must use `plomeros`, never `fontaneros`; (3) `Salamanca` must not appear in the hero; (4) if the subtext grows past 20 words at mobile width it will push the CTA below the fold, so keep the promise sentences short.

### Task 2: Services: one offer + three before-to-after examples
- Layout: asymmetric stacked split rows. One offer card as the section anchor, then three full-width before-to-after rows. Not three equal cards in a row: that exact pattern is banned and it is also what the retired offer looked like.
- Components: single offer card (`--radius-md`, 1px zinc-200 border, no shadow), then three example rows each with a before cell, a text arrow, and an after cell. Arrow is text, not an SVG.
- Typography: offer card headline at `--text-xl`, examples at `--text-base`; the trade name is the row's lead so the owner's eye lands on their own trade first.
- Motion: static. Hover on an example row, if any, is a border-color change only, 150ms, disabled under reduced motion.
- A11y: the before-to-after relationship must not be conveyed by arrow glyph alone; give each pair an accessible label such as "antes" / "después" (EN "before" / "after") so a screen reader hears the relationship. The arrow glyph is `aria-hidden`.
- Anti-patterns to avoid: three identical cards of equal height; any example that reads as a client case (no names, logos, metrics, "caso de éxito"); `testimonio`; a before-state that names a competitor product as a punchline; introducing `software` in the offer card; inline `style={{...}}` on the example cells.
- Watch items (Coder must check): separators may be bottom-border only between rows, never top-and-bottom on every row; the three trades must include one shop and one salon/clinic variant so the ES US-Spanish stems in the acceptance criteria match.

### Task 3: Proof reworded for the owner
- Layout: short vertical column, single visual family, no card grid. It is a credibility aside, not a feature section.
- Components: a short heading, two or three factual lines, the honesty line as a lighter-weight final paragraph. No logo wall (there are no real logos), no testimonial component.
- Typography: body at `--text-base`, honesty line at `--text-sm2` in zinc-500 so it reads as a note rather than a claim.
- Motion: static.
- A11y: plain text only; no icon-only bullets. If bullets are used, use real `<ul>`/`<li>` so they are announced.
- Anti-patterns to avoid: the `my-engineering-standards` repo link; `mutation`, `spec pipeline`, `CI gates`; invented uptime or client counts; a "Trusted by" heading with no logos under it.
- Watch items (Coder must check): removing the standards repo link is checkable and must be literal, not "de-emphasised"; the honesty line survives the rewrite.

### Task 5: Pricing: public USD figures, no hourly text
- Layout: one horizontal pricing block with two anchored figures and an inline per-project sentence underneath. Two columns at desktop, one at mobile. No comparison table.
- Components: two figure cells (`$1,200` setup, `$600/mes` recurring), each with a label above and one clarifying line below, plus a plain sentence about the agreed per-project price and the free first call.
- Typography: figures at `--text-3xl` with tabular alignment so the two numbers line up; labels at `--text-sm2` in zinc-600; the two figures are the second-largest type on the page after the hero headline, which is correct because price is the second question the owner asks.
- Motion: static.
- A11y: figures must be readable as numbers by assistive tech; do not split `$1,200` across elements or insert a space after `$`. Currency and recurrence live in adjacent text, not in a `title` attribute.
- Anti-patterns to avoid: a third number; `desde $1,200*` with an asterisk footnote; "más IVA"-style additions that change the quoted figure; the removed milestone line; any `EUR`/`€`/`por hora`; a "most popular" badge (there is one plan, so a badge is meaningless).
- Watch items (Coder must check): `booking.narrativePaid` and `booking.priceLine` render on the landing and must also lose hourly text and the milestone line; keep the figures exactly `$1,200` and `$600`.

### Task 6: About: filled bio, no photo
- Layout: single readable column, ~65ch measure, with `about.location` as a separate muted line. No portrait frame, no avatar placeholder, no two-column photo-and-text split with an empty half.
- Components: heading, `about.bio` paragraph (~3 sentences), `about.location` line.
- Typography: bio at `--text-base`; location at `--text-sm2` zinc-500. No drop cap, no pull quote.
- Motion: static.
- A11y: the bio is body text, not a blockquote; no `aria-label` needed.
- Anti-patterns to avoid: inventing facts beyond the owner list; `Inglés Ejecutivo`; a photo slot; making the company names into a faux logo wall; overselling adjectives ("apasionado por la excelencia").
- Watch items (Coder must check): `software` is permitted in the bio carve-out and banned everywhere else, so the same file will contain both allowed and banned uses; the count of sentences stays ~3 so the section does not become the longest block on the page.

### Task 7: FAQ: four honest answers
- Layout: single column, four stacked question/answer pairs, all expanded. Heading plus four `dl`-style or `h3` + `p` pairs.
- Components: no accordion, no `<details>`, no toggle. Each question is an `h3`; answers are `p`.
- Typography: questions at `--text-lg` weight 600, answers at `--text-base` zinc-600, answer measure <= 70ch.
- Motion: static.
- A11y: heading level continuity after the About `h2`; answers follow their question in DOM order so screen readers pair them.
- Anti-patterns to avoid: an accordion that hides the "what if it breaks" answer; a fifth "any other questions?" filler; invented SLAs (`99.9%`, `%` uptime) or invented prices; `billing`/`facturación` jargon.
- Watch items (Coder must check): the four topics must be recoverable by keyword (maintenance cost, breakage, data ownership, mobile), so the answer text has to name the topic, not gesture at it.

### Task 8: Nav label change
- Layout: unchanged nav row; one label swap.
- Components: `.nav-link` anchor to `#booking` labelled `Hablemos` / `Let's talk`.
- Typography: unchanged nav size. `Hablemos` is shorter than `Reservas`, so the row gains slack; spend it on spacing, not on a new item.
- Motion: static.
- A11y: the link's accessible name is the visible label; no `aria-label` override that diverges from visible text.
- Anti-patterns to avoid: turning the nav item into a filled button; adding a "Reservar" duplicate beside it; letting the nav wrap to two rows on desktop.
- Watch items (Coder must check): the anchor target stays `#booking`; nav height stays <= 80px on one line at 1280px.

## Out-of-scope tasks

- **Task 4 — head metadata.** `<title>`, `<meta description>`, `og:locale` (`es_US` / `en_US`). Non-visual; owned by the copy/dictionary work, not by design. Design only notes that the ES title must stay short enough to avoid truncation in a browser tab and that no design tokens are involved.
- **Task 9 — locale parity.** Dictionary shape, retired offer removal, banned terms. Content correctness, verified by tests rather than design judgment. Design consequence only: ES strings are the longer locale in every section here, so every layout above must be checked at ES length first.
- **Task 10 — E2E landing journey.** No visual surface.
- **Verify-only item 15 — recording consent wording.** Booking widget, unchanged and out of scope.
