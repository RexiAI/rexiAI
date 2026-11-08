# 019 — English-first landing relaunch

## Why we are doing this

Zero paying customers. The page currently sells one thing: "everything is free".
The free banner is the loudest element above the fold, above the H1. When the
promo ends, the page has no argument left. The buyer has no idea who this is
for, what it produces, or whether the person behind it has ever shipped
anything.

Consulting is now sold in English to an international audience. English is the
default language. Spanish stays available (toggle already exists) but is
secondary.

## The decision being made

Replace the commodity service grid + free-discount billboard with a single,
specific offer aimed at one buyer, backed by real shipped work, in English by
default, with one honest money story at the booking card.

## What the page must say (final copy — promote verbatim into tasks)

**Hero**

- H1: `Your business runs on a spreadsheet only one person understands.`
- Subtext: `I replace it with software that runs itself: internal tools, SaaS products and web apps. Scoped in one call, fixed price, shipped in weeks. You own the code.`
- Primary CTA: `Book a free hour` (arrow kept)
- Primary CTA microcopy, directly under the buttons: `You leave with a one-page plan and a fixed price.`
- Secondary CTA: `Email me`

**Free banner**

Deleted. The free first hour moves into the hero offer (above). Nothing is
struck through anywhere on the page, in any mode.

**Services section — retitled `What I build`, three cards, problem-first**

1. `Internal tools` — `The process living in three spreadsheets and one person's head, rebuilt as one tool your team actually opens.`
2. `SaaS products` — `If the thing you need does not exist, I build v1: auth, billing, deploys, the boring parts done properly.`
3. `Websites and apps` — `Fast, clear, and it converts. No page builder, no template.`

The old `SaaS · Product` / `Web · Frontend` / `Consulting · Strategy` tags are
removed. The carousel is removed — all three cards visible at every breakpoint,
no arrows, no dots.

**Proof section — new, titled `Shipped, not slideshow`**

Intro line: `No client logos yet. Everything below is live, built and run by me.`

Three items, each name + one line + link:

- `tax-advisor` — `AI tax guidance for Spanish freelancers.` → https://github.com/RexiAI/tax-advisor
- `pensions-system` — `Pension calculation, end to end.` → https://github.com/RexiAI/pensions-system
- `my-engineering-standards` — `The engineering standard everything above is built against: spec pipeline, CI gates, mutation-tested.` → https://github.com/RexiAI/my-engineering-standards

Honesty rule: these are products, not clients. No invented logos, no invented
numbers, no testimonials. If a metric is not true it does not ship.

**About block — new, titled `Who builds it`**

- `Daniel Bueno`, `Founder, RexiAI`
- `Based in Spain (Europe/Madrid). Working in English and Spanish.`
- `info@rexi-ai.com`
- `github.com/RexiAI`

Bio paragraph is a single field (`about.bio`) with the text supplied by the
owner at review time. Until it is supplied the block renders without it. Do not
invent a bio, a photo, an employer history, or a credential.

**Booking section — one money story per mode**

Free mode (`billingEnabled === false`):

- Narrative: `The first hour is free. You describe the process that is eating your week; you leave with a one-page plan and a fixed price for the build. No charge, no obligation, no slide deck.`
- Steps: `Pick a slot` / `Tell me what is broken` / `Get the plan and the price`
- Card: no `FREE` badge, no struck-through price ladder, no `Pay securely with Stripe` step, no `1h free · 2h 30 EUR · …` line.
- Submit button: `Book the free hour`

Paid mode (`billingEnabled === true`) — prepared now so the flip is a config
change, not a copy rewrite:

- Narrative: `First hour free. After that, 30 EUR per hour, prepaid — you pay for the block you book, nothing is metered afterwards.`
- Steps: `Pick a slot` / `Choose your block` / `Pay securely with Stripe`
- Price line: `1h free · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR` — NOT struck through, no FREE badge.
- Submit button: `Book and pay`

**Contact email**

`info@rexi-ai.com` replaces `danielbueno76@gmail.com` in every occurrence on the
site, both languages, including the hero secondary CTA, the contact section and
the email templates.

**Language**

English is the default for a first-time visitor (no stored preference). Spanish
remains reachable via the toggle. `<html lang>` follows the active locale and
`index.html` ships `lang="en"`.

**Document head**

- `<title>`: `RexiAI — fixed-price software for teams stuck on spreadsheets`
- `<meta name="description">`: `I replace the spreadsheet your business depends on with software that runs itself. Fixed price, scoped in one call, shipped in weeks. First hour free.`
- Open Graph: `og:type=website`, `og:title` (same as title), `og:description` (same as description), `og:url=https://www.rexi-ai.com/`, `og:site_name=RexiAI`, `og:locale=en_GB`, `og:locale:alternate=es_ES`, `og:image=/logo.png`
- Twitter: `summary_large_image`, same title and description
- `<link rel="canonical" href="https://www.rexi-ai.com/">`
- `<link rel="alternate" hreflang="x-default" href="https://www.rexi-ai.com/">`
- ES dictionary strings stay in sync with EN — no Spanish string is left saying something the English page no longer says.

## Explicitly out of scope for this spec

- Analytics / event tracking (separate spec).
- Privacy page content and legal entity data (privacy page exists in source;
  production is running an older build that predates it — verified by asset
  hash mismatch. Deploy verification belongs to the release, not this spec).
- Removing the post-paid `recorded-billing` path. Owner states the commercial
  model is prepaid; the meter should be reconciled or removed in its own spec.
- Recording / transcription (spec 004 territory).
- Any price change. 30 EUR/h stays.

## Kill criterion

If, four weeks after this deploys and traffic is measured, a cold visitor
cannot answer "who is this for / what do I get / has he shipped anything" in
under ten seconds — measured by a handful of five-second tests on strangers,
not by opinion — the copy is wrong again and gets rewritten from the answers,
not from taste.

## Conformance tier

`mvp` — no mutation testing, no property tests. Complexity and duplication
gates still apply.
