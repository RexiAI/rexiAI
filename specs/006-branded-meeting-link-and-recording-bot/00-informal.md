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
