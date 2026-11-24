# 022 — Tasks

Source: `00-informal.md`. Follow-up to `docs/changes/020-neighborhood-business-landing.md`.
Notation: `NBSP` = U+00A0 non-breaking space. ES figures: `1.200 €`, `600 €/mes`
written `1.200\u00A0€`, `600\u00A0€/mes`.

## Task 1 — Example rows wrap as an aligned block (bugfix)

Files: `src/components/Services.tsx`, `src/App.css`.

- Each `.example-row__cell` lays out label and text as two boxes: label in its own
  column/box, text in a separate element (e.g. `.example-row__text`) that is a block
  box — wrapped lines of the text start at the same x as its first line.
- `.example-row__label` is no longer `display: inline-block` inline with the text
  run; the cell uses `display: grid` or `display: flex` (not `block`).
- Holds in the mobile single-column layout and in the `min-width: 641px`
  three-column layout; no `@media` rule reintroduces inline label+text flow.
- Markup unchanged in meaning: each cell keeps its visible `antes`/`después`
  (`before`/`after`) label text and the arrow; no new digits or images added.

## Task 2 — Spanish prices in euros, English unchanged

Files: `src/i18n/locales/es.ts` (+ components only if they hard-code `$`).

- ES pricing figures are exactly `desde 1.200\u00A0€` and `desde 600\u00A0€/mes`.
- Every ES string containing a price uses the euro form: pricing section, FAQ
  answer (maintenance), contact/booking money line
  (`… puesta en marcha desde 1.200\u00A0€ y mantenimiento desde 600\u00A0€/mes.`).
- The rendered ES page contains no `$` character in any price.
- EN strings are byte-identical to today (`from $1,200`, `from $600/month`, FAQ,
  booking line).
- Only two distinct amounts exist per locale (1200, 600); no hourly text.
- `index.html` title/description/og/twitter contain no price today; they stay
  price-free (nothing to convert).

## Task 3 — Update existing price tests (IDs kept)

Rewrite assertions to the per-locale form, keeping each test's scenario ID and intent:

| File | ID | Change |
|---|---|---|
| `src/__tests__/AC-020-pricing.test.ts` | AC-020-14 | ES expects `desde 1.200\u00A0€` / `desde 600\u00A0€/mes`; EN unchanged; "page contains both figures" per locale |
| `src/__tests__/AC-020-faq.test.ts` | AC-020-19 | allowed amounts per locale: EN `$1,200`,`$600`; ES `1.200 €`,`600 €` (amount matcher must also catch `€` figures) |
| `src/__tests__/AC-020-e2e-landing.test.ts` | AC-020-25 | ES landing source/page has the euro forms; EN the dollar forms; no `30 EUR`, no SaaS |
| `tests/e2e/landing.e2e.ts` (~L254) | AC-020-25 | ES document text asserts `1.200 €` and `600 €`, not `$` |
| `src/__tests__/AC-019-booking-money-story.test.ts` | AC-019-15/16 | ES constant becomes the euro sentence; EN unchanged |
| `src/__tests__/AC-011-booking-ui.test.tsx` | AC-011-03 | `/desde \$1,200/` → euro form |

- No test is deleted; each ID still appears in its file.

## Task 4 — Remove `pensions-system` from Proof

Files: `src/i18n/locales/{es,en}.ts`; tests `AC-019-proof.test.ts`, any proof count in
`AC-020-proof.test.ts`/`tests/e2e`.

- `proof.items` in both locales contains only `tax-advisor` (order/other items unchanged).
- Rendered pages contain no `pensions` text and no `RexiAI/pensions-system` href.
- Honesty intro unchanged except: if it implies plurality that no longer holds,
  minimal edit allowed (current intro: "Lo de abajo… cada enlace" — kept as-is is acceptable).
- AC-019-12 keeps its ID; asserts one real link (tax-advisor) instead of two.

## Task 5 — Fourth example: AI receptionist

