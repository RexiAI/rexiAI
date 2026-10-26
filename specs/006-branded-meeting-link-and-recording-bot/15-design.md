# Design Spec: 006-branded-meeting-link-and-recording-bot

Scope note: only Task 1 (the branded link the client opens), Task 2 (the
recording-consent notice in the client email), and Task 8 (which language that
notice is written in) have a human-facing surface. Tasks 3 to 7 are backend/bot
mechanics with no visual surface and get no design directives (see Out-of-scope
tasks). Hosting mechanics stay out of scope, per `10-tasks.md` §Scope boundaries;
where the design depends on a hosting capability, it is stated as a contract the
host must satisfy, not as a deployment instruction.

Decision ledger. Five decisions this spec had flagged for human review have
landed; each is now a stated decision, not a question awaiting an answer:

1. **AC-003-25 is authorised to change.** The notice alters the billing-enabled
   client email's exact body, which `src/__tests__/AC-003-client-email.test.ts`
   pins with `toBe`. Lifting that freeze is a deliberate, human-approved change
   (`10-tasks.md` decision 6), not a defect fix. Scenario ID stays; the `toBe`
   stays; only the expected string moves.
2. **Contact address is `info@rexi-ai.com` (settled).** Confirmed by the human as
   the client-facing address on every failure path and in the notice's reply
   instruction. The site's own contact CTA is `mailto:danielbueno76@gmail.com`
   (`Landing.tsx`), and that address was explicitly rejected here: a personal
   Gmail on a branded domain reads like phishing, which is the exact signal this
   page exists to remove. Do not "consistency-fix" this to match `Landing.tsx`.
3. **No auto-forward (settled).** The join page never navigates on its own. The
   4s `location.replace` upgrade, its cancel listeners, the forward status line,
   the progress line, and the `forwarding` state are all deleted, not disabled
   behind a flag. `10-tasks.md` decision 8 supersedes the earlier 4s proposal.
4. **The notice follows the booking's language (settled).** Spanish is the
   default and keeps the original copy byte for byte; English is the counterpart
   below and is **final** (`10-tasks.md` decision 11, which closes open question
   5). The join interstitial carries an ES and an EN variant too. Only the notice
   and the join URL's `lang` value are localised: every other line of the email
   stays Spanish and byte-identical to spec 003, and the join URL's row gains
   nothing but the `?lang=` value.
5. **The locale rides on `?lang=`, not on a path segment and not on
   `Accept-Language` (settled; supersedes the earlier URL contract).** The human
   rejected both a `/<locale>/` prefix and device-language sniffing
   (`10-tasks.md` decision 10): the join URL is
   `https://meet.rexi-ai.com/rexi-<16hex>?lang=es|en`, and the page derives its
   language from that parameter and from nothing else. This replaces the earlier
   rule in this file that the URL carried no query string and that
   `Accept-Language` was the best-effort source. Both are deleted, not deprecated
   in place, and the "three host outcomes are not equivalent" analysis that
   followed from `Accept-Language` is gone with them.

## Design Read

Reading this as: a single-purpose join interstitial for a client who has never
seen the `meet.rexi-ai.com` domain, plus a consent notice inside an existing
transactional email, with a trust-first and calm-utility language, leaning
toward the repo's existing zinc token system and its `.result-view` pattern
(`src/App.css`), hand-written CSS, no framework, no webfont, no icons.

The audience decides the aesthetic here, not taste: this person clicked a link
in an email from a business they are paying, landed on a domain they have never
seen, and is about to be handed to a third-party video site. The page's only job
is to answer "is this legitimate?" and then get out of the way. Every visual
decision below is subordinate to that.

## Dial Values

- DESIGN_VARIANCE: 3 (unchanged). The skill's trust-first band (§1.A) is 3 to 4,
  and this is the extreme end of trust-first: one message, one action, one
  column. Asymmetry or a split layout here would read as decoration on a page
  whose entire content is a legitimacy claim. The page also reuses the existing
  `.result-view` layout family rather than inventing a second vocabulary for a
  second "outcome page".
- MOTION_INTENSITY: 0, down from 2. The only moving element the page ever had
  was the forward-progress line, and the forward it visualised is deleted. What
  remains is static HTML and CSS: no entrance animation, no transition, no
  timer. Stating the dial as 0 rather than leaving 2 in place is the point: a
  dial value whose justification has been removed from the file is a stale
  number that will get "restored" by a later reader.
- VISUAL_DENSITY: 3. One heading, two short body lines, one button, two muted
  meta lines, six elements in total (seven before the forward status line was
  deleted). Phone-first (390px is the design target, 320px must not break), so
  density is capped by the narrowest viewport rather than by desktop emptiness.

## Design System / Foundation

House system, honestly labelled: there is no design-system package in this repo
and this spec does not add one. The two surfaces reuse what already exists.

- **Join page**: `src/index.css` `:root` custom properties (verbatim values,
  copied) and the `.result-view` layout family from `src/App.css` (centred
  single column, `min-height: 100dvh`, `gap: var(--space-4)`, `text-align:
  center`, action as a `--radius-full` graphite pill). No card, no shadow, no
  nav, no footer chrome.
