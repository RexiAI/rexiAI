# AC-020: Services — one offer + three before→after examples

## AC-020-07 — Exactly one offer card
Given either locale
When the landing renders
Then the `#services` section renders exactly one offer card
And no card carries a `SaaS` or website/app offer title

## AC-020-08 — Three illustrative Miami before→after examples, not client cases
Given the services section renders in Spanish
Then three examples render, each a before→after pair:
  a `plomero` (presupuestos en papel → presupuesto desde el móvil),
  a `tienda` (stock en Excel → aviso de reposición),
  a `salón` / `clínica` (citas por WhatsApp → agenda con recordatorios)
And the section contains none of: `testimonio`, `testimonial`, `caso de éxito`,
  `case study`, an invented name, logo, or metric

## AC-020-09 — No jargon, `software`, or `Inglés Ejecutivo` in the services section
Given either locale
When the landing renders
Then the `#services` section text contains none of the banned developer jargon
And the section text contains no `software` (it says `app` / `herramienta`)
And it contains no `Inglés Ejecutivo`
