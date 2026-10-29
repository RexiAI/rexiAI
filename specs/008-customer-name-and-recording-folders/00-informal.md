# 008 — Customer name + recording folder organization

## The ask (operator's own words)

Two requests:

1. **Recording folders by date + person.** "The recording meeting should have
   a folder created with the date and the person that ordered it, so I can
   organize."

2. **Know who contacted me.** "In the email I received I should know the email
   of the person that contacted me, so it should be in the data."

## Clarification (already answered)

- **What identifies "the person that ordered it":** a NEW `name` field in the
  web booking form. It must be filled in (required). Today the customer's name
  is not captured anywhere — only their email.

## Current state (context, for orientation)

- Bookings are Stripe Checkout Sessions (`api/bookings/checkout.ts`), or direct
  bookings when billing is disabled (`api/bookings/direct.ts`). The only
  customer identity captured today is the **email**:
  - stored in Stripe session metadata (`metadata.email`),
  - already shown in the operator email as the "Cliente" line
    (`src/domain/email.ts`, `OperatorEmailInput.clientEmail`).
- Recordings land in `RECORDINGS_DIR` (`/home/dbueno/rexi-recordings`) as Jibri
  session directories named `<room>_<YYYY-MM-DD-HH-MM-SS>`. There is no
  organization by date or customer. The recording processor
  (`scripts/recording/pipeline.mjs`) already resolves room → booking email via
  the Stripe reservation, so the name could be resolved the same way once it is
  captured.

## What I want

1. **Capture the customer name** as a new required field in the web booking
   form, and persist it in the booking data alongside the email.

2. **Organize recordings** into folders keyed by meeting date + customer name,
   so a recording is findable by who booked it and when.

3. **Operator email** should show the customer's name and email, so I know who
   contacted me.

## Open question for the specifier

- "so it should be in the data" — the email is already in Stripe metadata. The
  likely intent is that the **name** (and email) be persisted in the booking
  data and carried through to the recording pipeline so the folder can be named
  with it. Confirm the intended "data" surface (booking/Stripe metadata, the
  recording sidecar, and/or the operator email) and flag anything ambiguous in
  `10-tasks.md` rather than guessing.
