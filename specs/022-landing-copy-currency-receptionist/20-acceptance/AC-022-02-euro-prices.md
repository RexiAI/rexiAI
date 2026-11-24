# AC-022-02: Spanish prices in euros, English unchanged

## AC-022-02-01 — ES pricing figures
Given the landing in ES
When the pricing section renders
Then it contains "desde 1.200\u00A0€" and "desde 600\u00A0€/mes"

## AC-022-02-02 — ES FAQ and booking line use euros
Given the landing in ES
When the FAQ and contact/booking money line render
Then every price reads "600\u00A0€/mes" or "1.200\u00A0€"
And the booking line is "Primera llamada gratis. Después acordamos el proyecto: puesta en marcha desde 1.200\u00A0€ y mantenimiento desde 600\u00A0€/mes."

## AC-022-02-03 — No dollar sign on the ES page
Given the landing in ES
When the full page text is read
Then it contains no "$"

## AC-022-02-04 — EN unchanged
Given the landing in EN
When the page renders
Then it contains "from $1,200" and "from $600/month"
And contains no "€"

## AC-022-02-05 — Exactly two amounts, no hourly text
Given either locale
When all price figures are extracted
Then the set of amounts is {1200, 600}
And no "/hora" or "/hour" text appears

## AC-022-02-06 — Head meta stays price-free
Given index.html
When title, description, og:* and twitter:* are read
Then none contains "$", "€", "1.200", "1,200" or "600"
