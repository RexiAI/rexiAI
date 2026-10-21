# Design Spec: 003-booking-comms-polish

## Design Read

Reading this as: trust-first transactional email + in-app confirmation polish for a
Spanish consulting booking product (operator + client audiences), with a calm,
professional, receipt-like language, leaning toward the repo's existing zinc/white
token system (SPA) and hand-built, email-client-safe HTML (emails) in the same zinc
DNA. Redesign mode per skill Section 11: **preserve** - modernise structure and CTA
hierarchy only; brand tokens, copy voice, IA and accessibility wins stay.

Surface split: Tasks 1-3 are email design surfaces (visual output, but the URL
mechanics, escaping pipeline and mode-propagation are engineering contracts already
pinned in `10-tasks.md`; this file owns only copy, hierarchy and styling). Tasks 4-5
are browser product UI. No task in this spec is fully out of design scope; nothing
in the spec is a landing page, so Section 10's hero vocabulary does not apply and is
honestly labeled below.

Research note (owner's explicit ask, honored): the informal-spec digest (Postmark /
Moosend / Mailjet / Unione) was deepened live on 2026-10-21 via web search; additional
sources used below are Sender's 2026 email-design guide, Stripo's 2026 CTA guide,
Litmus's bulletproof-button guide, Mailsoftly's 2026 rules, Sendlayer's transactional
design guide, Enchant's 2026 accessibility/dark-mode guide, and one LinkedIn email-
marketing voice (Emily Ryan, CTA-contrast tip; her full feed is auth-walled, the
search excerpt is what informed us). Each major decision carries its source inline.

## Dial Values

- DESIGN_VARIANCE: 4 - trust-first, regulated-ish signal ("professional, calm tone" +
  zero-billing constraint). Transactional emails are single-column documents; the
  skill's Section 1.A maps "trust-first" to 3-4. Not 1-2: the restructure still needs
  a visible hierarchy lift vs today's flat `<br/>` line list.
- MOTION_INTENSITY: 2 - email clients support none (and lean HTML is a deliverability
  rule, Sendlayer); the SPA panel keeps spec-002's existing gated one-shot entrance
  and nothing is added. Preserve, do not extend (skill 11.C).
