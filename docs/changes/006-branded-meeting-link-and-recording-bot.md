# 006-branded-meeting-link-and-recording-bot

> Spec pipeline archive. Original source: `specs/006-branded-meeting-link-and-recording-bot/` (deleted by this script).
> Archived: 2026-10-26

## Original ask

# 006 — Branded meeting link + local recording bot

## The problem, in my words

Bookings mint a room called `rexi-<hex>` and email the client a join link. Until
now that link pointed at the public `meet.jit.si`, so nothing was ever recorded —
the room lives on a server I don't control.

I tried to fix it the obvious way: my own Jitsi + Jibri on this computer, and a
link pointing at it. That worked locally (booking → email → room → Jibri →
transcript → customer brief all ran), but **no client can reach it**. My line is
behind carrier NAT: the router's own WAN address is a `10.x`, four external
vantage points cannot reach my public IP on any port, and inbound IPv6 is
firewalled too (tested from a phone on mobile data). Port forwarding is dead on
this connection. I am not buying a VPS.

So: keep the call on `meet.jit.si`, and record it from my computer instead.

## What I want

1. **The client gets a link on my own domain, not an IP.**
   `https://meet.rexi-ai.com/<something>` with a real certificate. Opening it
   takes them to the actual Jitsi room. No IP address in the URL, no
   certificate warning — it must not look like phishing.

2. **The meeting records itself, on my computer, with no inbound connection.**
   Something running locally watches the booked meetings, joins the room as a
   participant, and records the audio. It must start only when the meeting is
   real — at least two humans actually in the room — and stop when the humans
   are gone.

3. **The bot must not count itself.** If it is alone in the room it must not
   record. "Two people" means two people who are not the bot.

4. **The recording lands in the same place the existing pipeline already reads**,
   so transcription, customer brief and issue delivery keep working with no
   rewrite.

5. **The folder recordings are written to must be configurable on any machine** —
   one setting, not several files that can drift apart.

6. **The client is told the meeting is recorded.** In the booking email, before
   they join. Not a hidden bot.

## Constraints I care about

- No VPS, no rented relay I have to operate.
- No inbound ports: everything must work from behind CGNAT.
- Must not break the existing booking → email flow, or the billing-disabled free
  path.
- Must survive my machine being off: if the computer is asleep, that meeting is
  simply not recorded — but I want that visible, not silent.

## What I don't want

- The bot being visible as an unexplained anonymous participant with no notice.
- A link that shows an IP address or a self-signed cert.
- Anything that requires me to reconfigure the router or buy a static IP.

## Tasks

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

- **Vercel/redirect hosting is out of scope.** We specify the _behaviour_ of the
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
_client-facing_ URL is removed.

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

| Task | File                                          | Scenario IDs          |
| ---- | --------------------------------------------- | --------------------- |
| 1    | `20-acceptance/AC-006-branded-link.md`        | AC-006-01 … AC-006-04 |
| 2    | `20-acceptance/AC-006-consent-notice.md`      | AC-006-05 … AC-006-09 |
| 3    | `20-acceptance/AC-006-participant-count.md`   | AC-006-10 … AC-006-12 |
| 4    | `20-acceptance/AC-006-record-threshold.md`    | AC-006-13 … AC-006-17 |
| 5    | `20-acceptance/AC-006-recording-output.md`    | AC-006-18 … AC-006-20 |
| 6    | `20-acceptance/AC-006-recordings-location.md` | AC-006-21 … AC-006-23 |
| 7    | `20-acceptance/AC-006-missed-meeting.md`      | AC-006-24 … AC-006-26 |
| 8    | `20-acceptance/AC-006-notice-locale.md`       | AC-006-27 … AC-006-36 |

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
   the _minimum_ ("a durable record naming the room") is what is pinned.
5. **English notice wording — RESOLVED (decision 11).** Line 1 is
   `Recording notice: this meeting is recorded as audio.`; line 2 is unchanged:
   `We use the recording to document the session. If you prefer it not to be recorded, reply to this email before the meeting.`

## Acceptance scenarios

## AC-006-01 — Client join URL uses the branded domain, https, one path segment, and a lang query parameter

## AC-006-02 — Room name is rexi- plus 16 hex, last path segment

## AC-006-03 — Real Jitsi room resolves to meet.jit.si with the same room

## AC-006-04 — Missing brand config fails loud, never a meet.jit.si join URL

## AC-006-05 — Enabled client email carries the notice in text and HTML

## AC-006-06 — Disabled (direct) client email carries the notice in text and HTML

## AC-006-07 — Notice appears before the join link

## AC-006-08 — Operator email has no consent notice

## AC-006-09 — Existing locked copy is preserved; only the notice is added

## AC-006-10 — Bot alone counts as zero non-bot humans

## AC-006-11 — Bot plus humans counts only the humans

## AC-006-12 — A human sharing the bot's display name is still counted

## AC-006-13 — No recording below the threshold (0 or 1 non-bot human)

## AC-006-14 — Recording starts at exactly 2 non-bot humans

## AC-006-15 — Recording continues above 2 non-bot humans

## AC-006-16 — Recording stops when non-bot humans drop below 2

## AC-006-17 — The bot's own join/leave never changes the decision

## AC-006-18 — Recording lands under RECORDINGS_DIR as an .mp4

## AC-006-19 — The recording has an audio stream

## AC-006-20 — The room is derivable by the existing pipeline, unchanged

## AC-006-21 — One setting drives both the bot and the processor

## AC-006-22 — Reconfiguring the one setting moves both

## AC-006-23 — Unset setting yields one shared default, not two fallbacks

## AC-006-24 — Elapsed meeting with no recording is reported missed

## AC-006-25 — Pending or in-progress meetings are not reported missed

## AC-006-26 — A recorded meeting is not reported missed

## AC-006-27 — Spanish locale renders the exact Spanish notice (both variants)

## AC-006-28 — English locale renders the exact English notice (both variants)

## AC-006-29 — Missing or unrecognised locale falls back to Spanish, never crashes

## AC-006-30 — Locale changes only the notice and the join URL's lang value; every other line is byte-identical

## AC-006-31 — Operator email is unaffected by locale

## AC-006-32 — Enabled-path email localises using the locale captured at booking time

## AC-006-33 — The join URL in the booking email carries lang matching the booking's locale

## AC-006-34 — The join page derives its language from the lang parameter alone

## AC-006-35 — Absent, empty, or unrecognised lang falls back to Spanish, never a crash, never English

## AC-006-36 — The lang parameter never reaches the real Jitsi room

## Verification

# 25-verification — spec 006 (branded meeting link + local recording bot)

Verifier stage 4, attempt 1, phase 1. Independent re-check of Coder + Refactorer
claims against `10-tasks.md`, `15-design.md`, and `20-acceptance/`. The informal
spec (`00-informal.md`) was not read.

## Verdict: BLOCK

The pipeline stops. The scenario-to-behavior spot check (check 4) produced a
substantive finding: the end-to-end recording capability — a component that joins
a Jitsi room over WebRTC, observes participants, crosses the two-human threshold,
and produces audio — is **absent**. Scenarios AC-006-13 … AC-006-20 and
AC-006-24 … AC-006-26 are satisfied only by unit-level pure functions and a
finalizer that nothing calls in a live path. The tests are green because they
exercise decisions and a muxer, not a recorder.

Failing gate ID: `spot-check`.

---

## Evidence: scenario traceability

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-10-26T10:46:10Z

{
"checks": [1, 2],
"passes": ["AC-006-01 — traced to a test", "AC-006-02 — traced to a test", "AC-006-03 — traced to a test", "AC-006-04 — traced to a test", "AC-006-05 — traced to a test", "AC-006-06 — traced to a test", "AC-006-07 — traced to a test", "AC-006-08 — traced to a test", "AC-006-09 — traced to a test", "AC-006-10 — traced to a test", "AC-006-11 — traced to a test", "AC-006-12 — traced to a test", "AC-006-13 — traced to a test", "AC-006-14 — traced to a test", "AC-006-15 — traced to a test", "AC-006-16 — traced to a test", "AC-006-17 — traced to a test", "AC-006-18 — traced to a test", "AC-006-19 — traced to a test", "AC-006-20 — traced to a test", "AC-006-21 — traced to a test", "AC-006-22 — traced to a test", "AC-006-23 — traced to a test", "AC-006-24 — traced to a test", "AC-006-25 — traced to a test", "AC-006-26 — traced to a test", "AC-006-27 — traced to a test", "AC-006-28 — traced to a test", "AC-006-29 — traced to a test", "AC-006-30 — traced to a test", "AC-006-31 — traced to a test", "AC-006-32 — traced to a test", "AC-006-33 — traced to a test", "AC-006-34 — traced to a test", "AC-006-35 — traced to a test", "AC-006-36 — traced to a test"],
"fails": []
}

