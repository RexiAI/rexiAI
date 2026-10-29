# 008 — Customer name + recording folder organization: task list

Two features, one data flow: a required `name` field in the booking form, and
recording folders keyed by customer name + meeting date. The name must travel
booking → Stripe metadata → operator email → recording pipeline folder naming.

Layer map (what each task touches, so criteria are checkable by reading code):

| Task | Files |
|---|---|
| 1 | `src/components/booking/hooks/useBookingFields.ts`, `useBookingSubmit.ts`, `form/validateBookingForm.ts`, new `fields/NameField.tsx`, `BookingLayout.tsx`, `src/i18n/dictionary.ts` |
| 2 | `api/bookings/validation.ts` |
| 3 | `api/bookings/checkout.ts` |
| 4 | `src/domain/email.ts`, `src/domain/emailDirect.ts` |
| 5 | `api/bookings/direct.ts` |
| 6 | `api/stripe-webhook.ts` |
| 7 | `scripts/recording/billing.mjs`, `scripts/recording/pipeline.mjs` |
| 8 | `scripts/recording/pipeline.mjs` (or a new `scripts/recording/folder.mjs`) |

---

## Task 1 — Capture the customer name in the booking form

The web booking form gains a required `name` field, collected alongside `email`,
validated client-side, and sent in the POST body.

Acceptance criteria:

- `useBookingFields` (in `src/components/booking/hooks/useBookingFields.ts`)
  exposes a `name` state and a `setName` setter, initialised to `''`, alongside
  the existing `email`/`setEmail`.
- A new `NameField` component renders an `<input>` for the name with a
  `<label htmlFor=...>` and an error `<p>` — same structure as
  `EmailField` (`src/components/booking/fields/EmailField.tsx`), including the
  `aria-describedby`/helper wiring.
- `NameField`'s label and helper text come from the i18n dictionary
  (`dict.booking.form.nameLabel`, `dict.booking.form.nameHelper`) in BOTH the
  Spanish and English dictionaries (`src/i18n/dictionary.ts`) — never a
  hardcoded string in the component.
- `BookingLayout` (`src/components/booking/BookingLayout.tsx`) renders
  `NameField` inside the form (order: after `EmailField`, before the submit
  button) and passes `fields.name`, `fields.setName`, and
  `fields.errors['name']`.
- `validateBookingForm`
  (`src/components/booking/form/validateBookingForm.ts`) adds a name check to
  the validated value object (signature extended with a `name` field):
  - when the trimmed name is empty it sets `e['name'] = dict.booking.form.required`;
  - otherwise, when the trimmed name is longer than 200 characters it sets
    `e['name'] = dict.booking.form.nameTooLong`.
  The name is NOT restricted to a character allow-list — names are free-form
  (filesystem-unsafe characters are sanitized at folder-creation time in Task 8,
  never at the form).
- `runBookingSubmit` (`src/components/booking/hooks/useBookingSubmit.ts`)
  includes `name` in the object passed to `validateBookingForm` and in the
  `postBooking` payload (`{ name, email, date, startTime, hours, locale }`).
- A submit with an empty or over-long name never calls `fetch('/api/bookings', ...)`
  (validation returns before `doSubmit`).
- The dictionary gains `nameLabel`, `nameHelper`, and `nameTooLong` in BOTH
  `es` and `en` (`src/i18n/dictionary.ts`).

## Task 2 — Validate the name at the API boundary

`POST /api/bookings` rejects a booking whose `name` is missing, blank, or over
200 characters, and passes a trimmed name through to the downstream booking
paths.

Acceptance criteria:

- `extractBookingFields` (`api/bookings/validation.ts`) reads `name` from the
  body: `typeof b.name === 'string' ? b.name.trim() : ''` (same trim pattern as
  `email`).
- A new `validateName(name, res)`:
  - answers `400 { error: { code: 'INVALID_NAME', message: 'Name is required' } }`
    and returns `false` when `name` is the empty string;
  - answers `400 { error: { code: 'INVALID_NAME', message: 'Name is too long' } }`
    and returns `false` when `name.length > 200`;
  - returns `true` otherwise.
- The name is NOT constrained to a character allow-list at the API either —
  only trim + required + max 200.
- `validateInput` calls `validateName` after `validateEmail` and before
  `validateDate`, and returns the `name` in BOTH return branches (with and
  without `locale`) — i.e. the returned input object always carries `name`.
- `prepareBookingInput`'s returned value therefore always contains a non-empty
  `name` string of at most 200 characters.
- The `BookingInput` type in `api/bookings.ts` is extended with `name: string`
  (so the handler compiles against the new validated field).

## Task 3 — Persist the name in Stripe checkout metadata

The name is written into the Checkout Session metadata so it survives the
Stripe round trip and can be read back by the webhook and the recording
pipeline.

Acceptance criteria:

- `CreateCheckoutInput` (`api/bookings/checkout.ts`) gains `name: string`.
- `buildSessionParams` adds `name: opts.name` to the `metadata` object, so
  `metadata.name` equals the trimmed name captured at booking time.
- `createCheckout` threads `name` from its input into `createSession` /
  `buildSessionParams` (the `SessionOpts` passed in `api/bookings.ts` reserve()
  already supplies `name`).
- `reserve` in `api/bookings.ts` passes `name: input.name` into `createCheckout`.

## Task 4 — Show the customer name in the operator email (domain)