- VISUAL_DENSITY: 3 - key facts at top with generous whitespace (Mailjet "itemized
  summary" + Moosend "key info first"); 3-5 fact rows max, no marketing blocks, no
  filler sections.

## Design System / Foundation

No external system is installed and none should be: emails are hand-built HTML
through the existing `escapeHtml`/render pipeline (constraint: no new deps, no
web fonts, no images, no background images - Sendlayer/Mailsoftly). The SPA keeps
the repo's existing zinc/white token system from `src/index.css` (`:root` variables),
which spec-002 already established for the confirmation panel (skill 11: redesign -
preserve: extract brand tokens, don't replace them). Email styling mirrors the SPA's
zinc scale in inline hex so the customer's email looks like the product page.

## Global Tokens

- Font (email): `Arial, Helvetica, sans-serif` web-safe stack, explicit (Sender:
  never let the email fall back to Times). SPA panel: existing site font stack,
  unchanged.
- Accent color: `#18181b` (zinc-900) as the single action color: primary button
  background, headings. Secondary link `#52525b` (zinc-600). Warning lead
  `#b91c1c` (red-700). No other accents.
- Neutral base: zinc scale already in `src/index.css` - outer `#fafafa`
  (zinc-50), card `#ffffff` (white, matches existing tokens; it is the established
  base, skill 11.C says preserve wins), hairline `#e4e4e7` (zinc-200), body text
  `#18181b`, muted text `#52525b`/`#71717a`. No pure-black anywhere.
- Corner-radius system: soft, mirroring the repo scale - email card 16px
  (radius-lg), email button 12px (radius-md). SPA untouched (its `--radius-full`
  pills are the existing DNA). One system, email echoes the SPA tokens.
- Theme: light card for both emails, engineered to survive dark-mode inversion
  (solid bgcolors on every surface, no color-dependent-only meaning, no transparent
  assets - Sender/Enchant dark-mode rules). SPA: existing theme behavior, unchanged.
- Icon library: none. Zero icons/images in email (no external assets constraint);
  the SPA panel keeps its text-only design. This is deliberate, not a gap.
- Dash policy: no `—` or `–` in ANY string this spec introduces - dictionary copy is
  hard-banned by AC-001-05; email copy follows the skill's 9.G ban for discipline.
  Locked strings below use commas, colons, periods and plain hyphens only.

## Per-Task Directives

### Task 1: Google Calendar TEMPLATE link builder

- Layout: N/A (URL builder). Engineering contract already pinned in `10-tasks.md`
  (param order `action,text,dates,details`, UTC `YYYYMMDDTHHMMSSZ` pair, env tz
  chain, `encodeURIComponent`); nothing here changes it.
- Components: pinned copy inputs the builder must be called with, byte-exact, so
  Tasks 2-3 and their tests agree:
  - `text` (event title): `Sesión con RexiAI`
  - `details`: `Enlace de acceso a la sesión: {joinUrl}` (decoded details must
    contain the join URL - AC-003-10/15/22)
- Typography: n/a.
- Motion: n/a.
- A11y: n/a; calendar title is descriptive, no time-agnostic gibberish.
- Anti-patterns to avoid: do not stuff booking facts into the event title (Google
  already renders the date range); do not add `location`/`ctz`/`trp` params
  (Decision 7 bans extras).
- Watch items (Coder must check): title/details are the exact strings above; any
  divergence breaks AC-003-13 byte-determinism intent.

### Task 2: Operator reservation email (billing-disabled, Spanish)

- Layout: single-column transactional document stack, 600px max card - subject →
  preheader → wordmark → H1 → (conflict block if set) → facts table → primary CTA →
  secondary CTA → footer. Key facts BEFORE the CTAs in document order
  (AC-003-15; Mailjet "itemized summary is the core"; Sendlayer "don't bury the
  thing the email exists to deliver"). The subject names what happened and carries
  the searchable slot identifier (Sendlayer "include the identifier people search
  their inbox for" - here date+time, not a long attacker-controlled email).
- Locked strings (exact; every one passes the banned-stem screen in Task 2/3
  criteria, contains no `—`/`–`, and no billing word in any language):
  - Subject: `Nueva reserva: {date} {startTime} ({tz})` (47 chars with the fixture
    values `2027-03-01 10:00 (Europe/Madrid)`; ≤50 per Postmark, front-loaded per
    Sender's 30-40-char mobile truncation rule).
  - Preheader (hidden `display:none` span at the very top of the html part):
    `Fecha, hora y enlace de acceso, listos para revisar.`
  - Wordmark: `RexiAI`
  - H1: `Nueva reserva recibida`
  - Fact rows (label → value): `Cliente` → escaped clientEmail; `Fecha` → date;
    `Hora ({tz})` → startTime, `{tz}` from `getConfiguredTimezone()` exactly as
    today's pinned label; `Duración` → `1 hora` when hours=1, else `{n} horas`
    (grammar-correct singular is disabled-variant-only; the enabled frozen line
    `${hours} horas` stays untouched).
  - Primary CTA label: `Unirse a la reunión`
  - Secondary CTA label (must stay byte-exact, pinned by AC-003-15):
    `Añadir a Google Calendar`
  - Conflict block lead: `ATENCIÓN:` ; body: `Conflicto de franja. Ya existe una
    reserva (id: {bookingId}) que solapa este horario. Revisa el calendario antes
    de la reunión.` (replaces today's "Revisar y reembolsar manualmente" -
    Decision 5: `reembols` banned; the warning survives with disabled-appropriate
    action language).
  - Footer: `RexiAI` wordmark repeat, `#71717a`, 13px, nothing else (no marketing).
- Components (hand-built HTML, inline styles only):
  - Outer `div` bg `#fafafa`; card `div` max-width 600px, width 100%, bg `#ffffff`,
    border 1px solid `#e4e4e7`, border-radius 16px, padding 32px 24px,
    font Arial stack 16px/1.5, color `#18181b`.
  - H1 24px bold (≈1.5x body per Sender's heading-to-body ratio, calm not loud).
  - Facts table: 2-column `table`, label cell `#52525b` 14px, value cell `#18181b`
    16px font-weight 600, row spacing 12px, ONE hairline above and below the table
    block (`border-top`/`border-bottom` 1px solid `#e4e4e7`), none between rows
    (skill 9.F: no per-row hairline strips; whitespace does the grouping).
  - Primary CTA = padding-based bulletproof button (Litmus pattern): `table>td`
    bg `#18181b`, radius 12px, padding 14px 24px, inner `a` color `#ffffff`,
    bold 16px, `text-decoration:none`, `display:inline-block`,
    href = joinUrl. Height ≥44px tap target (Mailsoftly/Enchant). White-on-#18181b
    contrast ≈16:1, passes AA/AAA.
  - Secondary CTA = plain underlined text link, 14px `#52525b`, href = Task 1
    builder output (attribute-escaped). Deliberately NOT a button: one primary CTA
    per email (Sender/Stripo/Mailsoftly), secondary visually subordinate
    (Enchant). ~16px below the button with whitespace.
  - Conflict block (when `slotConflictWith`): full-width `div`, bg `#fafafa`,
    border-left 4px solid `#b91c1c`, padding 12px 16px, placed directly under the
    H1 (prominence: it is the only surface for the overlap backstop). "ATENCIÓN:"
    in `#b91c1c` bold; body text `#18181b`. Meaning never color-only (a11y).
- Text part (same line order as the html reading order; values raw via
  `renderText`): `Cliente: {clientEmail}` / `Fecha: {date}` /
  `Hora ({tz}): {startTime}` / `Duración: {dur}` / `Enlace de la reunión: {joinUrl}` /
  `Añadir a Google Calendar: {calendarUrl}` / (conflict line last, same wording as
  the block body).
- Typography: one family, three sizes (24/16/14→13 footer), two weights. Email H1
  per mailsoftly hierarchy discipline; no ALL CAPS anywhere except the pinned
  `ATENCIÓN:` lead.
- Motion: static. No animations exist in email.
- A11y: contrast values above; single reading order; full plain-text alternative
  (the text part above - its absence is a spam signal per Sendlayer); no images so
  no alt-text debt; `rel="noopener"` on both anchors; escaped sinks (AC-003-16):
  every dynamic value, the calendar URL included, passes `escapeHtml` at its HTML
  sink (the URL's structural `&` becomes `&amp;` in the attribute), raw in text part.
- Anti-patterns to avoid (specific): no "¡Gracias por tu reserva 🎉" celebration
  noise; no marketing footer links (Unione: professional without marketing
  phrases); no em-dash; no second button competing with the join CTA; do not
  reintroduce `Importe`/`Reserva sin cargo` phrasing from the enabled era; no
  "gratis"/"gratuito" anywhere (Decision 4 - the free-ness is simply unstated).
- Watch items (Coder must check):
  1. AC-003-18 fact-set interpretation: the subject carries date + start time
     (+ tz label); duration and client identity live in the text and html parts.
     The falsy-join test's "subject ... contain the slot facts" must assert the
     facts the design puts in the subject (date/time), and all facts in text/html.
     This is Decision 11's design ownership, pinned here.
  2. Falsy joinUrl branch: omit BOTH CTAs and their text lines AND neutralize the
     conflict placement logic unchanged; keep facts; no throw (AC-003-18).
  3. The enabled-path builders (`amountLine`, `buildLines`, `buildBody`) must not
     be edited for this design - new disabled-variant functions only, so AC-003-19
     byte-identity holds.
  4. Outlook desktop renders the button with squared corners under the
     padding-based pattern (Litmus). Accepted constraint cost: hand-built + lean
     beats VML markup; still fully clickable, readable, on-brand.

### Task 3: Client confirmation email (billing-disabled, Spanish)

- Layout: same single-column 600px skeleton as Task 2 (shared chrome), order:
  subject → preheader → wordmark → H1 → reassurance line → facts table → primary
  CTA → secondary CTA → help line → footer. The client's ONLY join path is this
  email, so the CTA instruction is spelled out in plain words right under the
  headline (reassurance-first, Moosend: reassuring copy reduces support tickets).
- Locked strings (banned-stem clean, dash-free):
  - Subject: `Tu reserva está confirmada: {date} {startTime}` (44 chars with
    fixture; "say what happened" per Sendlayer, ≤50 per Postmark, searchable
    identifier = the slot).
  - Preheader: `Los detalles de tu sesión y cómo entrar, en este correo.`
    (extends the subject, does not repeat it - Enchant).
  - H1: `Tu reserva está confirmada`
  - Reassurance line (under H1, 16px `#52525b`): `Para entrar a la sesión, usa el
    botón de abajo a la hora indicada.`
  - Fact rows: `Fecha`, `Hora ({tz})`, `Duración` - same resolutions and the same
    grammar-aware duration rule as Task 2.
  - Primary CTA label: `Unirse a la reunión` (identical button spec as Task 2).
  - Secondary CTA label: `Añadir a Google Calendar` (byte-exact, pinned).
  - Help line (below the CTAs, hairline separated): `¿Dudas o necesitas cambiar la
    hora? Responde a este correo.` (Sendlayer: a real reply route, no no-reply
    dead-end; the owner's mailbox answers).
  - Footer: `RexiAI` wordmark, `#71717a` 13px.
- Components: byte-identical button/link/table CSS specs to Task 2 (one design,
  two variants; the Coder may share a private block builder between Tasks 2-3
  disabled variants only - zero leakage into the enabled functions).
- Text part: `Tu reserva con RexiAI está confirmada.` / `Fecha: {date}` /
  `Hora ({tz}): {startTime}` / `Duración: {dur}` / `Enlace de la reunión: {joinUrl}` /
  `Añadir a Google Calendar: {calendarUrl}` / `¿Dudas? Responde a este correo.`
- Typography: same scale as Task 2. The service framing for the client is ONE
  calm sentence, not a positioning paragraph (skill 11.C: preserve voice; the
  product's voice is direct and human, see dictionary `hero.subtext`).
- Motion: static.
- A11y: same as Task 2; plus `assertClientSenderUsable` keeps failing loudly
  (design cannot hide the sandbox-sender condition from the operator - AC-003-26).
- Anti-patterns to avoid (specific): no fake urgency, no "we're excited to", no
  upsell, no promises the product doesn't keep (do NOT write "recibirás un
  recordatorio" - no reminder exists; do NOT claim environment prerequisites
  like "solo necesitas un navegador" - the owner's Brave/camera diagnostics are
  explicitly out of scope, don't re-open that wound in copy).
- Watch items (Coder must check):
  1. Same AC-003-24 subject-facts interpretation as Task 2 watch 1.
  2. Falsy joinUrl: both CTAs + their text lines omitted; the reassurance line's
     wording under a no-CTA state may drop the "botón de abajo" reference (defensive,
     unreachable via direct path; if kept it is a known cosmetic edge, not a defect -
     no scenario pins the preheader or reassurance in that branch).
  3. Enabled `buildClientLines`/`billingModelLines`/`buildClientBody` untouched
     (AC-003-25 byte-identity).

### Task 4: Billing-aware in-flight submit copy (es + en dictionary)

- Layout: none - label-only change inside the existing `.booking-submit` button
  (`BookingLayout.tsx:68-74` selection logic). Button visual DNA (pill, zinc-900,
  600 weight) untouched.
- Components (exact dictionary diff):
  - ADD `booking.form.submittingDirect` (key name per Decision 10's freedom):
    - es: `Enviando tu reserva...`
    - en: `Sending your reservation...`
    - existing `booking.form.submitting` stays byte-identical for the enabled path.
  - Selection: `fields.submitting ? (billingEnabled ? dict.booking.form.submitting
    : dict.booking.form.submittingDirect) : (billingEnabled ? dict.booking.form.submit
    : dict.freeMode.submit)` - the fail-safe default (`useSiteConfig` defaults
    `billingEnabled: true` when `/api/config` is unreachable) therefore keeps the
    Stripe wording automatically, satisfying AC-003-29's edge.
- Typography: existing button scale; copy is 23/25 chars, no wrap risk on the
  full-width button.
- Motion: none added (MOTION 2). The submitting state has no spinner today; do not
  add one - no CSS churn beyond the label.
- A11y: label swap on a `type=submit` button that is `disabled` while submitting;
  screen readers announce the change on the button's accessible name; three-dot
  `...` (ASCII) matches the existing convention, no dash characters, AC-001-05
  stays green.
- Anti-patterns to avoid (specific): do not write "Procesando pago..." (implies
  money) or "Reserva gratuita" (banned stem even here - the SPA invariant is
  narrower but professional discipline applies); do not mention Stripe; do not
  invent a new status panel - the button is the existing status surface.
- Watch items (Coder must check): dictionary-only, both locales non-empty, zero
  extra network requests (AC-003-31: reuse the single `useSiteConfig` fetch; no new
  fetch call at submit time).

### Task 5: Revised web confirmation panel (BookingConfirmation.tsx)

- Layout family: preserve - in-place status panel inside the unchanged
  `.booking-card` chrome (spec-002 design language kept): `role=status` wrapper,
  h3 title (keeps auto-focus, `titleRef` preserved), two-row `dl` (Fecha / Hora),
  refreshed note line. Removal is the redesign: no join anchor (Ask D).
- Components (exact dictionary diff):
  - REMOVE `booking.confirmation.joinLink` from BOTH `es` and `en` (Decision 6 /
    AC-003-34).
  - KEEP byte-stable: `title` ('Reserva confirmada' / 'Booking confirmed'),
    `dateLabel` ('Fecha' / 'Date'), `timeLabel` ('Hora' / 'Time').
  - REFRESH `note` (the only copy that must change - the join path moved to
    email, and the note is the panel's job):
    - es: `Te hemos enviado la confirmación por email, con el enlace para unirte a
      la sesión.`
    - en: `We emailed your confirmation, including the link to join your session.`
  - Component change: delete the `confirmation.joinUrl ? <a>...` block; the
    `.booking-confirmation__cta` CSS rules (hover + focus-visible included) become
    dead styles and must be deleted with them (no dead/duplicated rules per repo
    CSS convention). `ConfirmationState.joinUrl` and the API shape stay (pinned).
- Typography: existing scale (title `--text-xl`/600, values `--text-sm2`, note
  `--text-sm`/zinc-600). Hierarchy reads: status → facts → next-step note. That is
  the calm professional order the owner asked for.
- Motion: existing 200ms reduced-motion-gated entrance kept (preserve a11y win;
  skill 6.B already satisfied). Nothing new.
- A11y: `role=status` announcement preserved; h3 focus preserved (tabIndex -1);
  removed CTA removes a tab stop - no regression for keyboard users; panel strings
  still match none of /billing|stripe|disabled|checkout/i (AC-003-33) - the new es
  note contains none of those and the en note contains "link"/"join" only.
- Anti-patterns to avoid (specific): do not replace the panel with a toast/modal
  (terminal in-place state is spec-002's established IA, skill 11.C); do not re-add
  any join affordance "just in case"; do not show the timezone in `timeLabel` (the
  panel has no tz source; the email carries it - inventing a config dependency for
  a label is scope creep).
- Watch items (Coder must check): AC-003-32/33 tests assert absence of the join
  anchor and its copy; the owner-authorized AC-002 test modifications are applied
  exactly as scoped in `10-tasks.md` §Global context and recorded in the PR body
  (stage 2/5b duty, restated so it is not lost); dictionary `_check` shape guard
  stays green (remove the key in BOTH locales).

## Out-of-scope tasks

None of the five tasks is fully outside this design - but the non-design engineering
surfaces the owner pinned and this file must not alter are: Task 1's URL mechanics
(param order/encoding/env-chain, `10-tasks.md` + Decision 7), Tasks 2-3's escaping
and mode-propagation contracts (AC-016/AC-018/AC-002 pins), the billing-enabled
variants of both emails (byte-for-byte frozen; every design decision above applies
to the disabled variants only), the direct-path API response shape, and the
`freeMode` banner/submit copy established by spec 002 (its `GRATIS` badge lives in
the SPA banner, not in any email, and is untouched by the banned-stem set which
targets disabled-mode emails).
