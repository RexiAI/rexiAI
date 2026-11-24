# AC-020: Hero — eyebrow, exact headline, Miami trades, CTAs

## AC-020-01 — The eyebrow is exact in both locales
Given the hero renders above the headline
Then an eyebrow element shows exactly `Apps a medida para tu negocio` in Spanish
And exactly `Custom apps for your business` in English

## AC-020-02 — The headline is exact in both locales
Given the hero renders
Then the `h1` is exactly `Tú me lo cuentas. Yo lo construyo.` in Spanish
And exactly `You tell me. I build it.` in English

## AC-020-03 — The subtext names Miami trades and the listening differentiator
Given the Spanish hero subtext
Then it contains at least two trade terms from `plomer`, `clinic`, `despacho`,
  `abogad`, `contratist`, `electricist`, `tienda`, `salon`
And it contains a listening/adaptation signal (`escuchar`, `escucho`, `a medida`,
  `adapta`, `adaptado`, or `exactamente lo que`)
And the English subtext mirrors both assertions with the EN trade set and
  `listen`, `tailored`, `adapted`, or `exactly what you`

## AC-020-04 — The hero names Miami only, and the offer is Miami or video call
Given the hero renders in either locale
Then the hero names `Miami`
And the hero does not name `Salamanca`
And the hero states the offer is in person in Miami or by video call anywhere
  (signal `video llamada` / `videollamada` / `video call`)

## AC-020-05 — Kept promises and the two CTAs
Given the hero renders in either locale
Then the hero contains the free-first-call term (`primera llamada gratis` /
  `first call free`)
And the you-own-it term (`el código es tuyo` / `you own the code`)
And the primary CTA (`.hero-cta--primary`) anchors to `#booking` and reads as
  booking a call (ES `llamada` / `reserva` / `agenda`, EN `book` / `call`)
And the secondary CTA href is exactly `https://wa.me/34644409229`
And the secondary CTA label contains `WhatsApp`
And the hero contains no `mailto:` link

## AC-020-06 — The hero is free of banned copy
Given the hero renders in either locale
Then it contains no banned label, no banned developer jargon, and no `software`
And it contains no `Inglés Ejecutivo`, no `30 EUR`, no `EUR`, and no `€`
