# 006 — Branded meeting link + local recording bot (tasks)

Source: `specs/006-branded-meeting-link-and-recording-bot/00-informal.md`.

## Verified context (code facts the tasks build on)

- `src/domain/meeting.ts` `createMeetingLink` returns
  `${MEETING_BASE_URL || 'https://meet.jit.si'}/${room}` with
  `room = rexi-${randomBytes(8).toString('hex')}` (16 hex chars). The silent
  `meet.jit.si` fallback is the root cause: prod has no `MEETING_BASE_URL`, so
  every booking points at a public room nobody records.
- `api/bookings/direct.ts` `finishDirectBooking` resolves the join URL, sends the
  client + operator emails, and returns `{ checkoutUrl: null, joinUrl,
  billingDisabled: true }`. Its return shape is pinned (AC-002-*); this spec must
  not change it.
- `scripts/process-recording.mjs` (via `scripts/recording/*`) scans `RECORDINGS_DIR`
  for finished recordings, ffprobes them, and writes three independent markers
  (`.rexi-billed`, `.rexi-transcribed`, `.rexi-analyzed`). A "recording" it can
  process is a directory under `RECORDINGS_DIR` containing at least one `.mp4`
  (`scripts/recording/media.mjs` `listMp4Files`), with a room derivable from
  `metadata.json` `meeting_url` or a `rexi-<hex>` filename (`pipeline.mjs`
  `deriveRoom`), and an audio stream (`billing.mjs` `hasAudioStream`).
- `scripts/recording-cron.sh` + `deploy/production/rexi-recording.{service,timer}`
  run `--scan` every 5 minutes (`OnUnitActiveSec=5min`, `Persistent=true`).
- `RECORDINGS_DIR` is currently repeated in three files (the Jitsi stack `.env`,
  `/etc/rexi-recording.env`, and a compose overlay). Item 5 of the informal spec
  exists to collapse that.

## Scope boundaries (non-goals)

- **Vercel/redirect hosting is out of scope.** We specify the *behaviour* of the
  link (the URL the client sees, where it lands), not how the redirect is hosted.
- **The transcription/insight chain is out of scope.** The bot's job ends at "a
  recording exists in `RECORDINGS_DIR` in a format `process-recording.mjs` already
  handles". No change to the transcription/brief/issue stages.
- **No inbound ports.** The host is behind carrier NAT (router WAN in `10.0.9.x`);
  any design that needs an inbound port is rejected. The call stays on
  `meet.jit.si`; the bot makes outbound connections only.
- **The bot's implementation mechanism is the Coder's concern.** Tasks and
  scenarios pin observable behaviour (thresholds, start/stop, where files land,
  what a missed meeting looks like), never the mechanism.

## Tasks

### Task 1 — Branded meeting link (client URL) and real-room resolution

`createMeetingLink` (and its consumers) must produce a client-facing join URL on
the branded domain, and a separate resolution must yield the real `meet.jit.si`
room for the same room name. The silent `meet.jit.si` fallback for the
*client-facing* URL is removed.

Acceptance criteria:

- The join URL returned to the client has host = the configured brand
  (`MEETING_BASE_URL`, e.g. `https://meet.rexi-ai.com`), scheme `https`, and no
  IP literal anywhere in it.
- The room name is `rexi-` + 16 lowercase hex chars (`randomBytes(8)` hex),
  unchanged from today, and is the last path segment of the join URL.
- The path is exactly one segment — `rexi-<16 hex>` — with the room as the only
  path segment (room extraction is unchanged). The locale rides on a query
  parameter, not a path segment: the join URL carries exactly one query
  parameter, `lang`, whose value is `es` or `en` and nothing else; no other
  query parameter is ever introduced. The branded host, `https` scheme, and
  no-IP-literal requirements are unchanged.
- The join URL's host is **never** `meet.jit.si`. When `MEETING_BASE_URL` is
  unset/empty, `createMeetingLink` returns an error result (`status: 'error'`),
  never a `meet.jit.si` URL.
