# AC-020: About — filled bio from the fixed fact set, no photo

## AC-020-16 — About states Salamanca + Miami, and no other location
Given the about block renders in either locale
Then `about.location` names `Salamanca` (the founder lives there) and `Miami`
  (remote clients)
And it makes no other location claim

## AC-020-17 — The bio is filled from the allowed facts only
Given the about block renders in either locale
Then `about.bio` renders a non-empty paragraph in ES and EN
And the bio contains `Valladolid` and the allowed facts: Rexi AI (full-stack
  CRM), Verisure, Santander (or Open Digital Services), BME, Salamanca, and
  the padel + language facts
And the bio contains none of: an invented client name, logo, testimonial, or
  metric, or any fact outside the owner list
And the bio does not mention `Inglés Ejecutivo`

## AC-020-18 — No founder photo
Given the about block renders
Then it renders no founder `<img>` or photo asset
