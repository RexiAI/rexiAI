# 007-client-requested-reschedule

> Spec pipeline archive. Original source: `specs/007-client-requested-reschedule/` (deleted by this script).
> Archived: 2026-10-28

## Original ask

# 007 — Client-requested reschedule

## The problem, in my words

A client books a slot and later needs a different time. Today the only way that
happens is the client replies to the booking email (*"¿Dudas o necesitas cambiar
la hora? Responde a este correo."*) and I move it by hand — which means reading
mail, checking availability, editing the calendar, re-sending a link.

I asked whether this could be done by the client clicking in their calendar and
"proposing a new time". That doesn't work here: my organizer calendar is
Microsoft Graph, and Google Calendar only offers "propose new time" on events
organized by a Google Calendar — a Gmail user receiving my invite can accept or
decline, not propose. Outlook clients can propose; Gmail clients can't. So the
feature would silently exist for half my clients.

## What I want

1. **A link in the booking email that lets the client move the meeting
   themselves.** Same visual family as the join page — it's the same client, on
   the same unfamiliar domain, and it must not look like phishing.

2. **It must work for every client**, whatever calendar app they use. No Google
   API, no calendar-client feature dependency.

3. **It must show real availability** — the same windows the booking form uses,
   not a free-text "when suits you?".

4. **When they pick a new time, the change happens for me too**: the calendar
   event moves, the old slot is released, and I get told about it. That last part
   matters — a silent move is worse than no reschedule at all.

5. **The join link keeps working.** The meeting link in the calendar event must
   be the Jitsi room, and it should be visible in the calendar's location field,
   not buried in the description — on a phone the location field is the thing you
   tap.

6. **No Google Meet, ever.** There is none today and it must stay that way.

## Constraints

- No inbound connections: this machine is behind carrier NAT (spec 006, measured).
- Must not break the free/billing-disabled path, the consent notice, or the
  locale handling added in 006.
- A moved meeting must not be able to double-book the slot it moves into, and the
  old slot must stop being offered.
- The reschedule link has to be safe to put in an email: it will be forwarded,
  quoted, and possibly opened months later.

## What I don't want

- A client able to move a meeting into the past, into a slot that's already
  taken, or outside the availability windows.
- Unlimited reschedules with no trace — at some point a human should notice.
- Anything that requires the client to have a particular calendar provider.

## Tasks

# 007 — Client-requested reschedule (tasks)

Source: `specs/007-client-requested-reschedule/00-informal.md`.

## Verified context (code facts the tasks build on)

- `src/domain/calendar.ts` is the provider-agnostic facade; `resolveAdapter()` has
  one case (`microsoft`). `CalendarAdapter` exposes `createEvent`,
  `findEventByBookingId`, `findOverlappingBookingId`, `getBusyIntervals`. There is
  **no** update/move/cancel operation.
- `src/domain/microsoftGraph.ts` is the only adapter. Events are created with
  `singleValueExtendedProperties: [{ id: DEDUP_PROPERTY_ID, value: bookingId }]`
  where `DEDUP_PROPERTY_ID = 'String {00020329-0000-0000-C000-000000000046} Name rexi_booking_id'`.
  The event body carries the branded join URL (`input.joinUrl`), and — deliberately
  — no `isOnlineMeeting`/`onlineMeetingProvider` and no `location` field.
- `src/domain/meetingUrl.ts` exposes `realRoomUrl(room)` (`https://meet.jit.si/<room>`)
  and `roomFromJoinUrl(joinUrl)` (extracts `rexi-<16 hex>` from any join URL).
  `src/domain/meeting.ts` `createMeetingLink` returns the **branded** join URL
  `https://meet.rexi-ai.com/rexi-<16hex>?lang=<locale>`.
- Availability comes from `config/availability.yaml` (weekly windows + per-date
  exceptions) via `src/domain/availability.ts`; `AVAILABILITY_DAYS/HOURS/TIMEZONE`
  override it. Slots are computed per requested date (`computeSlotsForDate`), and
  `/api/availability` filters them against `getBusyIntervals`.
- **Bookings have no database.** For the billing path, `bookingId` is the Stripe
  Checkout Session id (`session.id`); booking fields live in session metadata. The
  billing-disabled path (`api/bookings/direct.ts`) creates `bookingId = randomUUID()`
  with no Stripe session at all — the only durable record is the calendar event's
  `rexi_booking_id` extended property. **A reschedule token must not assume a
  Stripe session exists.**
- `api/bookings/calendar.ts` `hasConflict` + `findOverlappingBookingId` already
  exclude a booking's own id (`other !== input.bookingId`), so moving an event
  never conflicts with itself.
- Spec 006 landed `?lang=` locale plumbing, `src/domain/meetingUrl.ts`, the consent
  notice in both client emails (`src/domain/consentNotice.ts`), and the local
  recording bot. None of it is reopened here; the reschedule emails must reuse the
  same consent-notice and locale rules.

## Scope boundaries (non-goals)

- **Google Calendar API migration.** Out of scope — the only provider remains
  Microsoft Graph.
- **Client-side "propose new time" from a calendar client.** Out of scope — the
  informal spec explicitly rules this out (only works for Gmail's own organizer).
- **Cancel/refund flows.** Out of scope — reschedule moves a meeting; it does not
  cancel, refund, or touch money.
- **Hosting mechanics for the branded host.** Out of scope — we specify the link
  shape (branded host, `/reschedule/<token>?lang=`) and the API that backs it, not
  how the page is served (mirrors spec 006's "Vercel/redirect hosting is out of
  scope" boundary).
- **The recording bot / recording pipeline.** Untouched. The room is unchanged by a
  move, so `deriveRoom` / `findReservationByRoom` keep working without a rewrite.

## Resolved ambiguities (assumptions the human must confirm before `/build`)

These are decisions the informal spec left open. Each is stated as an assumption so
it can be overruled — they are **not** guesses the Coder may re-derive.

1. **Token format.** The reschedule token is an opaque random value: 32 random
   bytes, lowercase hex, 64 characters (`/^[0-9a-f]{64}$/`). It is not a hash of
   booking data and carries no email, bookingId, room, date, or time.
2. **Token binding & single-use.** A token is bound to exactly one booking (the
   calendar event that carries it) and is **effectively single-use**: a successful
   reschedule rotates the token (writes a new one, emails it in the new
   confirmation), which invalidates the old token. A rotated/old token, a wrong
   token, and an expired token all produce the same generic response — the client
   is never told which failure it was.
3. **Token expiry.** No absolute TTL. A token is treated as expired when its
   booking's meeting start is in the past (there is nothing to reschedule) or when
   the reschedule limit is reached. This is what makes a months-old forwarded link
   fail cleanly.
4. **Reschedule limit.** `MAX_RESCHEDULES = 3` (module constant). Reschedules 1–3
   succeed and notify the operator with the running count; a 4th attempt is
   refused (`RESCHEDULE_LIMIT`) and the operator is notified that a client tried to
   exceed the limit. This turns "at some point a human should notice" into a
   concrete, testable bound. (Chosen 3; overrule here if you want a different
   number or an env var.)
5. **Location field value — RESOLVED by decision D4 (human-approved).** The
   `location` field carries the **branded** join URL, byte-identical to the body
   (including `?lang=`), never the raw `meet.jit.si` room. The original default
   (real Jitsi room) is overruled; see decision D4.
6. **Booking data recovery for a move.** Because there is no database, the booking
   state the move needs (email, join URL, hours, locale, count) is stored as
   additional single-value extended properties on the calendar event at create
   time (see Task 2). Stripe metadata is deliberately **not** read by the
   reschedule path — that is what makes the billing-disabled path work identically.
7. **Silent-move policy — RESOLVED by decision D5 (human-approved).** The
   operator notification is on the critical path: its failure returns a 5xx
   (surfaced to the log/alert path), never a silent success. The client
   confirmation is best-effort (logged, does not roll back). Neither a
   client-confirmation failure nor an operator-notification failure rolls back the
   move, and no compensating action is attempted — "a moved meeting with a
   missed email beats a refused move." (Closed: no hard guarantee, no pre-send, no
   compensation.)

## Documented decisions (human-approved)

These answers were given at the human gate. They are decisions, not assumptions
— the Coder may not re-derive them. Where a decision overrules a "Resolved
ambiguities" item, that item is annotated inline.

**D1 — Task 8 is added (the reschedule page).** Tasks 1–7 build everything
except the document the client opens. Task 8 (below) owns it, with scenarios
AC-007-39 … AC-007-47 in `20-acceptance/AC-007-reschedule-page.md`.

**D2 — The reschedule limit is visible before submitting.** `GET
/api/reschedule` gains one additive boolean, `canReschedule` (`true` when the
booking is below `MAX_RESCHEDULES` and its meeting is still in the future, `false`
otherwise). AC-007-22 is amended (ID kept); the page renders the limit state
directly from `canReschedule: false` instead of after a refused submit. No other
field is exposed — the GET response still returns no email, bookingId, joinUrl, or
count (AC-007-23 stands).

**D3 — The spec 003 byte-freeze is authorised to change.** Task 7 inserts the
reschedule link and shortens `CLIENT_HELP_HTML`. Per `docs/TESTING.md` §"Tests
That Encode a Defect", the frozen assertions may be updated: scenario IDs
`AC-003-19` and `AC-003-25` are preserved verbatim; only the help line and the new
link change; nothing else in the body moves; the test comment must name this
authorisation. *(Inspection note: `AC-003-19` pins the operator email `toBe` body,
which Task 7 does not change — the operator email gets no reschedule link
(AC-007-38) and has no help line — so in practice only `AC-003-25` (enabled client
`toBe`) and the disabled variant's help-line assertion (`AC-003-22`,
`toContain('¿Dudas o necesitas cambiar la hora?…')`) change.)*

**D4 — `location` carries the branded join URL.** The calendar event's `location`
field holds the branded join URL (byte-identical to the body's join URL, including
`?lang=`), never the raw `meet.jit.si` room. Rationale: one link, one experience; a
tap lands on the page that carries the recording notice. The room identity itself
is unchanged. Amends AC-007-10 and AC-007-11; AC-007-12 (room never rotates) still
holds.

**D5 — Notify-failure does not roll back the move.** The move stands. A
client-confirmation failure is logged and the endpoint still returns success
(200); an operator-notification failure surfaces loudly (5xx into the log/alert
path) but the move is still not rolled back. No compensating action is attempted
in either case — "a moved meeting with a missed email beats a refused move."
Amends AC-007-34; adds AC-007-49 (client confirmation) and AC-007-47 (the page's
no-retry unconfirmed state).

**D6 — The token stays in `?token=` on the resolve call.** Accepted, with the note
that the token therefore lands in the branded host's access logs, and scrubbing
those logs is an ops task, not this spec's.

**D7 — Client reschedule confirmation email is Spanish-body + localised notice.**
The body copy (subject, heading, fact labels, help, CTAs) is Spanish; only the
consent notice localises (es/en per 006's rule) and the join URL carries `?lang=`.
This mirrors spec 006 decision 9 — not a third convention. Adds AC-007-50.

**UX closings (from `15-design.md`'s open points).** (a) The page owns its states:
the API never returns copy the page renders verbatim; the page owns 100% of the
visible copy. (b) No second visual language: the page reads as a sibling of
`deploy/join/index.html`. (c) Control borders are `#71717a` or darker (WCAG 1.4.11
non-text contrast); `#e4e4e7` is a decorative hairline only.

**`15-design.md` sync (do not edit here).** The UX file must be updated at: Task 5
read contract (add `canReschedule`) and its "limit is invisible" watch item
(resolved by D2); the "token travels in a query string" watch item (resolved by
D6); Task 6's "bilingual or Spanish-body" watch item (resolved by D7); Task 7's
"byte-freeze" watch item (resolved by D3); Task 8's "add Task 8" decision needed
(resolved by D1); and the Global Tokens border rule (now a decision). The Task 8
hosting watch item (same-origin `/api/*` on `meet.rexi-ai.com`) remains a hosting
obligation, not a spec change.

## Tasks

### Task 1 — Opaque reschedule token

A single leaf module (sibling of `meetingUrl.ts`) that mints and shape-checks
reschedule tokens. Tokens are capability-bearing and travel in email, so they must
reveal nothing and be cheap to reject when malformed.

Acceptance criteria:
- `generateRescheduleToken()` returns a fresh token: 32 random bytes hex-encoded,
  lowercase, exactly 64 chars, matching `/^[0-9a-f]{64}$/`.
- Generation takes **no booking field as input** (email, bookingId, join URL, date,
  startTime are never inputs) — it is `randomBytes(32)` only, so it cannot leak or
  be derived from booking data.
- Two successive generations return different values (randomness, not a
  deterministic hash).
- `isValidRescheduleToken(value)` returns `true` only for a 64-char lowercase-hex
  string and `false` otherwise (empty, wrong length, uppercase, `/`, `_`, `+`, any
  non-hex char). A malformed token is rejected **before** any calendar/Graph call.

Scenarios: `20-acceptance/AC-007-token.md` (AC-007-01 … AC-007-03).

### Task 2 — Persist and resolve booking reschedule state on the calendar event

The calendar event becomes the durable store for reschedule state, because the
billing-disabled path has no Stripe session. `createEvent` writes the state; a new
adapter method resolves a token back to it.

Extended properties (single-value, same `String {00020329-…} Name <key>` shape as
`rexi_booking_id`):
- `rexi_booking_id` (existing) — the booking id.
- `rexi_reschedule_token` — the current token.
- `rexi_reschedule_count` — decimal string, `"0"` at create.
- `rexi_join_url` — the branded join URL (preserved verbatim so the room never
  rotates on move).
- `rexi_client_email` — the client email.
- `rexi_hours` — the slot duration.
- `rexi_locale` — the booking locale (`es`/`en`).

Acceptance criteria:
- `createEvent` accepts the token and (optionally) the locale and writes all seven
  properties above (count `"0"`). Existing callers that do not pass a token must
  still write the other fields — every booking, both billing paths, gets reschedule
  state from the start.
- New `CalendarAdapter.findBookingByRescheduleToken(token)` resolves a token to the
  booking state `{ bookingId, email, date, startTime, hours, joinUrl, locale,
  count }` or `null`. `date`/`startTime` come from the event's current start;
  `hours`/`email`/`joinUrl`/`locale`/`count` from the stored properties.
- Unknown, malformed, or rotated tokens resolve to `null`.
- `findBookingByRescheduleToken` reads the calendar only — it never touches Stripe.

Scenarios: `20-acceptance/AC-007-token-store.md` (AC-007-04 … AC-007-07).

### Task 3 — Calendar move operation and `location` field

A new `moveEvent` adapter method moves an existing event to a new slot, and
`createEvent` gains the `location` field. The meeting room and `bookingId` never
change across a move.

Acceptance criteria:
- `moveEvent` finds the event by `bookingId` (resolving the Graph id internally),
  PATCHes `start`/`end` to the new date/startTime with the **same** `hours`, keeps
  `subject`, `attendees`, body, and `rexi_booking_id` unchanged, and writes the new
  `rexi_reschedule_token` and incremented `rexi_reschedule_count`.
- On both `createEvent` and `moveEvent`, the event's `location` field is the
  branded join URL (byte-identical to the body's join URL, including its `?lang=`
  parameter), omitted when `joinUrl` is absent or not a valid `rexi-<16hex>` room.
  The raw `meet.jit.si` room URL is never placed in `location` (decision D4).
- Moving the **same** Graph event releases the old slot (the event no longer
  occupies it) — there is no delete-and-recreate, so the join URL (room) and
  `bookingId` stay traceable.
- The body's join link is untouched: it still references the branded URL with the
  same room and `?lang=`.

Scenarios: `20-acceptance/AC-007-calendar-move.md` (AC-007-08 … AC-007-13).

### Task 4 — Reschedule validation (bounds + re-checked availability + limit)

Pure validation that returns a typed result (never throws for expected failures).
It runs at submit time, after the token resolves, and immediately before the move.

Acceptance criteria:
- Reject with a distinct code (never a throw) for: a past new date; a booking whose
  meeting start is already in the past (token expired); a new start outside the
  availability windows; a new slot occupied by a **different** bookingId
  (re-checked against the live calendar, not the availability list the client
  already saw); and a booking at/over `MAX_RESCHEDULES`.
- The conflict check uses `findOverlappingBookingId` (or equivalent) which excludes
  the booking's own id — rescheduling into a slot that only overlaps its own
  current event is **not** a conflict.
- A successful validation increments the count; the count is enforced before the
  move, so the limit cannot be bypassed by racing two submits (each submit re-reads
  the current count from the event).

Scenarios: `20-acceptance/AC-007-reschedule-validation.md` (AC-007-14 … AC-007-21).

### Task 5 — Reschedule API endpoints (resolve + submit)

`api/reschedule.ts` exposes two operations over one path. It is billing-agnostic:
it reads booking state from the calendar event, never from Stripe.

- `GET /api/reschedule?token=<token>` — resolves the token and returns the current
  slot `{ date, startTime, hours, canReschedule }` where `canReschedule` is `true`
  when the booking is below `MAX_RESCHEDULES` and its meeting is still in the
  future, `false` otherwise. It returns nothing else — **no email, no bookingId,
  no joinUrl, no count** (decision D2).
- `POST /api/reschedule` with body `{ token, date, startTime }` — validates (Task
  4), moves (Task 3), notifies (Task 6), and returns
  `{ date, startTime, hours, joinUrl }` with `joinUrl` equal to the booking's
  existing (unchanged) join URL. `hours` is the booking's stored duration; the
  client never submits a duration.

Acceptance criteria:
- Method-guarded (GET only resolves, POST only submits; anything else 405).
- Rate-limited on its own key (`reschedule:<ip>`), independent of the booking key.
- GET returns `canReschedule` (a boolean) alongside `{ date, startTime, hours }`, and
  nothing else — the email, bookingId, joinUrl, and count are never returned.
- A wrong/rotated/expired token returns one generic `404` with code
  `INVALID_RESCHEDULE_TOKEN` and a static message — no distinction between the
  three, and no calendar write.
- Validation failures map to their Task 4 codes with the appropriate 4xx status.
- A successful POST writes the move and sends notifications; `joinUrl` in the
  response is the pre-existing room, byte-identical to before the move.

Scenarios: `20-acceptance/AC-007-reschedule-api.md` (AC-007-22 … AC-007-28, AC-007-48).

### Task 6 — Reschedule notifications (operator + client)

Two new email shapes built on the existing `email.ts` / `emailDirect.ts` plumbing.
Both follow the spec 006 consent-notice and locale rules.

Acceptance criteria:
- Operator email: client email, old slot (date/time), new slot (date/time),
  `bookingId`, the **locale-free** join URL (`localeFreeJoinUrl`), and the new
  reschedule count. No consent notice (operator mail never carries it).
- Client confirmation: new slot (date/time), the join URL **with** `?lang=` for the
  booking locale, the consent notice (Spanish/English per locale) placed before the
  join link, and a reschedule link carrying the **new** rotated token.
- The operator is also notified when a reschedule is refused for hitting the limit
  (the "a human should notice" backstop).
- Operator-notification failure returns a 5xx (never a silent success) and does
  not roll back the move; client-confirmation failure is logged and the move
  stands (best-effort). No compensating action is attempted in either case
  (decision D5).

Scenarios: `20-acceptance/AC-007-reschedule-emails.md` (AC-007-29 … AC-007-34, AC-007-49, AC-007-50).

### Task 7 — Reschedule link in the booking confirmation emails

Both client confirmation email variants (billing-enabled in `email.ts`, billing-
disabled in `emailDirect.ts`) gain the reschedule link.

Acceptance criteria:
- The link is `${MEETING_BASE_URL}/reschedule/<token>?lang=<locale>` — the branded
  host, `/reschedule/<token>` path, `?lang=` matching the booking locale (Spanish
  default when the booking has no locale).
- The path segment after `/reschedule/` is exactly the opaque 64-hex token: no
  email, bookingId, room, date, or time appears anywhere in the URL.
- The token in the link is the **same value** `createEvent` persisted as
  `rexi_reschedule_token` for that booking — a mismatch would make the link 404.
- The operator email carries **no** reschedule link (the token is a client-only
  capability).

Scenarios: `20-acceptance/AC-007-reschedule-link.md` (AC-007-35 … AC-007-38).

### Task 8 — Reschedule page document

The static, self-contained page the client opens from the reschedule link:
`deploy/reschedule/index.html` (sibling of `deploy/join/index.html`), plus
`deploy/reschedule/README.md` (URL contract + hosting contract). Native CSS in one
document, no framework, no external request other than the page's own two API
calls. The page reads the token from `location.pathname` (`/reschedule/<64
lowercase hex>`) and the locale from `?lang=`; every state is a fully-written
`<section>` revealed by a synchronous inline script. (Full visual spec:
`15-design.md` Task 8.)

Acceptance criteria:
- On load with a valid token, the page fetches `GET /api/reschedule?token=<t>`,
  renders the current slot `{ date, startTime, hours }`, then fetches
  `GET /api/availability?date=<current date>` and renders the slot choices. When
  `canReschedule` is `false` it renders the limit state (mailto exit) instead of
  the form.
- Success renders the new slot and reveals no join URL, no bookingId, no client
  email anywhere in the document (the POST response's `joinUrl` is discarded
  unrendered).
- A wrong, expired, or rotated token renders one invalid state (no distinction,
  matching AC-007-25) with a `mailto:info@rexi-ai.com` exit and no retry of the
  same link.
- `?lang=` selects the locale: `en` renders English; `es`, absent, empty, or
  anything else renders Spanish (the default). The page reads language from
  `?lang=` alone.
- The no-JS path is usable: a `<noscript>` block renders a mailto state without
  JavaScript.
- The token appears only in the resolve request line and the POST body. It never
  appears in the DOM, `data-*`, storage, history, a `href`/`mailto:` URL, or the
  address bar after a move. `referrer: no-referrer` and `robots: noindex` are set.
- Both locale blocks ship for every state; a missing locale/state pair falls back
  to the Spanish section, never a blank page.

Scenarios: `20-acceptance/AC-007-reschedule-page.md` (AC-007-39 … AC-007-47).

## Acceptance scenarios

## AC-007-01 — Token is 32 random bytes hex-encoded, lowercase, 64 chars
## AC-007-02 — Generation is independent of booking data and random
## AC-007-03 — A malformed token is rejected without a calendar call
## AC-007-04 — Create event writes the full reschedule state
## AC-007-05 — A token resolves to its booking's current state
## AC-007-06 — An unknown token resolves to null
## AC-007-07 — A rotated token no longer resolves
## AC-007-08 — Move changes start and end, keeps the duration and booking id
## AC-007-09 — Move releases the old slot
## AC-007-10 — Location field carries the branded join URL on create
## AC-007-11 — Location field carries the branded join URL on move
## AC-007-12 — The room never rotates on reschedule
## AC-007-13 — Move writes the new token and increments the count
## AC-007-14 — Cannot reschedule into a past date
## AC-007-15 — Cannot reschedule a meeting that has already happened
## AC-007-16 — Cannot move outside the availability windows
## AC-007-17 — Cannot move into a slot occupied by a different booking
## AC-007-18 — The submit re-check catches the race between two clients
## AC-007-19 — A slot overlapping only one's own event is not a conflict
## AC-007-20 — Cannot exceed the reschedule limit
## AC-007-21 — A reschedule within the limit succeeds and increments the count
## AC-007-22 — GET resolves a valid token to the current slot and reschedule eligibility
## AC-007-23 — GET does not reveal email, bookingId, or join URL
## AC-007-24 — POST moves the meeting and returns the unchanged join URL
## AC-007-25 — A wrong, expired, or already-used token returns one generic error
## AC-007-26 — Reschedule is rate-limited independently of booking
## AC-007-27 — Wrong method is rejected
## AC-007-28 — Reschedule works without a Stripe session (billing-disabled parity)
## AC-007-29 — Operator is notified with old and new slot, bookingId, and count
## AC-007-30 — Operator email is locale-free and never carries the consent notice
## AC-007-31 — Client confirmation carries the new slot, notice, and join link
## AC-007-32 — Client confirmation carries the new rotated token
## AC-007-33 — Operator is notified when the limit blocks a further reschedule
## AC-007-34 — An operator-notification failure surfaces loudly and never rolls back the move
## AC-007-35 — Enabled client email carries the reschedule link
## AC-007-36 — Disabled (direct) client email carries the reschedule link
## AC-007-37 — The reschedule URL reveals nothing beyond the token
## AC-007-38 — The operator email carries no reschedule link
## AC-007-39 — A valid token renders the current slot and the available-slot picker
## AC-007-40 — A date with no open slots shows the empty message and keeps the picker
## AC-007-41 — A successful move renders the new slot and reveals no join URL, booking id, or client email
## AC-007-42 — With JavaScript disabled the page is usable via a mailto exit
## AC-007-43 — The token never appears in the DOM, storage, or any URL other than the resolve request
## AC-007-44 — A wrong, expired, or rotated token renders one invalid state with a mailto exit
## AC-007-45 — ?lang= selects Spanish or English; absent or unrecognised falls back to Spanish
## AC-007-46 — A client at the reschedule limit renders the limit state directly
## AC-007-47 — A 5xx response renders the unconfirmed state with no retry
## AC-007-48 — GET reports canReschedule false at the limit or after the meeting
## AC-007-49 — A client-confirmation failure is logged and the move stands
## AC-007-50 — The client reschedule confirmation is Spanish-body with only the notice localised

## Verification

# 25-verification.md — Verifier report (spec 007-client-requested-reschedule)

Stage 4 (Verifier) independent re-verification of stages 2–3.
Branch: `spec/007-client-requested-reschedule`. Attempt 1, phase 1.
Worked from `10-tasks.md`, `20-acceptance/*.md`, and `15-design.md` only (never
`00-informal.md`).

## Overall verdict

**PASS** — every gate attributable to this branch's diff is clean. Two
out-of-scope findings are recorded below and not fixed (per instruction): a
vendored-submodule design-principles FAIL (environmental, byte-identical
pre/post this branch) and a pre-existing scenario-ID collision in a tracked test
file. Neither is attributable to this branch; both are flagged for follow-up.

Gate-by-gate:

| Gate | Result | Exit | Attribution |
|---|---|---|---|
| Scenario traceability | PASS | 0 | 50/50 scenarios traced; all references resolve |
| Full test suite | PASS | 0 | 519 passed, 1 skipped (pre-existing LIVE-gated test) |
| Complexity (ESLint) | PASS | 0 | 0 errors, 10 warnings (e2e `no-console`, pre-existing) |
| Design-principles | PASS (scoped) | 1 plain / 0 blame-scoped | plain FAIL is vendored submodule content, not this diff |
| Scenario-to-behavior spot check | PASS | — | 3 scenarios verified, assertions match |

## Evidence: scenario traceability

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-10-28T16:41:16Z

{
  "checks": [1, 2],
  "passes": ["AC-007-01 — traced to a test", "AC-007-02 — traced to a test", "AC-007-03 — traced to a test", "AC-007-04 — traced to a test", "AC-007-05 — traced to a test", "AC-007-06 — traced to a test", "AC-007-07 — traced to a test", "AC-007-08 — traced to a test", "AC-007-09 — traced to a test", "AC-007-10 — traced to a test", "AC-007-11 — traced to a test", "AC-007-12 — traced to a test", "AC-007-13 — traced to a test", "AC-007-14 — traced to a test", "AC-007-15 — traced to a test", "AC-007-16 — traced to a test", "AC-007-17 — traced to a test", "AC-007-18 — traced to a test", "AC-007-19 — traced to a test", "AC-007-20 — traced to a test", "AC-007-21 — traced to a test", "AC-007-22 — traced to a test", "AC-007-23 — traced to a test", "AC-007-24 — traced to a test", "AC-007-25 — traced to a test", "AC-007-26 — traced to a test", "AC-007-27 — traced to a test", "AC-007-28 — traced to a test", "AC-007-29 — traced to a test", "AC-007-30 — traced to a test", "AC-007-31 — traced to a test", "AC-007-32 — traced to a test", "AC-007-33 — traced to a test", "AC-007-34 — traced to a test", "AC-007-35 — traced to a test", "AC-007-36 — traced to a test", "AC-007-37 — traced to a test", "AC-007-38 — traced to a test", "AC-007-39 — traced to a test", "AC-007-40 — traced to a test", "AC-007-41 — traced to a test", "AC-007-42 — traced to a test", "AC-007-43 — traced to a test", "AC-007-44 — traced to a test", "AC-007-45 — traced to a test", "AC-007-46 — traced to a test", "AC-007-47 — traced to a test", "AC-007-48 — traced to a test", "AC-007-49 — traced to a test", "AC-007-50 — traced to a test"],
  "fails": []
}

Note: an early invocation of this script transiently reported one dangling
`AC-005-02` reference (exit 1). That did not reproduce across three subsequent
runs. Investigation confirmed `AC-005-02` is a valid heading in
`docs/changes/001-landing-booking.md:446` (spec 001 numbers scenarios per TASK,
so its archive owns headings `AC-001`…`AC-017`, including `AC-005-01`…`AC-005-05`).
The reference therefore resolves; the transient was a race with the parallel
orchestrator's filesystem activity in the shared working tree. The current
clean state is deterministic (3× exit 0).

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-28T16:34:00Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 Test Files  70 passed (70)
      Tests  519 passed | 1 skipped (520)

The one skipped test is `describe.skipIf(!LIVE)('live: the bot joins a room and
records a real participant', …)` in `src/__tests__/AC-006-bot-adapter.test.ts`
(line 705) — a pre-existing live-environment test gated behind the `LIVE` env
var, in a file unchanged from `main`. It is a documented conditional skip, not a
silently-disabled acceptance test. No `AC-007` test uses `.skip`/`.skipIf`.

## Evidence: complexity gate

command: npm run lint
exit: 0
at: 2026-10-28T16:38:00Z

> rexiai-website@0.0.0 lint
> eslint .

✖ 10 problems (0 errors, 10 warnings)

All 10 warnings are `no-console` in `tests/e2e/*.e2e.ts` (funnel-consent-boundary,
home-timer-scan, switch-refusal). No `complexity` (≤6, eslint.config.cjs:51)
violations anywhere, and the changed `api/**` and `src/**` files are linted (not
in the ignore list). Type-check gate also confirmed clean separately:
`npx tsc -b --pretty false` → exit 0.

## Evidence: design-principles gate

Two runs recorded. The plain run is the full-tree scan; the `-BaseRef main` run
is the script's own blame-scoping mode (judges only this branch's diff), used to
answer the attribution question the prior stages raised.

### Plain run (full tree)

command: .standards/scripts/check-code-principles.sh --json
exit: 1
at: 2026-10-28T16:40:00Z

{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [{ "message": "Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }],
  "warns": [{ "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "45" }, { "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "101" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }, { "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "93" }, { "message": "Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75", "file": "./src/pages/Landing.tsx", "line": "13" }, { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22", "file": "./src/components/ServicesCarousel.tsx", "line": "32" }, { "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79", "file": "./src/components/ServicesCarousel.tsx", "line": "54" }, { "message": "Method body >20 lines (node): ./api/stripe-webhook.ts:141:160:getRawBookingFields:KISS_LINES=21", "file": "./api/stripe-webhook.ts", "line": "141" }, { "message": "Method body >20 lines (node): ./api/bookings/checkout.ts:44:65:buildSessionParams:KISS_LINES=23", "file": "./api/bookings/checkout.ts", "line": "44" }, { "message": "Method body >20 lines (node): ./api/bookings/recorded-billing.ts:218:240:?:KISS_LINES=24", "file": "./api/bookings/recorded-billing.ts", "line": "218" }, { "message": "Method body >20 lines (python): ./scripts/recording/whisper_transcribe.py:37:64:main:KISS_LINES=23 [approximate heuristic — comprehension/decorator forms can inflate the count; ADR 0006 warn phase]", "file": "./scripts/recording/whisper_transcribe.py", "line": "37" }, { "message": "Possible duplication (11x identical 4-line block, first at ./api/bookings.ts:18): date: string /startTime: string /hours: number /email: string", "file": "./api/bookings.ts", "line": "18" }, { "message": "Possible duplication (5x identical 4-line block, first at ./api/stripe-webhook.ts:277): startTime: string /hours: number /joinUrl?: string | null /date: string", "file": "./api/stripe-webhook.ts", "line": "277" }, { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:115): email: string /date: string /startTime: string /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "115" }, { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: \"problem\", /docs: { /description: /meta: {", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "115" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:19): startTime: string /hours: number /locale?: Locale /date: string", "file": "./api/bookings.ts", "line": "19" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:117): startTime: string /hours: number /amountTotal: number /date: string", "file": "./api/stripe-webhook.ts", "line": "117" }, { "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "132" }, { "message": "Possible duplication (3x identical 4-line block, first at ./src/domain/email.ts:160): date: string /startTime: string /hours: number /clientEmail: string", "file": "./src/domain/email.ts", "line": "160" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:446): date: string /startTime: string /hours: number /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "446" }, { "message": "Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "133" }, { "message": "Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30", "file": "./.standards/ci/templates/archunit/OutboxArchRules.java", "line": "30" }, { "message": "Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33", "file": "./.standards/ci/templates/archunit/SagaArchRules.java", "line": "33" }, { "message": "SRP: possible god file (node) — ./api/stripe-webhook.ts: 610 lines, 8 methods (split by responsibility)", "file": "./api/stripe-webhook.ts", "line": "" }, { "message": "LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)", "file": "./src/domain/time.ts", "line": "" }]
}

### Blame-scoped run (this branch's diff only)

command: .standards/scripts/check-code-principles.sh -BaseRef main --json
exit: 0
at: 2026-10-28T16:40:20Z

{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [],
  "warns": [{ "message": "Method body >20 lines (node): ./api/stripe-webhook.ts:141:160:getRawBookingFields:KISS_LINES=21", "file": "./api/stripe-webhook.ts", "line": "141" }, { "message": "Method body >20 lines (node): ./api/bookings/checkout.ts:44:65:buildSessionParams:KISS_LINES=23", "file": "./api/bookings/checkout.ts", "line": "44" }, { "message": "Method body >20 lines (node): ./api/bookings/recorded-billing.ts:218:240:?:KISS_LINES=24", "file": "./api/bookings/recorded-billing.ts", "line": "218" }, { "message": "Possible duplication (11x identical 4-line block, first at ./api/bookings.ts:18): date: string /startTime: string /hours: number /email: string", "file": "./api/bookings.ts", "line": "18" }, { "message": "Possible duplication (5x identical 4-line block, first at ./api/stripe-webhook.ts:277): startTime: string /hours: number /joinUrl?: string | null /date: string", "file": "./api/stripe-webhook.ts", "line": "277" }, { "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:115): email: string /date: string /startTime: string /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "115" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:19): startTime: string /hours: number /locale?: Locale /date: string", "file": "./api/bookings.ts", "line": "19" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:117): startTime: string /hours: number /amountTotal: number /date: string", "file": "./api/stripe-webhook.ts", "line": "117" }, { "message": "Possible duplication (3x identical 4-line block, first at ./src/domain/email.ts:160): date: string /startTime: string /hours: number /clientEmail: string", "file": "./src/domain/email.ts", "line": "160" }, { "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:446): date: string /startTime: string /hours: number /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "446" }, { "message": "SRP: possible god file (node) — ./api/stripe-webhook.ts: 610 lines, 8 methods (split by responsibility)", "file": "./api/stripe-webhook.ts", "line": "" }]
}