PASS — all 36 scenario IDs (AC-006-01 … AC-006-36) resolve to a test, no dangling
references.

---

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-26T10:46:50Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

RUN v5.0.1 /home/dbueno/projects/rexiAI

Test Files 61 passed (61)
Tests 382 passed (382)
Start at 11:45:00
Duration 14.76s (environment 71%, tests 14%, setup 7%, transform 4%, import 3%, worker 1%)

PASS — 61 files / 382 tests green, exit 0. No skipped or disabled tests reported
(the `AC-006-19` real-ffmpeg case uses `it.skipIf(!hasFfmpeg)`; see spot check —
that guard is a genuine environment-skip, not a silent skip of the finalizer's
core assertion, which is separately asserted with a simulated runner).

---

## Evidence: complexity gate

command: npm run lint
exit: 0
at: 2026-10-26T10:47:20Z

> rexiai-website@0.0.0 lint
> eslint .

/home/dbueno/projects/rexiAI/tests/e2e/funnel-consent-boundary.e2e.ts
30:5 warning Unexpected console statement no-console
34:3 warning Unexpected console statement no-console
63:5 warning Unexpected console statement no-console
92:3 warning Unexpected console statement no-console

/home/dbueno/projects/rexiAI/tests/e2e/home-timer-scan.e2e.ts
35:5 warning Unexpected console statement no-console
39:3 warning Unexpected console statement no-console
90:3 warning Unexpected console statement no-console

/home/dbueno/projects/rexiAI/tests/e2e/switch-refusal.e2e.ts
30:5 warning Unexpected console statement no-console
34:3 warning Unexpected console statement no-console
81:3 warning Unexpected console statement no-console

✖ 10 problems (0 errors, 10 warnings)

PASS — 0 errors (the project's `complexity: ['error', 6]` and the rest of the
ESLint error rules produce no violations). The 10 warnings are `no-console` in
pre-existing `tests/e2e/*` files, unrelated to this spec.

---

## Evidence: design-principles gate

command: .standards/scripts/check-code-principles.sh --json
exit: 1
at: 2026-10-26T10:47:50Z

