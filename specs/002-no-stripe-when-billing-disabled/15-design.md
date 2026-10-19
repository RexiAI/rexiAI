# Design Spec: 002-no-stripe-when-billing-disabled

Mixed surface: Tasks 1 and 3 have no frontend component (see Out-of-scope tasks at the
bottom). The design directives below apply to **Task 2 only**.

## Design Read
Reading this as: an in-place transactional confirmation state inside the existing RexiAI
booking card (product UI on a Spanish consultancy landing page) for a prospect who just
booked a free session, with a calm trust-first language that must be indistinguishable
from the existing zinc/white token system - an extension, not a redesign.

## Dial Values
- DESIGN_VARIANCE: 5 - not the baseline 8. This panel lives inside a shipped, conservative,
  token-driven single-column card; a high-variance move at the exact moment trust is won
  would read as "different product". The in-app-extension row of the dial table (match
  existing) governs: existing variance is conventional, so 5 (near-symmetric, one small
  character move: the dl term/value pairing and full-width pill CTA).
- MOTION_INTENSITY: 3 - the app's entire motion vocabulary is one 150ms background
  transition (`.slot-chip`). The only honest motion moment is the form-to-panel swap:
  one quiet entrance, transform + opacity, 200ms, once, no loops. At 3 reduced-motion is
  not mandatory per skill 6.B, but it is gated anyway (cheap, correct).
- VISUAL_DENSITY: 3 - the panel replaces a pricing block plus four fields with one title,
  two data rows, one CTA and one note. Card chrome (padding, border, radius) stays
  identical so the widget footprint does not re-skin; content is airier because there is
  less of it.

## Design System / Foundation
Existing in-repo system: native CSS plus the custom token layer in `src/index.css :root`
(zinc neutrals, space scale, radius roles, text scale), BEM-ish global classes, styles
appended to `src/components/BookingWidget.css`. No install, no new dependency (spec
constraint forbids one anyway). Honest label per skill Section 2: this is not Tailwind,
shadcn, or a named system - it is the repo's own native-CSS token practice, and the only
correct choice for an extension of a shipped component. All skill references to GSAP /
Motion / Three.js are rejected for this task: vanilla CSS keyframes/transition match the
existing idiom and the no-deps constraint.

