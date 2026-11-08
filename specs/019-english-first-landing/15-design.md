# Design spec — 019 English-first landing

Stage 1.5 of `docs/SPEC_PIPELINE.md`. Scope: **frontend surface only**, all twelve tasks.
Every string, section order and mode behaviour comes from `10-tasks.md`; this file
decides only *how it looks*, and it decides nothing that touches existing brand
material.

**Design Read:** Reading this as a solo-consultant services landing for non-technical
SMB owners stuck on a spreadsheet, with a plain evidence-first language, leaning
toward the **existing hand-rolled zinc-on-white token sheet and its system type
stack**, with no motion.

This is a **preserve-and-extend** job, not a redesign. The audit-first rule of the
skill's redesign protocol collapses to one sentence: there is nothing to preserve a
decision about, because nothing outside the listed changes may move.

---

## Locked foundation (read before any task)

No new design system, no new dependency, no new asset, no new webfont.

| Concern | Locked value | Where it already lives |
|---|---|---|
| Page font | `Geist, system-ui, sans-serif` | `.landing` in `src/App.css` |
| Mono font | `Geist Mono, monospace` (system fallback, **not** loaded as a webfont) | previously `.service-card__meta` |
| Text colour | `--color-zinc-900` `#18181b` | `src/index.css` `:root` |
| Muted text | `--color-zinc-600` `#52525b` (7.8:1 on white) | `:root` |
| Faintest text | `--color-zinc-500` `#71717a` (≈4.8:1 on white, AA at 13px) | `:root` |
| Hairline / border | `--color-zinc-200` `#e4e4e7` | `:root` |
| Surface | `--color-white`, inset panel `--color-zinc-50` | `:root` |
| Accent | **none.** `--color-zinc-900` *is* the accent (filled CTA, active pill). `--color-green-600` and `--color-red-700` stay semantic only (success view, field errors) and never appear on the landing body | `:root` |
| Radius — interactive | `--radius-full` (pill) | existing CTAs, chips, switcher |
| Radius — containers | `--radius-lg` 16px (cards), `--radius-md` 12px (inputs) | `.booking-card`, `.service-card`, `.booking-input` |
| Spacing | only `--space-1|2|3|4|6|8|12|14` | `:root` |
| Type scale | only `--text-xs|sm|sm2|base|lg|xl|2xl|3xl|hero` | `:root` |
| Theme lock | **light, whole page, no exceptions.** No dark-mode work, no section inversion, no `prefers-color-scheme` block | current behaviour |
| Icons | **zero.** No icon library is added; the arrow in the hero CTA is the only glyph and it is markup that already exists | `.hero-cta--primary` |
| Images | only `/logo.png` (nav brand, `og:image`). No new images, no generated art, no placeholder graphic, no hand-rolled SVG | `src/pages/Landing.tsx` |
| Motion | **static.** The only animation on the page is the existing 200ms confirmation-panel fade; it is untouched and not extended | `BookingWidget.css` |

**No new custom property is required by this spec.** If implementation reaches for one
it has picked a literal it does not need. The only non-token values permitted are the
ones already in the file for the same purpose (`1px` hairlines, `80px`/`64px` hero
padding on desktop, `2px` switcher inset, `100dvh` result views, `800px`/`1100px`
measures). `calc(var(--space-14) + var(--space-6))` = 80px is permitted (see Task 12).

**Deliberate deviations from the skill, recorded rather than hidden.** Each of these is
forced by final copy or by an explicit spec constraint, so the skill rule yields and the
reason is written down instead of the rule being silently broken:

1. **Em dash.** The page carries exactly one `—`, inside `booking.narrativePaid`, plus
   the ones inside `<title>` / `og:*` in `index.html` (Task 9). Rendered body copy
   elsewhere carries none, and `–` appears nowhere.
2. **Three equal cards.** `#services` is three cards in a row at ≥900px because the spec
   mandates exactly three visible cards. Mitigation: they are text-only, borderless,
   shadowless, iconless, CTA-less, with unequal copy lengths — a spec sheet, not a
   feature row.
3. **Microcopy under the CTAs.** The skill bans a tagline under the buttons; the spec
   mandates one. Mitigation: it sits 12px under the button row, at 13px, sentence case,
   with no tracking, no uppercase and no rule above it, so it reads as a caption on the
   primary button rather than a strip.
4. **Three `·` in one line.** `booking.priceLine` is verbatim final copy and dictates its
   own separators. Nothing else on the page uses `·` as a separator.