The operator "new reservation" email renders the customer's name in addition to
the existing `Cliente` (email) line, in BOTH the billing-enabled and
billing-disabled variants, and never breaks when the name is absent.

Acceptance criteria:

- `OperatorEmailInput` (`src/domain/email.ts`) gains an OPTIONAL
  `clientName?: string`.
- The billing-enabled builder `buildLines` adds a `{ label: 'Nombre', value:
  input.clientName }` line immediately above the existing `Cliente` line, only
  when `input.clientName` is a non-empty string (additive: an input without
  `clientName` produces byte-identical output to today).
- The billing-disabled builder `buildDirectOperatorBody`
  (`src/domain/emailDirect.ts`) adds the same `{ label: 'Nombre', value:
  input.clientName }` row to its `rows` array, above the `Cliente` row, under
  the same non-empty-string guard.
- The name value is HTML-escaped at render time (it flows through the existing
  `renderHtml`/`tableHtml` escape path — no raw interpolation into the html
  part).
- The name is NOT added to the subject line (the subject stays
  `Nueva reserva: ...` / `Nueva reserva: <date> <startTime> (<tz>)` exactly as
  today).

## Task 5 — Direct booking carries the name to the operator email

The billing-disabled (direct) booking path forwards the captured name to the
operator email.

Acceptance criteria:

- `DirectBookingInput` (`api/bookings/direct.ts`) gains `name: string`.
- `notifyOperator` passes `clientName: input.name` inside the object given to
  `sendOperatorEmail` (the first-argument shape otherwise unchanged).
- `finishDirectBooking` receives `name` through its `input` (supplied by
  `api/bookings.ts` when billing is disabled).

## Task 6 — Webhook extracts the name and forwards it to the operator email

The Stripe webhook reads `name` out of session metadata and hands it to the
operator email, tolerating sessions that have no name.

Acceptance criteria:

- `getRawBookingFields` (`api/stripe-webhook.ts`) extracts
  `name: metaValue(metadata, 'name', '')`.
- The `BookingData` union type gains `name: string` on both variants, and both
  `buildStandardBookingData` and `buildRecordedBillingData` include it.
- `trySendEmail`'s data parameter includes `clientName` and passes it as
  `clientName: data.clientName` into `sendOperatorEmail` (alongside the
  existing `clientEmail`, `date`, `startTime`, `hours`, `amountCents`,
  `joinUrl`, `kind`, `slotConflictWith`).
- A session whose metadata has no `name` key (legacy booking, or a
  recorded-billing session) yields `clientName` as `''`/undefined and does NOT
  crash the webhook — the operator email simply omits the `Nombre` line (Task
  4's guard).

## Task 7 — Recording pipeline resolves the customer name and meeting date from the reservation

The recording processor reads the customer name and the meeting date out of the
Stripe reservation the same way it already resolves `email`, and carries them
into the per-session context (the date feeds Task 8's folder name).

Acceptance criteria:

- `reservationFields` (`scripts/recording/billing.mjs`) returns `name`
  (`meta['name']`) and `date` (`meta['date']`) alongside the existing
  `bookingId`, `email`, `quotedHours`, `joinUrl`;
  `reservationFromSession`/`findReservationByRoom` propagate them.
- `insightContext` (`scripts/recording/pipeline.mjs`) adds `clientName` sourced
  from `attribution?.name` (mirroring the existing `clientEmail:
  attribution?.email`).
- A reservation with no `name` metadata produces `clientName` as
  `undefined`/`''` without throwing — attribution and billing are unaffected.

## Task 8 — Organize recordings into `<name>_<date>` folders

The recording processor renames each Jibri session directory, in place, to
`<name>_<date>` (customer name first, underscore separator, then the meeting
date as `YYYY-MM-DD` from the booking's `metadata.date`).

Acceptance criteria:

- **Format.** The target folder name is `<sanitized-name>_<YYYY-MM-DD>`, e.g.
  `Maria_Garcia_2026-10-28`. The date is the booking's `metadata.date`
  (resolved by Task 7), never the processing date.
- **Sanitization.** The name part is made filesystem-safe before use:
  whitespace and the characters `/ \ < > : " | ? *` (and control characters)
  are replaced with `_`; consecutive `_` collapse to one; leading/trailing `_`
  are stripped. Accents and other unicode letters are preserved. Sanitization
  is deterministic (same input → same token).
- **Mechanics.** The session directory is RENAMED in place after the processor
  has resolved room → email → name (i.e. after `resolveAttribution`, so the
  room-resolution contract and the existing `.rexi-*` stage markers — which
  live inside the directory — are unchanged). A `.rexi-organized` marker is
  written inside the directory as part of the organize step (it travels with
  the directory on rename).
- **Fallback.** When no customer name is resolved, the folder is
  `unattributed_<YYYY-MM-DD>` — the date is the booking's `metadata.date` when
  attribution exists but the name is empty, otherwise the recording session
  date (already computed by `sessionDateFromMp4`). Never fabricate a name.
- **Collision.** When the target `<name>_<date>` already exists (a different
  directory), append `-2`, `-3`, … to the full folder name
  (`Maria_Garcia_2026-10-28-2`).
- **Idempotency.** The rename is guarded by the `.rexi-organized` marker: a
  re-scan of an already-organized directory never renames it again and never
  appends a new `-N` suffix. Per-directory containment in `sweepSessionDirs`
  holds — an organizing failure leaves the directory unmarked (eligible next
  scan) without crashing the sweep.
