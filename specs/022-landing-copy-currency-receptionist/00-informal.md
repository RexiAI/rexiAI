# 022 — Landing: example-row wrap bug, euros in Spanish, AI receptionist example

Small follow-up to spec 020 (docs/changes/020-neighborhood-business-landing.md).

## 1. Bugfix: example rows wrap badly

On the landing "lo que construyo" section, each before→after example row
(.example-row__pair, src/components/Services.tsx, src/App.css) shows a label
("antes"/"después") followed by the text. When the text wraps to 3 lines
(e.g. ES shop row "Aviso automático cuando algo se va a acabar."), lines 2 and
3 are not aligned with line 1: the inline label's min-width does not give the
text a hanging indent. Fix so the text of each cell wraps as one aligned block
beside/below its label at every width (desktop three-column layout and the
mobile single column), in ES and EN. Keep the semantic markup and the
accessible antes/después labels. No new digits/logos.

## 2. Currency per language, same numbers

- ES: "desde 1.200 €" (setup) and "desde 600 €/mes" (monthly), Spanish number
  format (dot thousands separator, symbol after, with a non-breaking space).
  Everywhere ES copy shows a price: pricing section, FAQ answer, contact
  line, head title/description if any, og/twitter meta in index.html.
- EN: unchanged ("from $1,200", "from $600/month").
- The numeric amounts stay 1200 and 600 (no conversion). No third price.
- Existing tests/E2E that assert "$1,200"/"$600" in the Spanish page must
  assert the euro form for ES and the dollar form for EN (scenario IDs kept,
  intent preserved: exactly two figures, no hourly text).

## 3. Remove pensions; add the AI receptionist as an example

- Remove the `pensions-system` item from the Proof section (ES + EN). The
  Proof section keeps its other items and its honesty line; if its intro
  copy refers to the count/content of items, adjust minimally.
- Add a 4th before→after example to "lo que construyo" (ES + EN), in owner
  vocabulary, illustrative only (not a client case, no metrics):
  - trade/title ES: "Despachos y consultas" (or similar owner-friendly name)
  - before ES: "Llamadas que se quedan sin contestar."
  - after ES: "Recepcionista de IA que contesta en español e inglés y agenda la cita."
  - EN equivalents ("Calls that go unanswered." / "AI receptionist that
    answers in Spanish and English and books the appointment.").
- No link, no repo URL, no claim of existing clients, no price for it
  (the two site-wide figures stay the only prices). Do not mention
  "Inglés Ejecutivo".

## 4. Script complexity (owner scope addition)

The Verifier found 11 cyclomatic-complexity violations (>6, eslint `complexity`
rule in `eslint.config.cjs`) in runtime scripts this spec did not touch. Owner
decision: fix them in this spec. Behavior-preserving refactor only — no change to
CLI flags, output, exit codes or side effects. These are recording/billing
scripts with thin test coverage, so pin current behavior with characterization
tests before refactoring.

Follow-up (owner-authorized): the `complexity` rule in `eslint.config.cjs` only
covered js/jsx/ts/tsx, so `.mjs` scripts were never checked. Add
`complexity: ['error', 6]` to the `**/*.mjs` block so the gate actually applies.

## Out of scope

Booking widget, payments, pipeline/tooling (except §4), other copy.
