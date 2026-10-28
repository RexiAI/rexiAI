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