- **Email notice**: the existing hand-built inline-style HTML in
  `src/domain/email.ts` / `src/domain/emailDirect.ts`, unchanged in structure.
  The email surface is deliberately **not** migrated to CSS custom properties;
  email clients require inline styles and the copy/layout is locked by spec 003.

The single new file is one self-contained HTML document (inline `<style>`, no
build step, no external request other than the navigation itself). Copying the
token values into it is a deliberate, documented duplication: the page lives on
a different host and must not fetch the SPA bundle to render eight words. The
token block in that file carries a comment naming `src/index.css` as the source
of truth. `check-code-principles.sh` will flag this duplication as a WARN; that
WARN is expected and does not get "fixed" by making the join page import the
SPA.

## Global Tokens

- Font: system stack, verbatim from `index.css` `body`:
  `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
  Arial, sans-serif`. No webfont request (poor-connectivity constraint). The
  email keeps `Arial, Helvetica, sans-serif` exactly as it is today. The English
  variant adds no font, no weight, no size: same tokens, different words.
- Accent color: none. The only "action" colour is `--color-zinc-900` `#18181b`
  (graphite) on `#ffffff`, matching `.result-action`. The palette already
  carries `--color-green-600` and `--color-red-700`; neither is used on the join
  page (green would imply the meeting is connected, red would imply something is
  wrong; both are lies at this point in the flow, and neither becomes true when
  the copy is English).
- Neutral base: zinc. `#18181b` headings and action, `#52525b` body,
  `#71717a` muted meta, `#e4e4e7` hairlines, `#ffffff` page, `#fafafa` email
  card surround.
