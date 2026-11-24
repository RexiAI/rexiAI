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
