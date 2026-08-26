# Design Spec: 001-landing-booking

## Design Read

Reading this as: **solo-consultant landing + booking conversion page for Spanish-first
small-business clients, in an OpenAI-style editorial monochrome storytelling language**
(white ground, near-black type, imagery carries the only color), built as a custom token
system on the existing React 19 + Vite + TS SPA, Geist type, restrained Motion fades.

### Read of the reference screenshots (openai.com, captured 2026-08-26)

- **openai-01-hero.png**: centered bold headline on pure white; one large soft-rounded
  interactive input below it (the product IS the hero, usable not decorative); a row of
  pill quick-link chips under that. Zero chrome color; hierarchy comes from weight and
  scale only.
- **openai-02-story-cards.png**: asymmetric editorial grid. Dominant ~2/3 feature card
  (full-bleed image, display type), headline sits BELOW the image, meta line under it
  (category, read time). Right rail of stacked smaller cards, same image-headline-meta
  anatomy. No borders, no shadows: whitespace does the separating.
- **openai-03-business-stories.png**: section header with a right-aligned action link;
  three image cards in a row, headline below each, meta line under that. Brand-colored
  imagery carries all the color on the page.
- **openai-00-full-page.png**: monochrome chrome end to end; plain bold section headers;
  five distinct section layout families down the page; a light-grey full-width closing
  CTA band; multi-column footer with a language pill bottom-right.

**Patterns stolen** (structure only, never OpenAI branding): product-as-hero with a real
interactive element; editorial story cards with meta lines; asymmetric feature + rail;
full-width closing CTA band; pill chips for nav and the language switcher.

## Dial Values

- **DESIGN_VARIANCE: 5** — OpenAI storytelling is disciplined editorial, not chaotic.
  Visual interest comes from one asymmetric feature card and whitespace, not wild
  layouts. Below the 8 baseline because trust and conversion (booking) demand calm.
- **MOTION_INTENSITY: 3** — the reference is nearly static: hovers and gentle fades only.
  A payment flow must feel stable, not animated. Below the 6 baseline for the same trust
  reason; also keeps `prefers-reduced-motion` coverage trivial.
- **VISUAL_DENSITY: 3** — airy editorial with generous whitespace, matching the
  reference. The only dense surface is the booking widget form, which stays single-column.

## Design System / Foundation

