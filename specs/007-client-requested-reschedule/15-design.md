# Design Spec: 007-client-requested-reschedule

## Design Read

Reading this as: a transactional single-purpose client utility page (not a landing page) for an
existing client who is anxious about an unfamiliar domain, opened from an email on a phone, in a
trust-first monochrome zinc language inherited from the spec 006 join interstitial, leaning toward
hand-authored native CSS in one self-contained document with zero motion, no framework, and no
icon set.

The skill applies, but only through its trust-first and anti-dead-end rules: there is no hero, no
marketing surface, and no layout choice to make. The page is a **preserve** job (skill Section 11
"redesign - preserve"): `deploy/join/index.html` is the reference and this page must read as its
sibling, not as a second visual language.

## Dial Values

- **DESIGN_VARIANCE: 3** - trust-first band of the dial table (3-4), pinned there by "reuse the join
  page's visual language, do not invent a second one". Not 1, because the slot picker needs a second
  column of equal targets at 360px+. The marketing baseline of 8 is wrong for a page whose entire job
  is to look boring and legitimate.
- **MOTION_INTENSITY: 0** - below the trust-first floor of 2, deliberately. Spec 006 (decision 8)
  bans automatic navigation and the join page ships no timer, no transition, no animation. A
  reschedule is a decision the client must make on purpose, and a moving interface on a poor phone
  signal is what makes an unfamiliar domain feel fake. Zero means zero: no `transition`, no
  `@keyframes`, no spinner, no `animation`.
- **VISUAL_DENSITY: 4** - trust-first band (4-5). One step above the join page's airy 2, because the
  page carries a real form (current slot, date, slot grid, one action). Still no cards, no table, no
  inset panes: whitespace and hairlines only.

## Design System / Foundation

No design system package. **Native CSS, hand-authored, in one self-contained document** - the same
foundation as `deploy/join/index.html`, for the same reason: this is served from
`meet.rexi-ai.com`, a different host from the SPA, and must render in one round trip with no bundle,
no webfont, no icon request, and no external fetch other than the page's own two API calls.

Install command: **none**. Do not add a dependency, a CDN link, or a bundled stylesheet.

The page file is `deploy/reschedule/index.html`, sibling of `deploy/join/index.html`, with a sibling
`deploy/reschedule/README.md` carrying the same URL-contract / hosting-contract shape.

Token block: copy the `:root` block from `deploy/join/index.html` verbatim (it mirrors
`src/index.css`), then add only the tokens listed under Global Tokens. Do not restyle what the join
page already defines.

Aesthetic labelled honestly: this is a **monochrome zinc utility page with a pill primary action**.
It has no accent hue, no illustration, no photography, no icon, and no ornament. That is the brand
here, not a shortcut.

## Global Tokens

- **Font**: system stack only, copied verbatim from `deploy/join/index.html` -
  `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`.
  Weights 400 (body) and 600 (headings, labels, actions). No webfont, no `@font-face`, no
  `font-display`.
- **Accent color**: none. There is no accent hue on this page. The action color is **zinc-900
  `#18181b`**; white `#ffffff` on it is 21:1. Do not introduce a brand blue, green, or red for
  success/error, and do not add a success tick or a warning triangle: state is communicated by the
  heading, not by color or iconography.
- **Neutral base**: zinc. `#18181b` (900, headings/actions), `#52525b` (600, body), `#71717a`
  (500, muted/meta), `#e4e4e7` (200, hairline separators only), `#ffffff` (page).
- **Corner-radius system**: two-step scale, locked.
  - `--radius-full: 9999px` for the one primary action and any inline retry action (identical to the
    join page).
  - `--radius-md: 12px` for the date input and the slot chips (matches the 12px button radius the
    booking emails already use).
  Nothing else gets a radius. No 4px, no 8px, no 16px, no "soft card".
- **Theme**: **light, locked.** `#ffffff` page, `#52525b` body. No `prefers-color-scheme` block, no
  dark variants. This is an explicit deviation from the skill's dark-mode mandate (Section 6.C):
  the page must be a pixel sibling of the join page, which is light-locked, and a client who taps a
  join link and then a reschedule link must not see the brand change temperature between the two.
- **Icon library**: **none**. No icon font, no SVG, no emoji, no unicode arrows, no status dots.
- **Border rule (accessibility, computed)**: `#e4e4e7` on white is 1.27:1 and may be used **only**
  as a non-interactive hairline. Any border that delineates a control (date input, slot chip) must
  be **`#71717a` or darker** - `#71717a` on white is 4.83:1, `#52525b` is 7.73:1, both clearing the
  3:1 WCAG 1.4.11 non-text contrast floor. A zinc-200 chip border is a defect, not a style choice.
- **Focus ring**: `outline: 2px solid #18181b; outline-offset: 2px` on every focusable element,
  including the visually-hidden radios (drawn on the chip label, not the radio).

## Per-Task Directives