- A separate function/unit resolves the **real** Jitsi room URL
  `https://meet.jit.si/<room>` from the room name (or from the join URL's last
  segment). The real host is fixed (`meet.jit.si`) per the informal spec
  ("keep the call on meet.jit.si").
- The room segment is identical in the branded URL and the real room URL, so the
  existing `room → booking` mapping (`pipeline.mjs` `deriveRoom` /
  `billing.mjs` `findReservationByRoom`) still resolves the same `rexi-<hex>`.
- Trailing slashes on the configured base are stripped (`replace(/\/+$/, '')`),
  preserved from today.

Scenarios: `20-acceptance/AC-006-branded-link.md` (AC-006-01 … AC-006-04).

### Task 2 — Recording-consent notice in the client booking email

The client confirmation email states, before the join link, that the meeting is
recorded. Applies to **both** the billing-enabled client email
(`src/domain/email.ts` `buildClientBody`) and the billing-disabled client email
(`src/domain/emailDirect.ts` `buildDirectClientBody`). Exact wording comes from
`15-design.md` (Spanish), same as spec 003's copy.

Acceptance criteria:

- Both client-email variants (enabled and disabled) carry a recording-consent
  notice in **both** the text part and the HTML part.
- The notice appears **before** the join link / join CTA in reading order in both
  parts (so the client is told before they can join).
- The operator email (`sendOperatorEmail`, both variants) is unchanged — no
  consent notice (it is a client-facing obligation).
- The consent notice is added without removing or rewording any existing line of
  the locked copy (spec 003): heading, fact rows, CTAs, help/footer lines remain
  as-is; only the notice is inserted.
- The notice is static copy (no dynamic interpolation); if it ever carries a
  dynamic value it must pass `escapeHtml` at every HTML sink. It is added
  verbatim to both parts.
- The notice is locale-aware (Task 8): Spanish is the default and the exact
  copy from `15-design.md`; English is the two-line translation. Only the
  notice is localised — every other line of both variants stays Spanish and
  byte-identical (the spec 003 locked copy).

Scenarios: `20-acceptance/AC-006-consent-notice.md` (AC-006-05 … AC-006-09).

### Task 3 — Participant count excludes the bot

A counting unit computes the number of non-bot humans in a room, excluding the
bot's own participant by identity (never by a name heuristic that could catch a
human).

Acceptance criteria:

- Given a participant list, the count equals the number of participants that are
  not the bot's own identity.
- The bot's own identity is a distinct, stable value (its own participant id /
  configured display name), and exactly that value is excluded.
- Exclusion is by identity, not by display-name pattern: a human who happens to
  share the bot's display name (a distinct participant) is still counted.
- The counting unit is pure (no I/O) and unit-testable.

Scenarios: `20-acceptance/AC-006-participant-count.md` (AC-006-10 … AC-006-12).

### Task 4 — Recording starts/stops at the two-non-bot-humans threshold

The recording decision is: record iff at least two non-bot humans are in the
room. The bot's own join/leave never moves the decision.

Acceptance criteria:

- Below threshold (0 or 1 non-bot humans), the decision is "do not record".
- At exactly 2 non-bot humans, the decision is "record".
- Above 2 (3+), the decision remains "record".
- When an in-progress recording's non-bot-human count drops below 2, the
  recording stops.
- The bot's own join or leave, with the human count otherwise unchanged, leaves
  the decision unchanged.
- The decision is a pure function of the participant list (no I/O), unit-testable.

Scenarios: `20-acceptance/AC-006-record-threshold.md` (AC-006-13 … AC-006-17).

### Task 5 — Recording output lands in `RECORDINGS_DIR` in a pipeline-ready format

The bot writes its recording so the existing pipeline picks it up with **no**
change to `process-recording.mjs` / `scripts/recording/*`.

