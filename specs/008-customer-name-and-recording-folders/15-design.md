# Design Spec: 008-customer-name-and-recording-folders

## Design Read

Reading this as: a required-field addition to the shipped RexiAI booking card
(trust-first product UI on a Spanish consultancy landing page) for a prospect
finishing a session request, with the same calm second-person Spanish voice and
the same zinc/white token system as the existing form, leaning toward the repo's
own native-CSS token layer (no external system, no new dependency).

Surface split: **Task 1** is the only browser-UI task. **Task 4** is a rendered
output surface (operator email) and gets copy/row-order directives, not styling.
Tasks 2, 3, 5, 6, 7, 8 have no visual surface and are out of scope (listed at
the end). Nothing in this spec is a landing page, so the skill's Section 10
layout-family / hero vocabulary does not apply and is not pretended below; the
skill's dials, consistency locks, and pre-flight still do.

## Dial Values

- **DESIGN_VARIANCE: 3** — this task makes almost no layout decision: the field's
  position is pinned by `10-tasks.md` inside a single-column form. Skill §1.A maps
  trust-first to 3–4; preserve-mode ("match existing") resolves to the shipped
  form's variance, which is minimum. Not 1: one deliberate character move survives
  — the new field becomes the one that hugs the submit button (see Task 1,
  "Interaction with the email field").
- **MOTION_INTENSITY: 1** — nothing animates. The app's whole motion vocabulary is
  a single 150ms background transition on `.slot-chip`. A field-level entrance
  would be the only animated form control and would push the submit button down
  (CLS). At 1, skill §6.B's reduced-motion gate is moot, which is the honest state,
  not a shortcut.
- **VISUAL_DENSITY: 4** — one more label + helper + input + error block stacked in
  a card that already holds five. The helper line is kept rather than dropped: the
  field asks for personal data, and an unexplained extra field at the moment of
  commitment costs more than one 13px line does.

## Design System / Foundation

Existing in-repo system only: native CSS plus the custom token layer in
`src/index.css` `:root`, BEM-ish global classes in
`src/components/BookingWidget.css`. **No install, no dependency** — honest label
per skill Section 2: this is not Tailwind, shadcn, or a named design system; it is
the repo's own native-CSS token practice, and it is the only correct choice for an
extension of a shipped component. GSAP / Motion / Three.js are rejected outright.

## Global Tokens

