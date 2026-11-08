# AC-019: English is the default locale

## AC-019-01 — First-time visitor gets English

Given no `rexi-locale` entry in `localStorage`
When the app renders
Then the active locale is `en`
And the hero `<h1>` text content is exactly `Your business runs on a spreadsheet only one person understands.`
And `document.documentElement.lang` is `en`

Given `localStorage['rexi-locale']` holds an unrecognised value (`fr`)
When the app renders
Then the active locale is `en`
And `document.documentElement.lang` is `en`

## AC-019-02 — A stored Spanish preference is honoured

Given `localStorage['rexi-locale']` is `es`
When the app renders
Then the hero `<h1>` text content is exactly `Tu negocio funciona con una hoja de cálculo que solo una persona entiende.`
And `document.documentElement.lang` is `es`
And the English H1 `Your business runs on a spreadsheet only one person understands.` is not in the document

## AC-019-03 — Toggling updates `lang` and persists

Given a first-time visitor whose page rendered in English
And `document.documentElement.lang` is `en`
When the language switcher's `ES` button is activated
Then `localStorage['rexi-locale']` is `es`
And `document.documentElement.lang` is `es`
And the Spanish hero subtext renders: `La sustituyo por software que funciona solo: herramientas internas, productos SaaS y aplicaciones web. Alcance en una llamada, precio fijo, entregado en semanas. El código es tuyo.`
When the `EN` button is activated
Then `localStorage['rexi-locale']` is `en`
And `document.documentElement.lang` is `en`
And the English hero subtext renders: `I replace it with software that runs itself: internal tools, SaaS products and web apps. Scoped in one call, fixed price, shipped in weeks. You own the code.`
