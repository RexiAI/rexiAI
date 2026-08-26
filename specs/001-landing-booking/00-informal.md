# 001 — RexiAI landing page with paid booking (informal spec)

Written by Daniel. Informal prose, my words. Specifier: turn into tasks + scenarios.

## What this is

Replace the current RexiAI one-page site with a main landing page that advertises
my company. The company is just me (solo operator) for now.

## Services to advertise

- Building SaaS products
- Building websites
- Building apps
- Consulting

## Catchphrase

Something like: **"Forget your Excel — let's automate, with or without AI!"**
Exact wording flexible; keep the spirit.

## Contact

- Email: danielbueno76@gmail.com
- "If you are interested, contact me" CTA somewhere prominent.

## Languages (i18n)

- Site must exist in **Spanish (default) and English**.
- All user-facing copy in both languages, language switcher on the page.

## Booking + payments feature

Visitors can book my time directly from the site:

1. A calendar shows when I am available.
2. My available hours must be **configurable through YAML** (or similar config file)
   so I can change them without touching code.
3. To book me, the visitor pays in advance through **Stripe**, in **test mode** for
   now (no live Stripe account yet — live keys plug in via config/env later).
4. Pricing (currency **EUR**): **first hour free — once per client ever** (identified
   by email; a returning client never gets another free hour), every additional hour
   **flat €30**. Examples: 1h = €0, 2h = €30, 3h = €60, 4h = €90.
5. Booking duration: **min 1 hour, max 4 hours** per booking.
6. Calendar timezone: **Europe/Madrid**.
7. On completed booking: record it, **email notification to me**, and **create the
   event in my Google Calendar**.
8. Payment amount depends on booked hours, charged in advance at booking time.

I will supply my actual availability hours later — that is why it must be config-driven.

## Design direction

OpenAI-style storytelling (user decision, 2026-08-26). Reference screenshots captured
from openai.com live on 2026-08-26, stored in `design-refs/`:

| File | What it shows |
|---|---|
| `openai-00-full-page.png` | Whole openai.com homepage scroll |
| `openai-01-hero.png` | Hero: product-as-hero ("What can I help with?" prompt box), quick links under it |
| `openai-02-story-cards.png` | Featured story-card grid — editorial storytelling layout |
| `openai-03-business-stories.png` | "OpenAI for business" customer-stories section |

Steal the *patterns* (hero with a real interactive element, story cards as narrative,
customer-proof section), not the branding.

## Out of scope / notes

- inglesmiami references already removed from the site (separate change, done).
- Old content (capabilities/repos sections) gets replaced by the new landing page;
  keep or drop the Open Source section at designer's discretion.

## Resolved decisions (2026-08-26, answered by Daniel)

1. Price after free first hour: flat €30/hour — yes.
2. Free first hour: once per client ever (email-keyed).
3. Timezone: Madrid/Spain (Europe/Madrid).
4. Stripe account: not ready — integrate test-mode now, live keys via config later.
5. Booking delivery: email notification + Google Calendar event creation.
6. Duration bounds: min 1h, max 4h.