- Corner-radius system: pill (`--radius-full`, 9999px) for the single action,
  and nothing else on the join page has a radius. (The email's 12px button and
  16px card are pre-existing and locked by spec 003; they are not part of this
  page's system.)
- Theme: light only, locked. The brand's public surfaces are light and a dark
  variant of a four-line page would double the surface for no gain.
- Icon library: none. Zero icons on the join page. The wordmark is text
  (`RexiAI`), exactly as it appears in the email's `WORDMARK` constant, so the
  page and the email the client just read carry the same mark.

## Per-Task Directives

### Task 1: Branded meeting link (client URL) and real-room resolution

The frontend surface of Task 1 is the page that URL opens. The ACs
(AC-006-01 to AC-006-04) pin the URL; this directive pins the experience, and
nothing here may contradict those ACs.

**Layout family**: "centred single-column outcome page", the `.result-view`
family already in `src/App.css`. Vertical stack, `max-width: 32rem`, page
background `#ffffff`, `min-height: 100dvh` (never `100vh`), `padding: var(--space-6)`.

**Components** (in document order, all of them, nothing else):

1. `<h1>` heading
2. `<p>` explanation line
3. `<p>` recording notice line
4. `<a>` primary action, styled as the graphite pill
5. `<p>` room identifier, muted
6. `<p>` help line, muted

Six elements. The forward status line and the progress line that were item 5 and
an overlay are deleted with the auto-forward (decision 3); nothing replaces them.
No card, no border box, no logo image, no nav, no footer, no language switcher,
no breadcrumb. The page is one message.

**Typography** (identical in both locales: the English strings are a few
characters longer and must wrap in the same rhythm, so no locale-specific size
or tracking is permitted):
- h1: 28px (`--text-2xl`) below 480px, 32px (`--text-3xl`) at and above;
  weight 600; `letter-spacing: -0.02em`; `line-height: 1.2`; `#18181b`
  (this is `.result-title` plus an explicit line-height, since `.result-title`
  inherits 1.6 and the h1 wraps to two lines at 320px).
- Body and notice: 16px (`--text-base`), `line-height: 1.5`, `#52525b`,
  `max-width: 48ch`. Same size for the notice as for the explanation: a consent
  notice de-emphasised below body copy is a dark pattern, and a larger one is an
  alarm. Check the English explanation at 320px: it is the longest body string
  on the page.
- Help: 14px (`--text-sm2`), `#71717a`.
- Room identifier: 13px (`--text-sm`), `#71717a`, `letter-spacing: 0.02em`.
  System stack, **not** a monospace family (a fourth family would be a new font,
  which this spec forbids).

**States** (enumerated; each is a complete page, and no state is a dead end).
The three states this file previously carried collapse to **two**: the
"valid room, auto-forward armed" state and the "forwarding unavailable" state
were the same page with and without a timer, so removing the timer removes the
distinction. There is no `forwarding` state, no `armed` state, and no third
state hiding behind a JS branch.

*State A, valid room.* The only state for a valid path. One static page, fully
usable from first paint. Its strings, Spanish (default) and English (final),
in document order:

| Element | `es` (default, final) | `en` (final) |
|---|---|---|
| `<title>` | `Entrar en la reunión · RexiAI` | `Join the meeting · RexiAI` |
| h1 | `Tu reunión con RexiAI` | `Your meeting with RexiAI` |
| explanation | `La sala está en Jitsi (meet.jit.si), la plataforma de vídeo que usamos para las sesiones.` | `The room is on Jitsi (meet.jit.si), the video platform we use for sessions.` |
| notice | `Aviso de grabación: la reunión se graba en audio.` | `Recording notice: this meeting is recorded as audio.` |
| action label | `Unirse a la reunión` | `Join the meeting` |
| room identifier | `Sala <room>` | `Room <room>` |
| help | `Si la sala no se abre, pulsa el botón. Si sigue sin abrirse, escribe a info@rexi-ai.com.` | `If the room does not open, press the button. If it still does not open, email info@rexi-ai.com.` |

- `<room>` is the `rexi-<16 hex>` segment read from the path. This is the page's
  verification cue: it must match the room segment of the URL in the booking
  email, and it is the only string a client can read back to the operator over the
  phone. It is locale-independent and is never translated, normalised, or
  reformatted. The `?lang=` suffix that follows it in the address bar is not part
  of the identifier: the page displays the segment only, so a client reading
  `Sala rexi-1a2b…` aloud does not have to explain the query string, and the
  operator matching it against the booking sees the same 21 characters.
- action `href`: `https://meet.jit.si/<room>`, in both locales.
- The Spanish action label is verbatim the email's `JOIN_CTA_LABEL`, so on the
  default path the button the client pressed in the email and the button on the
  page are the same words. **On the `en` path that property does not hold and is
  not pursued.** The `en` column is selected by `?lang=en` (decision 5), but
  localisation still stops at the notice: `JOIN_CTA_LABEL` is not localised
  (decision 4), so the email carries `Unirse a la reunión` and the English page
  carries `Join the meeting`. The page's only control therefore reads English
  while the email that delivered the client reads Spanish. Both alternatives are
  worse: echoing the Spanish label onto the English page puts one stray Spanish
  word on the single element a nervous visitor reads before tapping, and
  localising the email's CTA would rewrite spec 003's locked copy. This is an
  accepted, documented consequence of the two-line localisation scope. It is not
  an oversight, and it is not a defect in the `lang` parameter: the parameter
  selects the column correctly and the page stays internally coherent, because
  every word in the `en` column including the button is English. The mismatch is
  between the email and the page, which is what localising two lines of an
  otherwise Spanish email costs.
- The single-line notice on this page is deliberately the email's **first** line
  only. The email is the notice of record and it carries the opt-out instruction;
  the page is a reminder shown seconds before the handover. Restating the opt-out
  here would put a second, competing call to action directly above the one action
  the page exists to offer, and would invite the client to abandon a meeting that
  is about to start. The notice string itself is shared verbatim with the email,
  per locale, so the client reads the same sentence twice.

*State B, no room in the path.* No join action at all (a button that leads to
`https://meet.jit.si/undefined` is worse than no button). Nothing on this page
navigates on its own (decision 3), so it must earn its own exit:

- `<title>`: es `Enlace no válido · RexiAI` / en `Invalid link · RexiAI`
- h1: es `Este enlace no es válido` / en `This link is not valid`
- explanation: es `Falta el código de la sala en la dirección. Abre el enlace del correo de tu reserva tal cual, sin recortarlo.` / en `The room code is missing from the address. Open the link in your booking email exactly as it is, without shortening it.`
- help line plus the page's only action, an `<a href="mailto:info@rexi-ai.com">`:
  es `Si el enlace del correo tampoco funciona, escribe a info@rexi-ai.com.`
  labelled `Escribir a RexiAI` / en `If the link in the email does not work
  either, email info@rexi-ai.com.` labelled `Email RexiAI`
- no room identifier, no notice, no join button (there is no session and no room
  to join)

The locale rule applies to State B too: `...?lang=en` on a broken link renders
the English recovery copy, because which language the client reads does not
depend on the room being valid. A broken link is not a reason to switch them
back to Spanish mid-sentence.

Why this is not a dead end, and why its action is a mailto rather than a pill:
the two recovery steps are, in order, "reopen the link from the email, intact"
and "contact us". Step one cannot be linked, because the URL the client was given
is exactly what did not work, so it is stated as an instruction in the
explanation. Step two is real and is the only thing on the page that can be
clicked. It is rendered as an **underlined link at body size (16px, `#18181b`,
`min-height: 44px` inline-block tap target)**, not as the graphite pill: the pill
is this page family's treatment for "the one thing this page wants you to do",
and promoting a fallback contact to that weight would invert the intended order
of recovery and send clients to email instead of retrying their link. The action
is keyboard-reachable, has a visible `:focus-visible` outline, and its label
names its destination rather than saying "click here".

**Locale selection** (how a static page knows which column above to render). The
locale rides on the URL as exactly one query parameter, written by the email that
delivered the client: `https://meet.rexi-ai.com/rexi-<16hex>?lang=es|en`
(decision 5, `10-tasks.md` decision 10). The rule is:

- **`?lang=` alone decides.** `en` selects the English column; `es`, an absent
  parameter, an empty value (`?lang=`), or any unrecognised value (`fr`, `EN`,
  `de`) selects the Spanish column. Never throws, never renders a half-translated
  page, and never falls back to another signal at any point, before or after
  first paint.
- **Nothing else is read.** No `Accept-Language` sniffing, no cookie, no path
  segment, no stored preference, no geo or timezone heuristic, no client name.
  The parameter exists so the page shows the language the *booking* was made in;
  a device-language sniff would override that (a client who books in Spanish on
  an English phone would get the English page), which makes the parameter a
  suggestion rather than the contract. A second source is not a fallback from the
  first, it is a contradiction of it, so there is no precedence order to design:
  one source, one default, no chain.
- **Both columns ship in the one document**, and resolution happens before first
  paint from a value already present in the address bar when the document
  arrives (host-templated, or a synchronous inline read in `<head>`). No async
  locale fetch and no post-paint swap: a page that renders Spanish and becomes
  English after the visitor has started reading is worse than one that stays
  Spanish.
- **The parameter is a page concern and is never forwarded.** The action's `href`
  and any redirect target stay `https://meet.jit.si/<room>` with no query string
  at all (AC-006-36), so the room identity the bot derives (`pipeline.mjs`
  `deriveRoom`) is untouched. A `lang` parameter appearing on the Jitsi room URL
  is a defect, not a feature: Jitsi would receive a parameter we never specified
  against, and the room→booking mapping would be reading a string we invented for
  a different consumer.
- No language switcher, ever. A control whose entire job is to change four lines
  adds a decision to a page whose job is to remove one, and it is the first thing
  a nervous visitor would touch. If the client wants the other language they edit
  one character of the URL; the page does not offer to.

**Room parsing** (the only client-side logic on the page): match the **pathname**
against `^/?(rexi-[0-9a-f]{16})/?$`. Strip the query string before matching: the
`lang` parameter is not a path segment, is not matched by that regex, and must
not make an otherwise valid link fall into State B. A single optional trailing
slash is accepted because clients add one; anything else in the **path** —
uppercase hex, extra segments, two trailing slashes — is State B. Do not
normalise case and then join: a room that does not exist under its exact name
creates an empty room, which is a worse outcome than being told the link is
wrong.

**URL contract** (design constraints on top of AC-006-01 to AC-006-04): the room
is the last path segment and nothing else; **exactly one** query parameter,
`lang`, whose only legal values are `es` and `en`, and nothing else in the query
string; no fragment, no credentials, no port, no IP literal, `https` only. The
delivered URL has no trailing slash, so the query begins immediately after the
room segment (`/rexi-<hex>?lang=es`, never `/rexi-<hex>/?lang=es`). `#config.*`
Jitsi fragments are never generated by us. The `lang` parameter is consumed by
this page and is **never forwarded to the redirect target**: the action's `href`
is `https://meet.jit.si/<room>` with no query string at all (AC-006-36). A second
query parameter, or a `lang` value outside `es`/`en`, is a producer defect (the
booking code) and not something this page coerces: the page's job is to degrade
to Spanish for any value it does not recognise, which it does.

**Motion and timing spec**: none. Zero moving elements, zero timers. There is no
`setTimeout`, no `setInterval`, no `requestAnimationFrame`, no `transition`, no
`@keyframes` on this page, and no JavaScript whose absence changes the layout.
The only script, if the host cannot bind `<room>` server-side, is the binding
described in the Watch items, and it is synchronous: it runs before the first
paint and produces no state change after it. `prefers-reduced-motion` has nothing
to reduce, which is the cheapest possible accessibility outcome and the reason
this state is preferred over a non-interruptible redirect with reduced-motion
carve-outs.

Mechanical check for the Coder, since a prose claim about absence is not a gate:
grep the finished document for `setTimeout`, `setInterval`,
`requestAnimationFrame`, `transition`, and `@keyframes`. All five must return
zero hits, and the primary action must be a plain `<a href>` with no click
handler attached.

**A11y**: `<html lang>` matches the rendered column (`es` or `en`, derived from
`?lang=`, never `es` with English body text and never English body text under a
`lang="es"` declaration); contrast `#52525b` on `#ffffff` = 7.4:1 and
`#71717a` on `#ffffff` = 4.8:1 (both AA for normal text), button label `#ffffff`
on `#18181b` = 17:1; the action is a real `<a>` with a visible
`:focus-visible { outline: 2px solid #18181b; outline-offset: 2px; }`; tap target
`min-height: 44px`, `padding: 12px var(--space-6)`; no live region on this page
(nothing changes after load, and an empty `role="status"` left in place from the
deleted forward would be a permanent lie to a screen reader);
`<meta name="viewport" content="width=device-width, initial-scale=1">` with no
`user-scalable=no`; `<meta name="robots" content="noindex">` (these links are
semi-private and must not be indexed); `<meta name="referrer" content="no-referrer">`.
The State B mailto link gets the same focus ring and the same 44px minimum.

**Mobile**: 320px must render the h1 on two lines with no horizontal overflow;
button `display: block; width: 100%` below 480px, inline pill above;
`text-size-adjust: 100%`; `padding-bottom: calc(var(--space-6) +
env(safe-area-inset-bottom))` for notched phones; no hover-only affordance (the
button looks identical at rest and on hover except for `text-decoration`, which
stays `none`). Long English words are the new risk here: the explanation and the
help line must wrap, not overflow, at 320px in the `en` column.

**Fallback chain** (this is the "never a dead end" requirement, stated as a
chain rather than a hope): primary action (always present, from first paint) →
if the destination fails to load, the client returns to the email and reopens the
same link → if that fails, `info@rexi-ai.com` is named on the page and the email
says `¿Dudas? Responde a este correo.` The page never depends on a navigation the
client did not ask for, which is a stronger property than the one it replaces: a
page that cannot navigate cannot navigate wrongly.

**No data on this page, by design**: it shows no client name, no date, no time,
no booking reference. There is no per-room lookup and none is being added: a
page on an unknown domain that greets you by name is *more* alarming, and a
wrong time (stale cache, timezone, rescheduled slot) is worse than no time. The
email carries the date and time; this page confirms identity and hands over.

**Anti-patterns to avoid** (specific to this task, not a general dump):
- **Any automatic navigation, in any form.** Not a 4s timer, not a `meta refresh`,
  not a "continue in N seconds" fallback, not a re-armed timer on `pageshow`. The
  human chose one deliberate tap every time (decision 3). A future edit that
  reintroduces a timer is a regression against a settled decision, not a
  performance improvement.
- A spinner with no other content, or a page that renders nothing until JS runs.
  A blank white viewport on an unfamiliar domain is the exact phishing signal
  this spec exists to remove.
- A bare `302` with no page: the address bar would flash the brand and then show
  `meet.jit.si` with no explanation, which converts a trust problem into a
  mystery.
- A countdown ("3… 2… 1…") or a progress bar with a percentage: either makes the
  page feel like an ad interstitial. With the timer gone there is nothing left to
  visualise, so any progress affordance here is now purely decorative and
  dishonest.
- A language switcher or a locale toggle.
- Any IP literal, port, or `http://` anywhere in the visible URL or the href.
- An unexplained third-party hop: `Jitsi (meet.jit.si)` is named in the body
  before the client sees it in the address bar.
- Decorative flourishes: no gradient, no glass, no card shadow, no illustration,
  no emoji, no icons, no "Powered by" strip.

**Watch items (Coder must check)**:
- **Hosting contract, and the trap in this repo's own config**: `vercel.json`
  currently rewrites `/(.*)` to `/index.html`. If the branded host inherits that,
  `https://meet.rexi-ai.com/rexi-<hex>?lang=es` serves the marketing SPA and the
  client sees the homepage instead of the room. The observable requirement is: a
  valid room path renders the join page, never the landing page, never a 404,
  never an empty SPA shell. How that is achieved is hosting's problem; that it
  holds is this stage's requirement.
- **The `lang` parameter must survive the host's rewrite.** A rewrite to a static
  file keeps the query string; a rewrite that reconstructs the target from the
  captured path group does not, and silently forces Spanish for every client. The
  check is behavioural, not configurational: request the page with `?lang=en` and
  confirm the English column comes back. If the query is dropped, the locale
  mechanism is dead while every other assertion still passes.
- **Room and locale binding**: the page must produce the correct `href`, the
  correct room identifier, and the correct locale column before first paint
  (host-templated binding, or a rewrite that injects both). The room comes from
  the pathname; the locale comes from the `lang` parameter and from nothing else
  (Locale selection). If and only if the host cannot bind the room server-side,
  bind it client-side and ship a `<noscript>` stating that JavaScript is needed to
  enter the room plus the email fallback; client-side binding alone with no
  `<noscript>` is a dead end for a JS-disabled client and is not acceptable. With
  JS disabled the page falls back to Spanish, which is the specified default, so
  the language degrades correctly in the one case where the room does not.
- **Locale resolution must be synchronous.** Reading `lang` is a one-line parse of
  a value already in the address bar, so a deferred, async, or
  post-`DOMContentLoaded` read has no justification. An English visitor watching
  the Spanish column repaint under them has been shown a page that changed its
  mind, which is worse than the Spanish page they would have accepted had it never
  moved.
- **No `Accept-Language` anywhere.** Not as a tiebreak when `lang` is absent, not
  behind a flag, not in a comment describing a possible enhancement. `lang`
  absent means Spanish, full stop (AC-006-35). Grep the shipped document and the
  generator that produces it; zero hits.
- **URL contract check**: the emitted join URL carries exactly one query
  parameter, `lang`, whose only legal values are `es` and `en`; and the action's
  `href` plus any redirect target carry **no** query string at all. Both halves
  are greppable in the generated document and in the fixtures, and both are
  pinned (AC-006-01, AC-006-33, AC-006-36).
- `500`/`502` from the host, a certificate error, or an HTTP (not HTTPS) response
  all violate the informal spec's "must not look like phishing" constraint.
  Certificate and TLS are hosting concerns; they are launch blockers, not design
  items, so they must be verified before this ships rather than assumed.
- Zero em-dashes (`—`) in any string this spec introduces, in **both** locales.
  The existing email copy in `emailDirect.ts` is dash-free by design and the new
  strings must stay that way. The `·` in the page titles is a middle dot, not a
  dash, and matches the existing title convention.
- The page must not be added as a route inside the React SPA: loading the bundle
  to render eight words contradicts the poor-connectivity constraint. One
  self-contained document, inline styles, no imports.
- Do not add analytics, fonts, or images to this page. Each is an extra request
  in the exact three seconds this page is judged on.
- `100dvh`, never `100vh` or `h-screen`.
- Both locale columns must ship in the same document, and the document must
  actually read the column it was given. Do not ship a Spanish-only page and add
  English later: the strings are the only thing that changes, and a second deploy
  to add four sentences is how a page ends up bilingual by accident. Equally, do
  not ship both columns with no `lang` read: two columns and a hardcoded selector
  is the same defect with more bytes, and every Spanish-looking test would pass.

### Task 2: Recording-consent notice in the client booking email

**Layout family**: no new layout. Two body paragraphs inserted into the existing
reading order of both client variants. The email chrome (600px card, wordmark,
fact table, bulletproof button, hairline help footer) is locked by spec 003 and
is not touched.

**Copy, verbatim, two lines, both variants, both parts, per locale.**

Spanish (`es`, the default and the final copy; unchanged from the previous
version of this file):

```
Aviso de grabación: la reunión se graba en audio.
Usamos la grabación para documentar la sesión. Si prefieres que no se grabe, responde a este correo antes de la reunión.
```

English (`en`, **final**; `10-tasks.md` decision 11, which closes open question
5):

```
Recording notice: this meeting is recorded as audio.
We use the recording to document the session. If you prefer it not to be recorded, reply to this email before the meeting.
```

The English pair is reproduced here rather than invented: `10-tasks.md` decision
11 is the single authority for the wording and AC-006-28 pins the same two lines
verbatim. Line 1 reads "recorded **as** audio". The earlier wording used "in"
where "as" is correct; this file flagged the phrasing, the human agreed, and the
correction has landed in all three documents. The superseded variant is
deliberately not reproduced anywhere in this file, so there is exactly one
spelling of the sentence for a Coder to copy.

**All three places now carry the settled string, and the edit is done:** this
file, `10-tasks.md` (Task 8's acceptance bullet and decision 11), and
`20-acceptance/AC-006-notice-locale.md` (its header quote and AC-006-28). There is
no outstanding synchronisation left anywhere and nothing for a later reader to
finish. A *future* rewording of these two lines would still have to change those
three files together, because the acceptance test asserts them with "exactly" —
but that is a property of the string being pinned in three documents, not a task
someone deferred.

Non-negotiable properties of these strings, in both locales:
- **Selected, not translated, at send time.** The locale picks a frozen pair; no
  string is ever produced by a translation call, a template lookup, or an
  interpolated language switch. Two literals, one selector.
- Static, no interpolation, so no `escapeHtml` risk is introduced (they still go
  through the existing renderer, so the HTML sink escapes them like every other
  value).
- Dash-free and free of every stem in the `BANNED_SUBSTRINGS` list enforced by
  `src/__tests__/AC-003-direct-path-emails.test.ts` (checked against `€`,
  `pro-rata`, `prorrateo`, `factur`, `cargo`, `cobr`, `pago`, `pagar`, `precio`,
  `tarifa`, `importe`, `stripe`, `reembols`, `gratis`, `gratuit`, `billing`,
  `charge`, and the `EUR` token rule). The English pair passes: it contains no
  billing stem, and the `charge`/`cargo` stems do not occur inside "recorded" or
  "recording". Verify by running that suite, not by reading this sentence.
- Accurate: the bot records **audio**, so the notice says audio rather than
  implying video. Identical meaning in both languages, including the actor: the
  meeting *is* recorded, by us.
- It names a real objection path (`responde a este correo antes de la reunión` /
  `reply to this email before the meeting`) instead of a consent notice with no
  way to object.
- Same two-line structure in both languages: line 1 is the notice, line 2 is the
  purpose plus the opt-out. Do not let the English collapse into one line or
  expand into three.

Do not claim the client will receive a written summary of the call, in either
language. The recording feeds transcription, the internal customer brief, and
post-meeting billing; the brief is not emailed to the client (spec 004 explicitly
excludes emailing transcripts and briefs). "Documentar la sesión" / "document the
session" is true in both billing modes and promises nothing that does not happen.

**Placement and reading order** (the AC-006-07 requirement, made mechanical; the
position is locale-independent, because only the words change):

- Billing-enabled text and HTML (`email.ts` `buildClientLines`, which feeds both
  `renderText` and `renderHtml`): append the two notice `BodyLine`s to the array
  **after** the `Duración` line and **before** the conditional
  `{ label: 'Enlace de la reunión', value: input.joinUrl }` line. Because
  `renderHtml` joins lines with `<br/>`, one insertion gives correct order in
  both parts, and this is the least invasive change to a byte-frozen renderer.
- Billing-disabled text (`emailDirect.ts` `buildDirectClientBody`): append the
  two notice `BodyLine`s to the end of `textRows`, after `...facts`. `directTextLines`
  already returns `[...rows, ...ctaLines, ...tail]`, so the notice lands before
  the join link and the calendar link with **no signature change** to
  `directTextLines`.
- Billing-disabled HTML (`renderDirectHtml`): insert the notice block between
  `tableHtml(m.rows)` and the `joinUrl` block. Add one field to
  `DirectEmailModel` (`notice: string`), render it only when non-empty, and set
  it to `''` in `operatorModel` so the operator email is untouched
  (AC-006-08). `buildDirectOperatorBody` must not gain the strings at all.
- The locale enters at the same two points that build the rows: one selector
  returning `{ line1: string, line2: string }` (or a `Readonly<[string, string]>`),
  called once per build, so the two lines cannot come from different locales.
  No locale-aware branching inside `renderText` / `renderHtml`: the renderers stay
  locale-blind and keep receiving plain strings.
- The notice renders whether or not a join URL exists, in whichever locale the
  booking carried. It is a statement about the meeting, not about the button, and
  the defensive falsy-join path (AC-003-18/24) must not silently drop a consent
  notice.
- Operator emails, both variants: unchanged, byte for byte, for any locale.
- **Nothing else changes with locale.** Heading, fact rows *other than the join
  URL*, duration line, join CTA (`Unirse a la reunión`), calendar CTA (`Añadir a
  Google Calendar`), billing lines, and help line stay Spanish and byte-identical
  (AC-006-30). The join URL's `?lang=` value is the one other thing that moves
  (AC-006-33), so the two renders of the same booking differ in exactly the two
  notice lines and that one character. An English booking receives a Spanish email
  with two English lines and an English-language join target. That is the
  decision, not a bug: localising the rest would rewrite spec 003's locked copy and
  break its acceptance tests.

**Typography and colour**: the notice is body copy, not a callout, in both
languages. Two plain `<p>` elements using the existing `INTRO_STYLE`
(`margin:0 0 16px;font-size:16px;color:#52525b;`) at 16px, `#52525b` on the
white card, so it reads as part of the email rather than as a warning banner.
No coloured box, no left rule, no warning icon, no red: the email already uses
one accent (the graphite CTA) and one alert idiom (`alertHtml`, red left rule)
reserved for the operator-only slot conflict. A consent notice styled as an
alert would imply something is wrong with the booking, and styling it as a
second callout would compete with the button it is supposed to precede. No bold,
no all-caps, no eyebrow treatment.

**Motion**: static. Email motion does not exist.

**A11y**: 16px body with `line-height: 1.5` (the card's inherited value), 7.4:1
contrast, reading order in the DOM matches the visual order and matches the text
part exactly (same two lines, same position, same locale), so a screen-reader
user and a plaintext user are told the same thing before they can reach the
button. The button's accessible name is unchanged.

`lang="en"`: where it goes, and where it does not. When the notice is the English
pair, the two notice `<p>` elements **in the email HTML** carry `lang="en"`, so a
screen reader switches voice for those two lines instead of reading English with
Spanish phonetics. Those two `<p>` elements are the only place the attribute
appears, for three reasons:

- The email's own `<html>`/`<body>` stay `lang="es"`: the surrounding copy is
  Spanish (decision 4), so marking the document English would mislabel ninety
  percent of it. A per-paragraph attribute is the right instrument for a two-line
  island inside a Spanish document.
- The **join page** does not use per-paragraph attributes at all. It is a
  single-language document and puts the locale on `<html lang>` (Task 1 §A11y),
  derived from `?lang=` and matching the column it rendered.
- The attribute travels with the *notice selection*, not with the URL string: the
  same normalised booking locale that writes `?lang=en` onto the join URL is what
  selects the English pair and therefore the attribute. One captured value, three
  consumers (notice text, notice attribute, URL parameter), no second derivation.

The Spanish path emits no `lang` attribute at all — not on the paragraphs, not on
the container, not conditionally rendered in a way that changes whitespace. That
keeps the default path byte-identical to the Spanish rendering *without* the
locale machinery, which is the exact string AC-003-25 asserts: the notice is
added once, in Spanish, with no attribute, and the English column contributes
nothing to that path. "Byte-identical to today" would be the wrong claim here —
the notice lines are themselves the approved change (decision 6) — but
"byte-identical to the same page rendered with no locale support" is the claim
that matters and the one that keeps AC-003-25 meaningful.

**Anti-patterns to avoid**:
- A one-liner buried after the CTA, in a footer, or in a footnote-sized line, in
  either language.
- Wording that implies surveillance ("monitorizamos", "vigilamos", "we monitor",
  "we track") or that hides the actor ("esta sesión puede ser grabada",
  "podría grabarse", "this session may be recorded"). The meeting *is* recorded,
  by us, and the notice says so.
- Reusing the operator's red alert box, or inventing a second visual language for
  one paragraph.
- Dynamic interpolation (a date, a client name, a duration) inside the notice.
  Static copy is the requirement; interpolating turns a fixed string into a new
  escaping sink for no benefit.
- Machine-translating at send time, or reading the locale from the request on the
  webhook path. The locale is the one captured at booking (Task 8).
- Em dashes, and any wording that trips the banned-stem list, in either locale.
- Touching the subject line or the preheader, in either locale. Both are locked,
  both are Spanish, and both are already the wrong place for a legal notice.
- A second language of the *surrounding* copy: no part-English heading, no
  bilingual fact rows, no "Duración / Duration".

**Watch items (Coder must check)**:
- **An existing test now encodes the old behaviour.**
  `src/__tests__/AC-003-client-email.test.ts` AC-003-25 asserts the
  billing-enabled client body with `expect(payload.text).toBe(lines.join('\n'))`
  and the HTML with a matching `toBe`. AC-006-05 deliberately changes that
  output. Updating that assertion is authorised (`10-tasks.md` decision 6), but
  it is the one place in this change that edits a previously frozen contract, so
  the authorisation and the reason belong in the commit or PR body (per
  `docs/TESTING.md` §Tests That Encode a Defect), and the scenario ID
  `AC-003-25` must stay in the test name. Do not "fix" it by loosening `toBe` to
  `toContain` for the whole payload: the new exact expected text, with the two
  notice lines in position, is the stronger assertion and the one that keeps the
  guarantee meaningful.
- **The default path must not move.** AC-003-25 and the AC-003 `toContain`
  assertions all describe the Spanish (default) rendering. Write the Spanish pair
  first, get the whole existing suite green, and only then add the locale
  selector: a diff that adds both languages at once cannot tell you whether a
  failure is a placement bug or a selection bug.
- Other AC-003 assertions use `toContain` on specific fragments
  (`href="${JOIN_URL}"`, `>Añadir a Google Calendar</a>`, `Reserva sin cargo`,
  `pro-rata`); an insertion, not a reword, keeps them green. If any of them goes
  red, the notice was placed wrongly, not the test.
- `src/__tests__/AC-003-direct-path-emails.test.ts` asserts the direct text part
  opens with `Tu reserva con RexiAI está confirmada.` and closes with
  `¿Dudas? Responde a este correo.`; inserting the notice in the middle keeps
  both, which is the check that placement did not drift to the head or tail.
- The banned-stem test runs on `subject`, `text` and `html` of the direct
  variant. Run it for the **English** notice too, not just visually inspect it:
  the stem list is Spanish billing vocabulary and an English phrase can still
  collide (`charge`, `billing`).
- Both lines must appear in **both** parts of **both** client variants, before
  the join link, in exactly one language, and in neither part of either operator
  variant. Four appearances per locale, zero operator appearances, one language
  per email.
- AC-006-30 is the guard against scope creep: render the same booking twice with
  `es` and `en` and assert the two emails differ **only** in the two notice lines
  and the join URL's `lang` value. Write those two permitted differences down
  before asserting equality of the rest; if a third permitted difference becomes
  necessary, the locale has leaked out of the notice, and that is the finding, not
  the test to relax.
- `escapeHtml` is the only HTML sink; do not build the notice block by
  concatenating into an existing style string without passing the copy through
  it.
- Adding `lang="en"` to the English notice paragraphs must not touch the Spanish
  rendering. If the attribute ends up in the shared `INTRO_STYLE` string, the
  default-path HTML stops being byte-identical to the same page rendered with no
  locale support, and AC-003-25 goes red for the wrong reason. Put the attribute
  on the `<p>` element, keyed off the same normalised locale that selects the
  English pair. The join page is not in scope for this rule: its locale lives once
  on `<html lang>`.

### Task 8: Locale-aware consent notice (booking's language)

No new visual surface: no new component, no layout change, no new copy
container. The design content of this task is the copy table above (Task 2) and
the default rule, both of which are settled here so the Coder does not have to
invent them while writing the plumbing.

- **Two values, one default.** `'en'` selects the English pair; `'es'`, a
  missing/`null` value, and anything unrecognised (`'fr'`, `'EN'`, `''`) select
  the Spanish pair. Normalisation never throws and never rejects a booking: a
  locale is a presentation hint, and no client is ever refused a meeting because
  of a string in a payload.
- **Spanish is the reference rendering**, not the fallback: it is the copy the
  frozen spec 003 assertions describe, so it must remain reachable as the path
  that changes nothing.
- **Only the notice localises, plus the join URL's `lang` value.** The locale's
  entire visible effect is those two lines; its only other effect is the one
  character after `?lang=` on the join URL (AC-006-30, AC-006-33). It does not
  change the email's subject, preheader, chrome, layout, the join CTA label, the
  calendar CTA, or any other fact row, and it does not reach the operator email at
  all.
- **The locale travels, it is not re-derived.** On the billing-enabled path it
  survives via checkout metadata (Task 8's mechanism); the webhook must not
  re-read a header, a default, or the current session's language. A wrong-but-
  consistent locale is a support ticket; a locale that flips between the booking
  and the confirmation email is a bug the client can see.
- **The join interstitial reuses the same two values and the same default rule**
  (Task 1 §Locale selection), and it no longer needs a second source: the
  booking's normalised locale is written into the join URL as `?lang=` when the
  email is built (AC-006-33), so the page reads back the value the notice was
  selected from instead of sniffing anything. One vocabulary, one default (`es`),
  three consumers of one captured value (notice text, notice `lang` attribute,
  URL parameter). The page normalises the parameter with the identical rule (`en`
  and only `en` selects English), so a truncated or hand-edited URL degrades to
  Spanish rather than to a broken page.
- **`?lang=` is not a fourth locale source.** It is a transport for the second
  one. The chain is: SPA locale at submit → API normalisation → (checkout
  metadata on the enabled path) → both the notice selector and the join URL.
  Nothing downstream re-reads a header, a device setting, or a cookie, which is
  why the URL parameter and the email copy cannot disagree.

## Out-of-scope tasks

- **Task 3, Participant count excludes the bot**: pure counting logic, no
  human-facing surface.
- **Task 4, Recording starts/stops at the two-non-bot-humans threshold**: pure
  decision function, no human-facing surface.
- **Task 5, Recording output lands in `RECORDINGS_DIR`**: file-format mechanics.
- **Task 6, Single configurable recordings location**: configuration plumbing.
- **Task 7, Missed meetings are visible**: an operator-facing durable record (log
  line plus marker). The task pins "visible to the operator", not a UI, so no
  design directive applies. If it later grows a real operator surface (email,
  issue, dashboard), that is a new spec with its own design stage.
- **Hosting, certificates, DNS, and the link's delivery mechanism**: out of
  scope per `10-tasks.md`. This document states the observable contract only.
