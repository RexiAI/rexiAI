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