No design system is named in the brief, so the aesthetic is labeled honestly:
**"OpenAI-style editorial monochrome"** — a small custom token system (CSS custom
properties or Tailwind theme tokens, Coder's choice within the existing Vite SPA), no
component library, no shadcn/Material. Motion via `motion/react` (Motion) only; no GSAP,
no WebGL. Icons via Phosphor.

## Global Tokens

- **Font:** Geist Sans (self-hosted via `@fontsource-variable/geist`), weights 400/500/
  600/700; Geist Mono for meta lines and small labels. Fallback `system-ui`. Full
  Spanish diacritics coverage (á é í ó ú ñ ü ¿ ¡). No serif anywhere.
- **Accent color:** Emerald `#059669` ("booking green"). Used ONLY for: free-hour badge,
  price emphasis, focus rings, success state, link hover. Saturation within limits; not
  purple, not neon.
- **Primary action color:** near-black `#18181B` pill with white text (reference-faithful
  monochrome chrome; never pure `#000000`).
- **Neutral base:** Zinc family. Background `#FFFFFF`, text `#18181B`, secondary text
  `#52525B`, borders `#E4E4E7`, CTA band / widget surface `#FAFAFA`. One gray family
  only, no warm/cool mixing.
- **Corner-radius system:** documented mixed rule, locked: buttons, chips, switcher and
  the language pill are full-radius (pill); cards and inputs are 16px; images are 12px.
  Nothing else gets a radius.
- **Theme:** light, locked. No dark mode in v1; tokens defined so a later dark theme can
  be added without renaming.
- **Icon library:** Phosphor (`@phosphor-icons/react`), Regular weight. No hand-rolled
  SVG paths, no Lucide.
- **Motion tokens:** enter = opacity 0 to 1 + 8px rise, 400ms ease-out, once per section;
  hovers 150-200ms; `:active` on CTAs `scale-[0.98]`. Everything wrapped in
  `prefers-reduced-motion: reduce` (motion off, states still visible).
- **Em-dash rule (global, hard):** zero em-dashes or en-dashes in any user-facing
  string, in BOTH locales. The catchphrase direction ("Forget your Excel — let's
  automate...") is realized with a period: ES "Olvídate de tu Excel. Automatiza, con o
  sin IA." / EN "Forget your Excel. Let's automate, with or without AI." Exact wording
  stays flexible per the informal spec; the dash does not survive.

## Per-Task Directives

### Task 001: i18n dictionary + language switcher

- **Layout:** switcher is an "ES | EN" segmented pill in the top nav, right-aligned,
  visually identical to the reference's pill chips (16px inner padding, `#E4E4E7`
  border, active side `#18181B` background + white text). No second switcher instance.
- **Components:** typed i18n provider (dictionaries typed so a key missing from either
  locale is a compile error), switcher pill, `localStorage` persistence (key
  `rexi-locale`).
- **Typography:** identical type tokens for both locales; ES strings run roughly 15-25%
  longer than EN, so no component may hard-code widths that assume EN length.
- **Motion:** static. Locale swap is instant, no transition theater.
- **A11y:** switcher is real buttons with `aria-pressed`; `document.documentElement.lang`
  syncs to the active locale; focus ring 2px emerald with offset.
- **Anti-patterns to avoid:** flag emoji as language icons (flags are not languages);
  hardcoded strings leaking into components; a first-paint flash of the wrong language.
- **Watch items (Coder must check):** stored locale must be applied synchronously at
  module init, before first render, so a returning EN visitor never sees ES flash;
  dictionary copy obeys the global em-dash ban; fresh visit defaults to Spanish.

### Task 002: Landing page content sections

- **Layout:** five distinct families, one each (satisfies the layout-repetition ban, no
  zigzag anywhere):
  1. **Hero** — centered manifesto (OpenAI hero pattern; the centered override is
     justified because the reference itself is a centered manifesto hero). Stack, max 4
     text elements: headline (catchphrase, max 2 lines), subtext (max 20 words), one
     primary CTA "Reserva tu hora" pill (near-black, arrow icon) anchoring to `#booking`,
     one secondary mailto CTA. No chip row, no eyebrow, no trust strip in the hero.
  2. **Services (`#services`)** — asymmetric editorial story grid: ONE feature card
     (SaaS, spans 2 columns, larger image) + three standard cards in a row (Webs, Apps,
     Consultoría). Card anatomy copied from the reference: image on top (12px radius),
     title, max-25-word description, small mono meta line. No card borders or shadows;
     whitespace separates. 4 items, 4 cells, no empty tile.
  3. **Booking (`#booking`)** — split: left column narrative (section headline, pricing
     rules, "how it works" in 3 short steps), right column the widget card (widget ships
     in task 011; the shell and narrative ship here). Headline and body stack
     vertically, no split-header with floating right paragraph.
  4. **Contact (`#contact`)** — full-width `#FAFAFA` CTA band (reference closing-band
     pattern): centered short headline, one line of body, one near-black mailto pill
     (`mailto:danielbueno76@gmail.com`).
  5. **Footer** — multi-column small links (zinc-600, 13-14px), RexiAI wordmark, no
     version strings, no locale/weather strips.
- **Components:** sticky-free top nav (anchors Servicios / Reservas / Contacto +
  switcher from task 001, single line, max 72px tall), hero, service story cards,
  booking split shell, contact band, footer.
- **Typography:** hero `text-4xl md:text-6xl tracking-tight` (catchphrase is 9-10 words:
  do NOT jump to text-7xl/8xl); card titles ~`text-xl font-semibold`; descriptions
  `text-base text-[#52525B] max-w-[60ch]`; meta lines Geist Mono `text-xs text-[#71717A]`.
- **Motion:** Motion (`motion/react`) only. Sections fade+rise once on enter
  (`whileInView`, once). Card images brighten/scale 1.02 on hover, 200ms. CTA active
  press `scale-[0.98]`. No parallax, no marquees, no scroll hijack.
- **A11y:** all text AA against white (zinc-600 minimum for body, never lighter);
  images carry real alt text; anchors keyboard-reachable with visible emerald focus
  rings; all motion under reduced-motion guard; mobile collapse explicit per section
  (services grid 1-col, booking split stacks narrative above widget, nav condenses to
  anchors + switcher only).
- **Anti-patterns to avoid:** three-equal-cards row (the 1+3 asymmetric grid replaces
  it); em-dash in the catchphrase (period, per global rule); a fake "prompt box" or any
  div-built fake product UI in the hero; AI-purple gradients; eyebrows above section
  headers (zero on this page; the reference uses plain bold headers); duplicate CTA
  intent (ONE booking label and ONE contact label, reused verbatim in nav, hero,
  booking section, and contact band); hero overflow or >4-element hero stack.
- **Watch items (Coder must check):** hero must fit the initial viewport at desktop
  with CTAs visible without scroll; verify the ES headline does not wrap to 3 lines at
  `text-6xl` (drop to `text-5xl` if it does); images: no image-generation tool exists
  in this environment, so service cards use seeded placeholders
  (`https://picsum.photos/seed/rexiai-saas/800/600`, `-webs`, `-apps`, `-consulting`)
  and real work photography is a pre-launch TODO to hand back to Daniel; at least two
  service cells must carry visual variation beyond white-on-white (the photos satisfy
  this once real, keep the placeholder tint varied meanwhile); old capabilities/repos
  sections fully removed; stable anchor ids `#services`, `#booking`, `#contact`.

### Task 011: Booking widget UI

- **Layout:** single-column form flow inside the right-column card (16px radius, white
  surface, `#E4E4E7` border, zinc-tinted soft shadow): date picker, then slot chips,
  then duration, then email, then submit. Pricing-rules note sits directly above the
  form inside the card. Left column (task 002 shell) carries the narrative.
- **Components:** styled native `date` input (min = today, Europe/Madrid); available
  slots rendered as pill radio chips (fieldset + legend, one per slot start);
  duration as a segmented control offering exactly 1h/2h/3h/4h; email input with label
  ABOVE, helper text below the label, inline error BELOW the input; full-width
  near-black pill submit ("Reservar y pagar", one line at desktop); localized
  pricing-rules text ("primera hora gratis para clientes nuevos, después 30 EUR/hora")
  plus a static example line (1h gratis · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR) — display
  only, never computed client-side.
- **Typography:** labels 14px medium `#18181B`; helper 13px `#52525B`; errors 13px
  `#B91C1C`; slot chips 14px; all inside the card at AA contrast against white.
- **Motion:** slot loading = skeleton pills matching final chip shape (shimmer, no
  spinner); chip selection 150ms background transition; submitting state = button
  disabled with label swap ("Redirigiendo a Stripe..."). All under reduced-motion.
- **A11y:** every input labeled, errors tied via `aria-describedby`; chips are real
  radio inputs; focus rings 2px emerald; error and helper text pass AA; submit never
  white-on-white; `:active` press feedback on chips and submit.
- **Anti-patterns to avoid:** circular spinner for slot loading; placeholder-as-label;
  client-side price math (the Stripe page is authoritative per the task spec; the
  widget shows rules text only); dead-end error states; auto-submitting on selection.
- **Watch items (Coder must check):** empty-slot day renders a composed empty state
  ("Sin huecos ese día. Prueba otra fecha.") not a blank area; API 409 conflict renders
  an inline contextual error on the slot area; invalid email / missing fields block
  with inline feedback and zero network request (AC-011-05/06); card keeps stable
  min-height across locales so ES copy does not shift layout (CLS); redirect uses the
  returned `checkoutUrl` exactly.

### Task 012: Post-payment result views

- **Layout:** full-viewport (`min-h-[100dvh]`) centered single-column calm view: icon,
  headline (max 2 lines), one short body paragraph, one action pill. Same light theme
  and tokens as the landing; no section inversion.
- **Components:** success view (`/booking/success`): emerald check-circle icon
  (Phosphor), localized confirmation copy (booking received; confirmation arrives by
  email/calendar), one near-black pill returning to the landing (`/` or `#booking`).
  Cancel view (`/booking/cancel`): neutral Phosphor arrow-counter-clockwise icon,
  localized cancellation copy, one pill returning to `#booking`. Plain pathname checks,
  no router dependency.
- **Typography:** headline `text-3xl md:text-4xl tracking-tight`; body `text-base
  text-[#52525B] max-w-[48ch]` centered.
- **Motion:** static, or a single 300ms fade-in. Nothing else.
- **A11y:** AA contrast, visible focus on the action pill, `lang` attribute still
  synced by the task-001 provider, copy from the dictionaries (both locales complete).
- **Anti-patterns to avoid:** dashboard-style "order summary" panels; dead-end views
  with no action; theme inversion for the cancel view; fake transaction details the
  SPA does not actually have.
- **Watch items (Coder must check):** both paths must render standalone on a cold load
  (Stripe redirects here directly, user may land with no prior state); cancel action
  must land on the booking section, not just the top of the page; no em-dashes in
  result copy in either locale.

## Out-of-scope tasks

Tasks 003 (availability config loader), 004 (pricing calculator), 005 (free-hour
eligibility), 006 (availability API), 007 (booking creation API), 008 (Stripe webhook),
009 (Google Calendar events), 010 (operator email), 013 (deployment wiring and env
config) have no frontend surface and receive no design directives.
