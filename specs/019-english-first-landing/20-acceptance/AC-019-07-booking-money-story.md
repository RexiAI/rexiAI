# AC-019: Booking — one money story per mode

## AC-019-15 — Free mode shows the free-hour story and no price machinery

Given the site config reports `billingEnabled === false`
When the landing page renders in English
Then the booking section's narrative is exactly `The first hour is free. You describe the process that is eating your week; you leave with a one-page plan and a fixed price for the build. No charge, no obligation, no slide deck.`
And the step list contains exactly three items, in order: `Pick a slot`, `Tell me what is broken`, `Get the plan and the price`
And the card contains the text `Free session: nothing is charged now.`
And the document contains no exact text `FREE` and no exact text `GRATIS`
And the document contains no `<s>`, `<del>` or `<strike>` element
And the document contains no occurrence of `1h free · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR`
And the document contains no occurrence of `Pay securely with Stripe`
And the document contains no occurrence of the paid narrative `First hour free. After that, 30 EUR per hour, prepaid — you pay for the block you book, nothing is metered afterwards.`
And the submit button's accessible name is exactly `Book the free hour`

Given the same page renders in Spanish
Then the narrative is exactly `La primera hora es gratis. Describes el proceso que te está comiendo la semana; te vas con un plan de una página y un precio fijo para la construcción. Sin cargo, sin compromiso, sin presentación.`
And the steps are, in order: `Elige un hueco`, `Cuéntame qué está roto`, `Recibe el plan y el precio`
And the submit button's accessible name is exactly `Reserva la hora gratis`

## AC-019-16 — Paid mode shows the prepaid story and an unstruck price line

Given the site config reports `billingEnabled === true`
When the landing page renders in English
Then the booking section's narrative is exactly `First hour free. After that, 30 EUR per hour, prepaid — you pay for the block you book, nothing is metered afterwards.`
And the step list contains exactly three items, in order: `Pick a slot`, `Choose your block`, `Pay securely with Stripe`
And the card renders exactly one price line whose text is exactly `1h free · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR`
And that price line is not wrapped in `<s>`, `<del>` or `<strike>` and its class name does not contain `was` or `line-through`
And the card contains no exact text `FREE` and no exact text `GRATIS`
And the card contains no `First hour free for new clients, then 30 EUR/hour` line
And the document contains no occurrence of the free narrative `The first hour is free. You describe the process that is eating your week; you leave with a one-page plan and a fixed price for the build. No charge, no obligation, no slide deck.`
And the document contains no occurrence of `Tell me what is broken`
And the submit button's accessible name is exactly `Book and pay`

Given the same page renders in Spanish
Then the narrative is exactly `Primera hora gratis. Después, 30 EUR por hora, prepagado — pagas el bloque que reservas, nada se factura después.`
And the price line is exactly `1h gratis · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR`
And the steps are, in order: `Elige un hueco`, `Elige tu bloque`, `Paga de forma segura con Stripe`
And the submit button's accessible name is exactly `Reservar y pagar`
