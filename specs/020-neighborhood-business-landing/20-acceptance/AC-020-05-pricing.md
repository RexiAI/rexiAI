# AC-020: Pricing — public USD figures, no hourly text, no milestone line

## AC-020-14 — Public pricing shows `desde $1,200` + `desde $600/mes`
Given the landing renders in Spanish
Then it shows `desde $1,200` (setup) and `desde $600/mes` (hosting, maintenance
  and changes)
And the English landing shows `from $1,200` (setup) and `from $600/month`
And the figures `$1,200` and `$600` are present

## AC-020-15 — No hourly/EUR text, no milestone line; first call free stays
Given both dictionaries and the rendered landing
Then there is no `30 EUR`, no `EUR`, no `€`, no `por hora` / `per hour`, and no
  `1h · 2h · 3h · 4h` ladder anywhere on the landing
And the milestone line `Pagas por hitos: solo pagas cada parte cuando la ves
  funcionando.` is absent
And the landing conveys the first call is free (`llamada gratis` / `call free`)
And `booking.narrativePaid` and `booking.priceLine` (if rendered) carry no
  hourly text and no milestone line