## Global Tokens
- Font: existing system stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
  'Helvetica Neue', Arial, sans-serif`), no webfont introduced.
- Accent color: `#18181b` zinc-900 (existing brand action color, via `--color-zinc-900`).
  `--color-green-600` (#059669) stays reserved for free-mode pricing copy and does NOT
  enter the confirmation panel; no new accent is introduced.
- Neutral base: existing zinc scale - `--color-zinc-900` values/title, `--color-zinc-600`
  labels/notes, `--color-zinc-500` de-emphasized, `--color-zinc-200` hairlines if needed,
  `--color-white` card surface. No new hex values anywhere.
- Corner-radius system: existing role-based radii, unchanged: `--radius-full` (9999px) =
  interactive controls (CTA pill matches `.booking-submit`), `--radius-lg` (16px) = card
  shell (outer chrome is not restyled), `--radius-md` (12px) = inputs (unused in panel).
- Theme: light, locked. The app ships light-only tokens and no `color-scheme` or
  dark token layer; one component must not flip modes mid-page. See Watch item 9.
- Icon library: none. The existing app renders zero icons; adding a checkmark SVG or an
  icon dependency for one state is slop and violates the no-new-deps constraint.

## Per-Task Directives

### Task 2: Frontend confirmation state when billingDisabled (AC-002-16, AC-002-17)
- Layout: inline state-swap confirmation panel reusing the existing `.booking-card`
  chrome (outer shell stays, only its contents change). No new layout family is
  introduced. Explicitly rejected from Section 10: Morphing Modal, Glassmorphism Panel,
  Parallax Tilt Card, and all scroll/hero patterns - a post-submit transactional state is
  not a marketing moment. Panel top-to-bottom: title, definition list (date, start time),
  join CTA, one note line.
- Components:
  - `BookingConfirmation.tsx` - new file under `src/components/booking/`, one component
    per file (repo rule), props `{ dict, confirmation }`.
  - `BookingLayout.tsx` - edit: render `BookingConfirmation` instead of the pricing block
    plus `<form>` when the confirmation state is non-null; outer `div.booking-card`
    remains in both branches.
  - `useBookingFields.ts` - edit: add `confirmation: { date: string; startTime: string;
    joinUrl?: string } | null` state plus its setter to the returned flat object (the
    hook signature `useBookingSubmit(fields, dict)` must not change - hook tests call it
    without JSX/providers).
  - `useBookingSubmit.ts` - edit: widen `BookingResponse` per tasks; in
    `handleBookingResponse` branch `res.ok && data.billingDisabled === true` BEFORE the
    checkoutUrl redirect: set confirmation from `fields.date` / `fields.selectedSlot` /
    `data.joinUrl`, touch nothing on `window.location`, set no error.
  - `BookingWidget.css` - edit: append `booking-confirmation` block (BEM), following the
    file's property-order comment (layout, box, typography, visual, animation).
  - `src/i18n/dictionary.ts` - edit: new `booking.confirmation` section in BOTH `es` and
    `en`.
- Typography: title `--text-xl` (20px) weight 600 `--color-zinc-900` - not `--text-2xl`
  or larger (hierarchy by weight plus color, not raw scale). `dt` terms `--text-sm`
  weight 500 `--color-zinc-600`. `dd` values `--text-sm2` (14px) weight 500
  `--color-zinc-900`, rendered verbatim as the submitted raw values (`2027-03-01`,
  `10:00` - scenario-pinned, no `Intl`/locale reformulation, no timezone suffix added).
  Note line `--text-sm` `--color-zinc-600`.
- Color usage: no section-level status color. Title and values stay neutral zinc. The CTA
  is the same visual DNA as `.booking-submit`: white `--color-sm2` 600-weight label on
  `--color-zinc-900`, full width, `--radius-full`, hover background `--color-zinc-600`
  with `transition: background 150ms` (mirrors `.slot-chip`), `:focus-visible` outline
  2px solid `--color-zinc-900` offset 2px, never `outline: none`.
- Motion: `.booking-confirmation` gets a one-shot entrance `opacity 0 to 1` plus
  `translateY(4px) to 0`, 200ms ease-out, gated behind
  `@media (prefers-reduced-motion: no-preference)`; animate transform and opacity only.
  No hover lift, no infinite loops, no scroll behavior.
- Copy (recommended, dictionary-owned, zero hardcoded strings in components, default
  locale `es` reads first):
  - `booking.confirmation.title` - es "Reserva confirmada" / en "Booking confirmed"
  - `booking.confirmation.dateLabel` - es "Fecha" / en "Date"
  - `booking.confirmation.timeLabel` - es "Hora" / en "Time"
  - `booking.confirmation.joinLink` - es "Unirse a la sesión" / en "Join the session"
  - `booking.confirmation.note` - es "Te hemos enviado la confirmación por email." / en
    "We have sent the confirmation to your email."
  Tone: match the existing es voice (short sentences, informal "tu", no exclamations, no
  emoji). Tasks require at least `title` and `joinLink`; `dateLabel`, `timeLabel`, and
  `note` are added because every visible string must come from the dictionary and bare
  values would need labels.
- Semantics/a11y: wrapper `<div className="booking-confirmation" role="status">` (same
  pattern as `FreeModeBanner`), polite SR announcement of the swap. Details as `<dl>` with
  `<dt>`/`<dd>`. Title is an `<h3 tabIndex={-1}>` focused once on mount via a ref plus
  `useEffect` so the keyboard user who just pressed Enter on the submit button does not
  lose focus when the form unmounts. CTA is an `<a href={joinUrl}
  target="_blank" rel="noopener noreferrer">` rendered only when `joinUrl` is present
  (the type makes it optional even though AC-002-16/17 always provide it).
- A11y contrast: white on zinc-900 is ~16:1 (CTA); zinc-900 on white ~16:1 (values,
  title); zinc-600 on white ~7.5:1 (terms, note). All clear WCAG AA. Nothing uses
  zinc-500 below `--text-xs`.
- Anti-patterns to avoid (specific to this task):
  - No green success box, check-circle emoji, animated checkmark SVG, or confetti. The
    app has zero icons; the confirmation must not become the one place it sprouts them.
  - Do NOT navigate to `/booking/success` and do NOT reuse the `result.*` dictionary keys
    (Documented decision 3: `result` is the Stripe-return voice and cannot show the join
    link). New `booking.confirmation` section only.
  - Do not leak internal-state words into user copy: "billing", "Stripe", "disabled",
    "checkout" must never appear in the panel.
  - Do not display `bookingId`, price, or amount lines (decision 4; free mode has no
    invoice to show).
  - Do not copy the existing hardcoded `'Error'` fallback pattern into the new branch;
    every new user-facing string goes through `dict`.
  - No em-dashes in any copy string (skill 9.G, hard ban).
- Watch items (Coder must check):
  1. `useResetOnDate` must not clear `confirmation` - verify its effect deps; the panel
     state is terminal for the session, not date-driven.
  2. Branch order in `handleBookingResponse`: enabled-path redirect must stay untouched
     and the existing `AC-011-04` test must pass unmodified (billingDisabled absent from
     an enabled response, so it falls through to the `checkoutUrl` redirect).
  3. Dictionary parity is a compile-time gate (`Dictionary = typeof es`,
    `en as unknown as Dictionary`): add all five keys to both locales or `tsc` fails.
  4. Traceability: AC-002-16 and AC-002-17 citations must live in a `*.test.ts` file
     (`.tsx` alone does not satisfy the gate).
  5. `joinUrl?: string` is optional in the type - guard the anchor, never render an
     empty `href`.
  6. Render the date/time values verbatim from the submitted fields; any formatting
     layer risks failing AC-002-17's pinned strings.
  7. jsdom `window.location.href` assertions: reuse the existing AC-011 test pattern for
     proving "never assigned" rather than inventing a new mock approach.
  8. The card will be shorter than the form after the swap. That height change is the
     intrinsic content swap, not a bug; do NOT lock min-heights to compensate.
  9. Theme gap, honestly recorded: skill 6.C wants dark mode on consumer surfaces, but
     this app ships light-only tokens and a single component must not half-introduce a
     second theme. If a dark mode ever comes to the repo, `booking-confirmation` styles
     must be re-checked then; nothing in this spec may flip the page to inverted colors.

## Out-of-scope tasks
- Task 1 (backend direct booking branch in `api/bookings/direct.ts` / `api/bookings.ts`):
  pure server logic, no visual surface. Only its response contract
  (`{ checkoutUrl: null, joinUrl, billingDisabled: true }`) is consumed, by Task 2.
- Task 3 (`.env.example` plus `docs/microsoft-cutover.md` cleanup): config and docs only,
  no visual surface.
