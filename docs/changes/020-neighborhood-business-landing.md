# 020-neighborhood-business-landing

> Spec pipeline archive. Original source: `specs/020-neighborhood-business-landing/` (deleted by this script).
> Archived: 2026-11-24

## Original ask

# 020 — Neighborhood-business landing message

## Problem

The current landing message is diffuse. The hero names a pain ("a spreadsheet
only one person understands") but never names WHO the site is for, then lists
three unrelated offers (internal tools, SaaS products, websites/apps). Each
offer targets a different buyer: SaaS v1 is for startup founders, websites
compete with template agencies, internal tools are for operating businesses.
A visitor cannot tell in five seconds whether this is for them.

Compare inglesejecutivo.com: one audience, one promise. RexiAI needs the same
focus.

## Target buyer (decided)

Small and medium neighborhood businesses ("negocios de barrio", pymes):
plumbers / fontaneros, small supermarkets / tiendas de alimentación, workshops,
salons, clinics, small distributors. Owners, not IT departments. They speak in
jobs (presupuestos, pedidos, stock, citas, facturas, avisos a clientes), not in
software categories.

Do NOT use the labels "pymes de barrio" / "negocios de barrio" in the copy
(owner rejected them). Name the buyer through concrete trades instead
(fontaneros, tiendas, talleres, peluquerías).

## Hero message (decided by owner)

- ES headline (exact): "Tú me lo cuentas. Yo lo construyo."
- EN headline: "You tell me. I build it."
- Differentiator to convey in the subtext: I listen to what the business
  needs and build exactly that, adapted to them, unlike generic software
  (Holded/Odoo-style) where the business adapts to the tool. Proof of the
  listening: the free first hour is the owner talking, me listening; then a
  fixed price for exactly what they described.
- Subtext also names the trades (fontaneros, tiendas, talleres,
  peluquerías...) so the buyer recognizes themselves.

## Offer (decided)

Only one offer on the landing: replacing the spreadsheet / paper / WhatsApp
process that runs the business with one simple internal tool. SaaS products
and websites are removed from the landing.

## Laws of UX the new copy must respect (source: lawsofux.com)

- Jakob's Law / mental models: use the owner's vocabulary (presupuestos,
  pedidos, stock, citas), no developer jargon ("SaaS", "auth", "deploys",
  "mutation testing", "internal tools" as a category name).
- Hick's Law: one offer, one primary CTA (book the free hour). Email stays
  secondary.
- Serial Position Effect: the hero (first) and the contact/booking block
  (last) carry the core promise.
- Von Restorff: the primary CTA is the only visually emphasized action.
- Peak-End / concreteness: show 3 concrete before→after examples for
  neighborhood businesses (e.g. plumber: presupuestos en papel → presupuesto
  enviado desde el móvil; supermarket: stock en Excel → aviso automático de
  reposición; salon/clinic: citas por WhatsApp → agenda con recordatorios).
  These are illustrative examples, clearly NOT presented as client cases.
- Honesty: no invented testimonials, logos, or metrics.

## Required changes

1. Hero names the buyer explicitly (negocios de barrio / pymes: fontaneros,
   supermercados, talleres...) and one outcome. Fixed price, free first hour,
   "you own it" kept, in plain words.
2. "What I build" becomes one offer plus the before→after examples; SaaS and
   websites cards removed.
3. Proof section reworded for this buyer: no engineering jargon; the
   engineering-standards repo is not shown to owners as proof (or is
   de-emphasized). Keep honesty line.
4. Head title/description (index.html + dictionary head) match the new
   message, ES and EN.
5. Money story must be consistent with "precio fijo": the paid-mode narrative
   must not read as hourly billing for the build (it is for consulting
   blocks only).
6. ES remains primary; EN kept in sync (dictionary type enforces keys).

## Testing

- Unit tests updated for changed copy/sections.
- Add an E2E journey for the landing (tests/e2e, zero-npm-import plain node
  script per the repo's 004 D4 contract) that loads the built site and
  asserts: hero names the neighborhood-business buyer, only one service offer
  is rendered, no "SaaS" text appears, primary CTA scrolls to #booking, and
  ES/EN switch updates hero and document title.

## Additional owner decisions (round 2)

7. Eyebrow above the hero headline stating what is built: ES "Apps a medida
   para tu negocio", EN "Custom apps for your business". Copy says "app" /
   "herramienta", not "software", in buyer-facing text.
8. Secondary CTA becomes WhatsApp (replaces email in hero): link
   https://wa.me/34644409229 (number +34 644 40 92 29). Email stays in
   contact section/footer. Primary CTA stays "book the free hour".
9. Pricing message (no public range — owner decision): first hour free;
   after that, a closed price agreed per project depending on what is built;
   payment by milestones (pay as each part is delivered). No hourly-rate text
   on the landing: remove the 30 EUR/h paid narrative/price line from
   landing copy (booking widget behavior itself unchanged/out of scope).
10. Risk reversal line: "Pagas por hitos: solo pagas cada parte cuando la
    ves funcionando." (EN equivalent).
11. Locations: Salamanca (Spain) and Miami (USA). Show both in hero/about
    and in head title/description. Offer: in person in Salamanca or Miami,
    or video call anywhere. ES copy targets Salamanca/Spanish-speaking Miami;
    EN copy targets Miami.
12. About: add a real short human bio (owner to supply final text; until
    supplied the spec may use a placeholder-free version that renders
    nothing, per existing contract) — flag as owner TODO in the report.
    Founder photo is an owner TODO (asset not available), not a blocker.
13. Short FAQ section (4 questions, ES+EN): maintenance cost, what if it
    breaks, who owns the data, does it work on mobile. Answers must be
    honest and generic (no invented SLAs or prices).
14. Nav: "Reservas" → "Hablemos" (EN "Let's talk").
15. Recording consent wording in booking stays opt-in and friendly — verify
    only, no behavior change.

## Out of scope (see round 3 overrides below)

Booking widget behavior, payments, recording pipeline.

## Round 3 owner decisions (OVERRIDE earlier items where they conflict)

- Market: Miami (USA) small and medium businesses. Hero, head title and
  description name Miami only. Salamanca is NOT in hero/title/description;
  it appears only in About ("Daniel lives in Salamanca, Spain" / based in
  Salamanca, Spain, working remotely with Miami clients). Overrides item 11.
- Language: Spanish first (default locale ES, aimed at Spanish-speaking
  Miami), English second. Head locale ES becomes es_US, EN becomes en_US.
- Offer stays: custom apps/tools built to what the owner describes (headline
  "Tú me lo cuentas. Yo lo construyo." unchanged). No AI-receptionist product
  on the site.
- Trades named for Miami: e.g. clínicas, despachos/abogados, contratistas y
  servicios del hogar (plomeros, electricistas), tiendas, salones. Use US
  Spanish vocabulary ("plomeros", not "fontaneros").
- Pricing (overrides items 9 and 10): show publicly "desde $1,200" setup +
  "desde $600/mes" (hosting, maintenance and changes). EN: "from $1,200
  setup + from $600/month". First call free stays. Remove the milestone
  line. No "30 EUR" / hourly text anywhere on the landing. Currency USD.
  Anchor allowed: cheaper than hiring staff is NOT claimed (no unsourced
  comparison).
- Primary CTA: book a call (existing booking widget, free first call).
  Secondary CTA: WhatsApp https://wa.me/34644409229 kept.
- About bio (fill about.bio, ES+EN), using ONLY these owner-provided facts:
  founder of Rexi AI, where he designed and shipped a full-stack CRM end to
  end; engineering experience at Verisure España, Open Digital Services
  (Santander) and Grupo BME; based in Salamanca, Spain; works in Spanish and
  English. No photo (owner decision; do not add a photo slot). Nothing else
  may be invented.
- Do NOT mention Inglés Ejecutivo anywhere.

## Round 4 owner decisions

- Specifier open questions: 1 ok (term-level wording, pinned only eyebrow/
  headline), 2 ok (engineering-standards repo removed from proof), 3 ok
  (duration selector unchanged, widget out of scope), 4 E2E target URL is
  inferred from Vercel (the project's preview/production deployment URL;
  journey reads it from an env var, e.g. REXI_E2E_SITE_URL, resolved from
  the Vercel deployment), 5 bio facts supplied below.
- Bio extra owner-provided facts (allowed in about.bio, ES+EN): 10+ years
  building software professionally; Telecommunications Engineering
  (Ingeniería de Telecomunicaciones), Universidad de Valladolid; native
  Spanish, fluent English; amateur padel addict.
- Bio angle: big-company quality at small-business price. Example ES:
  "Más de 10 años construyendo software para Santander, Verisure y BME.
  Ahora construyo con la misma calidad para tu negocio, a precio de
  pequeña empresa." Then: founded Rexi AI (shipped a full-stack CRM end to
  end); Ingeniero de Telecomunicaciones por la Universidad de Valladolid;
  vive en Salamanca, España; español nativo, inglés fluido; jugador amateur
  de pádel, adicto. Keep it to ~3 short sentences.

## Tasks

# 020 — Neighborhood-business landing message: tasks

Stage 1 (Specifier) output. Source: `00-informal.md` (rounds 1–4; round 3 and
round 4 owner decisions override earlier items where they conflict).

## Copy scope note

Pinned **verbatim** by the owner:

- hero eyebrow: ES `Apps a medida para tu negocio` / EN `Custom apps for your business`
- hero headline: ES `Tú me lo cuentas. Yo lo construyo.` / EN `You tell me. I build it.`
- WhatsApp href (exact): `https://wa.me/34644409229`
- nav label: ES `Hablemos` / EN `Let's talk`
- public pricing figures: `$1,200` (setup) and `$600` (monthly), prefixed `desde` / `from`.

Everything else is pinned by **term-level constraints** (must-contain /
must-not-contain), not exact strings (round 4 Q1). Every criterion below is
checkable by reading the dictionary and rendered DOM, not by aesthetic judgment.

## Banned labels (owner-rejected — must never appear in copy)

`negocios de barrio`, `pymes de barrio`. The buyer is named through concrete
trades instead.

## Banned brand/word (owner-rejected — must never appear anywhere on the site)

`Inglés Ejecutivo` (and `Ingles Ejecutivo`). The founder's English-teaching
product must not be mentioned.

## Banned developer jargon (must never appear in buyer-facing copy)

`saas`, `auth`, `autenticación`, `authentication`, `deploy`, `despliegue`,
`mutation`, `mutación`, `internal tools`, `herramientas internas`,
`spec pipeline`, `pipeline de especificaciones`, `ci gates`, `puertas de ci`,
`billing`, `facturación`.

## Banned word in product/offer copy

`software` — the buyer-facing **product** copy says `app` / `herramienta`, not
`software`. The "generic software" contrast in the hero differentiator must be
phrased without the word (e.g. `herramientas genéricas` / `generic tools`).

Carve-out: the About **bio** describes the founder's engineering background and
may use `software` (owner's round-4 example: "Más de 10 años construyendo
software para Santander, Verisure y BME."). The ban applies to product/offer
copy, not the founder's resume.

## Retired offer copy (must be gone from both locales)

`Herramientas internas`, `Internal tools`, `Productos SaaS`, `SaaS products`,
`Webs y aplicaciones`, `Websites and apps`.

## No hourly-rate or EUR text on the landing

No `30 EUR`, no `EUR`, no `€`, no `EUR/h`, no `EUR por hora`, no `EUR per hour`,
no `1h · 2h · 3h · 4h` ladder. Currency is USD (`$`). The milestone/risk-reversal
line is removed (round 3 overrides round-2 items 9 and 10).

## Trade terms (the buyer is named through these, accent-tolerant stems)

Miami / US-Spanish vocabulary (round 3 overrides round-2 `fontaner`):

ES (US Spanish): `plomer`, `clinic`, `despacho`, `abogad`, `contratist`,
`electricist`, `tienda`, `salon`.

EN: `plumber`, `clinic`, `office`, `lawyer`, `contractor`, `electrician`,
`shop`, `store`, `salon`.

`fontaner` (Castilian) must not appear; use `plomer`. Owner vocabulary
(`presupuestos`, `pedidos`, `stock`, `citas`, `facturas`, `avisos`) and
`Excel`/`hoja de cálculo` as a before-state example are NOT banned.

## Locations

`Miami` (USA) is the market. It is the **only** location named in the hero, the
head title, and the head description — in ES and EN. `Salamanca` appears **only**
in the About block (the founder lives in Salamanca, Spain, working remotely with
Miami clients). The offer is in person in Miami, or by video call anywhere.

## Tasks

### Task 1 — Hero: eyebrow, exact headline, Miami trades, one outcome, CTAs

- Eyebrow above the headline, exact: ES `Apps a medida para tu negocio`,
  EN `Custom apps for your business`.
- Headline exact: ES `Tú me lo cuentas. Yo lo construyo.` /
  EN `You tell me. I build it.`
- Subtext names the buyer through Miami trades (≥2 ES US-Spanish trade terms;
  ≥2 EN trade terms), conveys the listening differentiator (I listen and build
  exactly what the owner described, adapted to them — ES signal
  `escuchar|escucho|a medida|adapta|adaptado|exactamente lo que` /
  EN `listen|tailored|adapted|exactly what you`), and states the offer is in
  person in **Miami**, or by video call anywhere.
- Kept, in plain words: free first call (`primera llamada gratis` /
  `first call free`) and you-own-it (`el código es tuyo` / `you own the code`).
- The hero names `Miami` and does **not** name `Salamanca`.
- Primary CTA is "book a call" (`.hero-cta--primary`, href `#booking`) — the
  only visually emphasized action; it reads as booking a (free) call
  (ES `llamada|reserva|agenda`, EN `book|call`).
- Secondary CTA is WhatsApp: href exactly `https://wa.me/34644409229`, label
  contains `WhatsApp`. No `mailto:` in the hero. Email stays in the contact
  section and footer only.
- No banned label, no banned jargon, no `software` (product copy), no
  `Inglés Ejecutivo`, no `EUR`, in the hero.

### Task 2 — Services: one offer + three before→after examples (Miami trades)

- The `#services` section renders exactly one offer card (not three), phrased as
  one `app`/`herramienta` that replaces the spreadsheet/paper/WhatsApp process.
- Three illustrative before→after examples render, in Miami/US-Spanish trades:
  plumber/`plomero` (presupuestos en papel → presupuesto desde el móvil),
  shop/`tienda` (stock en Excel → aviso automático de reposición),
  salon/clinic/`salón`/`clínica` (citas por WhatsApp → agenda con recordatorios).
- Each example is clearly an example, not a client case: no `cliente`-as-case,
  `testimonio`, `testimonial`, `caso de éxito`, `case study`, invented name,
  logo, or metric.
- No banned jargon, banned label, retired offer copy, `software` (product copy),
  or `Inglés Ejecutivo` in the section.

### Task 3 — Proof reworded for the owner; engineering-standards removed

- No banned jargon in the proof section (especially `mutation`, `spec pipeline`,
  `ci gates`); no `software` (product copy); no `Inglés Ejecutivo`.
- The `my-engineering-standards` repository is NOT shown in the proof list: no
  link to `github.com/RexiAI/my-engineering-standards` in the proof section.
  Decision (round 4 Q2): "removed from proof" (checkable); "de-emphasized" is
  not used.
- Honesty line kept (no invented logos, testimonials, or metrics).

### Task 4 — Head metadata: Miami only, es_US / en_US

- `es.head.title` and `es.head.description` name the buyer (≥1 ES US-Spanish
  trade term) and name `Miami` only; `en.head.*` mirrors with EN trade terms and
  `Miami` only. Neither names `Salamanca`.
- Neither head contains the three-offer enumeration, banned labels, banned
  jargon, `software`, or `Inglés Ejecutivo`.
- `index.html` `<title>` equals `es.head.title` and
  `<meta name="description">` equals `es.head.description` byte-for-byte.
- Locale codes are US: `lang="es"` (Spanish-first) with `og:locale=es_US` and
  `og:locale:alternate=en_US` (round 3 replaces the former `es_ES`/`en_GB`).

### Task 5 — Pricing: public USD figures, no hourly text, no milestone line

- The landing shows the public pricing (round 3 overrides round-2 items 9 and
  10): ES `desde $1,200` (setup) + `desde $600/mes` (hosting, maintenance and
  changes); EN `from $1,200` (setup) + `from $600/month`. The figures `$1,200`
  and `$600` are pinned.
- First call free stays.
- The milestone/risk-reversal line `Pagas por hitos: solo pagas cada parte
  cuando la ves funcionando.` is **removed**.
- No hourly text anywhere on the landing: no `30 EUR`, no `EUR`, no `€`, no
  `por hora`/`per hour`, no `1h · 2h · 3h · 4h` ladder. Currency is USD.
- `booking.narrativePaid` and `booking.priceLine` (landing-rendered copy) carry
  no hourly text and no milestone line. The booking widget's functionality
  (Stripe, slots, duration selector, consent) is out of scope and unchanged
  (round 4 Q3).

### Task 6 — About: filled bio (ES + EN) from the fixed fact set, no photo

- `about.location` (ES + EN) states the founder is based in `Salamanca` (Spain)
  and works remotely with `Miami` clients. No other location claim.
- `about.bio` (ES + EN) is **filled** with the owner-provided facts only, ~3
  short sentences, angle "big-company quality at small-business price". The
  allowed facts (nothing else may be invented):
  - founder of Rexi AI, where he designed and shipped a full-stack CRM end to end;
  - engineering experience at Verisure España, Open Digital Services (Santander)
    and Grupo BME;
  - based in Salamanca, Spain;
  - works in Spanish and English (native Spanish, fluent English);
  - 10+ years building software professionally;
  - Telecommunications Engineering (Ingeniería de Telecomunicaciones),
    Universidad de Valladolid;
  - amateur padel addict.
- The bio renders a non-empty paragraph in ES and EN. It contains `Valladolid`
  and the CRM + company facts; it does not invent clients, metrics, logos,
  testimonials, or any fact outside the list.
- **No photo**: the About block renders no founder `<img>` / photo asset
  (round 3: no photo slot).
- No `Inglés Ejecutivo` in the About block.

### Task 7 — FAQ: four honest, generic questions (ES + EN)

- A new FAQ section with exactly four question/answer pairs, both locales.
- Topics covered: maintenance cost, what if it breaks, who owns the data, does
  it work on mobile (topic keywords present in each Q/A).
- Answers are honest and generic: no invented SLA (no `%` uptime, no `99.9`),
  no invented price (no amount other than the public `$1,200` / `$600` figures),
  no invented metric.

### Task 8 — Nav: `Reservas` → `Hablemos`

- `nav.booking` label becomes `Hablemos` (ES) / `Let's talk` (EN). The anchor
  target stays `#booking`; no other nav change.

### Task 9 — Locale parity: retire the old offer and rejected labels; ES primary (es_US)

- `es` and `en` keep identical structural shape (the `Dictionary` type enforces
  this at compile time; the shape test must still pass after the reshape).
- The retired offer ids/copy (`saas-products`, `websites-and-apps`, and the
  retired-offer strings) are gone from both locales.
- The banned labels (`negocios de barrio`, `pymes de barrio`), the word
  `software` (product copy), `fontaner`, and `Inglés Ejecutivo` appear nowhere
  in either dictionary or the rendered landing.
- ES remains the primary/default locale; head locale is `es_US` / `en_US`
  (see Task 4).

### Task 10 — E2E landing journey (`tests/e2e/*.e2e.ts`, zero npm imports)

- A new plain-node script (zero npm imports, per the 004 D4 contract) drives the
  built/preview site (repo CDP helper or equivalent). It reads the target URL
  from the env var `REXI_E2E_SITE_URL`, resolved from the Vercel deployment
  (preview or production URL; round 4 Q4).
- The journey asserts: exact headline + eyebrow; `Miami` present; `Salamanca`
  absent from the hero and the document title; `$1,200` and `$600` present;
  no `30 EUR`; no `SaaS`; the About bio present and containing `Valladolid`;
  WhatsApp href `https://wa.me/34644409229` on the secondary CTA; the FAQ
  section present; the nav label `Hablemos`; exactly one service offer; the
  primary CTA scrolls to `#booking`; and the ES/EN switch updates the hero
  headline and document title.
- The script is executable as `node tests/e2e/<name>.e2e.ts` and picked up by
  the `tests/**/*.e2e.ts` glob.

## Verify-only (no code change)

- **Item 15 — recording consent wording** stays opt-in and friendly. Verify the
  booking consent copy is unchanged; no behavior change. No new scenario needed.

## Acceptance scenarios

## AC-020-01 — The eyebrow is exact in both locales
## AC-020-02 — The headline is exact in both locales
## AC-020-03 — The subtext names Miami trades and the listening differentiator
## AC-020-04 — The hero names Miami only, and the offer is Miami or video call
## AC-020-05 — Kept promises and the two CTAs
## AC-020-06 — The hero is free of banned copy
## AC-020-07 — Exactly one offer card
## AC-020-08 — Three illustrative Miami before→after examples, not client cases
## AC-020-09 — No jargon, `software`, or `Inglés Ejecutivo` in the services section
## AC-020-10 — No jargon, engineering-standards repo removed
## AC-020-11 — Honesty line kept, no invented proof
## AC-020-12 — The head names the buyer and Miami only
## AC-020-13 — The static head stays in sync, Spanish-first, US locale codes
## AC-020-14 — Public pricing shows `desde $1,200` + `desde $600/mes`
## AC-020-15 — No hourly/EUR text, no milestone line; first call free stays
## AC-020-16 — About states Salamanca + Miami, and no other location
## AC-020-17 — The bio is filled from the allowed facts only
## AC-020-18 — No founder photo
## AC-020-19 — Exactly four honest Q/A pairs in both locales
## AC-020-20 — The nav label changes, the target stays
## AC-020-21 — Identical shape, retired offer ids gone
## AC-020-22 — Rejected labels, `software`, `fontaner`, `Inglés Ejecutivo` gone; ES primary
## AC-020-23 — Zero-import script, target URL from `REXI_E2E_SITE_URL`
## AC-020-24 — Exact headline/eyebrow, Miami present, Salamanca absent from hero/title
## AC-020-25 — `$1,200` + `$600` present, no `30 EUR`, no `SaaS`
## AC-020-26 — Bio (Valladolid), WhatsApp href, FAQ, nav `Hablemos`
## AC-020-27 — One offer, primary CTA scrolls to `#booking`, ES/EN switch

## Verification

# 25-verification — spec 020-neighborhood-business-landing

Attempt 1, phase 1 (full run). Mode: full, not autopilot.
Overall verdict: **PASS**

Gates failed: none. Routing: none required.

## Evidence: scenario traceability

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-11-24T08:50:28Z

{
  "checks": [1, 2],
  "passes": ["AC-020-01 — traced to a test", "AC-020-02 — traced to a test", "AC-020-03 — traced to a test", "AC-020-04 — traced to a test", "AC-020-05 — traced to a test", "AC-020-06 — traced to a test", "AC-020-07 — traced to a test", "AC-020-08 — traced to a test", "AC-020-09 — traced to a test", "AC-020-10 — traced to a test", "AC-020-11 — traced to a test", "AC-020-12 — traced to a test", "AC-020-13 — traced to a test", "AC-020-14 — traced to a test", "AC-020-15 — traced to a test", "AC-020-16 — traced to a test", "AC-020-17 — traced to a test", "AC-020-18 — traced to a test", "AC-020-19 — traced to a test", "AC-020-20 — traced to a test", "AC-020-21 — traced to a test", "AC-020-22 — traced to a test", "AC-020-23 — traced to a test", "AC-020-24 — traced to a test", "AC-020-25 — traced to a test", "AC-020-26 — traced to a test", "AC-020-27 — traced to a test"],
  "fails": []
}

Verdict: PASS (27/27 scenario IDs AC-020-01…27 traced, fails: []).

## Evidence: full test suite

command: npm test   (vitest run --exclude '.standards/**')
exit: 0
at: 2026-11-24T08:50:30Z

 Test Files  106 passed (106)
      Tests  658 passed | 1 skipped (659)

Skipped: 1 — pre-existing conditional skip `describe.skipIf(!LIVE)` in
src/__tests__/AC-006-bot-adapter.test.ts (live-bot, needs credentials; ffmpeg is
installed so AC-006-recording-output's skipIf does not trigger). Not a spec-020
test; no `.skip/.only/.todo` in any AC-020 test.

Supporting checks (same run):

command: npm run build
exit: 0
at: 2026-11-24T08:51:22Z
dist/assets/index-Cp68o4Ka.css   15.06 kB │ gzip:  2.96 kB
dist/assets/index-Trb5VvaX.js   273.48 kB │ gzip: 86.92 kB

✓ built in 313ms

command: npm run format:check
exit: 0
Checking formatting...
All matched files use Prettier code style!

command: npm run lint
exit: 0
✖ 14 problems (0 errors, 14 warnings)   (no-console warnings in tests/e2e/*.e2e.ts scripts)

E2E journey against local preview:

command: npx vite preview --port 4173 --strictPort & REXI_E2E_SITE_URL=http://localhost:4173 node tests/e2e/landing.e2e.ts
exit: 0
at: 2026-11-24T08:52:07Z

2026-11-24T08:52:09.145Z [e2e:landing] ok: AC-020-26: the FAQ renders 4 pairs (got 4)
2026-11-24T08:52:09.154Z [e2e:landing] ok: AC-020-26: the nav label is Hablemos (got "Hablemos")
2026-11-24T08:52:09.157Z [e2e:landing] ok: AC-020-27: exactly one service offer (got 1)
2026-11-24T08:52:09.159Z [e2e:landing] ok: AC-020-27: the primary CTA targets #booking (got "#booking")
2026-11-24T08:52:09.186Z [e2e:landing] ok: AC-020-27: the primary CTA is clickable
2026-11-24T08:52:09.187Z [e2e:landing] ok: AC-020-27: the CTA reaches #booking (hash "#booking", inViewport true)
2026-11-24T08:52:09.206Z [e2e:landing] ok: AC-020-27: the EN switcher is present
2026-11-24T08:52:09.218Z [e2e:landing] ok: AC-020-27: the English headline is "You tell me. I build it." (got "You tell me. I build it.")
2026-11-24T08:52:09.219Z [e2e:landing] ok: AC-020-27: the document title changes with the locale
2026-11-24T08:52:09.253Z [e2e:landing] ok: AC-020-27: the ES switcher is present
2026-11-24T08:52:09.262Z [e2e:landing] ok: AC-020-27: the Spanish title returns (got "RexiAI: apps a medida para plomeros y tiendas de Miami")
2026-11-24T08:52:09.262Z [e2e:landing] AC-020-23…27 PASSED

Verdict: PASS.

## Evidence: complexity gate

Refactorer ran no complexity linter; independently run here.

command: npx eslint --rule '{"complexity":["error",6]}' src/__tests__/AC-001-i18n.test.tsx src/__tests__/AC-002-landing-content.test.tsx src/__tests__/AC-011-booking-ui.test.tsx src/__tests__/AC-019-about.test.ts src/__tests__/AC-019-booking-money-story.test.ts src/__tests__/AC-019-contact-email.test.ts src/__tests__/AC-019-document-head.test.ts src/__tests__/AC-019-hero.test.ts src/__tests__/AC-019-locale-default.test.ts src/__tests__/AC-019-locale-parity.test.ts src/__tests__/AC-019-page-assembly.test.ts src/__tests__/AC-019-proof.test.ts src/__tests__/AC-019-retire-superseded-tests.test.ts src/__tests__/AC-019-services.test.ts src/__tests__/landing-harness.ts src/__tests__/landing-units.test.ts src/__tests__/privacy-page.test.tsx src/components/About.tsx src/components/Services.tsx src/i18n/dictionary.ts src/pages/Landing.tsx src/__tests__/AC-020-about.test.ts src/__tests__/AC-020-document-head.test.ts src/__tests__/AC-020-e2e-landing.test.ts src/__tests__/AC-020-faq.test.ts src/__tests__/AC-020-hero.test.ts src/__tests__/AC-020-locale-parity.test.ts src/__tests__/AC-020-nav.test.ts src/__tests__/AC-020-pricing.test.ts src/__tests__/AC-020-proof.test.ts src/__tests__/AC-020-services.test.ts src/__tests__/landing-020-units.test.ts src/components/BookingSection.tsx src/components/Faq.tsx src/components/Footer.tsx src/components/Hero.tsx src/components/Nav.tsx src/components/Pricing.tsx tests/e2e/landing.e2e.ts 
exit: 0
at: 2026-11-24T08:52:23Z


✖ 4 problems (0 errors, 4 warnings)

Verdict: PASS on all changed/added .ts/.tsx files (0 complexity errors).

Out-of-scope finding (repo-wide run, not part of this change):

command: npx eslint --rule '{"complexity":["error",6]}' src tests
exit: 1
at: 2026-11-24T08:51:06Z

/home/dbueno/projects/rexiAI/tests/e2e/auto-record-lib.mjs
  326:8  error  Async function 'joinMeeting' has a complexity of 7. Maximum allowed is 6  complexity

tests/e2e/auto-record-lib.mjs is untouched by spec 020 (last commit 2a4de00,
pre-existing). Recorded, not fixed; propose a follow-up spec.

## Evidence: design-principles gate

command: .standards/scripts/check-code-principles.sh --json
exit: 0
at: 2026-11-24T08:51:43Z

WARN: Method body >20 lines (node): ./src/pages/Landing.tsx:19:53:Landing:KISS_LINES=31
WARN: Method body >20 lines (node): ./src/components/Nav.tsx:14:41:Nav:KISS_LINES=29
WARN: Method body >20 lines (node): ./src/components/BookingSection.tsx:6:42:BookingSection:KISS_LINES=36
WARN: SRP: possible god file (node) — ./src/i18n/dictionary.ts: 402 lines, 0 methods (split by responsibility)
fails: []  total warns (repo-wide incl. .standards): 216

Verdict: PASS (no FAIL). WARNs above (changed files only, verbatim) flagged to
the Architect: Landing/Nav/BookingSection component bodies >20 lines;
dictionary.ts 402 lines (god-file heuristic). Remaining WARNs are in
.standards/ and pre-existing files.

## Evidence: scenario-to-behavior spot check

command: manual read of 20-acceptance/AC-020-05-pricing.md, AC-020-07-faq.md vs src/__tests__/AC-020-pricing.test.ts, AC-020-faq.test.ts; plus git diff src/__tests__/AC-019-hero.test.ts
exit: 0
at: 2026-11-24T08:52:30Z

- AC-020-14: test asserts 'desde $1,200', 'desde $600/mes' (ES), 'from $1,200',
  'from $600/month' (EN), $1,200/$600 present — matches Then clauses.
- AC-020-15: asserts no '30 EUR', /\bEUR\b/, '€', 'por hora', 'per hour', hourly
  ladder, milestone line in dictionaries/booking strings/rendered landing; asserts
  /llamada gratis|call free/ — matches.
- AC-020-19: asserts exactly 4 pairs per locale, the four topics, no '%', no
  '99.9', only allowed amounts, no Nx metric — matches.
- Spec-019 test rewrites (17 files under src/__tests__, IDs preserved): e.g.
  AC-019-hero now asserts 'You tell me. I build it.' instead of the spreadsheet
  headline. 10-tasks.md §"Retired offer copy" and Task 9 explicitly retire the
  prior offer copy/ids, and AC-020-01 specifies the new hero. These are
  requirement changes from spec 020, not defect-encoding edits
  (docs/TESTING.md §Tests That Encode a Defect does not apply).

Verdict: PASS.

## No unaccounted behavior

Finding: new components Hero, Nav, Faq, Pricing, Footer, BookingSection map to
Tasks 1–8; dictionary/index.html changes map to Tasks 4 and 9; landing-harness
and landing-020-units helpers are test support. No logic found that does not
trace to a task. Pre-existing ` M .standards` pointer excluded from scope.

## Telemetry

command: .standards/scripts/record-gate-run.sh -record '{specSlug 020…, outcome pass, durationSec 148}' → exit 0 (appended to runs.jsonl).

---

# Re-verification — attempt 2, phase 1 (owner-requested refactor round, not a BLOCK)

Trigger: owner-requested refactor (Landing/Nav/BookingSection split into
LandingSections, ContactSection, NavLinks, NavMeta, BookingIntro, BookingSteps;
dictionary.ts split into src/i18n/locales/{es,en}.ts; joinMeeting in
tests/e2e/auto-record-lib.mjs reduced to complexity 6; AC-019-18 test now reads
ContactSection.tsx). SPEC_LOOP_COUNT=1, SPEC_PHASE1_RETRIES=0,
SPEC_PHASE2_RETRIES=0. Full gate re-run (refactor touched every area).

## Evidence: scenario traceability (attempt 2)

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-11-24T09:01:16Z

  "fails": []
(27 unique AC-020-NN IDs in passes, AC-020-01…27 — "traced to a test")

Verdict: PASS.

## Evidence: full test suite (attempt 2)

command: npm test
exit: 0
at: 2026-11-24T08:59:54Z

      Tests  658 passed | 1 skipped (659)

command: npm run lint
exit: 0
at: 2026-11-24T09:00:35Z

✖ 14 problems (0 errors, 14 warnings)   (no-console warnings in tests/e2e/*.e2e.ts)

command: npm run build
exit: 0
at: 2026-11-24T09:00:44Z

dist/assets/index-DzIIbBqw.js   273.82 kB │ gzip: 87.12 kB
✓ built in 295ms

command: npm run format:check
exit: 0
at: 2026-11-24T09:00:53Z

All matched files use Prettier code style!

command: npx vite preview --port 4173 --strictPort & REXI_E2E_SITE_URL=http://localhost:4173 node tests/e2e/landing.e2e.ts
exit: 0
at: 2026-11-24T09:01:44Z

2026-11-24T09:01:45.330Z [e2e:landing] ok: AC-020-27: the Spanish title returns (got "RexiAI: apps a medida para plomeros y tiendas de Miami")
2026-11-24T09:01:45.330Z [e2e:landing] AC-020-23…27 PASSED

Note: 1 skipped test is unchanged from attempt 1. Verdict: PASS.

## Evidence: complexity gate (attempt 2)

command: npx eslint --rule '{"complexity":["error",6]}' src tests
exit: 0
at: 2026-11-24T09:00:59Z

✖ 14 problems (0 errors, 14 warnings)   (all no-console; zero complexity errors)

Attempt-1 finding (joinMeeting complexity 7, auto-record-lib.mjs:326) is
resolved. Verdict: PASS.

## Evidence: design-principles gate (attempt 2)

command: .standards/scripts/check-code-principles.sh --json
exit: 0
at: 2026-11-24T09:01:22Z

  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests", "comments", "naming", "null-discipline"],
  "fails": [],

WARNs on spec-020 changed files: none (grep for Landing, Nav*, Booking*,
ContactSection, locales, component-per-file, auto-record returned no WARN).
The attempt-1 WARNs (Landing/Nav/BookingSection KISS_LINES, dictionary.ts god
file) are gone. NavLinks.tsx: one exported component (`export function NavLinks`
line 21); the second component is module-private, and component-per-file
emitted no finding. Remaining WARNs are pre-existing files and .standards/.
Verdict: PASS.

## Evidence: scenario-to-behavior spot check (attempt 2)

command: manual read of src/__tests__/AC-019-contact-email.test.ts (AC-019-18) + git diff of that file
exit: 0
at: 2026-11-24T09:01:30Z

    const landing = repoFile('src/pages/Landing.tsx')
    expect(landing).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
    const contact = repoFile('src/components/ContactSection.tsx')
    expect(contact).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
    expect(contact).toContain('dict.contact.email')

Assertion intent preserved: "address comes from the dictionary, never a JSX
literal" is still asserted on Landing.tsx (no literal) and now also on the file
that renders the contact block (no literal + reads dict.contact.email). The
assertion moved with the code, it was not weakened; scenario ID kept. The
attempt-1 spot checks (AC-020-14/15/19) stand — the e2e run re-exercises
AC-020-23…27 against the built site. Verdict: PASS.

## No unaccounted behavior (attempt 2)

Finding: new files LandingSections, ContactSection, NavLinks, NavMeta,
BookingIntro, BookingSteps, i18n/locales/{es,en}.ts are structural extractions
of attempt-1 code (Tasks 1–9); no new behavior observed. auto-record-lib.mjs
change is a complexity reduction outside spec 020 scope, requested by owner.

## Verdict (attempt 2, phase 1): PASS

All gates exit 0 with no findings. Routing: proceed to stage 5a (Mutation
Runner). No remediation needed; phase-1 budget unconsumed.

## Post-PR CI check (phase 2)

### Round 1 (attempt 1, phase 2) — PR #117, head cbbc18c

## Evidence: Post-PR CI check round 1
command: gh pr checks 117 --json name,state,bucket,workflow,link (polled until no `pending` bucket)
```
[{"bucket":"pass","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},
 {"bucket":"skipping","name":"Docker Build & Push","state":"SKIPPED","workflow":"CI","link":"https://github.com/RexiAI/rexiAI/actions/runs/45361632222/job/138333116175"},
 {"bucket":"pass","name":"Unit Tests","state":"SUCCESS","workflow":"CI","link":"https://github.com/RexiAI/rexiAI/actions/runs/45361632222/job/138332902633"},
 {"bucket":"pass","name":"Lint & Format","state":"SUCCESS","workflow":"CI","link":"https://github.com/RexiAI/rexiAI/actions/runs/45361632222/job/138332902565"},
 {"bucket":"pass","name":"Build","state":"SUCCESS","workflow":"CI","link":"https://github.com/RexiAI/rexiAI/actions/runs/45361632222/job/138332902119"},
 {"bucket":"pass","name":"Vercel","state":"SUCCESS","workflow":""}]
```
exit: 0
at: 2026-11-24T09:09:01Z

| Check | Result |
|---|---|
| Unit Tests | PASS |
| Lint & Format | PASS |
| Build | PASS |
| Vercel | PASS |
| Vercel Preview Comments | PASS |
| Docker Build & Push | SKIPPED (not a pass/fail; job gated to push events, not PR) |

Failing check IDs: none. Routing: none required.
Round 1 verdict: **PASS**

## Quality gates

# 30-report — spec 020-neighborhood-business-landing

Stage 5a (Mutation Runner), full mode, not autopilot.
Overall: **GREEN**

## Verifier verdict (carried forward)

PASS — `25-verification.md`: attempt 1 PASS, then attempt 2 (phase 1, owner-requested refactor round) PASS. Gates failed: none.

## Mutation score

skipped — `mvp` tier. No conformance tier is declared in the repo or the spec
(no `docs/CONFORMANCE_TIERS.md` setting, none in `10-tasks.md`/`45-decisions.md`);
per the Stop-and-Ask matrix ("Project type ambiguous") the harness default `mvp`
applies. Mutation testing is a `production`-tier gate
(`coder.md §Conformance tiers`: Architect mutation testing = skip at `mvp`).
Stryker is also not installed in the repo (`node_modules/.bin` has no stryker,
`package.json` has no stryker entry). No survivors, so no tests were added.

Equivalent mutants: none (no mutation run).

## Complexity summary (carried forward)

Attempt 2 re-ran ESLint `complexity ≤6` over `src tests`: 0 complexity errors
(14 no-console warnings only). The attempt-1 `joinMeeting` finding
(complexity 7, tests/e2e/auto-record-lib.mjs) was reduced to 6 in the refactor
round and is resolved. Refactor round: Landing/Nav/BookingSection split into
smaller units; dictionary god-file WARNs from attempt 1 addressed.

## Evidence: final test status

command: npm test   (vitest run --exclude '.standards/**')
exit: 0
at: 2026-11-24T09:03:02Z

Tests  658 passed | 1 skipped (659). Skip is the pre-existing
`describe.skipIf(!LIVE)` live-bot test in AC-006-bot-adapter.test.ts, not a
spec-020 test.

## Remediation record

none — no BLOCK occurred. Attempt 2 (phase 1) was an owner-requested refactor
re-verification, not a BLOCK response; attempt count 2, no phase-1 budget
consumed by a failure. Phase 2: none.

Mutation re-confirmed skipped (`mvp` tier default, no declared tier; Stryker not
installed). GATE_RUNS_FILE=runs.jsonl exported for this run.

PR: https://github.com/RexiAI/rexiAI/pull/117
Commits: 11

## 15-design.md

# Design Spec: 020-neighborhood-business-landing

Mixed surface. In scope for design: Tasks 1, 2, 3, 5, 6, 7, 8 (rendered landing
copy and layout). Out of scope: Task 4 (head meta, non-visual), Task 9 (locale
parity, content shape), Task 10 (E2E script), and the booking widget's
functionality (Stripe, slots, duration selector, consent), which is unchanged.

## Design Read

Reading this as: a one-offer service landing for non-technical Miami small-business owners (Spanish first), with a plainspoken, trust-first, type-led language, leaning toward native CSS + the project's existing Geist/zinc token system, zero decorative motion.

## Dial Values

- DESIGN_VARIANCE: 4 — trust-first audience, not a design award. Owners judge the page by whether they recognise their own trade and their own price, not by composition risk. The dial table's trust-first row (3-4) fits better than the landing default (7-9); the existing page is already near-symmetric, and this spec is a message redesign, not a visual overhaul.
- MOTION_INTENSITY: 2 — the page has no animation layer today; adding one would be motion for show. Only feedback transitions (hover, focus, anchor scroll) are allowed, because the buyer is often on a mid-range phone over cellular data.
- VISUAL_DENSITY: 4 — enough room for pricing, three before-to-after examples, a bio and four FAQ answers without turning into a brochure; held at 4 so nothing is hidden behind tabs or accordions.

## Design System / Foundation

No external system is named or warranted. Foundation stays the existing project
system: plain CSS modules/sheets over CSS custom properties in `src/index.css`,
plus `src/App.css` section classes. No install command. Do not introduce
Tailwind, shadcn, Radix Themes or a component library for this spec; a
one-offer landing with seven sections does not repay the dependency or the
second design system.

Honest label: native CSS + project tokens, Geist, zinc neutrals.

## Global Tokens

- Font: Geist (400 / 600 / 700), already loaded; system-ui fallback. Do not add Inter.
- Accent color: `#18181b` (`--color-zinc-900`), near-black, used for exactly one filled element (the primary CTA). No second accent is introduced; this spec adds no new color.
- Neutral base: zinc (`#18181b` / `#52525b` / `#71717a` / `#e4e4e7` / `#fafafa` / `#ffffff`).
- Corner-radius system: soft, pills for actions (`--radius-full`) and `--radius-md` 12px for content blocks. Keep those two values only; do not add a third radius.
- Theme: light, locked for the whole page. No section inverts.
- Icon library: none. The page ships zero icon dependency today and this spec needs no icon. The before-to-after relationship is rendered as a text arrow glyph in the markup, not a hand-rolled SVG path. If a later task genuinely needs an icon, Phosphor is the only permitted addition.

Copy-mechanics constraint that overrides taste: the em-dash (`—`) is banned
outright, including in Spanish copy where it is idiomatic. Use a period or a
comma. Hyphen only.

## Design Laws

| Task | Law | Applies to | Concrete consequence | How a reviewer checks it |
|---|---|---|---|---|
| 1 | Fitts's | primary CTA | Primary CTA is a full-height pill of at least 44×44 CSS px and sits before the WhatsApp link in reading order; the padding-based height today lands near 43px, so add `min-height: 44px`. WhatsApp secondary gets the same minimum height but no fill. | Measure computed height/width of `.hero-cta--primary` and `.hero-cta--secondary` in the built page; both >= 44px on both axes. |
| 1 | Hick's | hero action set | Exactly two hero actions: book-a-call primary, WhatsApp secondary. No third hero link, no email link in the hero, no CTA inside the eyebrow or headline. | Count anchors inside `.hero-ctas`: must be 2. Assert no `mailto:` in the hero. |
| 1 | Von Restorff | visual emphasis | The primary CTA is the only filled, high-contrast element above the fold. WhatsApp renders as a quiet outline or text link (zinc-600 text on white, no fill, no accent border) and must not read as a second button of equal weight. | Screenshot the hero greyscaled: exactly one high-contrast filled block. Check the secondary's background is transparent/white. |
| 1 | Jakob's | vocabulary | Subtext names trades in the owner's words (`plomeros`, `clínicas`, `contratistas`, `tiendas`, `salones`) and the jobs (`presupuestos`, `citas`, `pedidos`, `stock`). No category nouns ("SaaS", "herramientas internas", "soluciones digitales"). | Read the rendered ES and EN subtext against the banned-term list in `10-tasks.md`; a grep for the banned jargon returns zero hits. |
| 1 | Miller's | hero stack | Hero holds at most four text elements: eyebrow, headline, subtext, CTA pair. The "first call free" and "the code is yours" promises live inside the subtext sentence pair, not as a micro-strip under the buttons. | Count text nodes inside `.hero` above `.hero-ctas`: eyebrow + headline + subtext = 3, plus the CTA pair. No `.hero-cta-microcopy` element rendered. |
| 1 | Doherty Threshold | primary CTA response | The CTA is an in-page anchor to `#booking`; the scroll must begin on the same frame as the click and finish inside 400ms. No spinner, no deferred state. Under `prefers-reduced-motion` the jump is instant. | Click the CTA with network throttled; time from click to `#booking` in viewport. Assert < 400ms and no intermediate loading state. |
| 2 | Miller's | examples | Three examples, one per trade, never more. Each is a before-to-after pair, so the reader holds two facts per row, not a paragraph. | Count example rows in `#services`: 3. |
| 2 | Gestalt (Proximity, Common Region) | before-to-after pairs | Within each example, the before state and after state sit in one bounded row and the gap inside a pair is smaller than the gap between pairs, so each pair reads as one unit and the three do not merge into a list. | Measure vertical gap inside a pair vs between pairs; inside < between. |
| 2 | Jakob's | offer shape | One offer card, not three: the card describes replacing the spreadsheet/paper/WhatsApp process, which is what the owner already calls their problem. The retired three-offer cards (`Herramientas internas` / `Productos SaaS` / `Webs y aplicaciones`) are gone from both locales. | Count offer cards in `#services`: exactly 1. Grep both dictionaries for the retired copy: zero hits. |
| 3 | Tesler's | proof section | The section absorbs the "can I trust this person" question by stating the honest line once and showing verifiable facts, and it does not compensate by inventing logos, testimonials or metrics. The remaining uncertainty (a real customer would be better proof) stays visible as an honest statement rather than being papered over. | Read `#proof`: honesty line present; zero logos, zero testimonials, zero numeric metrics; no link to `my-engineering-standards`. |
| 5 | Hick's | pricing block | Two numbers only: `desde $1,200` and `desde $600/mes`. No tier table, no toggle, no range slider, no third number. | Count currency figures on the page: exactly `$1,200` and `$600`, plus zero others. |
| 5 | Tesler's | pricing clarity | The system absorbs the confusing part by pairing each figure with what it buys (setup vs monthly) in the same visual block; the part it cannot absorb (final per-project price) is stated in plain words in the same block, not deferred to a hidden FAQ link. | Read the pricing block: both figures carry an inline label, and the per-project sentence is visible without interaction. |
| 5 | Jakob's | price formatting | US-market convention: `$` before the number, comma thousands separator, `/mes` in ES and `/month` in EN. No `EUR`, no `€`, no `por hora`. | Grep rendered DOM for `EUR`, `€`, `hora`, `hour`, `1h`: zero hits. |
| 6 | Serial Position | about bio | The bio is the section where the founder is named as a person, placed after proof and before booking, so the last text block before the ask is human rather than technical. Its last sentence is the plain-language one (live in Salamanca, works with Miami clients remotely), not the credential list. | Read the section order in the rendered DOM: about follows proof and precedes booking; last sentence of `about.bio` names Salamanca and remote work with Miami. |
| 6 | Jakob's | no-photo layout | A photo-less bio is laid out as a readable column with real spacing, not as an empty photo slot or a grey placeholder box. A missing-asset frame is a defect, not a neutral state. | Screenshot `#about`: no `<img>`, no empty bordered box, no "photo coming soon" affordance. |
| 7 | Miller's | FAQ count | Exactly four question/answer pairs, one column, all answers visible expanded by default. No accordion: an owner on a phone should not need a tap per answer to learn what happens if the app breaks. | Count rendered pairs in the FAQ section: 4; all answers have non-zero rendered height without interaction. |
| 7 | Hick's | FAQ disclosure | Answers are not behind progressive disclosure, so the choice at paint is "read four answers", not "choose which answer to open". Nothing in the section competes with the booking CTA above it. | Inspect the section: no `<details>`, no accordion toggle, no `aria-expanded` control. |
| 8 | Jakob's | nav convention | The nav anchor keeps pointing at `#booking` and only its label changes (`Hablemos` / `Let's talk`). Nav keeps the existing single-line desktop layout at 80px max height, with no new items added. | Measure nav height at 1280px width: <= 80px, one row. Assert the anchor href is still `#booking`. |
| 8 | Von Restorff | nav vs hero | The nav item is a text link, never a filled button. Recognising "Hablemos" must not compete with the hero's single filled CTA. | Grep nav styles for background fill on `.nav-link`: none. |

**Deliberate violations** (reason + compensating control):
- None. No core law is knowingly departed from on this spec.

**Judged inapplicable for this spec** (so omissions are visible):
- Zeigarnik / Goal-Gradient — the only multi-step flow is the booking widget, which is out of scope and unchanged; the landing itself has no sequence to complete.
- Parkinson's / Flow — nothing on the page is time-bounded or paced by a timer; the page is read, not performed.
- Peak-End — the end of the *page* is a footer without an ask, and the booking confirmation is a widget state outside this spec, so there is no in-scope peak-state to design. Serial Position covers the ordering concern that remains.
- Aesthetic-Usability — not used as an argument anywhere. If the page looks calm and still asks the owner to trust an unverifiable claim, the claim gets removed, not restyled.
- Choice Overload — no set on the page exceeds four options, so Hick's Law already covers every decision point; citing both would be duplicate enforcement.
- Pareto — the page has one offer; there is no 80/20 trade-off to reason about.
- Doherty beyond the CTA — the page is static content with no data fetch on the critical path. Applying a feedback budget to content that renders with the document would be decoration.

## Per-Task Directives

### Task 1: Hero: eyebrow, exact headline, Miami trades, one outcome, CTAs
- Layout: Editorial Manifesto Hero. Type does the work, no asset, no fake product screenshot (there is no photo and no product to photograph). Keep the existing centered-left stack; do not add a hero image slot.
- Components: eyebrow span, `h1.hero-title`, `p.hero-subtext`, `.hero-ctas` with `a.hero-cta--primary` (href `#booking`) and `a.hero-cta--secondary` (WhatsApp). Remove `.hero-cta-microcopy` from the hero.
- Typography: keep `--text-hero` 48px at desktop and the existing clamp behaviour; headline is two sentences and must break at the period, never mid-clause. Subtext stays `--text-lg` with a max measure of ~60ch so it does not run edge to edge at 1280px.
- Motion: static. Only the anchor scroll (instant under reduced motion). No entrance animation on the headline.
- A11y: eyebrow must be a `p`/`span`, not an `h2` (single `h1` on the page). Primary CTA text zinc-900 fill with white text stays well above 4.5:1; the secondary outline must keep zinc-600 on white (>= 4.5:1), not zinc-500. WhatsApp link needs a visible focus ring and an accessible name that includes WhatsApp.
- Anti-patterns to avoid: em-dash anywhere in the ES headline or subtext; a micro-tagline under the CTAs; a third hero link; email/`mailto:` in the hero; "soluciones digitales", "transforma tu negocio", "eleva", "potencia" style filler; `software` in product copy; an icon beside the CTA that competes with the single-accent rule.
- Watch items (Coder must check): (1) the current padded CTA height is ~43px, so `min-height: 44px` is a real change, not a no-op; (2) ES subtext must use `plomeros`, never `fontaneros`; (3) `Salamanca` must not appear in the hero; (4) if the subtext grows past 20 words at mobile width it will push the CTA below the fold, so keep the promise sentences short.

### Task 2: Services: one offer + three before-to-after examples
- Layout: asymmetric stacked split rows. One offer card as the section anchor, then three full-width before-to-after rows. Not three equal cards in a row: that exact pattern is banned and it is also what the retired offer looked like.
- Components: single offer card (`--radius-md`, 1px zinc-200 border, no shadow), then three example rows each with a before cell, a text arrow, and an after cell. Arrow is text, not an SVG.
- Typography: offer card headline at `--text-xl`, examples at `--text-base`; the trade name is the row's lead so the owner's eye lands on their own trade first.
- Motion: static. Hover on an example row, if any, is a border-color change only, 150ms, disabled under reduced motion.
- A11y: the before-to-after relationship must not be conveyed by arrow glyph alone; give each pair an accessible label such as "antes" / "después" (EN "before" / "after") so a screen reader hears the relationship. The arrow glyph is `aria-hidden`.
- Anti-patterns to avoid: three identical cards of equal height; any example that reads as a client case (no names, logos, metrics, "caso de éxito"); `testimonio`; a before-state that names a competitor product as a punchline; introducing `software` in the offer card; inline `style={{...}}` on the example cells.
- Watch items (Coder must check): separators may be bottom-border only between rows, never top-and-bottom on every row; the three trades must include one shop and one salon/clinic variant so the ES US-Spanish stems in the acceptance criteria match.

### Task 3: Proof reworded for the owner
- Layout: short vertical column, single visual family, no card grid. It is a credibility aside, not a feature section.
- Components: a short heading, two or three factual lines, the honesty line as a lighter-weight final paragraph. No logo wall (there are no real logos), no testimonial component.
- Typography: body at `--text-base`, honesty line at `--text-sm2` in zinc-500 so it reads as a note rather than a claim.
- Motion: static.
- A11y: plain text only; no icon-only bullets. If bullets are used, use real `<ul>`/`<li>` so they are announced.
- Anti-patterns to avoid: the `my-engineering-standards` repo link; `mutation`, `spec pipeline`, `CI gates`; invented uptime or client counts; a "Trusted by" heading with no logos under it.
- Watch items (Coder must check): removing the standards repo link is checkable and must be literal, not "de-emphasised"; the honesty line survives the rewrite.

### Task 5: Pricing: public USD figures, no hourly text
- Layout: one horizontal pricing block with two anchored figures and an inline per-project sentence underneath. Two columns at desktop, one at mobile. No comparison table.
- Components: two figure cells (`$1,200` setup, `$600/mes` recurring), each with a label above and one clarifying line below, plus a plain sentence about the agreed per-project price and the free first call.
- Typography: figures at `--text-3xl` with tabular alignment so the two numbers line up; labels at `--text-sm2` in zinc-600; the two figures are the second-largest type on the page after the hero headline, which is correct because price is the second question the owner asks.
- Motion: static.
- A11y: figures must be readable as numbers by assistive tech; do not split `$1,200` across elements or insert a space after `$`. Currency and recurrence live in adjacent text, not in a `title` attribute.
- Anti-patterns to avoid: a third number; `desde $1,200*` with an asterisk footnote; "más IVA"-style additions that change the quoted figure; the removed milestone line; any `EUR`/`€`/`por hora`; a "most popular" badge (there is one plan, so a badge is meaningless).
- Watch items (Coder must check): `booking.narrativePaid` and `booking.priceLine` render on the landing and must also lose hourly text and the milestone line; keep the figures exactly `$1,200` and `$600`.

### Task 6: About: filled bio, no photo
- Layout: single readable column, ~65ch measure, with `about.location` as a separate muted line. No portrait frame, no avatar placeholder, no two-column photo-and-text split with an empty half.
- Components: heading, `about.bio` paragraph (~3 sentences), `about.location` line.
- Typography: bio at `--text-base`; location at `--text-sm2` zinc-500. No drop cap, no pull quote.
- Motion: static.
- A11y: the bio is body text, not a blockquote; no `aria-label` needed.
- Anti-patterns to avoid: inventing facts beyond the owner list; `Inglés Ejecutivo`; a photo slot; making the company names into a faux logo wall; overselling adjectives ("apasionado por la excelencia").
- Watch items (Coder must check): `software` is permitted in the bio carve-out and banned everywhere else, so the same file will contain both allowed and banned uses; the count of sentences stays ~3 so the section does not become the longest block on the page.

### Task 7: FAQ: four honest answers
- Layout: single column, four stacked question/answer pairs, all expanded. Heading plus four `dl`-style or `h3` + `p` pairs.
- Components: no accordion, no `<details>`, no toggle. Each question is an `h3`; answers are `p`.
- Typography: questions at `--text-lg` weight 600, answers at `--text-base` zinc-600, answer measure <= 70ch.
- Motion: static.
- A11y: heading level continuity after the About `h2`; answers follow their question in DOM order so screen readers pair them.
- Anti-patterns to avoid: an accordion that hides the "what if it breaks" answer; a fifth "any other questions?" filler; invented SLAs (`99.9%`, `%` uptime) or invented prices; `billing`/`facturación` jargon.
- Watch items (Coder must check): the four topics must be recoverable by keyword (maintenance cost, breakage, data ownership, mobile), so the answer text has to name the topic, not gesture at it.

### Task 8: Nav label change
- Layout: unchanged nav row; one label swap.
- Components: `.nav-link` anchor to `#booking` labelled `Hablemos` / `Let's talk`.
- Typography: unchanged nav size. `Hablemos` is shorter than `Reservas`, so the row gains slack; spend it on spacing, not on a new item.
- Motion: static.
- A11y: the link's accessible name is the visible label; no `aria-label` override that diverges from visible text.
- Anti-patterns to avoid: turning the nav item into a filled button; adding a "Reservar" duplicate beside it; letting the nav wrap to two rows on desktop.
- Watch items (Coder must check): the anchor target stays `#booking`; nav height stays <= 80px on one line at 1280px.

## Out-of-scope tasks

- **Task 4 — head metadata.** `<title>`, `<meta description>`, `og:locale` (`es_US` / `en_US`). Non-visual; owned by the copy/dictionary work, not by design. Design only notes that the ES title must stay short enough to avoid truncation in a browser tab and that no design tokens are involved.
- **Task 9 — locale parity.** Dictionary shape, retired offer removal, banned terms. Content correctness, verified by tests rather than design judgment. Design consequence only: ES strings are the longer locale in every section here, so every layout above must be checked at ES length first.
- **Task 10 — E2E landing journey.** No visual surface.
- **Verify-only item 15 — recording consent wording.** Booking widget, unchanged and out of scope.

## 40-deploy.md

# 40-deploy — spec 020 neighborhood-business-landing

Stage 5c (Deploy Verifier). PR: https://github.com/RexiAI/rexiAI/pull/117

- Repo classification: frontend (Vercel Git integration connected; `Vercel` commit status present)
- PR head: `cbbc18c16626db37d93e1e86e058821a7c7038c9`
- Deploy URL: https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app
- Inspector: https://vercel.com/danielbueno76-4270s-projects/rexi-ai/fFhFFVe9Yg7KAUNiSAxAY8yMYGPJ
- Build status: pass (Vercel commit status `success` on head SHA)
- Health check status: fail (HTTP 302 → Vercel SSO / Deployment Protection, not 2xx)
- E2E verdict: fail (exit 1; blocked by the same protection wall — not attributable to app behavior)
- Timestamp: 2026-11-24T09:11:36Z
- Phase-3 attempt: 1 of 3

Attempt-1 result: FAIL (superseded by attempt 2 below)

## Routing

Health failure cause is identified, not code: the preview is behind Vercel
Deployment Protection (Vercel Authentication). The response is a 302 to
`vercel.com/sso-api`, served by Vercel's edge before the app runs. This is a
configuration-classed issue, but the repair needs a project-settings change
(disable preview protection, or provision a Protection Bypass for Automation
secret and send `x-vercel-protection-bypass`). Neither is a permitted stage-5c
command, and no bypass secret exists in this machine's environment. The
pipeline therefore STOPS and escalates to the human. Do not route to spec-coder;
the E2E failure is a consequence of the protection wall.

Once the human repairs the configuration, re-run stage 5c as attempt 2.

## Notes

- `VERCEL_TOKEN` is not set on this machine. The deployment was still resolved
  through the GitHub Deployments API, so this is a note only.
- `vercel inspect` / `vercel ls` failed with `TypeError: fetch failed`. The
  corporate TLS interception proxy (issuer `Inditex SSL Proxy RSA 2025`,
  root `ITX Root CA`) is not in the system trust store. Health check and E2E
  ran with that chain, extracted from the live TLS handshake, as `--cacert` /
  `NODE_EXTRA_CA_CERTS`. TLS verification was not disabled.
- The Vercel bot PR comment references an earlier, canceled deployment
  (`4misQe3diy4Z4ZYqrKRtAP8LGYGF`). It is not the head deployment and was ignored.

## Evidence

### Deployment identity (commit status)
command: `gh api repos/RexiAI/rexiAI/commits/cbbc18c16626db37d93e1e86e058821a7c7038c9/statuses`
exit: 0
at: 2026-11-24T09:10:00Z
```
success	https://vercel.com/danielbueno76-4270s-projects/rexi-ai/fFhFFVe9Yg7KAUNiSAxAY8yMYGPJ	2026-11-24T09:05:36Z
pending	https://vercel.com/danielbueno76-4270s-projects/rexi-ai/fFhFFVe9Yg7KAUNiSAxAY8yMYGPJ	2026-11-24T09:03:51Z
```

### Deployment URL (GitHub Deployments API, filtered by sha)
command: `gh api "repos/RexiAI/rexiAI/deployments?sha=cbbc18c16626db37d93e1e86e058821a7c7038c9"` + `/deployments/8023275000/statuses`
exit: 0
at: 2026-11-24T09:10:30Z
```
8023275000	Preview	2026-11-24T09:05:36Z
success	https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app	https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app
```

### Health check
command: `curl -sS --cacert proxy-ca.pem -D - https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app/`
exit: 0 (HTTP 302)
at: 2026-11-24T09:11:27Z
```
HTTP/2 302
location: https://vercel.com/sso-api?url=https%3A%2F%2Frexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app%2F&nonce=...
server: Vercel
set-cookie: _vercel_sso_nonce=...; Secure; HttpOnly; SameSite=Lax
x-robots-tag: noindex
x-vercel-id: cdg1::z24h6-1795511487816-398c58cf62cf
```

### E2E against live preview
command: `GATE_RUNS_FILE=$PWD/runs.jsonl NODE_EXTRA_CA_CERTS=proxy-ca.pem REXI_E2E_SITE_URL=https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app node tests/e2e/landing.e2e.ts`
exit: 1
at: 2026-11-24T09:11:36Z
```
2026-11-24T09:11:36.983Z [e2e:landing] target: https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app
[e2e:landing] journey failed: timed out after 45000ms waiting for the landing hero
```

---

# Attempt 2

- PR head re-confirmed: `cbbc18c16626db37d93e1e86e058821a7c7038c9` (unchanged)
- Deploy URL: https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app (same deployment, inspector id `fFhFFVe9Yg7KAUNiSAxAY8yMYGPJ`)
- Config repair (by the owner): Vercel Protection Bypass for Automation secret, loaded via direnv as `VERCEL_AUTOMATION_BYPASS_SECRET`. The value is masked as `***MASKED***` everywhere and never printed.
- Build status: pass
- Health check status: pass (HTTP 200, real landing HTML)
- E2E verdict: pass (exit 0, AC-020-23…27 PASSED)
- Timestamp: 2026-11-24T09:19:51Z
- Phase-3 attempt: 2 of 3

Verdict: PASS

## Notes

- First E2E run in this attempt (09:18:23Z) exited 1 with `timed out after 45000ms waiting for the landing hero`.
  - Cause: verifier-side environment, not app behavior. Headless Chrome uses its own NSS trust store, so `NODE_EXTRA_CA_CERTS` does not cover it, and Chrome rejected the corporate TLS-interception chain. Reproduced with `google-chrome --headless=new --dump-dom <url>`: `net::ERR_CERT_AUTHORITY_INVALID`, `handshake failed`, empty DOM.
  - Fix (harness-side only, no repo change): `REXI_E2E_CHROME=/tmp/opencode/chrome-proxy-pin.sh`. This wrapper adds `--ignore-certificate-errors-spki-list=` with the SPKI SHA-256 pins of only the two ITX proxy CA certs (`Inditex SSL Proxy RSA 2025`, `ITX Root CA`). Pins:
    - `ft6/eLcOI7bGV2mPLIbd8ByA1TMiHzwq6Ch/wWLoJ3s=`
    - `irJJ+GDga1+dssoernak+i3hyvere1i9qhsUF9DKLUQ=`
  - Certificate errors are not ignored in general.
  - CI reproducibility note: on an un-intercepted runner the wrapper is unnecessary.
- `GATE_RUNS_FILE=$PWD/runs.jsonl` exported.

## Evidence

### Head re-confirmation
command: `gh pr view 117 --json headRefOid -q .headRefOid`
exit: 0
at: 2026-11-24T09:18:10Z
```
cbbc18c16626db37d93e1e86e058821a7c7038c9
```

### Health check (with protection bypass header)
command: `curl -sS --cacert proxy-ca.pem -H "x-vercel-protection-bypass: ***MASKED***" -D - https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app/`
exit: 0
at: 2026-11-24T09:18:17Z
```
http=200 time=0.668508
HTTP/2 200
content-type: text/html; charset=utf-8
server: Vercel
x-vercel-id: cdg1:cdg1:cdg1::752br-1795511897748-d9add1921405
<title>RexiAI: apps a medida para plomeros y tiendas de Miami
```

### E2E run 1 (browser blocked by proxy CA, environment)
command: `GATE_RUNS_FILE=$PWD/runs.jsonl NODE_EXTRA_CA_CERTS=proxy-ca.pem REXI_E2E_SITE_URL="<url>/?x-vercel-protection-bypass=***MASKED***&x-vercel-set-bypass-cookie=true" node tests/e2e/landing.e2e.ts`
exit: 1
at: 2026-11-24T09:18:23Z
```
2026-11-24T09:18:23.330Z [e2e:landing] target: https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app/?x-vercel-protection-bypass=***MASKED***&x-vercel-set-bypass-cookie=true
[e2e:landing] journey failed: timed out after 45000ms waiting for the landing hero
```

### E2E run 2 (Chrome SPKI-pinned to proxy CA)
command: `GATE_RUNS_FILE=$PWD/runs.jsonl NODE_EXTRA_CA_CERTS=proxy-ca.pem REXI_E2E_CHROME=/tmp/opencode/chrome-proxy-pin.sh REXI_E2E_SITE_URL="<url>/?x-vercel-protection-bypass=***MASKED***&x-vercel-set-bypass-cookie=true" node tests/e2e/landing.e2e.ts`
exit: 0
at: 2026-11-24T09:19:49Z
```
2026-11-24T09:19:49.451Z [e2e:landing] target: https://rexi-llyqcerqp-danielbueno76-4270s-projects.vercel.app/?x-vercel-protection-bypass=***MASKED***&x-vercel-set-bypass-cookie=true
2026-11-24T09:19:51.012Z [e2e:landing] ok: AC-020-24: eyebrow is "Apps a medida para tu negocio" (got "Apps a medida para tu negocio")
2026-11-24T09:19:51.015Z [e2e:landing] ok: AC-020-24: headline is "Tú me lo cuentas. Yo lo construyo." (got "Tú me lo cuentas. Yo lo construyo.")
2026-11-24T09:19:51.019Z [e2e:landing] ok: AC-020-24: Miami appears on the landing
2026-11-24T09:19:51.022Z [e2e:landing] ok: AC-020-24: Salamanca is absent from the hero
2026-11-24T09:19:51.024Z [e2e:landing] ok: AC-020-24: Salamanca is absent from the title ("RexiAI: apps a medida para plomeros y tiendas de Miami")
2026-11-24T09:19:51.024Z [e2e:landing] ok: AC-020-25: $1,200 appears on the landing
2026-11-24T09:19:51.024Z [e2e:landing] ok: AC-020-25: $600 appears on the landing
2026-11-24T09:19:51.024Z [e2e:landing] ok: AC-020-25: no "30 EUR" text on the landing
2026-11-24T09:19:51.025Z [e2e:landing] ok: AC-020-25: no EUR text on the landing
2026-11-24T09:19:51.025Z [e2e:landing] ok: AC-020-25: no euro sign on the landing
2026-11-24T09:19:51.025Z [e2e:landing] ok: AC-020-25: no "SaaS" text on the landing
2026-11-24T09:19:51.027Z [e2e:landing] ok: AC-020-26: the About bio is present
2026-11-24T09:19:51.027Z [e2e:landing] ok: AC-020-26: the About bio names Valladolid
2026-11-24T09:19:51.029Z [e2e:landing] ok: AC-020-26: the secondary CTA href is https://wa.me/34644409229 (got "https://wa.me/34644409229")
2026-11-24T09:19:51.032Z [e2e:landing] ok: AC-020-26: the secondary CTA names WhatsApp
2026-11-24T09:19:51.034Z [e2e:landing] ok: AC-020-26: the FAQ renders 4 pairs (got 4)
2026-11-24T09:19:51.036Z [e2e:landing] ok: AC-020-26: the nav label is Hablemos (got "Hablemos")
2026-11-24T09:19:51.038Z [e2e:landing] ok: AC-020-27: exactly one service offer (got 1)
2026-11-24T09:19:51.041Z [e2e:landing] ok: AC-020-27: the primary CTA targets #booking (got "#booking")
2026-11-24T09:19:51.055Z [e2e:landing] ok: AC-020-27: the primary CTA is clickable
2026-11-24T09:19:51.055Z [e2e:landing] ok: AC-020-27: the CTA reaches #booking (hash "#booking", inViewport true)
2026-11-24T09:19:51.073Z [e2e:landing] ok: AC-020-27: the EN switcher is present
2026-11-24T09:19:51.087Z [e2e:landing] ok: AC-020-27: the English headline is "You tell me. I build it." (got "You tell me. I build it.")
2026-11-24T09:19:51.087Z [e2e:landing] ok: AC-020-27: the document title changes with the locale
2026-11-24T09:19:51.117Z [e2e:landing] ok: AC-020-27: the ES switcher is present
2026-11-24T09:19:51.126Z [e2e:landing] ok: AC-020-27: the Spanish title returns (got "RexiAI: apps a medida para plomeros y tiendas de Miami")
2026-11-24T09:19:51.126Z [e2e:landing] AC-020-23…27 PASSED
```

## 45-decisions.md

Condition: Pipeline mode for /home/dbueno/projects/rexiAI/specs/020-neighborhood-business-landing
Options: lite, full
Chosen: full
Why: classifier: 5 named path(s) include 'EUR/h', outside docs/, specs/, *.md and scripts/
Reversibility: append a new entry with an explicit lite or full token
At: 2026-11-24T08:26:53Z