5. **Two `Email me` CTAs** (hero secondary and contact). Same copy is mandated in both
   places; they are the same action at the top and the bottom of one page, not competing
   offers. The hero one is outlined and secondary-weight, the contact one is the terminal
   dark pill.

---

## Task 1 — English is the default locale

**Visual change:** none. `getInitialLocale()` fallback flips to `en`; the switcher
already renders `role="group"` with `aria-pressed` on each button
(`src/components/LanguageSwitcher.tsx`), which is the "button group" the accessibility
constraint asks for. Nothing in `LanguageSwitcher` changes: no style, no markup, no
label, no order.

**Classes:** `.lang-switcher`, `.lang-btn`, `.lang-btn--active` untouched.

**Mobile / Desktop:** identical. Two 29px-tall pills inside a 1px-outlined pill. No
change at any breakpoint.

**Must not happen:** no new switcher affordance (no flag emoji, no dropdown, no
`<select>`, no globe icon); no `navigator.language` detection UI; `document.documentElement.lang`
stays a runtime assignment so `<html lang>` follows the toggle without a reload.

## Task 2 — Hero rewrite

**Visual change:** the H1 is now 68 characters and the subtext 167, and a third text
element appears under the button row. The hero must still read as **one screen at
390px**: headline, subtext, both CTAs, and the microcopy visible without scrolling. The
fix is entirely in the hero's own scale and padding; nothing else moves.

**Hero block, measured (not argued):** with the nav, the whole `#hero` must measure
**≤ 560px tall at 390×844** in **both** locales. Approximate budget per element, which
the Coder verifies against a real screenshot rather than trusting:

| Element | ≤640px | ≥641px |
|---|---|---|
| `.hero` padding | `var(--space-8) var(--space-6) var(--space-12)` = 32/24/48 | `80px var(--space-6) 64px` (unchanged) |
| `.hero-title` size | `var(--text-3xl)` 32px, `line-height: 1.1`, `letter-spacing: -0.03em` | `var(--text-hero)` 48px (unchanged) |
| headline lines at 390px | EN 3–4, ES 4–5 | 3 at 1280 (see Watch) |
| `.hero-subtext` size | `var(--text-base)` 16px, `max-width: 60ch`, `margin: 0 auto var(--space-6)` | `var(--text-lg)` 18px |
| `.hero-ctas` | one row, `flex-wrap: wrap`, `row-gap: var(--space-2)` | one row |
| `.hero-cta-microcopy` | `var(--text-sm)` 13px, `--color-zinc-500`, `margin: var(--space-3) auto 0`, `max-width: 42ch` | same |

32px is chosen because it is the smallest token that still clears the section headings:
h1 32 > h2 28 (`--text-2xl`) > h3 20 (`--text-xl`). Dropping to `--text-2xl` would make
the headline the same size as `What I build` and collapse the hierarchy.

**Classes reused:** `.hero`, `.hero-title`, `.hero-subtext`, `.hero-ctas`,
`.hero-cta--primary`, `.hero-cta--secondary`. **One class added:** `.hero-cta-microcopy`
for the paragraph that must follow `.hero-ctas` in DOM order (AC-019-06). Written
mobile-first: the base `.hero` / `.hero-title` / `.hero-subtext` rules take the ≤640px
values, and one `@media (min-width: 641px)` block restores the current desktop values.

**Mobile:** H1 32px over 3–4 lines (EN) then subtext 16px over ~4 lines; both CTAs stay
side by side (`Book a free hour →` ≈ 300px incl. gap at 390px fits in 342px of content
width), microcopy 1–2 lines. Do not stack the CTAs in EN; in ES the secondary wraps to a
second centred row, which is expected and fine. Both CTAs keep ≥44px touch height
(`space-3` vertical padding already yields ≈50px).

**Desktop:** unchanged block, except the microcopy sits under the buttons at 13px.

**Must not happen:** no eyebrow/label above the H1; no gradient, no italic word, no `<br>`
splitting the headline; no `text-transform`; no full-width stacked CTAs on mobile; the
arrow `→` stays markup inside the primary anchor and never enters the dictionary; the
microcopy never becomes a bordered strip, a chip, or a background band; the hero never
grows past 2 text elements plus buttons plus microcopy; no viewport-height hero
(`100dvh` stays confined to `.result-view`).

