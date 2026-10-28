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