Acceptance criteria:

- A finished session's recording is a file under `RECORDINGS_DIR` with the
  `.mp4` extension (the only extension `listMp4Files`/`findMp4` accept).
- The `.mp4` has an audio stream (ffprobe `codec_type=audio` present) — the
  pipeline flags silent recordings and skips transcription for them.
- The room is derivable by the existing `deriveRoom` path without modification:
  either a `metadata.json` with `meeting_url` whose last segment is `rexi-<hex>`,
  or a filename containing `rexi-<hex>`.
- No rewrite of `process-recording.mjs` or `scripts/recording/*` is required; the
  three markers (`.rexi-billed`/`.rexi-transcribed`/`.rexi-analyzed`) are still
  written by the pipeline, not by the bot.

Scenarios: `20-acceptance/AC-006-recording-output.md` (AC-006-18 … AC-006-20).

### Task 6 — Single configurable recordings location

One setting drives where the bot writes and where the processor scans; there is
no second copy to drift.

Acceptance criteria:

- The bot resolves its write directory from the same single source the processor
  uses (`RECORDINGS_DIR`, via `scripts/recording/pipeline.mjs`
  `recordingsDirFrom`'s env-first logic).
- Both components resolve to the same directory for the same value of the
  setting.
- The default when the setting is unset is the **same** single default for both
  (`~/.jitsi-meet-cfg/storage/jibri/recordings`), not two different fallbacks.
- The bot does not read or write a second, independent recordings-path
  configuration file; the Jitsi-stack `.env`/compose duplication that item 5
  exists to remove is not re-introduced by the bot.

Scenarios: `20-acceptance/AC-006-recordings-location.md` (AC-006-21 … AC-006-23).

### Task 7 — Missed meetings are visible (machine asleep)

When a booked meeting's window fully elapses without a recording being produced
(because the machine was asleep/off), that fact is surfaced, not silent.

Acceptance criteria:

- For a booked meeting whose scheduled window (start time + `hours`) has fully
  elapsed **and** for which no recording exists in `RECORDINGS_DIR`, the bot
  emits a visible missed-meeting record that names the room (a durable record the
  operator can see: a log line plus a persistent marker/status).
- A meeting whose window has not yet started, or is still in progress, is never
  reported missed.
- A meeting whose window elapsed but which **was** recorded is never reported
  missed.
- The missed-meeting determination is a pure function of (schedule entry,
  elapsed-window predicate, recording-exists predicate) with injected time, so it
  is unit-testable; "machine asleep" is realized as "no recording was produced
  during the window", not a hardware probe.

Scenarios: `20-acceptance/AC-006-missed-meeting.md` (AC-006-24 … AC-006-26).

### Task 8 — Locale-aware consent notice (booking's language)

Carry the client's UI locale from the booking form to the API, and select the
recording-consent notice's language from it. The SPA already knows the visitor's
locale (`src/i18n/dictionary.ts` `type Locale = 'es' | 'en'`;
`I18nContext.tsx` `useI18n().locale`); today nothing sends it to the API
(`useBookingSubmit.ts` posts only `{ email, date, startTime, hours }`). This
task adds that one field and threads it to both client-email builders.

Acceptance criteria:

- The `POST /api/bookings` payload carries a `locale` field with value `'es'` or
  `'en'`, sourced from `useI18n().locale` at submit time. The field is additive:
  the existing `{ email, date, startTime, hours }` shape is unchanged.
- The API normalises the locale before use: `'en'` selects the English notice;
  `'es'`, a missing/`null` field, or any unrecognised value (e.g. `'fr'`,
  `'EN'`, `''`) selects the Spanish notice. Normalisation never throws and never
  rejects the booking — an unrecognised locale is treated as Spanish, not as an
  error.
- The normalised locale reaches the notice selection in **both** client-email
  paths: the direct path (`api/bookings/direct.ts` `finishDirectBooking` →
  `sendClientEmail`) and the billing-enabled path. For the billing-enabled path,
  the client email is sent from the Stripe webhook (`api/stripe-webhook.ts`
  `trySendClientEmail`), so the locale captured at booking time must survive the
  round trip via the checkout session's `metadata` (additive key in
  `api/bookings/checkout.ts` `buildSessionParams`, read back in
  `getRawBookingFields`); the webhook must not guess or default the locale
  independently of what was captured.
