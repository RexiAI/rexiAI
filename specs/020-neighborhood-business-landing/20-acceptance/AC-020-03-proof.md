# AC-020: Proof — reworded for the owner

## AC-020-10 — No jargon, engineering-standards repo removed
Given either locale
When the landing renders
Then the `#proof` section text contains none of the banned developer jargon
And the proof section contains no link to
  `github.com/RexiAI/my-engineering-standards`
And the proof section contains no `Inglés Ejecutivo`

## AC-020-11 — Honesty line kept, no invented proof
Given either locale
When the landing renders
Then the proof section keeps an honesty line (no invented logos, testimonials,
  or metrics)
And the proof section contains no `testimonio`, `testimonial`, `caso de éxito`,
  or `case study`
And the proof section contains no invented metric (`100%`, `500+`, `10x`)