{
"tier": "mvp",
"gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
"fails": [{ "message": "Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" }],
"warns": [
{ "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "45" },
{ "message": "Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25", "file": "./.standards/ci/templates/go-saga-lint.go", "line": "101" },
{ "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7" },
{ "message": "Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "93" },
{ "message": "Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75", "file": "./src/pages/Landing.tsx", "line": "13" },
{ "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22", "file": "./src/components/ServicesCarousel.tsx", "line": "32" },
{ "message": "Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79", "file": "./src/components/ServicesCarousel.tsx", "line": "54" },
{ "message": "Method body >20 lines (node): ./api/stripe-webhook.ts:148:167:getRawBookingFields:KISS_LINES=21", "file": "./api/stripe-webhook.ts", "line": "148" },
{ "message": "Method body >20 lines (node): ./api/bookings/checkout.ts:45:66:buildSessionParams:KISS_LINES=23", "file": "./api/bookings/checkout.ts", "line": "45" },
{ "message": "Method body >20 lines (node): ./api/bookings/recorded-billing.ts:222:244:?:KISS_LINES=24", "file": "./api/bookings/recorded-billing.ts", "line": "222" },
{ "message": "Method body >20 lines (python): ./scripts/recording/whisper_transcribe.py:37:64:main:KISS_LINES=23 [approximate heuristic — comprehension/decorator forms can inflate the count; ADR 0006 warn phase]", "file": "./scripts/recording/whisper_transcribe.py", "line": "37" },
{ "message": "Possible duplication (11x identical 4-line block, first at ./api/bookings.ts:31): date: string /startTime: string /hours: number /email: string", "file": "./api/bookings.ts", "line": "31" },
{ "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:284): startTime: string /hours: number /joinUrl?: string | null /date: string", "file": "./api/stripe-webhook.ts", "line": "284" },
{ "message": "Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:122): email: string /date: string /startTime: string /bookingId: string", "file": "./api/stripe-webhook.ts", "line": "122" },
{ "message": "Possible duplication (3x identical 4-line block, first at ./src/domain/microsoftGraph.ts:178): }) /if (!res.ok) { /const text = await res.text().catch(() => '') /headers: { Authorization: `Bearer ${token}` },", "file": "./src/domain/microsoftGraph.ts", "line": "178" },
{ "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: \"problem\", /docs: { /description: /meta: {", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "115" },
{ "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:32): startTime: string /hours: number /locale?: Locale /date: string", "file": "./api/bookings.ts", "line": "32" },
{ "message": "Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:124): startTime: string /hours: number /amountTotal: number /date: string", "file": "./api/stripe-webhook.ts", "line": "124" },
{ "message": "Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "132" },
{ "message": "Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:14): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {", "file": "./api/bookings.ts", "line": "14" },
{ "message": "Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],", "file": "./.standards/ci/templates/eslint-saga-rules/saga-compensation.js", "line": "133" },
{ "message": "Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30", "file": "./.standards/ci/templates/archunit/OutboxArchRules.java", "line": "30" },
{ "message": "Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33", "file": "./.standards/ci/templates/archunit/SagaArchRules.java", "line": "33" },
{ "message": "SRP: possible god file (node) — ./api/stripe-webhook.ts: 603 lines, 9 methods (split by responsibility)", "file": "./api/stripe-webhook.ts", "line": "" },
{ "message": "LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)", "file": "./src/domain/time.ts", "line": "" }
]
}

Exit 1 (findings). The single FAIL is **out-of-repo noise**:
`./.standards/skills/hallmark/site/examples/cobalt-01/script.js` (CC=10) is an
example shipped inside the `.standards` submodule, not child-repo code. Verified
the submodule is clean and untouched by this spec:
`git -C .standards status` → "HEAD detached at 3b18790 / nothing to commit,
working tree clean". Zero FAILs in the child repo's own code.

WARNs are review hints (not stopping). Flag to the Architect — the two in spec
006-changed files: `./api/stripe-webhook.ts:148:167:getRawBookingFields:KISS_LINES=21`
and `./api/bookings/checkout.ts:45:66:buildSessionParams:KISS_LINES=23`, plus the
DRY duplication warns introduced by the repeated `BookingInput`/`BookingData`
field-shape literals in `./api/bookings.ts` and `./api/stripe-webhook.ts`.

---

## Evidence: scenario-to-behavior spot check

command: grep -nE "OnUnitActiveSec|ExecStart|recording-bot-cron|recording-bot\.mjs|recordRoom|joinRoom|runSession|applyStep|capture\.start|capture\.stop|finalizeRecording" deploy/home/rexi-recording-bot.timer deploy/home/rexi-recording-bot.service deploy/home/rexi-recording-bot-watch.service scripts/recording-bot-cron.sh scripts/recording-bot.mjs scripts/recording/bot/session.mjs scripts/recording/bot/capture.mjs scripts/recording/bot/output.mjs ; BOT_LIVE_TEST=1 npx vitest run src/**tests**/AC-006-bot-adapter.test.ts
exit: 0
at: 2026-10-26T12:31:05Z

deploy/home/rexi-recording-bot.timer:12:OnUnitActiveSec=5min
deploy/home/rexi-recording-bot.service:19:# Node is resolved by scripts/recording-bot-cron.sh, so no interpreter version is
deploy/home/rexi-recording-bot.service:34:ExecStart=/home/dbueno/projects/rexiAI/scripts/recording-bot-cron.sh \
deploy/home/rexi-recording-bot-watch.service:35:ExecStart=/home/dbueno/projects/rexiAI/scripts/recording-bot-cron.sh --watch
scripts/recording-bot-cron.sh:2:# scripts/recording-bot-cron.sh — node-path-resolving entry point for the bot's
scripts/recording-bot-cron.sh:10:# scripts/recording-bot-cron.sh --missed ~/.rexi-recording-bot/schedule.json
scripts/recording-bot-cron.sh:11:# scripts/recording-bot-cron.sh --watch
scripts/recording-bot-cron.sh:12:# scripts/recording-bot-cron.sh --run --room rexi-0123456789abcdef
scripts/recording-bot-cron.sh:28: echo "[recording-bot-cron] node not found — set NODE_BIN=/path/to/node" >&2
scripts/recording-bot-cron.sh:32:echo "[recording-bot-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ) $* via $NODE_BIN"
scripts/recording-bot-cron.sh:33:exec "$NODE_BIN" scripts/recording-bot.mjs "$@"
scripts/recording-bot.mjs:2:// scripts/recording-bot.mjs — host-side entry point for the local recording bot
scripts/recording-bot.mjs:43:import { DEFAULT_JITSI_BASE_URL, JITSI_BASE_URL_ENV, recordRoom } from './recording/bot/capture.mjs'
scripts/recording-bot.mjs:49:import { finalizeRecording } from './recording/bot/output.mjs'
scripts/recording-bot.mjs:71: ' node scripts/recording-bot.mjs --run --room rexi-<16hex> [--base <jitsi-url>]',
scripts/recording-bot.mjs:72: ' node scripts/recording-bot.mjs --watch [--schedule <file>] [--room rexi-<16hex>]',
scripts/recording-bot.mjs:73: ' node scripts/recording-bot.mjs --finalize <audio-file> --room rexi-<16hex>',
scripts/recording-bot.mjs:74: ' node scripts/recording-bot.mjs --decide <participants.json>',
scripts/recording-bot.mjs:75: ' node scripts/recording-bot.mjs --missed <schedule.json>',
scripts/recording-bot.mjs:129: const result = await finalizeRecording({ room, audioPath: audio, env: process.env, runner })
scripts/recording-bot.mjs:158: const result = await recordRoom({ room, baseUrl: base, env: process.env, log: console })
scripts/recording/bot/session.mjs:72:export async function applyStep({ command, capture }) {
scripts/recording/bot/session.mjs:73: if (command === 'start') await capture.start()
scripts/recording/bot/session.mjs:74: if (command === 'stop') return capture.stop()
scripts/recording/bot/session.mjs:85: * cap fired; `artifact` is whatever `capture.stop()` produced (null when nothing
scripts/recording/bot/session.mjs:94:export async function runSession({
scripts/recording/bot/session.mjs:115: const artifact = await applyStep({ command: step.command, capture })
scripts/recording/bot/session.mjs:126: const artifact = await capture.stop()
scripts/recording/bot/capture.mjs:12:// 4. hands the snapshots to `runSession`, which starts ffmpeg on the sink's
scripts/recording/bot/capture.mjs:30:import { finalizeRecording } from './output.mjs'
scripts/recording/bot/capture.mjs:33:import { runSession } from './session.mjs'
scripts/recording/bot/capture.mjs:47: * and `joinRoom` clicks the page's own join button as a fallback.
scripts/recording/bot/capture.mjs:141:export async function joinRoom({
scripts/recording/bot/capture.mjs:199: * RECORDINGS_DIR until the capture has stopped and `finalizeRecording` muxes it.
scripts/recording/bot/capture.mjs:205:export async function recordRoom({ room, baseUrl, env, log = console, sessionOptions = {}, deps = {} }) {
scripts/recording/bot/capture.mjs:221: const room$ = await (deps.joinRoom || joinRoom)({
scripts/recording/bot/capture.mjs:231: const { reason, artifact } = await (deps.runSession || runSession)({
scripts/recording/bot/capture.mjs:247:/** The capture device `runSession` drives: ffmpeg on the sink, then the muxer. */
scripts/recording/bot/capture.mjs:266: const result = await finalizeRecording({ room, audioPath: outPath, env, runner, log })
scripts/recording/bot/output.mjs:79:export async function finalizeRecording({

RUN v5.0.1 /home/dbueno/projects/rexiAI

[live-proof] mean_volume=-18.5 dB file=/tmp/rexi-live-recordings-t1GtBq/rexi-dc7639061d46b10d_2026-10-26-12-31-46/rexi-dc7639061d46b10d_2026-10-26-12-31-46.mp4

Test Files 1 passed (1)
Tests 31 passed (31)
Start at 13:31:06
Duration 40.80s (tests 99%)

---

**Historical note — attempt-1 BLOCK, since cleared (preserved verbatim, not recoded).**

The attempt-1 evidence block for this check recorded `exit: n/a (finding)`, which
`check-audit-trail.sh` rejects — a `## Evidence: scenario-to-behavior spot check`
block must carry a numeric `exit:` code. The numeric `exit: 0` above is a fresh
re-run performed now (command and `at:` timestamp above), not a retroactive recoding
of that `n/a` into a number never observed. The attempt-1 finding that the `n/a`
encoded — the end-to-end recorder was absent — was real, and is preserved below in
full as the historical BLOCK that the attempt-2 remediation round cleared.

---

**Attempt-1 finding (historical BLOCK — the substantive content behind the original `exit: n/a`):**

**Finding (a) — no test exercises a live recording; the live capture is absent.**

Confirmed by tracing the code, not by trusting the Coder's report:

- `scripts/recording-bot.mjs` lines 29-31 state it outright:
  "CAPTURE IS THE HOST'S ADAPTER, NOT THIS SCRIPT's JOB: joining the room as a
  participant and capturing its audio needs a WebRTC client, which this repo does
  not ship. `--finalize` is the contract that adapter feeds."
- `grep -rniE "webrtc|lib-jitsi|RTCPeerConnection|getUserMedia|MediaRecorder"`
  across `scripts/`, `deploy/`, `api/`, `src/` finds **no** WebRTC client, media
  capture, or room-join code — only comments and the Jitsi _deployment_ scripts
  (`deploy/production/setup-jitsi-host.sh`, etc.) that install the stack.
- `--finalize` has exactly one caller: `recording-bot.mjs` itself (`runFinalize`).
  No adapter exists. `--decide` only prints JSON. `--missed` is never scheduled —
  `scripts/recording-cron.sh` still runs the OLD `process-recording.mjs --scan`.
- `recordingAction` / `shouldRecord` / `countNonBotHumans` are referenced only by
  the tests and by `recording-bot.mjs`'s `--decide` print path.

So the scenarios are satisfied by unit-level functions only:

- AC-006-13 … AC-006-17 (threshold) → pure `shouldRecord` / `recordingAction`
  returning 'start'/'continue'/'stop'/'idle'. Nothing acts on the returned action.
- AC-006-18 … AC-006-20 (output) → `finalizeRecording` muxes a _provided_ audio
  file. The test writes a fake `'audio'` WAV and uses a `simulatedRunner` (mocked
  ffmpeg/ffprobe); the one real-ffmpeg case is `skipIf(!hasFfmpeg)`. Nothing
  produces the audio file in production.
- AC-006-24 … AC-006-26 (missed) → pure `findMissedMeetings` + `recordMissedMeetings`.

Further: the repo's _actual_ recording mechanism is Jibri via
`deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua` (spec 004),
which starts recording on the **first** human occupant (threshold = 1). The spec
006 two-human threshold (`shouldRecord`/`recordingAction`) is wired to **no**
recorder, so even Task 4's decision is disconnected from the stack that records.
The `README.md` this spec adds documents the Jibri path (threshold = 1), which is
inconsistent with spec 006 Task 4.

Classification: the tests are green but assert decisions and a muxer, not a
recorder. The end-to-end capability the spec is titled after ("recording bot")
is not delivered. This is a false green for the _capability_, not a fault in the
individual unit assertions.

**Finding (b) — the `AC-007-bookings.test.ts` edit is a legitimate fixture fix,
not a bent test.**

`git diff -- src/__tests__/AC-007-bookings.test.ts` shows a single addition to
`beforeEach`, no assertion moved:

    +    // spec 006 AC-006-04: createMeetingLink now fails loud without a brand
    +    // (the silent meet.jit.si fallback is gone), so the booking path under test
    +    // needs the configured brand. Fixture only: no assertion in this file changes.
    +    process.env['MEETING_BASE_URL'] = 'https://meet.rexi-ai.com'

Justification holds: `api/bookings.ts` `rejectOnMeetingError` (line 56) returns
`502` when `createMeetingLink` yields `{ status: 'error' }`, and `meeting.ts`
now returns that error when `MEETING_BASE_URL` is unset (AC-006-04). Without the
fixture, AC-007's checkout-path tests (which assert `res.status === 200` and
`stripeMocks.mockCreate` called) would fail on the 502. The fixture restores the
precondition the new fail-loud behavior requires; no assertion changed, no
expected value bent. Legitimate.

**Other confirmations (commands, not reading):**

- `npm run build` → exit 0 ("✓ built in 201ms"; 43 modules). The branded-link
  change to `src/domain/meeting.ts` compiles in both entry points.
- `grep -nE "setTimeout|setInterval|requestAnimationFrame|location\.replace|http-equiv" deploy/join/index.html` → no matches. The page reads `window.location.search`/`.pathname` (a read, not navigation) and `pointAtRoom` sets the action `href` to `https://meet.jit.si/<room>` with no query — decision 8 (no auto-forward) holds.
- `?lang=` is not forwarded: `AC-006-36` test asserts `href === https://meet.jit.si/<room>` and `href` does not contain `lang`; the page's `pointAtRoom` builds the href without any query string.
- `src/domain/meeting.ts` no longer falls back: `meetingBaseUrl` returns `null`
  when unset/invalid, `createMeetingLink` returns `{ status: 'error', ... }`.
  Confirmed by `git diff -- src/domain/meeting.ts` (the `|| 'https://meet.jit.si'`
  branch is gone).

---

## No unaccounted behavior (finding line)

- `router-1.png` … `router-wan.png` (6 untracked images at repo root) are NAT
  diagnostic screenshots, not code — flag for removal from the branch; they trace
  to nothing in the tasks/scenarios.
- `README.md` (+108 lines) documents the Jibri-based recording pipeline. The
  content is documentation, but it records a threshold (first occupant) that
  contradicts spec 006 Task 4's two-human threshold — the same disconnect noted
  in the spot check.
- All other new modules (`src/domain/meetingUrl.ts`, `locale.ts`,
  `consentNotice.ts`, `scripts/recording/bot/*`, `deploy/join/`) trace to Tasks
  1-8 / decisions 1-12; nothing untraced in the logic.

---

## Phase-1 remediation round — attempt 2, phase 1 (scoped re-verification)

Scoped re-verification per docs/SPEC_PIPELINE.md §Remediation budget and
AC-007-02: re-run only the gate that BLOCKed in attempt 1 — `spot-check`.
Traceability / test-suite / complexity / design-principles were green in
attempt 1 and are not re-run in full (one supplementary complexity check below,
run because the fix added ~1,500 lines of new `.mjs` which could have moved the
complexity gate).

The failing gate from attempt 1 was: `spot-check` — "nothing acts on the
returned actions; the end-to-end recording capability is absent." The Coder
claims to have closed it by adding `scripts/recording/bot/{chrome,cdp,pulse,
session,capture,schedule,missed,config,output,participants}.mjs`,
`scripts/recording-bot.mjs`, `scripts/recording-bot-cron.sh`, three systemd
units, `--run`/`--watch`/`--missed` modes, and a `BOT_LIVE_TEST=1` live proof.

Verdict below. Every check executed with commands, not by reading the Coder's
claims.

### 1. A real recorder now exists and is wired — VERIFIED

Traced the full chain (read the code, then confirmed by live execution):

- `deploy/home/rexi-recording-bot-watch.service` (`Type=simple`) →
  `ExecStart=scripts/recording-bot-cron.sh --watch` → resolves node →
  `scripts/recording-bot.mjs --watch` → `runWatch` → `currentWindows` →
  `activeWindows(readSchedule(...))` → `runRoom` → `recordRoom`.
- `deploy/home/rexi-recording-bot.timer` → `rexi-recording-bot.service`
  (`Type=oneshot`, every 5 min) → `scripts/recording-bot-cron.sh --missed
<schedule.json>` → `--missed` → `findMissedMeetings` + `recordMissedMeetings`.
- Inside `recordRoom`: `joinRoom` (launchBrowser → openPage → navigate →
  waitForJoin) → `runSession` → `nextStep` (pure threshold) → `applyStep` →
  on command `'start'` **calls `capture.start()`** (ffmpeg on the PulseAudio
  null-sink monitor) and on `'stop'` **calls `capture.stop()` →
  `finalizeRecording`** (mux to RECORDINGS_DIR).

The attempt-1 finding — "`--decide` only prints JSON, nothing acts on the
returned action" — is no longer true. `session.mjs` `applyStep` is the consumer:
`if (command === 'start') await capture.start()` (line 73), and the live run
below proves a `.mp4` actually lands in RECORDINGS_DIR. The chain
schedule/timer → captured file is complete.

### 2. Does the live proof reproduce? — YES (run myself, clean state)

## Evidence: live proof (scoped spot-check re-run)

command: BOT_LIVE_TEST=1 npx vitest run src/**tests**/AC-006-bot-adapter.test.ts
exit: 0
at: 2026-10-26T12:17:51Z

RUN v5.0.1 /home/dbueno/projects/rexiAI

[live-proof] mean_volume=-17.6 dB file=/tmp/rexi-live-recordings-zzdIYm/rexi-8747ae3e35388146_2026-10-26-12-18-35/rexi-8747ae3e35388146_2026-10-26-12-18-35.mp4

Test Files 1 passed (1)
Tests 31 passed (31)
Start at 13:17:51
Duration 44.55s (tests 99%)

`mean_volume=-17.6 dB` (a real participant reads ~-20 dB; silence ~-91 dB),
exit 0, 31 tests. The recording is audible and lands in RECORDINGS_DIR as a
muxed `.mp4` with `metadata.json` and a derivable room — AC-006-14 (start at
two humans) and AC-006-19 (audio stream present) exercised end-to-end, not just
at unit level.

### 2b. The bot-alone control (independent reproduction)

The load-bearing half of the claim is that a bot ALONE does not record itself
(silence, ~-91 dB). This is not a committed test — I reproduced it myself using
the bot's own launch path (`launchBrowser` + `buildJoinUrl` with the bot's muted
join config + `ensurePulseServer` + `loadSink`), joined to a fresh room alone,
confirmed the participant store was exposed (bot actually joined), then captured
only its sink monitor for 8 s.

## Evidence: bot-alone control (independent reproduction)

command: node /tmp/opencode/bot-alone-control.mjs (scratch; removed after)
exit: 0
at: 2026-10-26T12:19:00Z

[recording-bot] started private PulseAudio server at unix:/tmp/rexi-bot-pulse/native
[recording-bot] null sink rexi-bot-4082612 loaded (module 1)
[control] bot joined room (store exposed): true
[control] mean_volume=-91.0 dB (bot alone)

Confirmed independently: `mean_volume=-91.0 dB` with the bot joined (store
exposed) and alone — it does not record itself. The muted join config
(`config.startWithAudioMuted=true`, `config.disableInitialGUM=true`) holds: no
self-audio leaks into the capture.

### 3. The host deviation — (a) honest test workaround

- Production default is unchanged: `capture.mjs` line 36
  `DEFAULT_JITSI_BASE_URL = 'https://meet.jit.si'`. The override is
  test-only, via `BOT_LIVE_TEST_BASE` (default `https://meet.ffmuc.net`), and
  only the `BOT_LIVE_TEST=1` gated test reads it.
- No acceptance scenario pins the bot's capture host. AC-006-13…17 pin the
  pure threshold decision; AC-006-18…20 pin output format/room-derivation/pipeline
  compatibility; Task 1 pins the _client-facing_ branded URL and the real-room
  resolution (booking-side, `meeting.ts`), not the bot's join host.
- The comment is truthful about _why_: meet.jit.si now refuses to start a
  conference without a signed-in moderator, and the bot never starts a
  conference (it joins one the humans opened).

Verdict: (a). Production path defaults to meet.jit.si and is unchanged; the
live proof moves off it only because an anonymous test cannot start a
meet.jit.si room. **Note (recorded, not blocking):** the same moderator
requirement raises a real deployment question for production — if meet.jit.si
no longer lets anonymous _clients_ start rooms either, the booked humans cannot
open the room the bot joins; that is a hosting-policy/deployment concern (the
repo already ships Jibri/self-host scripts), not a defect in this spec's code.
Second note: `output.mjs` hardcodes `meeting_url` to `https://meet.jit.si/<room>`
regardless of the actual capture host; room derivation only reads the last
segment, so correctness is unaffected, but the constant is a latent assumption.

### 4. The declared gap — genuinely one step removed (out-of-scope), NOT the attempt-1 failure

Confirmed by grep: `schedule.json` is **read** (schedule.mjs, recording-bot.mjs,
both systemd units) but **no in-repo producer writes it**. `api/bookings.ts`,
`api/bookings/direct.ts`, `api/stripe-webhook.ts` never emit it. So `--watch`
and `--missed` have nothing feeding them unattended.

Judgment — this is **not** the same class of failure as attempt 1:

- Attempt 1: the `'start'`/`'stop'` actions had **no consumer inside the
  delivered code** — a chain broken _within_ scope. Now the chain is complete and
  live-verified.
- The schedule file is the bot's **input**, produced by a component (the booking
  side) that **no task in 10-tasks.md assigns**. Tasks 1–8 cover branded link,
  consent, participant count, threshold, output, recordings location, missed
  _evaluation_, locale — none says "write schedule.json on booking."
- AC-006-24…26 assert the missed-meeting **evaluation** ("given a booked meeting
  … the bot emits a record naming the room"). The pure `findMissedMeetings` /
  `recordMissedMeetings` is correct and its test asserts exactly the scenario
  (see below). No scenario asserts schedule _production_.

So the scenarios are satisfied by the bot as scoped. The gap is a genuine
out-of-scope input (propose a follow-up spec to have the booking side emit
schedule.json), one step removed from what AC-006-24…26 assert — the
"function green, capability absent" failure does not recur in the same form,
because the capability (join→threshold→record→finalize) is now present and
live-verified. The follow-up must exist before the bot runs unattended; I flag
that plainly rather than bury it.

### Scenario-to-behavior spot check (AC-006-24…26, AC-006-18…20) — PASS

## Evidence: scenario tests (scoped spot-check)

command: npx vitest run src/**tests**/AC-006-missed-meeting.test.ts src/**tests**/AC-006-recording-output.test.ts src/**tests**/AC-006-recordings-location.test.ts src/**tests**/AC-006-record-threshold.test.ts
exit: 0
at: 2026-10-26T12:23:27Z

Test Files 4 passed (4)
Tests 27 passed (27)

Read `AC-006-missed-meeting.test.ts` directly: AC-006-24 asserts an elapsed
unrecorded entry → `findMissedMeetings` length 1 + a durable `.rexi-missed`
marker + a log line naming the room; AC-006-25 asserts not-started/in-progress →
empty; AC-006-26 asserts elapsed-but-recorded → empty (using a real
`recordingExistsForRoom` over a session dir). Assertions match the
Given/When/Then, not just the ID.

### 5. Sanity — no other regression

- The three idempotency markers (`.rexi-billed` / `.rexi-transcribed` /
  `.rexi-analyzed`) live only in the processor (`pipeline.mjs`, `billing.mjs`,
  `transcribe.mjs`, `insight.mjs`); the bot modules never write them (grep
  confirms zero references under `scripts/recording/bot/`).
- `RECORDINGS_DIR` single source: `scripts/recording/bot/config.mjs`
  `botRecordingsDir` delegates to `pipeline.mjs` `recordingsDirFrom`
  (`env['RECORDINGS_DIR'] || ~/.jitsi-meet-cfg/storage/jibri/recordings`),
  matching AC-006-21/22/23. No second path knob.
- `process-recording.mjs`, `pipeline.mjs`, `billing.mjs`, `transcribe.mjs`,
  `insight.mjs`, `recording-cron.sh` are all **untouched** (empty `git diff`).
  The only changed processor-adjacent file is the unrelated
  `scripts/test-billing-chain.mjs`.

### Supplementary complexity check (run because the fix added new `.mjs`)

## Evidence: supplementary eslint complexity check on new bot modules

command: npx eslint scripts/recording/bot/*.mjs scripts/recording-bot.mjs
exit: 0
at: 2026-10-26T12:24:00Z

(no output — 0 errors, 0 warnings)

The project's complexity gate (`complexity: ['error', 6]`) is clean on the new
recorder code. Full traceability/design-principles gates were not re-run
(prior green, unchanged scope; the design-principles FAIL in attempt 1 was
out-of-repo `.standards/skills/hallmark/...` noise and stands as-is).

## No unaccounted behavior (finding line)

- New modules trace to Tasks 3–7 (the recorder) and the bot's deployment; the
  cron wrapper and three systemd units trace to the bot's host-side wiring.
  Nothing untraced in the logic.
- Observation (environment, not a spec finding): orphaned Chrome processes from
  a prior _manual_ run remain (`/tmp/chrome-p4-{Alpha,Beta,Rexi Recorder}`,
  room `rexi-39f7a6cd00000000`, ports 9481–9483). These are not from the
  committed vitest live test (which uses `rexi-live-profile-*` dirs and cleans
  up in its `finally`), nor from my runs (both of mine cleaned up). Flag for the
  Coder to kill, not a gate finding.

---

## Phase-1 remediation round verdict: PASS

The attempt-1 `spot-check` BLOCK is resolved. A real recorder exists, is wired
end-to-end, and is independently live-verified twice over (a real two-human
meeting records audibly at -17.6 dB; a bot alone records silence at -91 dB, i.e.
it does not record itself). The host deviation is an honest test workaround with
the production default (meet.jit.si) unchanged, and the schedule-file producer
gap is a genuine out-of-scope input (follow-up spec recommended), not a
recurrence of the "capability absent" failure.

Recorded for the Architect (not blocking): (1) follow-up spec for a schedule.json
producer so `--watch`/`--missed` run unattended; (2) meet.jit.si moderator
requirement — confirm anonymous clients can open rooms, else the self-hosted
Jitsi path must be used; (3) orphaned Chrome processes from a prior manual run.
---

## Audit-trail re-check (remediation of the attempt-1 spot-check block)

command: .standards/scripts/check-audit-trail.sh 006-branded-meeting-link-and-recording-bot
exit: 0
at: 2026-10-26T12:34:04Z

PASS — folder complete, verifier evidence recorded. All five evidence blocks
parse with numeric `exit:` codes. The `scenario-to-behavior spot check` block
now carries `exit: 0` from a fresh live re-run (grep wiring proof +
`BOT_LIVE_TEST=1 npx vitest run src/__tests__/AC-006-bot-adapter.test.ts`,
`mean_volume=-18.5 dB`, 31/31 tests, exit 0). The historical attempt-1
`exit: n/a (finding)` was neither deleted nor recoded into an unobserved number —
it is preserved verbatim in the "Historical note / Attempt-1 finding" prose
immediately below the block. No other evidence block was modified.

## Quality gates

# 30-report — spec 006 (branded meeting link + local recording bot)

Stage 5a (Mutation Runner). Written against `10-tasks.md`, `20-acceptance/`, and
`25-verification.md`. The informal spec (`00-informal.md`) was not read.

**Precondition:** `25-verification.md` exists and its current verdict is **PASS**
(phase-1 remediation round, attempt 2). Stage 5a therefore ran.

## Verdict: GREEN

Mutation testing is **skipped — `mvp` tier** (see §Conformance tier determination
for the live evidence). The full suite was re-run by this stage and is green
(414 passed, 1 skipped, exit 0). No stage-5a gate blocks stage 5b.

One **handoff blocker** is recorded for stage 5b anyway, and it is not this
stage's artifact: the pipeline's `check-audit-trail.sh` fails on a
Verifier-owned evidence-format gap in `25-verification.md`
(§Audit-trail gate finding). Stage 5b runs that gate before pushing, so it must
be fixed by the Verifier first. The Verifier's PASS verdict itself stands.

---

## Verifier's verdict (carried forward)

**PASS** — `25-verification.md`, phase-1 remediation round, attempt 2.

The attempt-1 verdict was **BLOCK** on a single gate, `spot-check`: the
end-to-end recorder was absent (`--decide` printed an action nothing consumed).
The Verifier's scoped re-verification closed it by tracing the live chain
(systemd unit → `recording-bot-cron.sh --watch` → `recording-bot.mjs --watch` →
`runRoom` → `joinRoom` → `runSession` → `applyStep` → `capture.start()/stop()` →
`finalizeRecording`) and then reproducing it twice by execution:

- live two-human capture: `mean_volume=-17.6 dB`, muxed `.mp4` in
  `RECORDINGS_DIR` (`exit: 0`, `2026-10-26T12:17:51Z`);
- bot-alone control (independent scratch reproduction): `mean_volume=-91.0 dB`
  with the participant store exposed, i.e. the bot does not record itself
  (`exit: 0`, `2026-10-26T12:19:00Z`).

Carried forward unchanged; not re-litigated here.

---

## Conformance tier determination

Repository tier: **`mvp`**.

Per `.standards/docs/SPEC_PIPELINE.md §Conformance tiers`, the "Architect —
mutation testing" row is **skip** at `mvp`; per
`.standards/docs/CONFORMANCE_TIERS.md`, mutation testing (PiTest / Gremlins /
Stryker) is a `production`-tier rule, so at `mvp` it is out of scope rather than
an unmet gap. The Architect role still runs — only the mutation _test_ does not.

The tier was verified live by this stage, not assumed:

- No `AGENTS_*.md` project-instructions file exists at the repo root; root
  `AGENTS.md` is a symlink to `.standards/AGENTS.md`, and it carries no
  `Conformance tier:` declaration.
- `check-code-principles.sh` therefore terminates its auto-detection in
  `TIER="${TIER:-mvp}"` (line 365).
- The gate's own JSON reports `"tier": "mvp"` (its `--json` output, extract
  below).
- The project has not adopted mutation tooling: no `stryker` binary in
  `node_modules/.bin/`, no `stryker.conf.*`, and no `mutation` script in
  `package.json`.

## Evidence: conformance tier auto-detection source

command: ls AGENTS*.md; grep -n "Conformance tier" AGENTS.md; grep -n 'TIER="${TIER:-mvp}"' .standards/scripts/check-code-principles.sh
exit: 0
at: 2026-10-26T12:27:21Z

AGENTS.md
AGENTS.md: no 'Conformance tier:' declaration
365:TIER="${TIER:-mvp}"

## Evidence: conformance tier reported by the gate

command: .standards/scripts/check-code-principles.sh --json 2>/dev/null | jq -r '.tier, (.gates|join(","))'
exit: 1
at: 2026-10-26T12:26:58Z

mvp
complexity,dry,yagni,solid,component-per-file,property-tests

Note on `exit: 1`: the exit code is the gate script's (`PIPESTATUS[0]`), not the
tier extraction. The gate returns 1 because of one FAIL —
`./.standards/skills/hallmark/site/examples/cobalt-01/script.js` (CC=10) — an
example shipped inside the `.standards` submodule, not child-repo code, already
diagnosed and dismissed as out-of-repo noise in `25-verification.md`
§design-principles gate. The tier row itself printed unambiguously: `mvp`.

## Evidence: mutation tooling not adopted

command: ls node_modules/.bin/stryker; ls stryker.conf.*; grep -n '"test"\|mutation' package.json
exit: 0
at: 2026-10-26T12:27:21Z

ls: cannot access 'node_modules/.bin/stryker': No such file or directory
ls: cannot access 'stryker.conf.*': No such file or directory
13: "test": "vitest run --exclude '.standards/**'"

---

## Mutation score

**skipped — `mvp` tier.**

No mutation tool was run, because the tier does not require one
(`.standards/docs/SPEC_PIPELINE.md §Conformance tiers`: mutation testing is
`production` and `multi-service` only; `.standards/docs/CONFORMANCE_TIERS.md`:
"Mutation testing (PiTest / Gremlins / Stryker) — `production`"). Running Stryker
here would have been running a gate the project has not adopted at its declared
tier, and would have required installing tooling (`@stryker-mutator/*`) that no
tracked file references — a dependency addition this stage has no mandate to
make.

No mutants were generated, so there are no survivors, and this stage wrote no
new tests: there is no surviving mutant to kill. The test suite is unchanged by
stage 5a.

## Evidence: mutation score

command: (none — skipped by tier policy; no mutation tool configured)
exit: 0
at: 2026-10-26T12:26:58Z

Mutation testing skipped — `mvp` tier. Per
`.standards/docs/SPEC_PIPELINE.md` §Conformance tiers and
`.standards/docs/CONFORMANCE_TIERS.md`, mutation testing
(PiTest / Gremlins / Stryker) is a `production`-tier gate and is skipped at
`mvp`. Repo tier is `mvp` (no `Conformance tier:` declaration; gate
auto-detection defaults to `mvp`; no Stryker dependency or config present).

---

## Equivalent mutants

**None.** Mutation testing was skipped at `mvp` tier, so no mutants were
generated and no mutant reached the equivalence question. There is nothing to
name as un-killable, and no mutant was rationalised away — nothing was analysed
as "matches the intent" because nothing was mutated.

---

## Test-suite status: the headline feature's proof is opt-in

Read this before trusting the green number below. The live capture test — the
one that proves the bot actually joins a room, crosses the two-human threshold,
and records audible audio — is **skipped in the default suite**:

```
const LIVE = process.env['BOT_LIVE_TEST'] === '1'
describe.skipIf(!LIVE)('live: the bot joins a room and records a real participant', () => {
```

It runs only under `BOT_LIVE_TEST=1 npx vitest run src/__tests__/AC-006-bot-adapter.test.ts`,
which is how the Verifier produced the `-17.6 dB` capture and the `-91.0 dB`
bot-alone control. In a plain `npm test` — including the run recorded below —
that block is the **1 skipped** test, so the default suite's green does **not**
re-prove live capture; it proves the unit/acceptance layer around it.

The separate `it.skipIf(!hasFfmpeg)` case in `AC-006-recording-output.test.ts`
(AC-006-19) is an environment guard, and in this run it was **not** skipped:
`ffmpeg` and `ffprobe` are present, so the real-ffmpeg assertion executed.

## Evidence: live-test gating (source fact)

command: grep -n "const LIVE\|describe.skipIf(!LIVE)\|it.skipIf(!hasFfmpeg)" src/**tests**/AC-006-bot-adapter.test.ts src/**tests**/AC-006-recording-output.test.ts
exit: 0
at: 2026-10-26T12:27:26Z

src/**tests**/AC-006-bot-adapter.test.ts:515:const LIVE = process.env['BOT_LIVE_TEST'] === '1'
src/**tests**/AC-006-bot-adapter.test.ts:516:const LIVE_BASE = process.env['BOT_LIVE_TEST_BASE'] || 'https://meet.ffmuc.net'
src/**tests**/AC-006-bot-adapter.test.ts:695:describe.skipIf(!LIVE)('live: the bot joins a room and records a real participant', () => {
src/**tests**/AC-006-recording-output.test.ts:121: it.skipIf(!hasFfmpeg)(

---

## Complexity summary (carried from the Refactorer)

The Refactorer leaves no report artifact; its gates are re-executed and recorded
by the Verifier in `25-verification.md`. Carried forward verbatim as measured:

- `deploy/join/index.html` inline script cyclomatic complexity: **9 → 5**.
- `api/stripe-webhook.ts`: **631 → 603 lines**, method count **14 → 9**
  (`getRawBookingFields` extraction among them).
- Overall max cyclomatic complexity: **6**, with **0 violations** of the
  project's ESLint `complexity: ['error', 6]` gate.

Independently corroborated at stage 4: `npm run lint` → 0 errors (the 10
existing `no-console` warnings are confined to pre-existing `tests/e2e/*`
files), and the supplementary `npx eslint scripts/recording/bot/*.mjs
scripts/recording-bot.mjs` run added by the remediation round → 0 errors,
0 warnings.

Carried WARNs (not blockers, recorded for stage 5b / reviewers):
`api/stripe-webhook.ts:148 getRawBookingFields` KISS_LINES=21 and
`api/bookings/checkout.ts:45 buildSessionParams` KISS_LINES=23 — both just over
the 20-line method guideline; plus DRY duplication warnings from repeated
`BookingInput`/`BookingData` field-shape literals in `api/bookings.ts` and
`api/stripe-webhook.ts`. The `stripe-webhook.ts` "possible god file" WARN is now
603 lines / 9 methods after the Refactorer's split (down from 631 / 14).

Note on the tier: property testing is also a `production`-tier rule
(`docs/CONFORMANCE_TIERS.md`), so the gate skips that check at `mvp`. Three
property-test files nonetheless exist in this spec's tree
(`PROP-consent-notice.test.ts`, `PROP-meeting-url.test.ts`,
`PROP-participants.test.ts`) and do run as part of the suite below — they are
included in the 414 passing tests, not skipped.

---

## Final test status (re-run by this stage)

**PASS** — 62 test files, **414 passed, 1 skipped**, exit 0. Re-run by stage 5a
itself after the mutation-kill work (which was a no-op); no number is copied
from the Verifier's run, which reported a different count (61 files / 382 tests,
before the remediation round added the bot-adapter suite).

## Evidence: final full test suite

command: npm test
exit: 0
at: 2026-10-26T12:26:58Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

RUN v5.0.1 /home/dbueno/projects/rexiAI

Test Files 62 passed (62)
Tests 414 passed | 1 skipped (415)
Start at 13:26:59
Duration 16.91s (environment 69%, tests 15%, setup 8%, transform 5%, import 4%, worker 1%)

Environment jsdom was created 62 times · 109.18s total, 69% of tracked time
create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
learn more: https://vitest.dev/guide/improving-performance#test-environments

The single skipped test is the `BOT_LIVE_TEST`-gated live capture described
above. No acceptance scenario depends on it exclusively: the two IDs that block
also carries, AC-006-14 and AC-006-19, are additionally asserted by tests that
ran in this suite (evidence below), and stage 4's traceability check resolved
36/36 IDs.

## Evidence: skipped live block is not the sole coverage for its scenario IDs

command: grep -rn "AC-006-14\|AC-006-19" src/**tests**/ | grep -v "AC-006-bot-adapter"
exit: 0
at: 2026-10-26T12:28:36Z

src/**tests**/AC-006-record-threshold.test.ts:31: it('AC-006-14: exactly two non-bot humans starts the recording', () => {
src/**tests**/AC-006-recording-output.test.ts:91: it('AC-006-19: the finalized recording reports an audio stream to ffprobe', async () => {
src/**tests**/AC-006-recording-output.test.ts:92: const recordings = path.join(base, 'AC-006-19')
src/**tests**/AC-006-recording-output.test.ts:113: env: { RECORDINGS_DIR: path.join(base, 'AC-006-19-silent') },

---

## Non-blocking flags carried forward from the Verifier

Recorded, not fixed here — neither is a gate failure, and neither is stage 5a's
file to change.

1. **No `schedule.json` producer (follow-up spec needed).** The bot _reads_
   `schedule.json` (`scripts/recording/bot/schedule.mjs`, `scripts/recording-bot.mjs`,
   and both systemd units), but nothing in the repo writes it —
   `api/bookings.ts`, `api/bookings/direct.ts`, and `api/stripe-webhook.ts` never
   emit it. Consequence: `--watch` and `--missed` are correct and live-verified
   but have no input when run unattended. No task in `10-tasks.md` assigns the
   producer, and no acceptance scenario asserts schedule production, so this is a
   genuine out-of-scope input rather than an unmet scenario — but it must be
   closed by a follow-up spec **before** the bot is trusted unattended. The
   timer/service units should not be enabled in production until then.
2. **Orphaned Chrome processes.** A prior _manual_ run left browser processes
   behind: `/tmp/chrome-p4-{Alpha,Beta,Rexi Recorder}`, room
   `rexi-39f7a6cd00000000`, ports 9481–9483. They are not from the committed
   vitest live test (which uses `rexi-live-profile-*` dirs and cleans up in its
   `finally`) and not from the Verifier's runs (both cleaned up). Flagged for the
   Coder to kill; harmless to the suite, but they hold ports and profile dirs.

Also carried (housekeeping before stage 5b commits): six untracked NAT-diagnostic
screenshots at the repo root (`router-1.png`, `router-2.png`,
`router-connect.png`, `router-nat.png`, `router-nat2.png`, `router-wan.png`)
trace to nothing in the tasks or scenarios — they should be excluded from the
spec branch rather than committed.

---

## Remediation record

Per `.standards/docs/SPEC_PIPELINE.md §Remediation budget`, carried from the
attempt entries in `25-verification.md`:

| Phase      | Attempt | Gate                                  | Outcome                                                                                                         |
| ---------- | ------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1 (pre-PR) | 1       | `spot-check`                          | **BLOCK** — end-to-end recorder absent; `--decide` printed an action with no consumer                           |
| 1 (pre-PR) | 2       | `spot-check` (scoped re-verification) | **Resolved → PASS** — recorder wired and live-verified twice (`-17.6 dB` capture, `-91.0 dB` bot-alone control) |

- **BLOCKs during this run: 1.** Resolved in **phase 1, attempt 2** — inside the
  phase-1 budget of max 3 (2 of 3 used, 1 remaining).
- **Phase 2 (post-PR) BLOCKs: none.** No PR exists yet; stage 5b owns that loop,
  and its counter is independent of the phase-1 counter above.
- No other gate produced a BLOCK: traceability (36/36), the full suite, the
  complexity gate, and the design-principles gate were green from attempt 1, and
  the attempt-1 design-principles FAIL was out-of-repo `.standards` submodule
  noise, not an in-scope defect.
- Stage 5a itself raised **no** BLOCK and invoked no remediation loop: its only
  gate (mutation testing) is tier-skipped, so the phase-1 budget was not
  consumed further.

---

## Audit-trail gate finding (handoff blocker for stage 5b — Verifier-owned, NOT fixed here)

Running the pipeline's own audit gate on this folder **fails**, and the cause is
in `25-verification.md`, not in this report. Stage 5b runs this gate before
pushing, so **stage 5b will be blocked until it is corrected**.

## Evidence: audit-trail gate

command: .standards/scripts/check-audit-trail.sh 006-branded-meeting-link-and-recording-bot
exit: 1
at: 2026-10-26T12:28:15Z

PASS 006-branded-meeting-link-and-recording-bot: 10-tasks.md present and non-empty
PASS 006-branded-meeting-link-and-recording-bot: 20-acceptance/ has an AC-*.md with a '## AC-NNN-NN' heading (AC-015-10)
PASS 006-branded-meeting-link-and-recording-bot: 25-verification.md present and non-empty
PASS 006-branded-meeting-link-and-recording-bot: 30-report.md present and non-empty
PASS 006-branded-meeting-link-and-recording-bot: 15-design.md present and non-empty (AC-015-13)
PASS 006-branded-meeting-link-and-recording-bot: evidence block 'scenario traceability' — command: .standards/scripts/check-scenario-traceability.sh --json, exit: 0, at: 2026-10-26T10:46:10Z
PASS 006-branded-meeting-link-and-recording-bot: evidence block 'full test suite' — command: npm test, exit: 0, at: 2026-10-26T10:46:50Z
PASS 006-branded-meeting-link-and-recording-bot: evidence block 'complexity gate' — command: npm run lint, exit: 0, at: 2026-10-26T10:47:20Z
PASS 006-branded-meeting-link-and-recording-bot: evidence block 'design-principles gate' — command: .standards/scripts/check-code-principles.sh --json, exit: 1, at: 2026-10-26T10:47:50Z
FAIL 006-branded-meeting-link-and-recording-bot: evidence block 'scenario-to-behavior spot check' is missing: exit (AC-015-04)
✘ Audit-trail check: 1 violation(s).

Cause, precisely: `check-audit-trail.sh` selects the evidence block whose
`## Evidence:` heading **exactly** equals one of its five check names
(`FIVE_CHECKS`, lines 76-82) and then requires a **numeric** exit
(`marker "$block" '^exit:[[:space:]]*\K[0-9]+'`, line 156). The heading it
therefore selects is the attempt-1 block in `25-verification.md`:

```
## Evidence: scenario-to-behavior spot check

command: manual — read 20-acceptance/AC-006-record-threshold.md, AC-006-recording-output.md, AC-006-missed-meeting.md; traced `--finalize`/`--decide`/`--missed` callers; grep for any WebRTC client
exit: n/a (finding)
at: 2026-10-26T10:48:00Z
```

`exit: n/a (finding)` does not match `[0-9]+`, so the block is reported as
missing its exit code. The attempt-2 blocks that carry the PASS-producing
scoped spot-check evidence (`## Evidence: live proof (scoped spot-check re-run)`,
`## Evidence: scenario tests (scoped spot-check)`) use headings with
parentheticals, so the exact-match selector never reaches them.

Why this stage did not fix it: `25-verification.md` is the Verifier's
independent record of what _it_ executed. Rewriting its `exit:` line, or
renaming its headings to make a gate pass, would put stage 5a's hand on another
stage's evidence — the exact failure mode the separate Verifier stage exists to
prevent (`.standards/docs/SPEC_PIPELINE.md §Why a separate Verifier stage`). A
numeric exit for a manual read is the Verifier's to assert (the attempt-1
finding was a BLOCK, so `exit: 1` would carry its own meaning), not mine to
invent.

Minimal correction, for the Verifier: give the attempt-1 spot-check block a
numeric `exit:` (or retitle the attempt-2 scoped block to the exact contract
name `## Evidence: scenario-to-behavior spot check` with its `exit: 0`). One of
the two, chosen by the agent that ran it. This is a formatting gap in the
Verifier's artifact, not a technical defect in the spec's code, and it does not
change the PASS verdict — but it is a hard gate failure for stage 5b until
fixed.

---

## What this stage changed

Nothing but this report. No production code, no test file, no threshold, no
gate configuration, and no exemption list was modified — stage 5a had no
surviving mutant to kill and no gate to widen. Specifically **not** done:
committed, pushed, tagged, or opened a PR (that is stage 5b). The working tree
still carries this spec's uncommitted work by design; it was not stashed,
cleaned, or committed here, per the stop-and-ask matrix.

---

## Gate summary

| Item                                         | Result                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Verifier precondition (`25-verification.md`) | PASS (attempt 2, phase 1)                                                                              |
| Conformance tier                             | `mvp` (live-verified: no declaration, gate auto-detect, no Stryker)                                    |
| Mutation score                               | skipped — `mvp` tier (threshold ≥80% applies at `production`+)                                         |
| Equivalent mutants                           | none (no mutants generated)                                                                            |
| Complexity (carried from Refactorer)         | max CC 6, 0 violations; inline script 9→5; webhook 631→603 lines / 14→9 methods                        |
| Final full suite                             | 62 files, 414 passed, 1 skipped, exit 0                                                                |
| Remediation                                  | 1 BLOCK, resolved phase 1 attempt 2 (budget 2/3)                                                       |
| Stage 5a gates                               | GREEN (mutation skipped by tier; suite green)                                                          |
| Audit-trail gate (`check-audit-trail.sh`)    | **FAIL** — Verifier-owned evidence-format gap in `25-verification.md`; blocks stage 5b until corrected |
| Non-blocking                                 | `schedule.json` producer (follow-up spec); orphaned Chrome processes                                   |

## PR

PR: https://github.com/RexiAI/rexiAI/pull/86
commit-count: 9

Stage 5b appended this after the report above was green. One correction to the
row above, recorded rather than rewritten: the audit-trail `FAIL` cited there
(`2026-10-26T12:28:15Z`) was fixed by the Verifier afterwards — its
`scenario-to-behavior spot check` block now carries a numeric `exit:` and its
timestamp is `2026-10-26T12:31:05Z`. As run by stage 5b,
`check-audit-trail.sh 006-branded-meeting-link-and-recording-bot` exits **0**, and
`check-specs-archived.sh` exits **0** at the pushed head.

Commits on `spec/006-branded-meeting-link-and-recording-bot` (8 at PR open plus
this record commit):

1. `feat(meeting): branded join URL with real-room resolution and join page` — Task 1
2. `feat(email): recording-consent notice before the join link in both client emails` — Task 2
3. `feat(booking): carry the booking locale from the SPA to both client emails` — Task 8
4. `feat(recording-bot): count non-bot humans and gate recording on two of them` — Tasks 3+4 (grouped: both behaviours live in one module)
5. `feat(recording-bot): join the room, capture audio, write a pipeline-ready mp4` — Tasks 5+6 (grouped: the output writer imports the config module)
6. `feat(recording-bot): surface missed meetings and install the host units` — Task 7
7. `docs(specs): add spec 006 tasks, design, acceptance scenarios and reports`
8. `docs(changes): archive 006-branded-meeting-link-and-recording-bot`
9. `docs(changes): record PR URL and commit count for 006-branded-meeting-link-and-recording-bot`

## 15-design.md

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

_State A, valid room._ The only state for a valid path. One static page, fully
usable from first paint. Its strings, Spanish (default) and English (final),
in document order:

| Element         | `es` (default, final)                                                                       | `en` (final)                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `<title>`       | `Entrar en la reunión · RexiAI`                                                             | `Join the meeting · RexiAI`                                                                       |
| h1              | `Tu reunión con RexiAI`                                                                     | `Your meeting with RexiAI`                                                                        |
| explanation     | `La sala está en Jitsi (meet.jit.si), la plataforma de vídeo que usamos para las sesiones.` | `The room is on Jitsi (meet.jit.si), the video platform we use for sessions.`                     |
| notice          | `Aviso de grabación: la reunión se graba en audio.`                                         | `Recording notice: this meeting is recorded as audio.`                                            |
| action label    | `Unirse a la reunión`                                                                       | `Join the meeting`                                                                                |
| room identifier | `Sala <room>`                                                                               | `Room <room>`                                                                                     |
| help            | `Si la sala no se abre, pulsa el botón. Si sigue sin abrirse, escribe a info@rexi-ai.com.`  | `If the room does not open, press the button. If it still does not open, email info@rexi-ai.com.` |

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

_State B, no room in the path._ No join action at all (a button that leads to
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
  The parameter exists so the page shows the language the _booking_ was made in;
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
page on an unknown domain that greets you by name is _more_ alarming, and a
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
finish. A _future_ rewording of these two lines would still have to change those
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
  meeting _is_ recorded, by us.
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
- **Nothing else changes with locale.** Heading, fact rows _other than the join
  URL_, duration line, join CTA (`Unirse a la reunión`), calendar CTA (`Añadir a
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
- The attribute travels with the _notice selection_, not with the URL string: the
  same normalised booking locale that writes `?lang=en` onto the join URL is what
  selects the English pair and therefore the attribute. One captured value, three
  consumers (notice text, notice attribute, URL parameter), no second derivation.

The Spanish path emits no `lang` attribute at all — not on the paragraphs, not on
the container, not conditionally rendered in a way that changes whitespace. That
keeps the default path byte-identical to the Spanish rendering _without_ the
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
  "podría grabarse", "this session may be recorded"). The meeting _is_ recorded,
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
- A second language of the _surrounding_ copy: no part-English heading, no
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

---

# Phase-2 post-PR CI check — round 1 (spec pipeline)

PR: https://github.com/RexiAI/rexiAI/pull/86
Branch: `spec/006-branded-meeting-link-and-recording-bot`
Head SHA: `51dd2c551ff91aed344bad247bccb3b19d3e32c6`
Budget: phase 2, round 1 of max 3 (counter independent of phase 1). No local runs — judged from the checks API only.

## Evidence: PR checks (gh pr checks)

command: gh pr checks 86 --repo RexiAI/rexiAI --json name,state,bucket,workflow,link
exit: 0
at: 2026-10-26T12:41:53Z

[{"bucket":"skipping","link":"https://github.com/RexiAI/rexiAI/actions/runs/40324121246/job/121576613306","name":"Docker Build & Push","state":"SKIPPED","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/40324121246/job/121576463056","name":"Unit Tests","state":"SUCCESS","workflow":"CI"},{"bucket":"fail","link":"https://github.com/RexiAI/rexiAI/actions/runs/40324121246/job/121576463240","name":"Lint & Format","state":"FAILURE","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/40324121246/job/121576463385","name":"Build","state":"SUCCESS","workflow":"CI"},{"bucket":"pass","link":"https://vercel.com/github","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},{"bucket":"pass","link":"https://vercel.com/danielbueno76-4270s-projects/rexi-ai/Y5z21s3VhyWzK7AQurRqgg7PQdCT","name":"Vercel","state":"SUCCESS","workflow":""}]

## Evidence: check-runs pinned to head SHA

command: gh api repos/RexiAI/rexiAI/commits/51dd2c551ff91aed344bad247bccb3b19d3e32c6/check-runs --jq '.total_count, (.check_runs[] | [.id,.name,.status,.conclusion] | @tsv)'
exit: 0
at: 2026-10-26T12:41:53Z

5
121576613306 Docker Build & Push completed skipped
121576463385 Build completed success
121576463240 Lint & Format completed failure
121576463056 Unit Tests completed success
121576462672 Vercel Preview Comments completed success

## Evidence: failing job log (Lint & Format)

command: gh run view 40324121246 --repo RexiAI/rexiAI --log-failed
exit: 0
at: 2026-10-26T12:41:53Z

Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:25.0244117Z > rexiai-website@0.0.0 format:check
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:25.0244729Z > prettier --check .
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:25.1016541Z Checking formatting...
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:25.7249978Z [warn] deploy/home/README.md
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:25.8267815Z [warn] deploy/join/index.html
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:27.2222020Z [warn] docs/changes/006-branded-meeting-link-and-recording-bot.md
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:27.4434387Z [warn] scripts/recording-bot.mjs
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:27.4847018Z [warn] scripts/recording/bot/capture.mjs
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:27.5012663Z [warn] scripts/recording/bot/cdp.mjs
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:27.5573773Z [warn] scripts/recording/bot/pulse.mjs
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:28.3450218Z [warn] src/**tests**/AC-006-bot-adapter.test.ts
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:28.3558765Z [warn] src/**tests**/AC-006-branded-link.test.ts
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:28.4101382Z [warn] src/**tests**/AC-006-missed-meeting.test.ts
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:28.4687543Z [warn] src/**tests**/AC-006-notice-locale.test.ts
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:28.5010546Z [warn] src/**tests**/AC-006-record-threshold.test.ts
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:28.5360931Z [warn] src/**tests**/AC-006-recording-output.test.ts
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:29.3587859Z [warn] Code style issues found in 13 files. Run Prettier with --write to fix.
Lint & Format Run npm run format:check --if-present 2026-10-26T12:39:29.4378156Z ##[error]Process completed with exit code 1.

## Verdict: FAIL

Failing check: `Lint & Format` (check-run id `121576463240`, workflow `CI`, run `40324121246`).

Concrete failure reason: the `Lint & Format` job's `npm run format:check` step runs `prettier --check .`, which exits 1 with `Code style issues found in 13 files. Run Prettier with --write to fix.` — 13 files are unformatted per the repo's Prettier config:

- deploy/home/README.md
- deploy/join/index.html
- docs/changes/006-branded-meeting-link-and-recording-bot.md
- scripts/recording-bot.mjs
- scripts/recording/bot/capture.mjs
- scripts/recording/bot/cdp.mjs
- scripts/recording/bot/pulse.mjs
- src/**tests**/AC-006-bot-adapter.test.ts
- src/**tests**/AC-006-branded-link.test.ts
- src/**tests**/AC-006-missed-meeting.test.ts
- src/**tests**/AC-006-notice-locale.test.ts
- src/**tests**/AC-006-record-threshold.test.ts
- src/**tests**/AC-006-recording-output.test.ts

All other terminal checks are green: Unit Tests (pass), Build (pass), Vercel (pass), Vercel Preview Comments (pass), Docker Build & Push (skipped). No pending checks.

Fix routing: formatting only — no behavior implicated. Run `npx prettier --write` on the 13 files (mechanical) and re-push. Classified as structure/formatting → **Refactorer**.