- The notice copy is selected by locale. Spanish = the exact two-line copy from
  `15-design.md` (Task 2). English = the two-line translation (same meaning,
  same placement before the join link, dash-free, no banned billing stem,
  "audio" not "video"):
  `Recording notice: this meeting is recorded as audio.` /
  `We use the recording to document the session. If you prefer it not to be recorded, reply to this email before the meeting.`
- **Only the notice and the join URL's `lang` value are localised.** Every other line of both client variants —
  heading, fact rows other than the join URL, join CTA label, calendar CTA, billing lines, help line — stays
  Spanish and byte-identical to today (the spec 003 locked copy), regardless of
  locale. Localising the whole email is out of scope and would break the spec
  003 acceptance tests.
- The join URL placed in the booking email carries the normalised locale as its
  `lang` query parameter — `?lang=en` for an English booking, `?lang=es` for a
  Spanish booking. The join page reads its language from this parameter alone:
  it never sniffs `Accept-Language`, never reads a path segment, and never reads
  a cookie. The parameter never reaches the real Jitsi room — the redirect
  target stays `https://meet.jit.si/<room>` with no added query, so the room
  identity and the bot's room derivation (`pipeline.mjs` `deriveRoom`) are
  unaffected.
- The operator email (both variants) is unaffected: no locale dependence, no
  notice, byte-identical to today for any booking locale.

Scenarios: `20-acceptance/AC-006-notice-locale.md` (AC-006-27 … AC-006-36).

## Scenario ID map

| Task | File | Scenario IDs |
|---|---|---|
| 1 | `20-acceptance/AC-006-branded-link.md` | AC-006-01 … AC-006-04 |
| 2 | `20-acceptance/AC-006-consent-notice.md` | AC-006-05 … AC-006-09 |
| 3 | `20-acceptance/AC-006-participant-count.md` | AC-006-10 … AC-006-12 |
| 4 | `20-acceptance/AC-006-record-threshold.md` | AC-006-13 … AC-006-17 |
| 5 | `20-acceptance/AC-006-recording-output.md` | AC-006-18 … AC-006-20 |
| 6 | `20-acceptance/AC-006-recordings-location.md` | AC-006-21 … AC-006-23 |
| 7 | `20-acceptance/AC-006-missed-meeting.md` | AC-006-24 … AC-006-26 |
| 8 | `20-acceptance/AC-006-notice-locale.md` | AC-006-27 … AC-006-36 |

## Documented decisions

1. **Two URLs, one room.** The client-facing URL (branded) and the real Jitsi URL
   (`meet.jit.si`) share the room name; only the host differs, so room→booking
   mapping is untouched.
2. **`MEETING_BASE_URL` becomes the brand; `meet.jit.si` is the fixed real host.**
   The silent `|| 'https://meet.jit.si'` fallback on the client-facing URL is
   removed and replaced with fail-loud (error result) on missing config.
3. **Consent notice is client-only, static copy.** Added to both client email
   variants, before the join CTA; exact wording from `15-design.md`.
4. **Bot identity is an explicit, stable value.** "Not the bot" is decided by
   identity, not by display-name matching.
5. **"Machine asleep" = no recording during the window.** We do not probe power
   state; we detect "window elapsed and no recording exists" and surface that.