Files: `src/i18n/locales/{es,en}.ts`; test `AC-020-services.test.ts` (AC-020-08 count 3→4).

- `services.examples` gains a 4th item, id `receptionist`, last in order, in both locales:
  - ES trade `Despachos y consultas`; before `Llamadas que se quedan sin contestar.`;
    after `Recepcionista de IA que contesta en español e inglés y agenda la cita.`
  - EN trade `Law firms and medical practices`; before `Calls that go unanswered.`;
    after `AI receptionist that answers in Spanish and English and books the appointment.`
- The row has no link, no digit, no price, no client/metric claim, no "Inglés Ejecutivo".
- Locale parity tests (AC-019/020 parity) pass: same example ids in ES and EN.

## Task 6 — Script complexity ≤6 (behavior-preserving)

Owner scope addition (see 00-informal §4). Targets (eslint `complexity` 6, from `eslint.config.cjs`):

| File | Function | Current |
|---|---|---|
| `scripts/dev-api-server.mjs` | function at :88 | 7 |
| `scripts/m365-consent.mjs` | function at :74 | 7 |
| `scripts/recording-bot.mjs` | `parseArgs` | 13 |
| `scripts/recording-bot.mjs` | `runWatch` | 7 |
| `scripts/recording/billing.mjs` | `reservationFields` | 7 |
| `scripts/recording/bot/capture.mjs` | `recordRoom` | 7 |
| `scripts/recording/bot/pulse.mjs` | `loadSink` | 7 |
| `scripts/recording/bot/session.mjs` | `nextStep` | 8 |
| `scripts/recording/bot/session.mjs` | `runSession` | 12 |
| `scripts/test-billing-chain.mjs` | `findRecordingForRoom` | 9 |
| `scripts/test-billing-chain.mjs` | async arrow at :91 | 8 |

(`tests/e2e/auto-record-lib.mjs` `joinMeeting` already fixed — not in scope.)

- Order: characterization tests first. For every target function reachable from a
  module export (`parseArgs`, `runWatch`, `reservationFields`, `recordRoom`, `loadSink`,
  `nextStep`, `runSession`, `findRecordingForRoom`), a vitest test under `src/__tests__/`
  named `AC-022-06-*.test.*` pins current outputs for one input per existing branch,
  and is committed green against the **unrefactored** code. Existing tests that already
  pin a branch (e.g. `AC-006-recording-bot-cli.test.ts`) may be reused instead.
- Functions not exported may be exported for testing only if the export adds no
  behavior; otherwise covered via the nearest exported caller.
- Config (owner-authorized, supersedes earlier "config unchanged" wording for this one rule):
  the `files: ['**/*.mjs']` block in `eslint.config.cjs` sets `complexity: ['error', 6]`,
  with a comment stating why (the js/jsx/ts/tsx block does not match `.mjs`). No other
  rule or threshold in `eslint.config.cjs` changes.
- No `eslint-disable` comment for `complexity` in `scripts/` or `tests/`.
- After refactor: `npx eslint scripts tests` exits 0 with 0 `complexity` errors.
- A probe `.mjs` with complexity 7, linted through ESLint's Node API with the repo config
  from a temp dir (not committed), yields a `complexity` error — proves the gate is live.
- `node --check <file>` exits 0 for each of the 8 files listed.
- `npm test` passes; every characterization test passes unchanged (assertions not edited
  after refactor).
- No change to: CLI flag names/defaults, stdout/stderr text, exit codes, file paths written,
  HTTP routes/status codes in `dev-api-server.mjs`.

## Open questions

None blocking. Task 6: if a target function is untestable without real Teams/PulseAudio/Stripe
I/O, characterize via injected fakes already used by AC-006 tests; if none exist, record it in
25-verification as residual risk rather than adding new mocking infrastructure. Note: informal spec suggests trade "Despachos y consultas" "or similar";
taken literally. Existing row `salon` is "Salones y clínicas" — overlap accepted by spec.
EN trade name `Law firms and medical practices` is the Specifier's translation; reviewer may change.