Tasks 1-4 have no frontend surface (see Out-of-scope tasks). Directives are given for Task 5 (the
API as the page's client contract), Tasks 6 and 7 (client-facing email copy), and for the page
document itself, which no task in `10-tasks.md` currently owns - see Task 8 (proposed) below.

### Task 5: Reschedule API endpoints (resolve + submit)

- **Layout**: not applicable (no visual surface of its own). What is in scope is the contract the
  page consumes; every field the page reads and every field it must ignore is pinned below.
- **Components**: none. The design obligation is the **error-code vocabulary** the page branches on.
- **Typography**: none.
- **Motion**: none.
- **A11y**: the API must never return a message that the page renders verbatim. The page owns 100% of
  the visible copy; the API's `error.message` is a developer string and is never shown to the client.
- **Anti-patterns to avoid**: do not make the page distinguish the three invalid-token causes
  (AC-007-25 forbids it server-side; the page must not invent the distinction either). Do not add
  fields to the GET response to make the page prettier - AC-007-22 forbids extra fields.
- **The page's read contract** (a Coder implementing the page can rely on exactly this):
  - `GET /api/reschedule?token=<t>` -> `200 { date, startTime, hours }`. The page reads all three and
    nothing else. It never expects `email`, `bookingId`, or `joinUrl` here.
  - `POST /api/reschedule` body `{ token, date, startTime }`, `Content-Type: application/json` ->
    `200 { date, startTime, hours, joinUrl }`. The page reads `date`, `startTime`, `hours` and
    **discards `joinUrl` unrendered**. `joinUrl` exists in the response for parity with the email
    path, not for the page.
  - Errors are `{ error: { code, message } }` (same shape as `api/availability.ts`). The page branches
    on `error.code` **only**, never on the HTTP status, because Task 5 leaves the exact status to the
    Coder: `INVALID_RESCHEDULE_TOKEN`, `PAST_DATE`, `SLOT_UNAVAILABLE`, `SLOT_CONFLICT`,
    `RESCHEDULE_LIMIT`. Any 4xx carrying none of those codes falls back to the generic submission
    failure message.
  - `GET /api/availability?date=<YYYY-MM-DD>` -> `200 { date, slots: string[] }` (existing endpoint,
    unchanged). The page uses it for the slot grid; `slots` entries are `"HH:MM"` in the configured
    timezone (`config/availability.yaml` -> `Europe/Madrid`).
- **Watch items (Coder must check)**:
  - **DECISION NEEDED (human gate) - the limit is invisible until submit.** AC-007-22 forbids extra
    GET fields, so a client already at `MAX_RESCHEDULES` is shown the picker and only learns on
    submit. The page handles it (state `limit`) but the sequence is a UX wart: fill a form, get
    refused. If you want the page to refuse *before* the client invests effort, the GET response
    needs one additive boolean (e.g. `canReschedule`) and AC-007-22 must be amended. Design does not
    assume it; the shipped states work either way.
  - **DECISION NEEDED (human gate) - the token travels in a query string.** `GET
    /api/reschedule?token=` puts the capability in the branded host's access logs (Task 5's contract,
    not the page's choice). The page keeps the token out of the address bar of any *other* URL, out
    of storage, and out of the DOM, but it cannot keep it out of that request line. If log exposure
    matters, the resolve call needs to become a POST or move the token to a header - that is a Task 5
    change, and the page's two fetches would follow it.
  - The page is a same-origin client. If the API answers cross-origin with `Access-Control-Allow-
    Origin`, the page must not be changed to accommodate it; fix the hosting (see Task 8 hosting
    contract).

### Task 6: Reschedule notifications (operator + client)

Client-facing copy only; the operator mail is internal and stays terse. Both mails are built with the
existing `email.ts` / `emailDirect.ts` / `emailHtml.ts` plumbing - no new renderer, no inline-style
strings outside the existing constants.

**Client confirmation after a successful move.** Body copy stays **Spanish**, with the consent notice
localized by booking locale - the spec 006 rule (decisions 9 and 11), not a new one. Note the page is
fully bilingual while this mail is not; that inconsistency already exists today between the join page
and the booking email, and this design does not reopen it (see the sign-off item).

- **Layout**: the existing single-column 600px card, hand-built HTML, inline styles. Same reading
  order as the booking confirmation: preheader -> wordmark -> H1 -> facts table -> consent notice ->
  primary CTA -> secondary text link -> help -> footer.
- **Components**: `tableHtml` facts rows (labels `Fecha`, `Hora (<timezone>)`, `Duración` - reuse
  the existing `factRows` shape verbatim, raw `date`/`startTime` values, `directDuration` for the
  duration); `noticeHtml(locale)` for the consent notice; `joinButtonHtml` for the primary CTA; a new
  secondary text link for the reschedule URL, styled exactly like `calendarLinkHtml` (14px,
  `#52525b`, underline) so it never competes with the join button.
- **Typography**: unchanged from the existing builders (24px/600 H1, 16px body, 14px meta).
- **Motion**: none (email).
- **Verbatim strings (Spanish body, locked; no em-dashes):**
  - subject: `Tu reunión se ha movido: <date> <startTime>`
  - preheader: `La nueva hora de tu reunión, en este correo.`
  - H1: `Tu reunión se ha movido`
  - intro: `Tu reunión con RexiAI tiene una nueva hora.`
  - rows: `Fecha` / `Hora (<timezone>)` / `Duración`
  - primary CTA: `Unirse a la reunión` (existing locked label, reuse the constant)
  - secondary link label: `Cambiar la hora otra vez`
  - help: `¿Dudas? Responde a este correo.` (the existing `CLIENT_HELP_TEXT`)
  - consent notice: unchanged `consentNotice(locale)` pair, placed **before** the join CTA
    (AC-007-31)
  - the secondary link href is `${MEETING_BASE_URL}/reschedule/<newToken>?lang=<locale>` - the
    **rotated** token (AC-007-32), never the old one.
- **A11y**: the English notice keeps the `lang="en"` attribute `noticeLangAttribute` already emits;
  the reschedule link must be a real `<a>` with visible text (never "click here"), and must not be
  the only way to reach a human - the help line stays.
- **Anti-patterns to avoid**: do not put the old slot in the client mail (the client knows what they
  asked to move; the operator mail is where the before/after belongs). Do not promise a calendar
  invite update - the design may not claim behaviour the implementation does not guarantee. Do not
  add a second primary button.

**Operator notification.** Internal, terse, Spanish, no consent notice (AC-007-30), no reschedule
link or token (AC-007-38).

- subject: `Reunión movida: <clientEmail> - de <oldDate> <oldStart> a <newDate> <newStart>`
- rows, in this order: `Cliente`, `Antes`, `Ahora`, `Duración`, `Reserva` (bookingId), `Enlace`
  (`localeFreeJoinUrl`, no `?lang=`), `Cambios` (the new count).
- heading: `Reunión movida`; no preheader wordplay, no wordmark, no CTA, no button.

**Operator notification on a refused reschedule (limit).**

- subject: `Reschedule bloqueado: <clientEmail> - límite alcanzado`
- rows: `Cliente`, `Reserva`, `Reunión` (current date/time), `Cambios` (count), `Pedido` (the
  requested date/time, from the POST body).
- heading: `Intento de cambio bloqueado`; one body line: `El cliente ha intentado mover la reunión
  y se ha rechazado por límite.` No CTA.

- **Watch items (Coder must check)**:
  - **DECISION NEEDED (human gate) - bilingual or Spanish-body?** This design follows spec 006
    (Spanish body, localized notice) for consistency inside the client's mail thread. But this email
    is a **new** shape, not covered by the spec 003 byte-freeze, so "make it fully bilingual" is
    available and cheap. If you want English-locale clients to receive an English reschedule
    confirmation, say so at the gate and this section gets an English column; otherwise the page
    (bilingual) and this mail (Spanish) stay mismatched exactly as the join page and the booking
    confirmation already are.
  - Operator-notification failure returns 5xx **after** the move may already have happened. That is
    why the page has an `unconfirmed` state with no retry (Task 8). Do not "fix" the 5xx by returning
    a success.

### Task 7: Reschedule link in the booking confirmation emails

- **Layout / Components**: one inserted secondary line in both client variants (`email.ts` enabled,
  `emailDirect.ts` disabled), below the join CTA and above the help line, styled like
  `calendarLinkHtml`.
- **Typography**: 14px, `#52525b`, underline - subordinate to the button.
- **Motion**: none.
- **Verbatim strings (Spanish, both variants):**
  - link line: `¿Necesitas otra hora? ` + `<a>Cambiar la hora</a>` - rendered as one 14px paragraph,
    sentence split so the link text is meaningful out of context.
  - help line, changed from `¿Dudas o necesitas cambiar la hora? Responde a este correo.` to
    `¿Dudas? Responde a este correo.` (`CLIENT_HELP_HTML`). The old string now points at a route the
    page replaces; leaving it would give the client two contradictory instructions.
- **A11y**: the link is a real anchor with visible text; it must not be the only route (the help line
  and `info@rexi-ai.com` remain).
- **Anti-patterns to avoid**: no button, no badge, no "NEW" or "Nuevo" marker, no second CTA colour.
  No token, no email, no date in the URL beyond the `?lang=` the join URL already carries
  (AC-007-37).
- **Watch items (Coder must check)**:
  - **DECISION NEEDED (human gate) - this reopens the spec 003 byte-freeze.** `AC-003-19`/`AC-003-25`
    pin the enabled client body with `toBe`, and `CLIENT_HELP_HTML` is shared by both variants.
    Inserting the link **and** shortening the help line makes those assertions fail, and a failing
    assertion that encodes the old copy must not be silently rewritten (`docs/TESTING.md` §Tests That
    Encode a Defect). The precedent and the required procedure are spec 006 decision 6: explicit
    human authorisation, scenario ID preserved verbatim, and the diff recorded in the commit/PR body.
    Get that authorisation at this gate, not at build time.
  - Both variants must carry the link. Missing the direct/disabled one silently removes the feature
    for every free booking (AC-007-36).

### Task 8 (proposed, not in `10-tasks.md`): the reschedule page document

**This task does not exist in `10-tasks.md`.** Tasks 1-7 specify the token, the calendar, the
validation, the API, and the emails; nothing owns "build the page the client actually opens". The
informal spec's item 1 is exactly that page, and `10-tasks.md`'s scope boundary excludes only
*hosting*, not the document. **DECISION NEEDED (human gate): add Task 8 with the acceptance
scenarios below, or state that the page ships under Task 5's contract.** The design is complete
either way; only ownership is missing. Suggested scenarios: `AC-007-39` (valid token renders the
picker with the current slot), `AC-007-40` (no open slots shows the empty message and keeps the
picker), `AC-007-41` (success renders the new slot and no join URL), `AC-007-42` (no-JS renders the
standalone mailto state), `AC-007-43` (the token never appears in the DOM, storage, or a URL other
than the page the client opened).

**File**: `deploy/reschedule/index.html`, one self-contained document, plus
`deploy/reschedule/README.md` (URL contract + hosting contract, mirroring `deploy/join/README.md`).

#### Layout

- **Layout family**: single-column, top-aligned utility column ("Single-column pick-and-confirm").
  No Section 10 hero paradigm applies; this is a transactional page, and naming a marketing family
  here would be dishonest.
  - `max-width: 32rem`, `margin: 0 auto`, `padding: var(--space-6)`, plus
    `padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom))` (copy the join page).
  - **Deviation from the join page, deliberate**: `justify-content: flex-start` instead of `center`.
    The join page centres two short paragraphs; this page's height changes with the slot grid, and a
    vertically centred form on a phone jumps as content arrives. Same column, same tokens, one
    alignment change, justified.
  - One rhythm between blocks: `gap: var(--space-4)`. No cards, no inset panels, no shadows, no
    `border` boxes around sections. A single hairline (`1px solid #e4e4e7`) above the slot group is
    the only separator allowed.
- **States are sections, not re-renders.** The join page's mechanism, extended: every state ships as
  a fully written `<section hidden>` for each locale, and the synchronous inline script reveals
  exactly one. No state's copy is assembled in JS, so every string below is greppable in the HTML and
  every state renders before the first paint.

#### State enumeration

| # | State id | Trigger | Section id | Primary action |
|---|---|---|---|---|
| S1 | `loading` | script starts, resolve in flight | `state-loading-<locale>` | none (transient) |
| S2 | `load-failed` | resolve network error / timeout / non-404 4xx / 5xx | `state-load-failed-<locale>` | `Reintentar` (tertiary: mailto) |
| S3 | `invalid` | path token not 64 lowercase hex, or `INVALID_RESCHEDULE_TOKEN` from GET or POST | `state-invalid-<locale>` | mailto only |
| S4 | `ready` | resolve 200; contains the form and the slot area | `state-ready-<locale>` | `Mover la reunión` (tertiary: mailto) |
| S4a | `ready` + slot `loading` | availability in flight | `[data-slot-state="loading"]` | same as S4 |
| S4b | `ready` + slot `empty` | availability 200 with `slots: []` | `[data-slot-state="empty"]` | same as S4 |
| S4c | `ready` + slot `error` | availability non-200 after a slot request (target the availability request) | `[data-slot-state="error"]` | same as S4 |
| S4d | `ready` + `slot-rejected` | POST 4xx `SLOT_CONFLICT` or `SLOT_UNAVAILABLE` | `[data-message="slot-rejected"]` | same as S4 |
| S4e | `ready` + `date-past` | POST 4xx `PAST_DATE` | `[data-message="date-past"]` | same as S4 |
| S4f | `submitting` | POST in flight | `state-ready-<locale>` with `[data-busy]` | button disabled, label swapped |
| S5 | `success` | POST 200 | `state-success-<locale>` | none (tertiary: mailto) |
| S6 | `limit` | POST 4xx `RESCHEDULE_LIMIT` | `state-limit-<locale>` | mailto only |
| S7 | `rate-limited` | POST or GET 429 | `state-rate-limited-<locale>` | mailto only |
| S8 | `unconfirmed` | POST network error / timeout / 5xx / unknown 4xx | `state-unconfirmed-<locale>` | mailto only, **no retry** |
| S9 | `nojs` | JavaScript disabled | `<noscript>` inside `<main>` | mailto only |

S4a-c and S4d-f are inline variants inside `ready`, not page swaps: the client's date choice and
scroll position survive a rejection, and the picker is never replaced by an apology.

**The single-action rule per state** is the "Primary action" column, and it is literal: at most one
filled pill on screen at a time. Every `mailto:` is a plain underlined text link
(`.recover`, copied from the join page), never a second pill, so the escape hatch never competes with
the decision.

#### Verbatim copy, per state, both locales

Rules that hold for every string below: no em-dash (U+2014) or en-dash (U+2013), no `·` in body copy (the
middle dot appears only in `<title>`, matching the join page), no exclamation marks, no "por favor"
padding, no marketing verbs, sentence case, `info@rexi-ai.com` is the only address that appears
anywhere.

**S1 `loading`** - `<title>`: `Cargando tu reunión · RexiAI` / `Loading your meeting · RexiAI`

```
es  h1  Cargando tu reunión
    p   En un momento verás los huecos disponibles.

en  h1  Loading your meeting
    p   The available slots will appear in a moment.
```

No action. It cannot hang: both fetches carry `AbortSignal.timeout(12000)` and a timeout lands in S2.

**S2 `load-failed`** - `<title>`: `No hemos podido cargar tu reunión · RexiAI` /
`We could not load your meeting · RexiAI`

```
es  h1  No hemos podido cargar tu reunión
    p   Puede ser la conexión o un fallo nuestro. No se ha cambiado nada.
    p   Vuelve a intentarlo o escríbenos.
    [pill] Reintentar
    [link] Escribir a RexiAI        -> mailto:info@rexi-ai.com

en  h1  We could not load your meeting
    p   It may be the connection, or a fault on our side. Nothing has been changed.
    p   Try again, or email us.
    [pill] Try again
    [link] Email RexiAI             -> mailto:info@rexi-ai.com
```

`Reintentar` re-runs the resolve (GET, idempotent, safe to repeat).

**S3 `invalid`** - `<title>`: `Este enlace ya no sirve · RexiAI` / `This link no longer works · RexiAI`

```
es  h1  Este enlace ya no sirve
    p   Puede que ya hayas cambiado la hora, que la reunión ya haya tenido lugar o que el
        enlace esté incompleto.
    p   Si ya la has cambiado, el correo nuevo trae un enlace nuevo.
    p   Si necesitas moverla igualmente, escríbenos.
    [link] Escribir a RexiAI        -> mailto:info@rexi-ai.com

en  h1  This link no longer works
    p   You may have already changed the time, the meeting may already have taken place, or
        the link may be incomplete.
    p   If you already changed it, the new email has a new link.
    p   If you still need to move the meeting, email us.
    [link] Email RexiAI             -> mailto:info@rexi-ai.com
```

One state for wrong, expired, and rotated, because the API refuses to distinguish them
(AC-007-25). No primary action, and nothing that invites a retry of the same link.

**S4 `ready`** - `<title>`: `Cambiar la hora de tu reunión · RexiAI` /
`Change your meeting time · RexiAI`

```
es  h1     Cambia la hora de tu reunión
    p      Esta página es de RexiAI. Desde aquí puedes mover tu reunión a otro hueco
           disponible, sin responder al correo.
    p.meta Ahora mismo: <fecha larga> a las <HH:MM> (hora de Madrid).
    p.meta La reunión dura lo mismo: <1 hora | N horas>.
    [label]        Nueva fecha
    [date input]
    p.help         Elige un día para ver los huecos disponibles.
    [fieldset legend] Huecos disponibles
    [slot chips]   <HH:MM> buttons
    [pill]         Mover la reunión
    p.help         Si algo no funciona, escribe a info@rexi-ai.com.

en  h1     Change the time of your meeting
    p      This page belongs to RexiAI. From here you can move your meeting to another
           available slot, without replying to the email.
    p.meta Right now: <long date> at <HH:MM> (Madrid time).
    p.meta The meeting keeps its length: <1 hour | N hours>.
    [label]        New date
    [date input]
    p.help         Pick a day to see available slots.
    [fieldset legend] Available slots
    [slot chips]   <HH:MM> buttons
    [pill]         Move the meeting
    p.help         If something does not work, email info@rexi-ai.com.
```

Duration strings are frozen pairs, not a plural rule invented per string:
`La reunión dura lo mismo: 1 hora.` / `La reunión dura lo mismo: {hours} horas.` and
`The meeting keeps its length: 1 hour.` / `The meeting keeps its length: {hours} hours.`

**S4a-d inline slot messages** (rendered inside the slot area, `role="status"`):

```
es  loading   Cargando huecos...
    empty     Sin huecos ese día. Prueba otra fecha.
    error     No hemos podido cargar los huecos. Vuelve a intentarlo.
    retry     Reintentar
    rejected  Ese hueco ya no está disponible. Elige otro.
    past      Esa fecha ya ha pasado. Elige otra.

en  loading   Loading slots...
    empty     No slots that day. Try another date.
    error     We could not load the slots. Try again.
    retry     Try again
    rejected  That slot is no longer available. Please choose another.
    past      That date has already passed. Please choose another.
```

`empty`, `rejected`, `past` and `error` reuse the SPA's existing slot vocabulary
(`src/i18n/dictionary.ts`: `Sin huecos ese día. Prueba otra fecha.` /
`Ese hueco ya no está disponible. Elige otro.`) so the client meets the same words in both places.

**S4f `submitting`** - no new section. The form gets `[data-busy]`, the pill's label swaps to
`Moviendo tu reunión...` / `Moving your meeting...`, the pill gets `disabled`, and a
`submitted` flag blocks a second submit. No spinner, no progress bar, no skeleton.

**S5 `success`** - `<title>`: `Reunión movida · RexiAI` / `Meeting moved · RexiAI`

```
es  h1  Tu reunión se ha movido
    p   Nuevo hueco: <fecha larga> a las <HH:MM> (hora de Madrid).
    p   Te hemos enviado un correo con la nueva hora y el enlace para entrar. El enlace
        de la reunión no cambia.
    p   Si algo no cuadra, escribe a info@rexi-ai.com.
    [link] Escribir a RexiAI        -> mailto:info@rexi-ai.com

en  h1  Your meeting has moved
    p   New slot: <long date> at <HH:MM> (Madrid time).
    p   We have emailed you the new time and the link to join. The meeting link does not
        change.
    p   If something does not look right, email info@rexi-ai.com.
    [link] Email RexiAI             -> mailto:info@rexi-ai.com
```

Nothing else. **No primary action** (there is nothing left to do), **no join URL**, **no old slot**,
no confetti, no checkmark, and no claim that the calendar invite has been updated - the copy says the
email carries the new time, which is true, and stops there.

**S6 `limit`** - `<title>`: `Esta reunión ya no se puede mover desde aquí · RexiAI` /
`This meeting can no longer be moved from here · RexiAI`

```
es  h1  Esta reunión ya no se puede mover desde aquí
    p   Ya se ha cambiado el máximo de veces permitido desde esta página.
    p   Escríbenos y la movemos nosotros.
    [link] Escribir a RexiAI        -> mailto:info@rexi-ai.com

en  h1  This meeting can no longer be moved from here
    p   It has been changed as many times as this page allows.
    p   Email us and we will move it for you.
    [link] Email RexiAI             -> mailto:info@rexi-ai.com
```

No number is printed: the page does not know the count (AC-007-22 returns no count), and a wrong
number is worse than none.

**S7 `rate-limited`** - `<title>`: `Demasiados intentos · RexiAI` / `Too many attempts · RexiAI`

```
es  h1  Demasiados intentos
    p   Espera un minuto y vuelve a intentarlo. No se ha cambiado nada.
    p   Si tienes prisa, escríbenos.
    [link] Escribir a RexiAI        -> mailto:info@rexi-ai.com

en  h1  Too many attempts
    p   Wait a minute and try again. Nothing has been changed.
    p   If it is urgent, email us.
    [link] Email RexiAI             -> mailto:info@rexi-ai.com
```

**S8 `unconfirmed`** - `<title>`: `Cambio sin confirmar · RexiAI` / `Change not confirmed · RexiAI`

```
es  h1  No sabemos si el cambio se ha hecho
    p   El cambio puede haberse hecho igualmente. No lo repitas desde esta página.
    p   Revisa tu correo en unos minutos. Si no llega la confirmación, escríbenos y lo
        comprobamos.
    [link] Escribir a RexiAI        -> mailto:info@rexi-ai.com

en  h1  We could not confirm the change
    p   The change may have gone through anyway. Do not repeat it from this page.
    p   Check your email in a few minutes. If no confirmation arrives, email us and we
        will check.
    [link] Email RexiAI             -> mailto:info@rexi-ai.com
```

The most important state on the page. A 5xx from `api/reschedule` can arrive **after** the move
landed (task 6 decision 7: operator-notification failure returns 5xx, the move is not rolled back).
So: no retry button, no "try again" wording, no claim that nothing changed. A client who taps retry
here either gets a 404 (token rotated, looks like a broken link) or, worse, submits twice.

**S9 `nojs`** - `<title>` falls back to the static `<title>`: `Cambiar la hora · RexiAI` /
`Change the time · RexiAI`. One `<noscript>` block containing **both** languages, like the join page,
with the mailto as the action:

```
es  h1  Cambia la hora por correo
    p   Esta página necesita JavaScript para mostrar los huecos disponibles. Escríbenos y
        movemos la reunión nosotros.
    [link] info@rexi-ai.com         -> mailto:info@rexi-ai.com

en  h1  Change the time by email
    p   This page needs JavaScript to show the available slots. Email us and we will move
        the meeting for you.
    [link] info@rexi-ai.com         -> mailto:info@rexi-ai.com
```

Both languages unconditionally, because with JavaScript off the page cannot read `?lang=`. The
`<html lang="es">` attribute stays static (Spanish is the default), so the no-JS document is
correctly labelled for the Spanish block and the English block is marked by its own `lang="en"`
wrapper.

#### Locale and URL contract

- Path: `/reschedule/<64 lowercase hex>` (`/^\/reschedule\/([0-9a-f]{64})\/?$/`, trailing slash
  tolerated). Anything else is S3 without a network call - a truncated forwarded link must not
  produce an API request.
- Language: `?lang=` only. `es` and `en`; absent, empty, or anything else renders Spanish. No
  `Accept-Language`, no `navigator.language`, no cookie, no storage, no path segment, no switcher.
- `<a>`/`<link>`/`fetch` targets and the token: the token lives in `location.pathname` and in the
  POST JSON body, and nowhere else. It is never written into the DOM, the title, `data-*`, storage,
  `history`, a `mailto:` query, or a log line.
- `referrer: no-referrer` meta (copy the join page) plus `<meta name="robots" content="noindex">`.
- After success the URL is left alone: no `history.replaceState`, no redirect. The old token is dead
  server-side, so a reload lands on S3 with an honest explanation, and rewriting the address bar
  would break the back button on a page the client may want to keep.

#### Data and rendering

- Two requests on load: `GET /api/reschedule?token=<t>`, then `GET /api/availability?date=<current
  date>` (the booking's current date, pre-filled into the date input, so the page is useful the
  moment it renders). Both carry `AbortSignal.timeout(12000)`.
- Changing the date re-requests availability for that date only. No client-side slot computation, no
  caching, no prefetch.
- `POST /api/reschedule` with `{ token, date, startTime }`, `Content-Type: application/json`. Branch
  on `error.code`, never on status. Map: `INVALID_RESCHEDULE_TOKEN` -> S3; `SLOT_CONFLICT` /
  `SLOT_UNAVAILABLE` -> S4d; `PAST_DATE` -> S4e; `RESCHEDULE_LIMIT` -> S6; 429 -> S7; network /
  timeout / 5xx / any other 4xx -> S8. **A failed availability request never produces S8** (nothing
  was written): it produces S4c.
- Render every dynamic value with `textContent`, never `innerHTML`. `date`, `startTime` and `slots`
  come from the server and are treated as untrusted strings.
- Date formatting: `new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month:
  'long', timeZone: 'UTC' })` over `new Date(date + 'T12:00:00Z')`. Parsing at `T12:00:00Z` and
  formatting in UTC is what stops a `YYYY-MM-DD` from shifting a day. Times are printed exactly as
  the API sends them (`HH:MM`), never re-formatted.
- The timezone label is `(hora de Madrid)` / `(Madrid time)`, matching the SPA's locked copy. It
  assumes `config/availability.yaml` `timezone: Europe/Madrid`; if that setting ever changes, this
  string is wrong and must change with it (state it in an HTML comment next to the string).

#### A11y

- Every interactive target is at least 44x44 CSS px: the pill (`min-height: 44px`), the `.recover`
  link (`min-height: 44px`, `display: inline-block`), the date input, and each slot chip.
- **The date input's `font-size` must be at least 16px.** Below 16px, iOS Safari zooms the whole
  page when the field is focused, which on this page throws the client into a half-scrolled layout.
  `--text-base` is already `1rem`; do not shrink it for the input.
- Slot chips are real radios inside a `<fieldset>` with a `<legend>`: `<label class="slot"><input
  type="radio" name="slot" required><span>10:00</span></label>`. Selection is drawn with
  `input:checked + span` and focus with `input:focus-visible + span`, so the chosen chip and the
  focus ring exist without a class-toggling script. The radio itself is visually hidden but
  focusable (`position: absolute; opacity: 0`), never `display: none`.
- The form is a real `<form>` with `required` on the radios, so the browser blocks an empty submit
  and announces the problem in the client's own language. Do not disable the pill while no slot is
  chosen, and do not replace native validation with a hand-written message.
- One `role="status"` region inside `ready` for the inline slot messages and the busy label. On a
  state swap, move focus to the revealed section (`tabindex="-1"` then `.focus()`) so a screen reader
  announces "Tu reunión se ha movido" instead of silence.
- Contrast, verified: `#18181b` on `#ffffff` 21:1, `#52525b` 7.73:1, `#71717a` 4.83:1, white on
  `#18181b` 21:1. Control borders `#71717a` or darker (see Global Tokens). Hairlines `#e4e4e7` are
  decorative only.
- `prefers-reduced-motion`: nothing to disable, because there is no motion. Do not add a
  `@media (prefers-reduced-motion)` block for the sake of looking thorough; a reviewer should read
  its absence as the intent.
- No dark mode (theme locked light, Global Tokens). Do not add a `prefers-color-scheme` block.

#### Anti-patterns to avoid (specific to this task)

- No spinner, loading bar, skeleton, or animated dots. "Cargando huecos..." is a sentence.
- No success tick, no green, no red, no amber. State is the heading.
- No card, no panel, no shadow, no `border-radius` other than the two locked values, no gradient.
- No `alert()`/`confirm()`, no toast that disappears on a timer.
- No password-field treatment of the token, no "copy link" button, no QR code.
- No date-picker library, no custom calendar grid. Native `<input type="date">`, because on a phone
  that opens the OS picker.
- No step wizard ("Paso 1 de 2"), no progress indicator, no eyebrow labels, no `·` separators in
  body copy.
- No "¿Seguro?" confirmation step before the move: the client already chose a slot from a list, and
  a modal on a phone is a second thing to get wrong.

#### Watch items (Coder must check)

- **DECISION NEEDED (human gate) - hosting must make `/api/*` same-origin on `meet.rexi-ai.com`.**
  The page calls relative `/api/reschedule` and `/api/availability`. `meet.rexi-ai.com` and the SPA
  are separate deployments, so either the branded host proxies `/api/*` to the API deployment or the
  page is served from the API host. Do **not** solve this in the page with an absolute API host or
  CORS: an absolute second host in a security-sensitive page is a trust regression, and a
  credentialed cross-origin call is a leak waiting to happen. This is the one hosting obligation the
  page cannot absorb, and it belongs in `deploy/reschedule/README.md` next to the rewrite trap the
  join page already documents (`vercel.json` rewrites `/(.*)` to `/index.html`, so `/reschedule/...`
  must be served this document, not the SPA, and `?lang=` must survive the rewrite).
- The page document can be cached publicly (it is token-agnostic; the token is read client-side).
  `/api/reschedule` responses must not be: they carry `Cache-Control: no-store` at the API/proxy
  layer.
- No request timeout is not an option: `AbortSignal.timeout(12000)` on both fetches, or a client on
  a bad train connection sits on S1 forever with no route out. Do not use `setTimeout` to build it.
- `POST` must be guarded by a `submitted` flag before the `await`: a phone double-tap is the
  realistic double-submit, and the second request would move the event twice with a token that is
  already rotating.
- Both locale blocks for every localised state ship in the document. Missing one locale/state
  combination is a blank page, so the reveal script must fall back to the Spanish section for that
  state rather than doing nothing.
- Do not render `joinUrl` from the POST response, and do not add a "go to the meeting" link to S5:
  it would put the room in the page and in any screenshot the client takes.
- The `mailto:` fallback has no query string at all. `mailto:info@rexi-ai.com?body=...` would copy
  the token into a mail client, and `?subject=` invites the token to be typed in later.

#### Mechanical invariants (a reviewer can grep these)

Against `deploy/reschedule/index.html`:

1. `grep -c $'\u2014'` and `grep -c $'\u2013'` -> **0** (no em-dash, no en-dash).
2. `grep -Ec 'setTimeout|setInterval|requestAnimationFrame|@keyframes|animation:|transition:'` ->
   **0** (zero motion, zero timers).
3. `grep -Ec 'location\.reload|location\.replace|location\.assign|history\.(push|replace)State'` ->
   **0** (no navigation, no history rewriting; spec 006 decision 8).
4. `grep -Ec 'localStorage|sessionStorage|document\.cookie|indexedDB'` -> **0**.
5. `grep -Eic 'accept-language|navigator\.language'` -> **0**.
6. `grep -c 'innerHTML'` -> **0**.
7. `grep -Ec '<(img|link rel="stylesheet"|script src)|@import|@font-face'` -> **0** (one document,
   no external request).
8. `grep -c 'mailto:info@rexi-ai.com'` -> **at least 8** (one per failure state per locale, plus the
   noscript pair), and `grep -c 'danielbueno76'` -> **0**.
9. Every `fetch(` argument starts with a relative path (`'/api/reschedule'`,
   `'/api/availability?date='`): no host, no `http://`, no interpolated origin. `grep -Ec
   "fetch\(['\"]https?://|fetch\(['\"]//"` -> **0**.
10. `grep -c 'joinUrl\|join_url'` -> **0** (the page never names or renders the join URL).
11. `grep -c '?token='` -> **1** (the resolve call, per Task 5's contract) and no other occurrence:
    the token is not in any `href`, `mailto:`, or storage call.
12. `grep -Ec 'textContent *= *token|data-token|setAttribute\([^)]*token'` -> **0** (the token never
    reaches the DOM).
13. Both locale sections exist for every state id: `grep -c 'id="state-'` -> **16** (8 states x 2
    locales) plus the `<noscript>` block.
14. `grep -c 'aria-live\|role="status"'` -> **1** in the `ready` state per locale, and every
    `<section>` that can be revealed has `data-title`.
15. `grep -c '9999px'` -> only the two radius tokens; `grep -c '12px'` -> only `--radius-md`; no
    other `border-radius` values.
16. `grep -c '#e4e4e7'` appears only in hairline rules, never in a `border` on an `input` or a
    `.slot` (control borders are `#71717a` or darker).

## Out-of-scope tasks

- **Task 1 - Opaque reschedule token.** No frontend surface. The page consumes its shape
  (`/^[0-9a-f]{64}$/`) as a client-side pre-check only; the token module itself is untouched by
  design.
- **Task 2 - Persist and resolve booking reschedule state.** No frontend surface. The page never
  learns `email`, `bookingId`, `joinUrl`, `locale`, or `count` from it, by design.
- **Task 3 - Calendar move operation and `location` field.** No frontend surface. `location` is
  consumed by calendar clients, not by this page.
- **Task 4 - Reschedule validation.** No frontend surface, but it owns the error codes the page maps
  to states (Task 5's mapping table above). Any code renamed there breaks a state silently, so the
  two must move together.