**Watch (pre-flight):** the skill wants a ≤2-line headline at desktop. 68 characters at
48px inside the 800px measure resolves to **3 lines** and cannot be coaxed to 2 without
either shrinking the token or widening the measure past 880px. Accepted: 3 balanced
lines at desktop, `text-wrap: balance` permitted on `.hero-title` only if it does not add
a line at 390px. Do not widen `.hero` beyond 880px and do not introduce an intermediate
font size.

## Task 3 — Free banner deleted, nothing struck through

**Visual change:** the dark full-bleed strip above the nav disappears. The page now opens
on the nav, and the hero is the first thing a visitor reads. This is the single largest
perceptual change in the spec: the loudest element above the fold becomes the H1.

**Classes removed:** `.free-banner`, `.free-banner__badge`, `.free-banner__text`,
`.free-banner__title`, `.free-banner__was`, `.free-banner__body`, `.free-banner__fineprint`
(all of `src/App.css` lines 281–330).

**Mobile / Desktop:** the ~72px the banner occupied at 390px returns to the viewport. No
replacement element, no spacer, no substitute strip. `nav.nav` is `.landing`'s first
element child in both modes.

**Must not happen:** no `border-bottom` added to the nav to compensate for the lost
divider (`.nav` already has one); no free-first-hour pill, ribbon, or badge anywhere on
the page; **nothing struck through in any mode**; no element whose class ends in `__was`.

## Task 4 — `What I build`: three cards, carousel removed

**Visual change:** the section header loses its arrow controls, the horizontal scroll
track becomes a plain grid, and four image-topped cards become three text cards with no
media. Section title `What I build`. Each card: `h3` title (20px) + one problem-first
line (14px, `--color-zinc-600`). No tags (`.service-card__meta` and the `SaaS · Product`
stripes are gone), no image, no arrow, no dot.

**Layout family:** *equal-column spec grid* (not a "three feature cards" row — see the
deviation note). Left-aligned heading, cards flush to the same left edge as the heading;
no centred heading, no icon badge, no number, no accent bar, no shadow, no hover lift.

**Classes reused:** `.services` (container), `.section-title` (h2), `.service-card`,
`.service-card__title`, `.service-card__desc`. **One class added:** `.services-grid` (the
grid wrapper). `.services-header`, `.services-carousel__*`, `.service-card__media`,
`.service-card__image`, `.service-card__meta`, `.service-card__body` are deleted; the
card carries its own padding instead of a nested body.

```css
.services-grid { display: grid; gap: var(--space-4); grid-template-columns: 1fr; }
@media (min-width: 641px) { .services-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 900px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
.service-card {
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--color-zinc-50);
}
.service-card__title { margin-bottom: 6px; font-size: var(--text-xl); font-weight: 600; }
.service-card__desc { max-width: 60ch; color: var(--color-zinc-600); font-size: var(--text-sm2); }
```

**Mobile (≤640):** one column, three cards stacked, full 342px width, 16px gaps. The
third card's line is short (55 chars), so heights differ; that is honest and fine, the
grid does not need equal heights.
**Tablet (641–899):** two columns; the third card sits alone on row two, left-aligned.
That gap is accepted: it is the honest consequence of three items in a two-column grid,
and a wide third card or a centred orphan would read as a designed "feature row".
**Desktop (≥900):** three columns of ≈340px inside the 1100px container, `align-items:
stretch` so the row has one height.

**Must not happen:** no `overflow-x`, no scroll-snap, no `button` inside `#services`, no
`aria-roledescription`, no `img`, no `svg`, no price/duration/count/badge added to a
card, no truncation of a description to force equal heights, no `line-clamp`, no
`text-overflow: ellipsis`.

## Task 5 — Proof section: `Shipped, not slideshow`

**Visual change:** a new section between `#services` and `#about`. It must read as
**"here is the work"**, never as a partner wall. The distinction is structural, not
decorative: a logo wall is centred equal boxes; this is a **left-aligned ruled list** of
three full-width rows, each row one link.

**Layout family:** *ruled list* (single column of hairline-separated rows). Rows, not
cards: no box, no background, no radius, no shadow, no hover lift.

```
Shipped, not slideshow            ← h2, .section-title
No client logos yet. Everything below is live, built and run by me.   ← intro, 16px, muted
──────────────────────────────────────────────────────────────────
tax-advisor         AI tax guidance for Spanish freelancers.          ← whole row is one link
──────────────────────────────────────────────────────────────────
pensions-system     Pension calculation, end to end.
──────────────────────────────────────────────────────────────────
my-engineering-standards  The engineering standard everything above is built against: …
```