- **Font**: existing system stack
  (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`).
  Weights already in use: 400 body, 500 labels. No webfont.
- **Accent color**: `#18181b` zinc-900 (`--color-zinc-900`) — the form's action
  color. `--color-green-600` stays reserved for free-mode pricing copy and is not
  used on the name field.
- **Neutral base**: zinc — `#18181b` / `#52525b` / `#71717a` / `#e4e4e7` /
  `#fafafa` / `#ffffff`. Error red `--color-red-700` (`#b91c1c`) is the only status
  color.
- **Corner-radius system**: soft. Inputs `--radius-md` (12px), card
  `--radius-lg` (16px), chips `--radius-full`. The name input takes `--radius-md`
  via the existing `.booking-input` rule — **no new radius**.
- **Theme**: **light, locked**. There is no `prefers-color-scheme` block anywhere
  under `src/`; a one-field change is not where a theme system gets introduced.
- **Icon library**: none. This card uses no icons and the name field adds none. Do
  not introduce one.

## Per-Task Directives

### Task 1: Capture the customer name in the booking form

- **Layout**: single-column form stack, no wrapper element. Locked order:
  date → slots → duration → email → **name** → submit (position is pinned by
  `10-tasks.md`; the design consequence is that the identity pair `email` + `name`
  stays adjacent and the "who are you" cluster sits immediately before commit).
  `NameField` returns a fragment, exactly like `EmailField` — no `<div>`, no
  `<fieldset>`, no extra spacing container.
- **Components**: new `src/components/booking/fields/NameField.tsx` mirroring
  `EmailField.tsx` structure line for line: `<label htmlFor>` → `<p class="field-helper">`
  → `<input>` → `<span class="hidden-helper">` → conditional `<p class="field-error">`.
  Props: `{ name, setName, error }`. Copy comes from `useI18n()` inside the
  component, never from `BookingLayout`'s `dict` prop (matches `EmailField`).
- **Copy (lock these strings; Spanish is primary)**:

  | Key | `es` | `en` |
  |---|---|---|
  | `booking.form.nameLabel` | `Tu nombre` | `Your name` |
  | `booking.form.nameHelper` | `Así sabremos con quién es la sesión` | `So we know who the session is for` |

  Chosen to sit in the existing register: `Tu email` / `Usaremos este email para
  la confirmación`. The helper answers the only question a first-time visitor has
  ("why do you need my name?") without mentioning folders, Stripe, or the operator
  — the customer never needs to know about the recording pipeline.
  The required-field message is **not** a new key: reuse `dict.booking.form.required`
  (`Este campo es obligatorio` / `This field is required`), the same string email,
  date and slot already show. One error vocabulary for the whole form.
- **Required-state affordance**: **no asterisk, no "obligatorio" tag, no
  `required` attribute.** Date, slot, duration and email are all required today and
  none of them carries an indicator. Marking only the new field would silently
  announce that *email is optional*, which is worse than uniform silence. The
  affordance is the one the form already uses everywhere: submit, then a red
  message under the offending field. Form-wide required indication is recorded as
  a follow-up below — not improvised here.
- **Typography**: label 14px / 500 / zinc-900 (`.booking-label`), helper 13px /
  400 / zinc-600 (`.field-helper`), input inherits 16px (no iOS zoom, body has no
  `font-size` override), error 13px / 400 / red-700 (`.field-error`). **No new
  font sizes, no new weights.**
- **Interaction with the email field (the one real design decision here)**:
  `.booking-input--email` exists to make the *last field before the CTA* sit 4px
  above the button instead of 12px. Once `NameField` renders after `EmailField`,
  that intent moves — leaving the class on email would put the name label 4px
  under the email input, visually fusing the two fields into one block and reading
  as a sub-label of email. Required fix, in this order:
  1. `src/components/BookingWidget.css` — rename `.booking-input--email` to
     `.booking-input--last` (same declaration: `margin-bottom: var(--space-1)`).
     The old name would lie once a name input wears it.
  2. `EmailField.tsx` — `className` becomes `booking-input` (plus the error
     modifier when present); it is no longer adjacent to the CTA.
  3. `NameField.tsx` — `className` is
     `` `booking-input booking-input--last${error ? ' booking-input--error' : ''}` ``.

  Net visual result: email gets its standard 12px breathing room, the name field
  hugs the button at 4px, and the error-under-input rhythm (4px → 8px) is
  unchanged from what email+error did before. This is the only CSS change in the
  spec; anything more is a redesign and out of scope.
- **Input attributes**: `type="text"`, `id="booking-name"`, `autoComplete="name"`
  (real friction win: browser autofills a person's name reliably, unlike a
  generic text field). **No `placeholder`** — the form uses visible labels and a
  placeholder would duplicate the label and risk contrast failure. **No
  `maxLength`** while open question 5 in `10-tasks.md` is unanswered; do not
  invent a bound. **No `autoFocus`** — date is the first field and stealing focus
  on load is a mobile-keyboard hijack.
- **Motion**: static. No entrance, no highlight, no shake on error. The error
  message appearing pushes the submit button down ~21px, exactly as the email
  error already does; that pre-existing shift is accepted, and must not be
  "fixed" by absolutely positioning the message (it would overlap the button).
- **A11y**:
  - `<label htmlFor="booking-name">` — a visible label, never placeholder-as-label.
  - `aria-describedby={error ? 'err-name' : 'help-name'}` — the swap is the
    existing pattern; both ids must be `-name` suffixed. Copying `help-email` /
    `err-email` verbatim produces duplicate ids in the document and breaks the
    association for both fields.
  - Error `<p id="err-name" className="field-error">` — spelled-out message, not
    colour alone (the border colour change is redundant reinforcement, which is
    correct).
  - Contrast on white: 14px/500 zinc-900 label ≈ 17.7:1; 13px zinc-600 helper ≈
    7.7:1; red-700 error ≈ 6.5:1. All pass AA, and all three pass AAA at body
    size. No new colour is introduced, so nothing new can regress.
  - Keyboard: normal tab order lands name between email and submit; Enter submits
    (single implicit submission, unchanged).
- **Validation behaviour** (design contract on top of the pinned criteria):
  - Trim before the emptiness test: `v.name.trim() === ''` → error. A bare
    `!v.name` fails AC-008-02 (whitespace-only name) — this is the single most
    likely way to break an acceptance scenario in this task.
  - No live/on-blur validation for the name. Errors appear on submit and persist
    while typing until the next submit, which is how every other field behaves.
  - Do not disable the submit button while the name is empty. A disabled button
    with no explanation is a dead end; the form's contract is "submit, then tell
    me what is wrong".
  - Preferred, non-blocking: post `fields.name.trim()` so the stored, emailed and
    folder-derived value equals what the user sees. The server trims again
    (Task 2), so this is parity, not a correctness requirement.
- **Anti-patterns to avoid (specific to this task)**:
  - Asterisk / "(obligatorio)" on the name field only — the trap described above.
  - Splitting into `nombre` + `apellidos`: two more required fields, two more
    error states, and the folder key only needs one string. YAGNI.
  - A different error message for name (`Introduce tu nombre`) — breaks the single
    error vocabulary.
  - Placeholder text (`Tu nombre`, `Ana López`, `Jane Doe`) — label duplication,
    and a sample name in a field that names a folder invites garbage data.
  - Wrapping `NameField` in a `<div>` with its own margins — the rhythm is owned by
    `.booking-input` / `.field-helper` margins; a wrapper double-spaces the block.
  - Inline `style={{}}` (docs/CODING_CONVENTIONS.md §HTML/TSX) — class names only.
  - Animated focus ring, floating label, or icon inside the input: none of these
    exist in the form, and each would make the new field the odd one out.
- **Watch items (Coder must check)**:
  1. **`en` is not type-checked.** `I18nContext.tsx` does
     `{ es, en: en as unknown as Dictionary }` and `dictionary.ts` declares
     `Dictionary = typeof es`. A missing English key therefore **compiles clean**
     and renders `undefined` in English at runtime. Add `nameLabel` and
     `nameHelper` to *both* objects and verify by switching the locale, not by
     trusting `tsc`.
  2. The errors key must be exactly `'name'` (lowercase, no prefix) —
     `BookingLayout` reads `fields.errors['name']`.
  3. `booking-input--last` rename: all three sites (CSS rule, `EmailField`,
     `NameField`). Two of three leaves either a stray 4px gap or a dead rule.
  4. Pre-flight check "no em-dashes in copy": the Spanish and English strings
     above contain none; do not let a translator-style gloss reintroduce one.
  5. Copy self-audit in both locales — read the rendered field in `es` *and* `en`
     (the `nameHelper` string is the one most likely to be left English in the
     Spanish dictionary).

### Task 4: Show the customer name in the operator email (domain)

- **Layout**: one additional fact row, immediately above the existing `Cliente`
  row, in both the billing-enabled (`buildLines` → `renderHtml`, plain
  `Label: value` lines) and billing-disabled (`buildDirectOperatorBody` →
  `tableHtml`, two-column rows) variants. Row order becomes
  `Nombre` → `Cliente` → `Fecha` → `Hora` → `Duración`.
- **Components**: none new. Label string is the literal `Nombre` — operator-facing
  Spanish, matching the hardcoded `Cliente` / `Fecha` / `Duración` labels in the
  same file. This is not customer copy and takes no i18n key.
- **Typography**: **no new styling.** Both renderers style every value row
  identically (`#18181b`, 16px, weight 600 in the table variant), so the name
  automatically reads with the same emphasis as the date and the email. Do not
  bold, italicise, colour, or link the name — it is one fact among peers.
- **Motion**: static (emails).
- **A11y**: the value is HTML-escaped through the existing `escapeHtml` path
  (pinned in the criteria). Long names wrap; neither renderer sets `nowrap` or a
  fixed column width, so a 40-character name cannot widen or overflow the email.
- **Anti-patterns to avoid**: putting the name in the subject line (pinned out);
  truncating or ellipsising a person's name; adding a second `<table>` or a
  separate "customer" block for one row; renaming `Cliente` — with `Nombre` now
  above it, `Cliente` reads as a leftover, but changing it rewrites existing
  behaviour and belongs in a follow-up, not this task.
- **Watch items (Coder must check)**: the non-empty-string guard on **both**
  builders (a missing name must produce byte-identical output to today); the
  billing-enabled and billing-disabled paths are separate functions and it is easy
  to satisfy one scenario and miss the other.

## Out-of-scope tasks

No visual or copy surface, no directives:

- **Task 2** — API-boundary `name` validation (`api/bookings/validation.ts`).
- **Task 3** — Stripe Checkout metadata (`api/bookings/checkout.ts`, `api/bookings.ts`).
- **Task 5** — direct-booking name forwarding (`api/bookings/direct.ts`).
- **Task 6** — webhook metadata extraction (`api/stripe-webhook.ts`).
- **Task 7** — recording pipeline name resolution (`scripts/recording/billing.mjs`, `pipeline.mjs`).
- **Task 8** — date + name folder organization (`scripts/recording/*`) — filesystem
  behaviour, and its four open questions are a human decision, not a design one.

## Follow-ups (record only — do not build in this spec)

1. **Form-wide required-field indication.** Add `aria-required` and a visible
   convention (e.g. one legend line above the form, not per-field asterisks) to
   date, slot, duration, email **and** name in a single sweep. Doing it for the
   name alone is the one thing this spec explicitly forbids.
2. **Form-wide error announcement.** Errors appear after submit while focus stays
   on the button; a screen-reader user gets no announcement and must navigate back
   up. Fixing it for one field would be inconsistent; the fix (move focus to the
   first invalid field, or `role="alert"` on every `field-error`) is form-wide.
3. **`aria-describedby` merge.** Both `help-*` and `err-*` ids could be referenced
   simultaneously instead of swapped, so the helper is not dropped when an error
   shows. Form-wide; the swap is the pinned pattern for this task.
4. **`Cliente` label in the operator email.** Once `Nombre` sits above it,
   `Cliente: ana@example.com` is ambiguous; `Email` would be clearer.
5. **Name validation bound** (open question 5 in `10-tasks.md`). If a max length
   is confirmed, the field needs a `maxLength` plus a `nameTooLong` message in
   both dictionaries — and only then. Not added speculatively.
