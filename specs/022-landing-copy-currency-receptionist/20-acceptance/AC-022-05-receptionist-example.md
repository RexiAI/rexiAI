# AC-022-05: AI receptionist as fourth example

## AC-022-05-01 — ES row
Given the landing in ES
When the Services section renders
Then there are 4 example rows and the 4th reads trade "Despachos y consultas", before "Llamadas que se quedan sin contestar.", after "Recepcionista de IA que contesta en español e inglés y agenda la cita."

## AC-022-05-02 — EN row
Given the landing in EN
When the Services section renders
Then the 4th row reads trade "Law firms and medical practices", before "Calls that go unanswered.", after "AI receptionist that answers in Spanish and English and books the appointment."

## AC-022-05-03 — Illustrative only
Given the 4th row in either locale
When inspected
Then it contains no link, no digit, no "$"/"€", and no "Inglés Ejecutivo"

## AC-022-05-04 — Locale parity
Given es.services.examples and en.services.examples
When ids are compared
Then both are ["plumber","shop","salon","receptionist"]