```css
.proof__intro { max-width: 60ch; margin-bottom: var(--space-6); color: var(--color-zinc-600); font-size: var(--text-base); }
.proof__list  { margin: 0; }
.proof__item  { display: grid; gap: var(--space-1); padding-block: var(--space-4); border-top: 1px solid var(--color-zinc-200); }
.proof__name  { color: var(--color-zinc-600); font-family: Geist Mono, monospace; font-size: var(--text-sm2);
                text-decoration: underline; text-decoration-color: var(--color-zinc-200); text-underline-offset: 2px; }
.proof__line  { color: var(--color-zinc-900); font-size: var(--text-base); }
@media (min-width: 900px) { .proof__item { grid-template-columns: minmax(0, 1fr) minmax(0, 3fr); gap: var(--space-6); align-items: baseline; } }
```

The name is mono, muted and hairline-underlined (it is the identifier and the
affordance), the line is full-contrast sans (it is the claim). On hover and
`:focus-visible` the underline colour goes to `var(--color-zinc-600)`. That is the whole
interaction: no arrow, no `↗`, no "View repo" link, no `target="_blank"` (Task 5 forbids
it, and promising a new tab would be a lie).

**Mobile (≤640):** name above line, 16px block padding, one hairline per row, no side
padding (rows align with the section's 24px gutter). Item 3's line wraps to 2 lines:
unavoidable with verbatim copy.
**Desktop (≥900):** 1:3 columns so each item is literally one line; the three rows share
a fixed rhythm of 54px.

**Must not happen:** no `img`, no `svg`, no logo marks, no favicon-style tile, no
testimonial blockquote, no metrics ("3 products", "100% shipped"), no "trusted by", no
grid of three equal cells, no `·` separators, no extra sentence in the section, no
`<s>`, no lifted card styling.

## Task 6 — About block: `Who builds it`

**Visual change:** a new identity block between `#proof` and `#booking`. It must not read
as a team page and not as a profile card. One name, one role, one location line, one
email link, one GitHub link, and an optional bio that is absent by default.

**Layout family:** *left-aligned identity block* — narrow measure (`max-width: 60ch`) at
the same left edge as the other section headings, no container box, no avatar, no
cover band, no "our values" list, no columns.

```
Who builds it                    ← h2, .section-title
Daniel Bueno                     ← 20px / 600 / zinc-900
Founder, RexiAI                  ← 14px / zinc-600
Based in Spain (Europe/Madrid). Working in English and Spanish.   ← 14px / zinc-600
info@rexi-ai.com   github.com/RexiAI                             ← two underlined links, gap only
[bio paragraph — absent while about.bio is empty]
```

```css
.about__name     { margin-bottom: var(--space-1); color: var(--color-zinc-900); font-size: var(--text-xl); font-weight: 600; }
.about__role,
.about__location { color: var(--color-zinc-600); font-size: var(--text-sm2); }
.about__location { margin-bottom: var(--space-4); }
.about__links    { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.about__link     { color: var(--color-zinc-900); font-size: var(--text-sm2); text-decoration: underline; text-underline-offset: 2px; }
.about__bio      { max-width: 60ch; margin-top: var(--space-4); color: var(--color-zinc-600); font-size: var(--text-base); }
```

Why `.about__link` gets a full underline while `.proof__name` gets a hairline: a proof row
is a link wrapping a whole sentence, so a full underline would strike through the claim;
an about link is standalone link text, where the full underline is the clearest
affordance on touch. Two contexts, two deliberate treatments.

The two links are separated by `gap` only. **No `·`, no `|`, no `/` between them** — the
separator would read as decoration and the dot budget is already spent by `priceLine`.

**Mobile (≤640):** everything stacked, links wrap under the location line, both links
≥44px tall via `padding-block` on the anchor is *not* required; 14px text at `gap:
var(--space-4)` in a single row fits 390px (`info@rexi-ai.com` ≈ 120px + `github.com/RexiAI`
≈ 130px + 16px = 266px).
**Desktop:** same stack, same narrow measure. Do not split name and bio into two columns:
a two-column person block is the team-page silhouette this section is avoiding.

**Must not happen:** no `img` (no avatar slot, no grey circle, no initials badge), no
stock photo, no job history, no credential, no years-of-experience number, no client
count, no social icon row, no "About me" heading above the name, no card border, no
background band, no empty `<p>` standing in for the bio when `about.bio` is `''`.

## Task 7 — Booking: one money story per mode

**Visual change:** the card's top block collapses from a price ladder + struck example +
FREE badge + note to **one sentence**, and the mode decides which sentence. Nothing else
in the card is restyled. Free mode also loses the duration selector (resolved open
question 6) and gains a longer, concrete submit label.

**Money-story hierarchy, both modes, top to bottom of `.booking-card`:**

| # | Free mode (`billingEnabled === false`) | Paid mode (`billingEnabled === true`) |
|---|---|---|
| 1 | `p.booking-pricing` → `booking.freeNote` (14px, zinc-600) | `p.booking-pricing` → `booking.priceLine` (14px, zinc-600) |
| 2 | `DateField` | `DateField` |
| 3 | `SlotField` | `SlotField` |
| 4 | — no duration fieldset at all — | `DurationField` (unchanged) |
| 5 | `TextField` email | `TextField` email |
| 6 | `TextField` name (`--last`) | `TextField` name (`--last`) |
| 7 | `button.booking-submit` → `Book the free hour` | `button.booking-submit` → `Book and pay` |

One money statement per mode. Free mode makes **no** numeric claim at all; paid mode makes
**one** numeric claim (`priceLine`). Neither mode makes two.

```css
.booking-pricing { margin-bottom: var(--space-4); color: var(--color-zinc-600); font-size: var(--text-sm2); }
```

`.booking-pricing` is extended from 13px to 14px because it is now the card's only money
line and must not read as a footnote. Deleted: `.booking-pricing--free`,
`.booking-pricing__was` (the `line-through`), `.booking-pricing__free`,
`.booking-pricing-note`, `.booking-pricing-example` (its key `pricingExample` is removed,
so the rule has no consumer).

**Why the free card does not look empty.** The emptiness risk was the *top* of the card,
where a badge and a ladder used to sit. That slot is now filled immediately: the note is
the card's first line, 16px below it the first fieldset starts, and the card closes on a
full-width dark pill with a specific label (`Book the free hour`, not `Submit`). Three
fieldsets + two inputs + the pill fill ≈380px even at 390px width. The compensation is
*position*, not padding: do not add top padding, a spacer, an illustration, a "what you
get" list, a badge, or a grey box to fill the gap.

**Mobile (≤640) — a fix this task owns:** `.booking` is currently a hard
`grid-template-columns: 1fr 1fr` at every width, which crushes the card into a 155px
column at 390px. Split:
```css
.booking { grid-template-columns: 1fr; gap: var(--space-6); }                    /* base */
@media (min-width: 641px) { .booking { grid-template-columns: 1fr 1fr; gap: var(--space-8); } }
```
Mobile order stays: narrative + steps first, card second (DOM order unchanged).
**Desktop:** unchanged two-column split, narrative left, card right.

**Must not happen:** no `<s>`/`<del>`/`<strike>`, no `line-through` anywhere, no `FREE` /
`GRATIS` text or badge, no second price statement, no price ladder in free mode, no
`Pay securely with Stripe` in free mode, no duration selector rendered in free mode
(**not** `display:none`, not `visibility:hidden`, not an empty `<fieldset>`/`<legend>` —
no ghost element in the card or the accessibility tree; `hours: 1` travels in the request,
not in the DOM), no new form field, no relocating the money line below the form, no
relabelling the paid submit button, no colour change to the money line (green means the
success view only).

## Task 8 — Contact email replacement

**Visual change:** none beyond the address string itself. `info@rexi-ai.com` is shorter
than `danielbueno76@gmail.com`, so no reflow risk at 390px; the hero secondary CTA and the
contact pill keep their sizes.

**Classes:** `.hero-cta--secondary`, `.contact__cta` untouched. Nothing gains a new
colour, weight or underline treatment because the href changed.

**Mobile / Desktop:** identical.

**Must not happen:** no `mailto:` shown as visible text in the hero or contact section
(the pill label stays `Email me`); no second address introduced; no email icon added next
to a link; no `target`/`rel` change on either anchor.

## Task 9 — Document head metadata

**Visual change:** none. Head only. However one design constraint belongs here: **`og:image`
is `/logo.png`, the existing asset.** Do not compose a 1200×630 OG card, do not generate
an image, do not add a second image file. The shared link preview renders the square logo
inside whatever frame the platform draws; that is accepted for this spec.

**Classes:** none.

**Must not happen:** no new image asset, no inline `<style>` in the head, no font
preload, no runtime head-manipulation library.

## Task 10 — Locale parity and ES sync

**Visual change:** none *by construction*, and that is the requirement: the Spanish page
must render with the same layout at every breakpoint. Two ES strings are longer than
their EN counterparts (H1 +73 chars, service card 1 +27), so the parity rule has a
visual consequence the Coder must check:

- ES H1 may run to 5 lines at 390px. Type sizes are **not** locale-specific — never
  shrink ES to fit. The hero budget (≤560px) holds because the ES subtext is *shorter*
  than EN.
- ES `services.items[0].description` wraps to 3 lines at 390px in a card. Cards do not
  clamp text; heights follow content.

**Must not happen:** no locale-conditional CSS, no `[lang="es"]` selector, no per-locale
font-size override.

## Task 11 — Retire the assertions this spec supersedes

**Visual change:** none. Test-only task; it has no design surface. Listed for
completeness because it is one of the twelve.

**Must not happen:** no test is deleted; no assertion is relaxed beyond the authorised
table in `10-tasks.md`; the em-dash test narrows to "one `—`, inside `booking.narrativePaid`",
it does not disappear.

## Task 12 — Page assembly and section order

**Visual change:** the page gains a stable rhythm of seven blocks:

```
nav.nav  →  #hero  →  #services  →  #proof  →  #about  →  #booking  →  #contact  →  footer.footer
```

| # | Section | Layout family | Container |
|---|---|---|---|
| — | `nav` | single row, sticky, hairline bottom | full width, `space-3`/`space-6` |
| 1 | `#hero` | centred text stack | 800px |
| 2 | `#services` | equal-column spec grid (1 / 2 / 3) | 1100px |
| 3 | `#proof` | ruled list | 1100px |
| 4 | `#about` | left-aligned identity block | 1100px, content 60ch |
| 5 | `#booking` | two-column split (1 column ≤640) | 1100px |
| 6 | `#contact` | centred band on `--color-zinc-50` | full width |
| 7 | `footer` | single row, hairline top | full width |

Five distinct families across seven blocks, no two adjacent blocks sharing one, and one
single inverted-surface moment (the `--color-zinc-50` contact band) which already existed
and stays. Theme lock holds: nothing flips to dark.

**One shared container rule instead of three copies.** Extend the existing selector, do
not duplicate the block:
```css
.services, .proof, .about { max-width: 1100px; margin: 0 auto; padding: var(--space-12) var(--space-6); }
.proof > .section-title { margin-bottom: var(--space-2); }   /* heading + intro belong together */
```

**Anchors must land below the sticky nav.** The nav is `position: sticky; z-index: 10` and
80px-ish tall at both breakpoints, so today `#services` / `#booking` / `#contact` scroll the
heading underneath it. Add, tokens only:
```css
#hero, #services, #proof, #about, #booking, #contact { scroll-margin-top: calc(var(--space-14) + var(--space-6)); }
```

**Contact band** keeps `.contact`, `.contact__title`, `.contact__body`, `.contact__cta`;
the body gets a measure so one line does not stretch across 1440px:
```css
.contact__body { max-width: 52ch; margin: 0 auto 20px; }
```

**Footer at 390px** currently cannot wrap (`display:flex; justify-content:space-between`),
so the `© … Privacy` line collides with the brand. Add `flex-wrap: wrap; row-gap:
var(--space-1);`. Nothing else about the footer changes.

**Mobile:** nav keeps all three links + brand + switcher (two rows at 390px, unchanged,
no hamburger, no hidden links); every section single-column; contact band centred.
**Desktop:** as the table above.

**Must not happen:** no nav entry for `#proof` or `#about` (no copy exists for one); no
section reordering, no wrapper `<div>` per section that breaks the anchor ids; no
background band added to proof/about/services/booking; no second accent colour; no
`border-radius` change on any existing element; no icon added to a heading; no section
numbering, eyebrow, or micro-label above any `h2`.

---

## Dial values

Measured on the 1–5 scale; the 1–10 equivalent is given for the skill's own references.

| Dial | 1–5 | ≈1–10 | Reasoning |
|---|---|---|---|
| DESIGN_VARIANCE | **2** | 4 | Preserve-and-extend of an existing symmetric page. Variance here would mean restyling, which is forbidden. The only asymmetry the page gets is the 1:3 proof row and the 2-column booking split, both structural rather than decorative. |
| MOTION_INTENSITY | **1** | 2 | Zero new motion. Static document; the only animation on the page is the pre-existing confirmation-panel fade, untouched. No scroll reveal, no hover lift, no transition on cards, links, or the switcher. |
| VISUAL_DENSITY | **2** | 4 | Airy, text-first, generous whitespace, short sections, 16px body, one sentence per card. Density is carried by rhythm (`space-12` section padding) not by boxes; the only insets are the three service cards, the booking card, and the contact band. |

---

## Checklist (Coder self-verification)

Run every line before handing off. Each is checkable, not a matter of taste.

**Tokens and scope**
- [ ] `git diff src/index.css` is empty: **no new custom property**, no token value changed.
- [ ] No hex literal, no `rgba()`, no `px` font-size, no new `@media` breakpoint other than 641px and 900px in the rules this spec adds.
- [ ] Every `var(--…)` used in new or changed rules resolves to a `:root` entry in `src/index.css`.
- [ ] No new dependency in `package.json`; no icon package; no font file; no image file.

**Bans**
- [ ] `grep -rn '<s>\|line-through\|<del>\|<strike>' src/` → no output.
- [ ] `grep -rn 'free-banner\|carousel\|pricing--free\|pricing__was\|pricing__free\|pricing-note\|pricing-example' src/` → no output.
- [ ] Rendered page body copy contains exactly one `—` (inside `booking.narrativePaid`); zero `–`.
- [ ] No `img` or `svg` inside `#services`, `#proof`, `#about`.
- [ ] No `button` inside `#services`; no element with class containing `carousel`.
- [ ] No `text-transform: uppercase`, no eyebrow label, no section number, no `·` separator outside `booking.priceLine`.
- [ ] No `overflow-x` container anywhere on the landing.

**Mobile, 390×844 (primary breakpoint, both locales)**
- [ ] Hero including nav measures ≤560px: headline, subtext, both CTAs and the microcopy are all visible without scrolling.
- [ ] H1 reads in 3–4 lines (EN) / ≤5 (ES) at 32px; no one-word final line.
- [ ] Primary CTA is on the first CTA row in both locales; ES secondary wraps to a second centred row without clipping.
- [ ] Three service cards all visible, stacked, no horizontal scroll.
- [ ] Booking section is one column; the `.booking-card` is full content width, not a 155px sliver.
- [ ] Money line is the first line of the card in both modes; free mode shows exactly one sentence about money.
- [ ] Footer's `© …` line wraps under the brand instead of colliding.

**Breakpoints**
- [ ] 375 / 768 / 1440 all render exactly three `article.service-card`; 1 column ≤640, 2 at 641–899, 3 ≥900.
- [ ] At 1440 every section's left edge aligns (services heading, proof rows, about name, booking narrative) at the same x.
- [ ] At 900px each proof item is one line; at 1280 the hero headline is 3 balanced lines.

**Accessibility**
- [ ] Exactly one `h1`; `h2` = 5 (services, proof, about, booking, contact); `h3` = 3 (service cards). No skipped level.
- [ ] Every CTA is an `<a>`; the language switcher is still `role="group"` with `aria-pressed`.
- [ ] Tab order shows a visible ring on: brand, 3 nav anchors, both lang buttons, both hero CTAs, 3 proof rows, 2 about links, the contact CTA, every booking input/chip/pill, the submit button. One shared rule is enough: `a:focus-visible, button:focus-visible { outline: 2px solid var(--color-zinc-900); outline-offset: 2px; }`
- [ ] Contrast: body/muted text `--color-zinc-600` on white 7.8:1; the 13px microcopy `--color-zinc-500` on white ≈4.8:1; white on `--color-zinc-900` pills ≈16:1. No muted text below 4.5:1.
- [ ] `prefers-reduced-motion` behaviour is unchanged from today: nothing new to gate, nothing removed.
- [ ] Nav anchor clicks land the heading below the sticky nav (`scroll-margin-top` in place).

**Behaviour preserved**
- [ ] Nav still renders exactly three `#` anchors plus the brand and the switcher; no new nav entry.
- [ ] `.landing`'s first element child is `nav.nav` in both billing modes.
- [ ] The confirmation panel, the reschedule flow and the consent notice are visually untouched.
