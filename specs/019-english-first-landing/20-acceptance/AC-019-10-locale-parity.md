# AC-019: Locale parity and ES sync

## AC-019-21 — Both dictionaries have the same shape and the retired keys are gone

Given the exported `es` and `en` dictionaries
When their key shapes are compared recursively
Then no key exists in one and not the other (arrays compared by length and element keys)

Given both dictionaries
Then neither contains a `freeMode` key
And neither contains `services.carouselPrev`, `services.carouselNext`, `services.carouselPosition` or `services.carouselRole`
And no `services.items[*]` entry has a `meta` key
And neither contains `booking.narrative`, `booking.pricingRules` or `booking.pricingExample`
And `services.items` has exactly 3 entries in both locales, with ids `internal-tools`, `saas-products`, `websites-and-apps` in that order
And `proof.items` has exactly 3 entries in both locales
And every `proof.items[*].href` and `proof.items[*].name` is identical across locales
And `contact.email` is `info@rexi-ai.com` in both locales

Given the dictionary module
Then the only em dash (`—`, U+2014) in either dictionary is inside `booking.narrativePaid`
And the en dash (`–`, U+2013) appears in neither dictionary
And `npx tsc --noEmit` exits 0 (a key missing from `en` is a compile error)

## AC-019-22 — Spanish says what the English page now says

Given the landing page renders in Spanish
Then the hero `<h1>` is exactly `Tu negocio funciona con una hoja de cálculo que solo una persona entiende.`
And the services `<h2>` is exactly `Lo que construyo`
And the proof `<h2>` is exactly `Publicado, no presentación`
And the about `<h2>` is exactly `Quién lo construye`
And the booking narrative in free mode is exactly `La primera hora es gratis. Describes el proceso que te está comiendo la semana; te vas con un plan de una página y un precio fijo para la construcción. Sin cargo, sin compromiso, sin presentación.`

Given both dictionaries
When the ES values of the changed sections (`hero`, `services`, `proof`, `about`, `booking`) are compared with their EN counterparts
Then no ES value is byte-identical to its EN value, except `about.name`, `about.email`, `about.githubLabel`, `about.githubUrl`, `about.bio` (empty), all `proof.items[*].name`, all `proof.items[*].href` and all `services.items[*].id`
And no ES value is empty
And no ES value still holds the retired copy: `Olvídate de tu Excel. Automatiza, con o sin IA.`, `Servicios`, `SaaS · Producto`, `Web · Frontend`, `App · Móvil`, `Consultoría · Estrategia`, `Paga de forma segura con Stripe` as a *step* in free mode, `30 EUR/h`