6. **`AC-003-25` is authorised to change (human-approved).** The human explicitly
   approved modifying the frozen client-email assertion in
   `src/__tests__/AC-003-client-email.test.ts`, which pins the enabled client
   body with `toBe`. This is a deliberate change, not a defect fix, and follows
   `docs/TESTING.md` §"Tests That Encode a Defect" as the procedure. Constraints
   the change must respect: the scenario ID `AC-003-25` is preserved verbatim;
   the recording-consent notice is appended before the join line; nothing else in
   that body changes.
7. **Contact address is `info@rexi-ai.com` (branded).** The notice's
   "reply to this email to opt out" line uses the branded address. The human
   explicitly rejected `danielbueno76@gmail.com` — their personal inbox — because
   a personal Gmail on a branded domain reads like phishing.
8. **No auto-forward on the join interstitial.** The human chose an explicit user
   action over a timed auto-forward. This is the UX Designer's file
   (`15-design.md`), not this spec's; recorded here so the decision is not lost.
   It supersedes `15-design.md` gate note #3 ("4s interruptible forward").
9. **The consent notice follows the booking's language.** Localised by the
   client's UI locale (Task 8): Spanish is the default and the exact `15-design`
   copy; English is the two-line translation. Only the notice and the join
   URL's `lang` value are localised — the rest of the email stays Spanish and
   byte-identical (spec 003). The same locale also rides on the join URL as
   `?lang=` (decision 10).

10. **The locale rides on a `?lang=` query parameter, not a path segment.** The
    human rejected both a path segment and `Accept-Language`; a query is how you
    switch language on the web, and the email already carries the right one:
    `https://meet.rexi-ai.com/rexi-<16hex>?lang=es|en`. This supersedes
    `15-design.md` §Task 1 "Locale selection" (which forbade a query string and
    proposed `Accept-Language`) and its "URL contract" ("the locale never
    appears in the URL"). The UX file must be updated to match.
11. **English notice wording is settled.** Line 1 is
    `Recording notice: this meeting is recorded as audio.` (was "recorded in
    audio"); line 2 is unchanged:
    `We use the recording to document the session. If you prefer it not to be recorded, reply to this email before the meeting.`
    This string is the single authority. It is pinned in Task 8, AC-006-28, and
    `15-design.md`; the UX file (`15-design.md`) must be updated to match
    ("recorded in audio" → "recorded as audio"). Closes open question 5.
12. **Muxed `.mp4` output is confirmed.** The human approved muxed `.mp4` output
    (audio muxed into an MP4 container) so the existing pipeline
    (`process-recording.mjs` / `scripts/recording/*`) is untouched. Task 5's
    `.mp4`-with-audio-stream requirement stands unchanged. Closes open
    question 3.

## Open questions (need a human answer before /build)

1. **Missing `MEETING_BASE_URL` → fail loud vs. hardcode the brand.** Task 1 pins
   "error result on unset", consistent with the orchestrator's "fallback is the
   root cause" framing. If you instead want the brand hard-coded to
   `https://meet.rexi-ai.com` (no config, no failure mode), say so and I'll
   rewrite Task 1 / AC-006-04.
2. **Real-room host configurable?** The informal spec says "keep the call on
   `meet.jit.si`", so Task 1 treats `meet.jit.si` as a fixed constant. If you
   want the real host configurable too (for test stubbing), that is an additive
   knob — confirm.
3. **Recording container format — RESOLVED (decision 12).** Muxed `.mp4` output
   is confirmed: audio is muxed into an MP4 container so the pipeline is
   untouched. No pipeline change.
4. **Missed-meeting visibility surface.** Task 7 requires "a durable record the
   operator can see". Confirm whether that is a log line + filesystem marker, an
   operator email, or an issue — the exact surface is the Coder's mechanism, but
   the *minimum* ("a durable record naming the room") is what is pinned.
5. **English notice wording — RESOLVED (decision 11).** Line 1 is
   `Recording notice: this meeting is recorded as audio.`; line 2 is unchanged:
   `We use the recording to document the session. If you prefer it not to be recorded, reply to this email before the meeting.`
