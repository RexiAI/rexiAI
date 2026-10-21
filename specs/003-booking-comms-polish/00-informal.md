# 003 — Booking communications polish under disabled billing

## Problem

Spec 002 (merged, PR #68) made bookings work without Stripe when
`BILLING_ENABLED=false`, but the booking conversation with operator and client
still speaks the billing-era language. Observed by the owner on a real
billing-disabled booking (preview deployment, 2026-10-19):

1. **Misleading in-flight status.** While the booking POST runs, the SPA shows
   "Redirigiendo a Stripe..." / "Redirecting to Stripe..."
   (`src/i18n/dictionary.ts:74,187`, `submitting` key) even when billing is
   disabled. No redirect ever happens — the confirmation renders in place.
2. **Wrong billing copy in emails.** The operator email carries
   "Reserva sin cargo — se factura tras la reunión (pro-rata 0,50 EUR/min)"
   (`src/domain/email.ts:46`, `amountLine`), and the client email carries the
   pro-rata billing-model lines (`email.ts:144-147`, `billingModelLines`).
   Both are sent from the direct booking path where **nothing is ever
   charged**. The owner received the operator variant in his personal mailbox
   and asked why.
3. **Unprofessional email structure.** Both emails are flat line lists with no
   visual hierarchy and no calendar integration. Owner wants a better
   structured, professional email for operator AND client, including an
   "Add to Google Calendar" link.
4. **Web confirmation must not offer a join link.** The spec-002 confirmation
   panel renders an "Unirse a la sesión" CTA
   (`src/components/booking/BookingConfirmation.tsx:38-45`, dictionary key
   `booking.confirmation.joinLink`). Owner decision (2026-10-19): the customer
   joins **only via the email's Jitsi link** — the web confirmation shows the
   booking facts and tells the customer the confirmation was sent by email.
   Context/goal: meetings run in Jitsi rooms so they can be recorded and
   processed by the owner's AI assistant; the emailed link is the canonical
   join path.

## Ask

### A. Billing-aware in-flight copy

The SPA already fetches `billingEnabled` on load (`GET /api/config` — the
free-mode banner consumes it). When `billingEnabled === false`, the submitting
status must use a neutral confirming copy (es + en, dictionary-driven) that
never mentions Stripe. Billing-enabled: copy stays exactly as today.

### B. No billing language when billing is disabled

The reservation emails sent from the direct path (billing disabled) must
contain **zero** references to charging, billing, pro-rata, or prices — in
subject and body, operator and client variants. Billing-enabled emails stay
**byte-for-byte unchanged**: `src/__tests__/AC-016-email-safety.test.ts` and
`src/__tests__/AC-018-billing-guards.test.ts` pin the current wording (e.g.
'Reserva sin cargo', 'pro-rata 0,50 EUR/min') and must keep passing
unmodified — those assertions encode the enabled-world contract, not a defect.

### C. Professional restructure + Google Calendar link (disabled-billing emails)

The UX agent produces the layout + final copy in `15-design.md` from
transactional-email best practice. Owner must-haves:

- Clear hierarchy: key facts at top (date, start time, timezone, duration;
  client identity for the operator email, service framing for the client
  email), mobile-readable single-column layout.
- Primary CTA: the meeting join link, button-styled.
- Secondary CTA: "Añadir a Google Calendar" —
  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<title>&dates=<UTCstart>/<UTCend>&details=<details>`
  with times as UTC `YYYYMMDDTHHMMSSZ`, details containing the join link.
  All dynamic values URL-encoded (`encodeURIComponent`); HTML sinks escaped
  with the existing `escapeHtml`.
- Professional, calm tone; Spanish (existing email language — do not silently
  expand to bilingual emails).

### D. Web confirmation panel: no join link

Remove the join CTA from `BookingConfirmation.tsx`; the panel keeps title,
date, time, and the "confirmation sent by email" note (final copy/layout: UX
agent, es + en via dictionary). The direct-path API response shape stays
**unchanged** (`{ checkoutUrl: null, joinUrl, billingDisabled: true }` — the
frontend simply stops rendering `joinUrl`; zero backend test churn).

**Owner-authorized test changes** (per docs/TESTING.md §Tests That Encode a
Defect — these encode the superseded spec-002 contract, owner authorization is
this spec, changes must be recorded in the PR body):
`src/__tests__/AC-002-frontend-confirmation.render.test.tsx` (expects the
joinLink CTA when joinUrl present) and `src/__tests__/AC-002-frontend-confirmation.test.ts`
AC-002-17 (pins dictionary keys incl. `joinLink`). The
"billingDisabled without a joinUrl still confirms and never navigates" unit
test stays valid untouched.

Research digest gathered for the UX agent (fetched 2026-10-19):

- Postmark, "15 transactional email best practices" — subject ≤50 chars and
  useful without opening; proper From/preheader.
  https://postmarkapp.com/guides/transactional-email-best-practices
- Moosend 2026 guide — key information at top; one obvious tappable CTA; one
  simple mobile-friendly layout; reassuring copy reduces support tickets.
  https://moosend.com/blog/transactional-email-best-practices/
- Mailjet — itemized summary of the transaction as a core component.
  https://www.mailjet.com/blog/email-best-practices/transactional-email-structure-what-is-the-most-crucial-information/
- Unione — professional tone without marketing phrases; emphasize critical
  information. https://unione.io/en/blog/transactional-email-best-practices/

The UX agent may deepen this research (owner suggested sources like LinkedIn
top voices) and owns the final layout/copy decisions inside the constraints
below.

## Constraints

- No new dependencies: hand-built HTML through the existing
  `renderHtml`/`escapeHtml` pipeline in `src/domain/email.ts`; the calendar
  link is plain URL construction.
- Security: client-controlled values (email, name) escaped at every sink
  (`escapeHtml`); no upstream error passthrough (docs/SECURITY.md).
- Billing-enabled path byte-for-byte unchanged (subject, lines, pro-rata
  wording, webhook-driven flow).
- Spec-002 side-effect policy unchanged: operator-email failure = visible
  booking failure; client email best-effort (logged, swallowed).
- `api/bookings/direct.ts` must give the email builders the billing mode
  (flag or separate builder functions — Coder's call, cyclomatic ≤6, no
  behavior forks leaking into the enabled path).
- SPA: dictionary-only copy (es + en for the in-flight status), no hardcoded
  strings, reuse the existing `/api/config` fetch — no extra requests.
- Direct-path API response shape unchanged (joinUrl stays in the JSON; the
  confirmation UI stops consuming it — see Ask D).
- Calendar-link times must derive from the same resolved slot start/end and
  timezone chain (`AVAILABILITY_TIMEZONE` → `TIMEZONE` → 'Europe/Madrid') as
  the calendar event itself — no second source of truth.

## Out of scope (owner questions handled outside the pipeline)

- Brave/Windows camera diagnostics for meet.jit.si (client-environment issue).
- Local Jibri recording verification (infrastructure, answered directly).
- Reviving meet.rexi-ai.com self-hosted Jitsi for prod (separate effort).