### Attribution determination

The plain run's single FAIL — `Cyclomatic complexity >6 (node):
./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7` (CC=10) — is
**environmental, not attributable to this branch**:

1. `git diff --name-only main...HEAD` contains no path under
   `.standards/skills/hallmark/`.
2. `git diff main...HEAD -- .standards/skills/hallmark/site/examples/cobalt-01/script.js`
   is empty — byte-identical pre/post this branch.
3. The blame-scoped run (`-BaseRef main`) exits 0 with `fails: []` — zero
   diff-introduced FAILs.

The blame-scoped run's 11 WARNs (KISS method-length, DRY 4-line duplication,
SRP god-file in `api/stripe-webhook.ts`) are review hints in files this branch
touched. None is a FAIL (KISS/DRY/SOLID are outside the default blocking set
`complexity,property-tests,component-per-file`). Flagged to the Architect below.

## Evidence: scenario-to-behavior spot check

command: (manual read of scenario .md vs test assertions)
exit: 0
at: 2026-10-28T16:41:16Z

Three scenarios checked at random; each test's assertions were read directly
against the scenario's Given/When/Then.

1. **AC-007-25 — wrong/expired/rotated token → one generic 404.** Scenario
   requires byte-identical responses across the three causes, code
   `INVALID_RESCHEDULE_TOKEN`, and no calendar move.
   `src/__tests__/AC-007-reschedule-api.test.ts:179` pushes the three bodies and
   asserts `new Set(bodies).size === 1`, `error.code === 'INVALID_RESCHEDULE_TOKEN'`,
   and `cal.mockMove` not called. Matches.
2. **AC-007-13 — move writes the new token and increments the count.** Scenario:
   token T0→T1, count "0"→"1". `src/__tests__/AC-007-calendar-move.test.ts:182`
   asserts `written[RESCHEDULE_TOKEN_PROPERTY_ID] === TOKEN_T1` and
   `written[RESCHEDULE_COUNT_PROPERTY_ID] === '1'`. Matches.
3. **AC-007-34 — operator-notification failure returns 5xx, move stands (D5).**
   Scenario requires 5xx (never silent), no rollback, logged.
   `src/__tests__/AC-007-reschedule-emails.test.ts:239` asserts status ≥500,
   `cal.mockMove` called exactly once, `console.error` containing the upstream
   detail. Matches.

No false green found: each checked test asserts the scenario's actual behavior,
not merely a same-ID placeholder.


## No unaccounted behavior

Skimmed the full diff (17 modified files + new files) against Tasks 1–8 and the
documented decisions D1–D7. Finding: **none unaccounted.**

- New domain modules (`rescheduleToken.ts`, `rescheduleUrl.ts`, `reschedule.ts`,
  `graphEventProperties.ts`, `rescheduleEmail.ts`) each map to a task (T1, T7,
  T4, T2, T6 respectively) and carry a header comment citing it.
- `api/reschedule.ts` + `api/reschedule/{resolve,submit,booking,errors}.ts` map
  to T5; `routeGuards.ts` and `errorText.ts` are DRY consolidations of the 405/
  429 envelope and the `errMsg`/`errorText` helper that six pre-existing handlers
  each owned a copy of (their headers say so) — legitimate refactor, not new
  behavior.
- `deploy/reschedule/{index.html,README.md}` map to T8 (the page document +
  hosting contract).
- The `AC-003-*` and `AC-006-*` test edits are the decision-D3 byte-freeze
  authorization (help line shortened, reschedule link inserted; scenario IDs
  preserved verbatim).

## Out-of-scope findings (recorded, not fixed — per instruction)

1. **Vendored design-principles FAIL (environmental).** Plain-run FAIL at
   `.standards/skills/hallmark/site/examples/cobalt-01/script.js:7` (CC=10) lives
   in the `.standards/` submodule's vendored example content, byte-identical
   pre/post this branch, and is absent from the blame-scoped run (exit 0). Not
   this branch's defect. Recommendation: exclude `.standards/**` from the
   design-principles scan, or downgrade vendored example content.
2. **Scenario-ID collision in a pre-existing tracked test.**
   `src/__tests__/AC-007-bookings.test.ts` is tracked on `main` (unchanged by
   this branch) and carries `AC-007-01`…`AC-007-08` with *bookings* semantics
   (free-hour billing, email/duration/off-grid/availability/conflict
   validation), while this spec's `AC-007-01`…`AC-007-08` are *token / token-
   store / calendar-move* scenarios. Both resolve under the mechanical gate
   (the IDs exist in the in-flight scenarios), so the gate does not flag it —
   but the same ID now names two unrelated behaviors. Pre-existing; recorded,
   not touched. Recommendation: renumber one side in a follow-up spec.
3. **Design-principles WARNs in touched files** (flag to Architect, non-blocking):
   KISS method-length in `api/stripe-webhook.ts:141`, `api/bookings/checkout.ts:44`,
   `api/bookings/recorded-billing.ts:218`; DRY 4-line booking-state-shape
   duplication (`api/bookings.ts`, `api/stripe-webhook.ts`, `src/domain/email.ts`);
   SRP god-file `api/stripe-webhook.ts` (610 lines, 8 methods). WARN = review
   hint, not a stop.

## Remediation budget

Attempt 1, phase 1: initial full run — no BLOCK, no code/design-gate FAIL
attributable to this branch.
Attempt 2, phase 1 (SPEC_PHASE1_RETRIES=1): one report-format FAIL from
`check-audit-trail.sh` (evidence-block heading mismatch for the complexity gate);
fixed by renaming the heading; re-run exits 0. Budget not consumed (the finding
was report formatting, not a code/design defect).


## Scoped re-verification — attempt 2, phase 1 (audit-trail gate)

Reason: `scripts/check-audit-trail.sh 007-client-requested-reschedule` exited 1
with a single FAIL — `no evidence block for 'complexity gate'` — because the
heading `## Evidence: complexity gate (ESLint)` carried a `(ESLint)` suffix that
broke the gate's case-insensitive exact match against the literal
`complexity gate`. The evidence content was correct; only the heading was wrong.

Fix: renamed the heading to exactly `## Evidence: complexity gate` (the raw
output block below it is unchanged).

command: bash .standards/scripts/check-audit-trail.sh 007-client-requested-reschedule
exit: 0
at: 2026-10-28T16:49:53Z

PASS 007-client-requested-reschedule: 10-tasks.md present and non-empty
PASS 007-client-requested-reschedule: 20-acceptance/ has an AC-*.md with a '## AC-NNN-NN' heading (AC-015-10)
PASS 007-client-requested-reschedule: 25-verification.md present and non-empty
PASS 007-client-requested-reschedule: 30-report.md present and non-empty
PASS 007-client-requested-reschedule: 15-design.md present and non-empty (AC-015-13)
PASS 007-client-requested-reschedule: evidence block 'scenario traceability' — command: .standards/scripts/check-scenario-traceability.sh --json, exit: 0, at: 2026-10-28T16:41:16Z
PASS 007-client-requested-reschedule: evidence block 'full test suite' — command: npm test, exit: 0, at: 2026-10-28T16:34:00Z
PASS 007-client-requested-reschedule: evidence block 'complexity gate' — command: npm run lint, exit: 0, at: 2026-10-28T16:38:00Z
PASS 007-client-requested-reschedule: evidence block 'design-principles gate' — command: .standards/scripts/check-code-principles.sh --json, exit: 1, at: 2026-10-28T16:40:00Z
PASS 007-client-requested-reschedule: evidence block 'scenario-to-behavior spot check' — command: (manual read of scenario .md vs test assertions), exit: 0, at: 2026-10-28T16:41:16Z
✔ Audit-trail check: specs/007-client-requested-reschedule complete, verifier evidence recorded.

The prior FAIL is gone: the audit-trail gate now exits 0. No other gate re-run —
this was scoped to the audit-trail gate per the re-verification discipline.

## Quality gates

# 30-report.md — spec 007-client-requested-reschedule

Stage 5a (Mutation Runner). Written against `10-tasks.md`, `20-acceptance/*.md`, and
`25-verification.md` only. `00-informal.md` was not read.

**Precondition satisfied:** `25-verification.md` exists and its current verdict is
**PASS** (attempt 1, phase 1). Stage 5a therefore ran.

## Verdict: GREEN

Mutation testing is **skipped — `mvp` tier** (one-line note and evidence in
§Mutation testing below). The full suite was re-run by this stage, independently of
the Verifier, and is green: **519 passed, 1 skipped, exit 0**. No stage-5a gate
blocks stage 5b. One **Verifier-owned** audit-trail heading string does still block
it, and it is not this stage's artifact — see §Audit-trail gate finding.

At `mvp` there is no mutation-kill work to perform, so this stage adds no new test
code — the suite state reported below is the same suite the Verifier checked,
re-executed once more by this stage.

---

## Verifier's verdict (carried forward)

**PASS** — `25-verification.md`, attempt 1, phase 1. Every gate attributable to this
branch's working tree is clean; two out-of-scope findings were recorded and not
fixed (vendored-submodule design-principles FAIL, pre-existing scenario-ID
collision). Not re-litigated here.

| Gate | Result | Exit | Attribution |
|---|---|---|---|
| Scenario traceability | PASS | 0 | 50/50 scenarios traced; all references resolve |
| Full test suite | PASS | 0 | 519 passed, 1 skipped (pre-existing LIVE-gated test) |
| Complexity (ESLint) | PASS | 0 | 0 errors, 10 warnings (e2e `no-console`, pre-existing) |
| Design-principles | PASS (scoped) | 1 plain / 0 blame-scoped | plain FAIL is vendored submodule content, not this diff |
| Scenario-to-behavior spot check | PASS | — | 3 scenarios verified, assertions match |

Carried forward verbatim; this stage did not modify any Verifier finding.

---

## Mutation testing: skipped — `mvp` tier

**One-line note (contract-mandated at `mvp`): Mutation testing skipped — `mvp` tier;
per `docs/SPEC_PIPELINE.md` §Conformance tiers the "Architect — mutation testing" row
is `skip` at `mvp` and runs at `production`/`multi-service` only, and per
`.standards/docs/CONFORMANCE_TIERS.md` mutation testing (PiTest / Gremlins / Stryker)
is a `production`-tier rule — at `mvp` it is out of scope, not an unmet gap. No
mutator was configured and none was run.**

Tier was verified live by this stage rather than assumed, three ways:

1. No `AGENTS_*.md` project-instructions file exists at the repo root (only
   `AGENTS.md`, which carries no `Conformance tier:` declaration), so
   `check-code-principles.sh` falls through to `TIER="${TIER:-mvp}"` (line 365).
2. The gate's own `--json` output reports `"tier": "mvp"`, freshly re-run by this
   stage with exit 0.
3. The project has adopted no mutation tooling at all: no `stryker.conf.*`, no
   `.strykerrc*`, no `node_modules/.bin/stryker`, no `mutation` script in
   `package.json` (`scripts` = dev, build, preview, lint, format, format:check,
   test). A direct `npx --no-install stryker run` fails with a module-resolution
   error (recorded below) — it never reaches the mutation phase.

Per the decision matrix, "a design gate blocks (… mutation below threshold) → fix
the code, never the threshold." No threshold was touched, no gate config edited, and
nothing in `.standards/` was modified.

## Evidence: conformance tier auto-detection source

command: ls AGENTS*.md; grep -n "Conformance tier" AGENTS.md; grep -n 'TIER="${TIER:-mvp}"' .standards/scripts/check-code-principles.sh; ls stryker.conf.* .strykerrc* node_modules/.bin/stryker
exit: 0
at: 2026-10-28T16:47:28Z

AGENTS.md
AGENTS.md: no 'Conformance tier:' declaration
365:TIER="${TIER:-mvp}"
no stryker config / binary / mutation script

(The trailing `ls` failing is what the shell `||` branch reports; the grep and the
declaration-absence checks are the load-bearing parts. The `exit: 0` is the
compound command's status after the `||` fallback.)

## Evidence: conformance tier reported by the gate

command: .standards/scripts/check-code-principles.sh -BaseRef main --json
exit: 0
at: 2026-10-28T16:46:35Z

tier: mvp
gates: complexity, dry, yagni, solid, component-per-file, property-tests
fails: 0
warns: 11

This is the blame-scoped mode (judges only what this change touched). It reproduces
the Verifier's scoped result exactly: `fails: []`, 11 WARNs, tier `mvp`. The
unscoped full-tree run is `exit: 1` on a single vendored FAIL inside the
`.standards/` submodule — recorded in `25-verification.md` and dismissed there as
environmental; not re-run by this stage and not attributable to this branch.

## Evidence: mutation tooling absent (Stryker invocation attempt)

command: npx --no-install stryker run
exit: 1
at: 2026-10-28T16:46:58Z

Error: Cannot find module 'stryker-api/config'
Require stack:
- /home/dbueno/.npm/_npx/49301fa88e4fa3d5/node_modules/stryker/src/ConfigReader.js
- /home/dbueno/.npm/_npx/49301fa88e4fa3d5/node_modules/stryker/src/stryker-cli.js
- /home/dbueno/.npm/_npx/49301fa88e4fa3d5/node_modules/stryker/bin/stryker

The `npx` resolution fetched the legacy `stryker` package rather than
`@stryker-mutator/core` (which this project does not depend on), and it fails at
module load. Recorded as proof that no mutation run was possible or attempted, not
as a gate failure — at `mvp` this run was out of scope and is reported for
transparency only.

---

## Final test status (full suite, run by this stage)

Re-run by this stage after its (skipped) mutation work, so the green verdict below is
this stage's own execution, not one inherited from the Verifier.

## Evidence: final full test suite

command: npm test
exit: 0
at: 2026-10-28T16:45:48Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  70 passed (70)
      Tests  519 passed | 1 skipped (520)
   Duration  22.45s

Identical to the Verifier's run (70 files, 519 passed, 1 skipped). The single skip is
the pre-existing, documented `.skipIf(!LIVE)` live-environment test in
`src/__tests__/AC-006-bot-adapter.test.ts` — a conditional skip in a file unchanged
from `main`, not a disabled acceptance test. No `AC-007` test carries
`.skip`/`.skipIf`.

`AC-007` coverage in the suite: 113 `it(`/`test(` declarations across 9 files
(`AC-007-token`, `AC-007-token-store`, `AC-007-calendar-move`, `AC-007-reschedule-link`,
`AC-007-reschedule-page`, `AC-007-reschedule-validation`, `AC-007-reschedule-api`,
`AC-007-reschedule-emails`, plus the pre-existing `AC-007-bookings`). All green.

---

## Equivalent mutants

**None — not applicable.** No mutants were generated, because the `production`-tier
mutation gate does not run at `mvp`. This is a genuine absence, not a claim that
"every surviving mutant was equivalent": there is no mutation score to qualify, no
survivor set to enumerate, and therefore no equivalent-mutant list to name. Nothing
here should be read as "mutation-clean" — the honest statement is **mutation
untested**, per the tier.

## Complexity summary (carried from the Refactorer via `25-verification.md`)

Not re-measured by this stage; carried forward, with the Verifier as the
re-executing party.

| Measure | Result | Source |
|---|---|---|
| Cyclomatic complexity ≤6 (ESLint `complexity`) | 0 errors, 10 warnings | Verifier `25-verification.md` |
| ESLint warning composition | 10 × `no-console` in `tests/e2e/*.e2e.ts`, all pre-existing | Verifier |
| Type check (`npx tsc -b --pretty false`) | exit 0 | Verifier |
| Design-principles, blame-scoped | exit 0, `fails: []`, 11 WARNs (reproduced by this stage) | Verifier + this stage |
| Design-principles, full tree | exit 1 — one FAIL in vendored `.standards/` example content | Verifier |
| Property tests (`production`+ only) | skipped — `mvp` tier | `docs/SPEC_PIPELINE.md` §Conformance tiers |

No FAIL attributable to this branch. The 11 scoped WARNs are review hints in files
this branch touched, all below the blocking set:

- KISS method length >20 lines: `api/stripe-webhook.ts:141` (`getRawBookingFields`,
  21), `api/bookings/checkout.ts:44` (`buildSessionParams`, 23),
  `api/bookings/recorded-billing.ts:218` (24).
- DRY 4-line booking-state-shape duplication across `api/bookings.ts`,
  `api/stripe-webhook.ts`, `src/domain/email.ts`.
- SRP god-file: `api/stripe-webhook.ts` (610 lines, 8 methods).

Carried forward to stage 5b as non-blocking. Per the decision matrix, a design-gate
WARN is recorded and flagged, never a stop.

## Out-of-scope findings carried forward (recorded by the Verifier, not fixed here)

1. Vendored design-principles FAIL at
   `.standards/skills/hallmark/site/examples/cobalt-01/script.js:7` (CC=10) —
   submodule content, absent from the blame-scoped run. Follow-up: exclude
   `.standards/**` from the design-principles scan, or downgrade vendored examples.
2. Scenario-ID collision: `src/__tests__/AC-007-bookings.test.ts` (tracked on `main`,
   unchanged) carries `AC-007-01`…`AC-007-08` with *bookings* semantics while this
   spec's `AC-007-01`…`AC-007-08` are token/token-store/calendar-move scenarios. Both
   resolve mechanically, so the traceability gate does not flag it. Pre-existing.
   Follow-up: renumber one side in a separate spec.

Recorded, not fixed — out-of-scope findings are the Verifier's to record and a
follow-up spec's to resolve, per the decision matrix. Neither is attributable to this
branch's change.

---

## Remediation record

| Phase | Attempt | BLOCK | Resolution |
|---|---|---|---|
| Phase 1 (pre-PR) | attempt 1 | none | n/a — no BLOCK occurred |
| Phase 2 (post-PR) | — | none | not started; the pipeline has not pushed |

Carried forward from `25-verification.md`: *"Attempt 1, phase 1. No BLOCK, no FAIL
attributable to this branch. Budget not consumed."* This stage adds no BLOCK of its
own (mutation gate skipped; final suite green), so the Phase 1 budget still reads
**0 of 3 consumed**.

**No orchestrator loop summary was supplied to this stage.** Explicitly, rather than
inventing one: no phase-1 remediation iteration was described beyond the Verifier's
own single-attempt record, and Phase 2 has no attempts because no push has happened.
The remediation-budget table above therefore reflects exactly the two sources named
in the contract — the Verifier's attempt entries and the orchestrator's loop summary —
and the orchestrator's loop summary contributed nothing because none was passed to
this stage.

---

## Audit-trail gate finding — handoff blocker for stage 5b (not this stage's artifact)

`scripts/check-audit-trail.sh 007-client-requested-reschedule` exits **1** with a
single violation, and it is in **`25-verification.md`** — the Verifier's file, which
this stage must not edit:

```
FAIL 007-client-requested-reschedule: 25-verification.md has no evidence block for
'complexity gate' (AC-015-04/AC-015-14)
✘ Audit-trail check: 1 violation(s).
```

Cause, confirmed by reading the matcher rather than guessing: `evidence_block()`
compares the heading name for **exact** equality after stripping the prefix —
`if (tolower(name) == tolower(want))` where `want` is the literal `complexity gate`
from the `FIVE_CHECKS` array. The Verifier's heading is
`## Evidence: complexity gate (ESLint)`, so `name` is `complexity gate (ESLint)` and
never matches. The block's four markers are otherwise complete and well-formed.

**Fix (Verifier's to make, one line):** rename that heading in `25-verification.md`
from `## Evidence: complexity gate (ESLint)` to `## Evidence: complexity gate`,
keeping the `(ESLint)` wording in the body text below the markers. Nothing else in
the file violates the gate — the other four checks all PASS with numeric `exit:` codes.

Stage 5b runs this gate before pushing, so it must be fixed before stage 5b can
proceed. This stage did **not** fix it: editing a prior stage's report would forge
that stage's evidence, and the decision matrix makes an out-of-scope finding
something to record, not repair. The Verifier's PASS verdict itself is unaffected —
the evidence exists and is genuine; only its heading string fails to match.

## Evidence: audit-trail gate result

command: .standards/scripts/check-audit-trail.sh 007-client-requested-reschedule
exit: 1
at: 2026-10-28T16:47:54Z

PASS 007-client-requested-reschedule: 10-tasks.md present and non-empty
PASS 007-client-requested-reschedule: 20-acceptance/ has an AC-*.md with a '## AC-NNN-NN' heading (AC-015-10)
PASS 007-client-requested-reschedule: 25-verification.md present and non-empty
PASS 007-client-requested-reschedule: 30-report.md present and non-empty
PASS 007-client-requested-reschedule: 15-design.md present and non-empty (AC-015-13)
PASS 007-client-requested-reschedule: evidence block 'scenario traceability' — command: .standards/scripts/check-scenario-traceability.sh --json, exit: 0, at: 2026-10-28T16:41:16Z
PASS 007-client-requested-reschedule: evidence block 'full test suite' — command: npm test, exit: 0, at: 2026-10-28T16:34:00Z
FAIL 007-client-requested-reschedule: 25-verification.md has no evidence block for 'complexity gate' (AC-015-04/AC-015-14)
PASS 007-client-requested-reschedule: evidence block 'design-principles gate' — command: .standards/scripts/check-code-principles.sh --json, exit: 1, at: 2026-10-28T16:40:00Z
PASS 007-client-requested-reschedule: evidence block 'scenario-to-behavior spot check' — command: (manual read of scenario .md vs test assertions), exit: 0, at: 2026-10-28T16:41:16Z
✘ Audit-trail check: 1 violation(s).

## Handoff to stage 5b (PR Opener)

- This report is **GREEN**: mutation gate skipped by tier, final suite exit 0.
- **One blocker before stage 5b can push:** `scripts/check-audit-trail.sh` exits 1 on
  the Verifier's `25-verification.md` heading string (see §Audit-trail gate finding).
  Fix is a one-line heading rename in that file, owned by the Verifier. The green
  verdict of this stage does not clear it, and this stage did not edit it.
- `scripts/check-audit-trail.sh 007-client-requested-reschedule` requires a
  non-empty `30-report.md`; no `PR:` line was written here — stage 5b appends it
  after opening the PR.
- **Workspace state at handoff (relevant to committing):** branch
  `spec/007-client-requested-reschedule`, **0 commits ahead of `main`**, 17 tracked
  modifications + 20 untracked additions in the working tree. All of stages 2–5a's
  work is uncommitted; stage 5b owns the commits (one conventional commit per task
  from `10-tasks.md`). This stage neither stashed nor committed anything.

## Evidence: workspace state at handoff

command: git branch --show-current; git log --oneline main..HEAD | wc -l; git status --short
exit: 0
at: 2026-10-28T16:47:28Z

branch: spec/007-client-requested-reschedule
commits ahead of main: 0
tracked modifications: 17
untracked additions: 20

---

Written by stage 5a (Mutation Runner). No commit, no push, no PR — stage 5b's job.

## 15-design.md

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

## PR

PR: https://github.com/RexiAI/rexiAI/pull/88
Commits: 10 at PR open; 11 including this record commit.
