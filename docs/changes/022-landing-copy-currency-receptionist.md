# 022-landing-copy-currency-receptionist

> Spec pipeline archive. Original source: `specs/022-landing-copy-currency-receptionist/` (deleted by this script).
> Archived: 2026-11-24

## Original ask

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

## Tasks

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

## Acceptance scenarios

## AC-022-01-01 — Label and text are separate boxes
## AC-022-01-02 — Cell uses a two-box layout, not inline flow
## AC-022-01-03 — Desktop media query keeps the block layout
## AC-022-01-04 — EN labels preserved
## AC-022-02-01 — ES pricing figures
## AC-022-02-02 — ES FAQ and booking line use euros
## AC-022-02-03 — No dollar sign on the ES page
## AC-022-02-04 — EN unchanged
## AC-022-02-05 — Exactly two amounts, no hourly text
## AC-022-02-06 — Head meta stays price-free
## AC-022-03-01 — IDs preserved
## AC-022-03-02 — No ES assertion expects dollars
## AC-022-03-03 — FAQ amount guard catches euros
## AC-022-04-01 — Item gone in both locales
## AC-022-04-02 — Remaining proof intact
## AC-022-05-01 — ES row
## AC-022-05-02 — EN row
## AC-022-05-03 — Illustrative only
## AC-022-05-04 — Locale parity
## AC-022-06-01 — Characterization before refactor
## AC-022-06-02 — parseArgs behavior pinned
## AC-022-06-03 — Session state machine pinned
## AC-022-06-04 — Billing helpers pinned
## AC-022-06-05 — Zero complexity errors
## AC-022-06-06 — Scripts still parse
## AC-022-06-07 — Suite stays green
## AC-022-06-08 — CLI surface unchanged
## AC-022-06-09 — Gate is live for .mjs

## Verification

# 025 Verification — 022-landing-copy-currency-receptionist

Attempt 1, phase 1 (SPEC_LOOP_COUNT=0, SPEC_PHASE1_RETRIES=0). Mode: full, not autopilot.

**Verdict: FAIL** — gate `traceability` exited 1 with a finding (AC-022-03 untraced). All other gates clean.

## Evidence: scenario traceability

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 1
at: 2026-11-24T14:44:57Z

{
  "checks": [1, 2],
  "passes": ["AC-022-01 — traced to a test", "AC-022-02 — traced to a test", "AC-022-04 — traced to a test", "AC-022-05 — traced to a test"],
  "fails": ["AC-022-03 — scenario defined in specs/*/20-acceptance/ but no test references it.  Add a test named after this ID, or confirm with 10-tasks.md that it's obsolete  and remove the scenario instead of leaving it untraced."]
}

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-11-24T14:44:58Z
Test-run hash: f31f36e73f1433b4c010b0da2ca9a78a93ccd453b44b85c248ed593f7be78373

SUMMARY: mode=run exit=0 signal=0 log_lines=17 log=/tmp/opencode/pipeline/022-verifier-suite.log
      Tests  674 passed | 1 skipped (675)
Note: the 1 skip is pre-existing env-gated (`AC-006-bot-adapter` describe.skipIf(!LIVE) / `AC-006-recording-output` it.skipIf(!hasFfmpeg)), not in this spec's diff. Flagged, not counted as this spec's failure.
Supporting: `npm run build` exit 0; `npm run format:check` exit 0 ("All matched files use Prettier code style!"); `npx eslint .` (project config) exit 0, 0 errors, 14 warnings (no-console).
full log: §Raw log: full test suite

## Evidence: complexity gate

command: npx eslint --rule '{"complexity":["error",6]}' src/__tests__/AC-002-landing-content.test.tsx src/__tests__/AC-011-booking-ui.test.tsx src/__tests__/AC-019-booking-money-story.test.ts src/__tests__/AC-019-locale-parity.test.ts src/__tests__/AC-019-proof.test.ts src/__tests__/AC-019-services.test.ts src/__tests__/AC-020-e2e-landing.test.ts src/__tests__/AC-020-faq.test.ts src/__tests__/AC-020-pricing.test.ts src/__tests__/AC-020-services.test.ts src/__tests__/landing-020-units.test.ts src/__tests__/landing-units.test.ts src/components/Services.tsx src/i18n/locales/en.ts src/i18n/locales/es.ts tests/e2e/landing.e2e.ts src/__tests__/AC-022-landing-copy.test.ts
exit: 0
at: 2026-11-24T14:45:56Z


/home/dbueno/projects/rexiAI/tests/e2e/landing.e2e.ts
   37:3  warning  Unexpected console statement  no-console
   42:5  warning  Unexpected console statement  no-console
  367:5  warning  Unexpected console statement  no-console
  384:3  warning  Unexpected console statement  no-console

✖ 4 problems (0 errors, 4 warnings)

(Whole-tree run with the same rule reports 11 complexity errors, all in untouched `scripts/*.mjs` files outside this diff — pre-existing, out of scope; follow-up spec suggested.)

## Evidence: design-principles gate

command: .standards/scripts/check-code-principles.sh --json
exit: 0
at: 2026-11-24T14:45:21Z

fails: [] — WARN lines verbatim:
Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28
Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25
Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:111:242::KISS_LINES=38
Method body >20 lines (node): ./src/pages/Privacy.tsx:10:52:SectionView:KISS_LINES=43
Method body >20 lines (node): ./src/pages/Privacy.tsx:54:102:Privacy:KISS_LINES=42
Method body >20 lines (node): ./api/stripe-webhook.ts:143:165:getRawBookingFields:KISS_LINES=24
Method body >20 lines (node): ./api/bookings/checkout.ts:38:63:buildSessionParams:KISS_LINES=27
Method body >20 lines (node): ./api/bookings/recorded-billing.ts:218:240:?:KISS_LINES=24
Method body >20 lines (python): ./scripts/recording/whisper_transcribe.py:37:64:main:KISS_LINES=23 [approximate heuristic — comprehension/decorator forms can inflate the count; ADR 0006 warn phase]
Possible duplication (5x identical 4-line block, first at ./api/stripe-webhook.ts:294): startTime: string /hours: number /joinUrl?: string | null /date: string
Possible duplication (5x identical 4-line block, first at ./api/_lib/bookingsTypes.ts:16): date: string /startTime: string /hours: number /email: string
Possible duplication (4x identical 4-line block, first at ./api/_lib/bookingsValidation.ts:131): name: string /date: string /startTime: string /email: string
Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: "problem", /docs: { /description: /meta: {
Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:118): startTime: string /hours: number /amountTotal: number /date: string
Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},
Possible duplication (3x identical 4-line block, first at ./api/_lib/bookingsValidation.ts:172): date: string /startTime: string /hours: number /name: string
Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:463): date: string /startTime: string /hours: number /bookingId: string
Possible duplication (2x identical 4-line block, first at ./src/content/privacy.ts:143): }, /}, /id: 'transferencias', /],
Possible duplication (2x identical 4-line block, first at ./src/content/privacy.ts:104): }, /}, /id: 'grabacion', /],
Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30
Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33
SRP: possible god file (node) — ./api/stripe-webhook.ts: 627 lines, 8 methods (split by responsibility)
LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)
Comments: commented-out code (./src/__tests__/AC-006-bot-adapter.test.ts:10)
Comments: section-divider comment (./src/__tests__/AC-006-bot-adapter.test.ts:513)
Comments: section-divider comment (./src/__tests__/AC-006-bot-adapter.test.ts:524)
Comments: TODO/FIXME without an issue reference (./src/domain/pricing.ts:10)
Comments: TODO/FIXME without an issue reference (./api/stripe-webhook.ts:338)
Comments: commented-out code (./api/_lib/rescheduleSubmit.ts:6)
Comments: comment restates the following line (./session-start-check.sh:25)
Comments: comment restates the following line (./session-start-check.sh:43)
Comments: commented-out code (./.standards/scripts/check-code-principles.selftest.sh:641)
Comments: section-divider comment (./.standards/scripts/check-code-principles.selftest.sh:639)
Comments: comment restates the following line (./.standards/scripts/tests/gate-telemetry.selftest.sh:150)
Comments: commented-out code (./.standards/scripts/check-bats-assertions.sh:21)
Comments: TODO/FIXME without an issue reference (./.standards/scripts/gate-clean-code-lib.sh:97)
Comments: commented-out code (./.standards/scripts/verify-production-deploy.sh:30)
Comments: commented-out code (./.standards/scripts/check-code-principles.sh:58)
Comments: commented-out code (./.standards/scripts/check-code-principles.sh:121)
Comments: TODO/FIXME without an issue reference (./.standards/scripts/check-code-principles.sh:57)
Comments: attribution comment (./.standards/scripts/check-code-principles.sh:59)
Comments: comment restates the following line (./.standards/scripts/check-remediation-budget.sh:139)
Comments: comment restates the following line (./.standards/scripts/check-remediation-budget.sh:209)
Comments: commented-out code (./.standards/scripts/lint-outbox-schema.sh:13)
Comments: commented-out code (./.standards/scripts/lint-outbox-schema.sh:22)
Comments: TODO/FIXME without an issue reference (./.standards/scripts/check-saga-timeouts.sh:185)
Comments: commented-out code (./.standards/scripts/run-mutation.sh:29)
Comments: commented-out code (./.standards/scripts/run-mutation.sh:33)
Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:51)
Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:53)
Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:90)
Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:92)
Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:132)
Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:134)
Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:149)
Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:151)
Comments: commented-out code (./.standards/scripts/check-loop-files.sh:10)
Comments: section-divider comment (./.standards/scripts/init-ci.sh:6)
Comments: section-divider comment (./.standards/scripts/init-ci.sh:43)
Comments: commented-out code (./.standards/scripts/check-loop-triage.sh:39)
Comments: commented-out code (./.standards/scripts/check-loop-triage.sh:49)
Comments: commented-out code (./.standards/scripts/check-loop-triage.sh:67)
Comments: commented-out code (./.standards/scripts/token-stats.sh:10)
Comments: commented-out code (./.standards/scripts/classify-spec-size.sh:28)
Comments: commented-out code (./.standards/scripts/agent-test-summary.sh:45)
Comments: commented-out code (./.standards/scripts/test-run-reuse.sh:41)
Comments: commented-out code (./.standards/scripts/guard-env.sh:21)
Comments: commented-out code (./.standards/scripts/check-ci-sweeper.sh:37)
Comments: commented-out code (./.standards/scripts/check-security-hardening.sh:39)
Comments: commented-out code (./.standards/scripts/judgment-preflight.sh:16)
Comments: commented-out code (./.standards/scripts/check-model-env.sh:30)
Comments: commented-out code (./.standards/scripts/gate-stats.sh:20)
Comments: commented-out code (./.standards/scripts/check-pr-babysitter.sh:56)
Comments: TODO/FIXME without an issue reference (./.standards/scripts/check-saga-tests.sh:85)
Comments: comment restates the following line (./session-end-check.sh:14)
Comments: comment restates the following line (./session-end-check.sh:38)
Comments: commented-out code (./deploy/home/install-recording-host.sh:8)
Naming: boolean flag parameter (hasDedupStore) (./.standards/ci/templates/archunit/OutboxArchRules.java:197)
Naming: boolean flag parameter (hasCompensation) (./.standards/ci/templates/archunit/SagaArchRules.java:147)
Naming: boolean flag parameter (hasStateStore) (./.standards/ci/templates/archunit/SagaArchRules.java:201)
Naming: more than three parameters (Fprintf) (./.standards/ci/templates/go-saga-lint.go:61)
Naming: more than three parameters (synthesise_silent) (./.standards/scripts/voice/tts-worker.py:66)
Naming: more than three parameters (run_engine) (./.standards/scripts/voice/tts-worker.py:87)
Naming: more than three parameters (synthesise_silent) (./.standards/scripts/voice/tts-worker.py:90)
Naming: more than three parameters (run_engine) (./.standards/scripts/voice/tts-worker.py:120)
Naming: more than three parameters (handle_line) (./.standards/scripts/voice/tts-worker.py:126)
Naming: more than three parameters (handle_line) (./.standards/scripts/voice/tts-worker.py:154)
Naming: single-character identifier (b) (./api/_lib/bookingsValidation.ts:138)
Naming: single-character identifier (e) (./api/_lib/errorText.ts:8)
Naming: more than three parameters (moveOrFail) (./api/_lib/rescheduleSubmit.ts:212)
Naming: more than three parameters (completeMove) (./api/_lib/rescheduleSubmit.ts:254)
Naming: more than three parameters (filterSlotsByBusy) (./api/availability.ts:92)
Naming: more than three parameters (reserve) (./api/bookings.ts:86)
Naming: more than three parameters (reserve) (./api/bookings.ts:119)
Naming: single-character identifier (d) (./api/bookings/calendar.ts:36)
Naming: single-character identifier (s) (./api/bookings/calendar.ts:59)
Naming: single-character identifier (e) (./api/bookings/calendar.ts:60)
Naming: single-character identifier (h) (./api/bookings/checkout.ts:18)
Naming: single-character identifier (p) (./api/bookings/checkout.ts:20)
Naming: more than three parameters (createCalendarSideEffect) (./api/bookings/direct.ts:151)
Naming: more than three parameters (failStatic) (./api/bookings/direct.ts:153)
Naming: more than three parameters (failStatic) (./api/bookings/direct.ts:162)
Naming: single-character identifier (h) (./api/bookings/recorded-billing.ts:56)
Naming: single-character identifier (p) (./api/bookings/recorded-billing.ts:58)
Naming: single-character identifier (b) (./api/bookings/recorded-billing.ts:69)
Naming: more than three parameters (handlePaidCheckout) (./api/bookings/recorded-billing.ts:343)
Naming: more than three parameters (handleCheckoutResult) (./api/bookings/recorded-billing.ts:377)
Naming: single-character identifier (v) (./api/stripe-webhook.ts:81)
Naming: single-character identifier (e) (./api/stripe-webhook.ts:92)
Naming: single-character identifier (a) (./api/stripe-webhook.ts:98)
Naming: noise word in type name (BookingData) (./api/stripe-webhook.ts:113)
Naming: single-character identifier (v) (./api/stripe-webhook.ts:168)
Naming: single-character identifier (v) (./api/stripe-webhook.ts:174)
Naming: single-character identifier (d) (./api/stripe-webhook.ts:401)
Naming: single-character identifier (d) (./api/stripe-webhook.ts:494)
Naming: more than three parameters (dump) (./scripts/recording/whisper_transcribe.py:60)
Naming: single-character identifier (e) (./src/components/booking/form/validateBookingForm.ts:49)
Naming: more than three parameters (handleBookingResponse) (./src/components/booking/hooks/useBookingSubmit.ts:90)
Naming: single-character identifier (v) (./src/components/booking/hooks/useBookingSubmit.ts:101)
Naming: single-character identifier (m) (./src/domain/availability.ts:20)
Naming: single-character identifier (h) (./src/domain/availability.ts:22)
Naming: single-character identifier (h) (./src/domain/availability.ts:28)
Naming: single-character identifier (m) (./src/domain/availability.ts:29)
Naming: single-character identifier (p) (./src/domain/availability.ts:297)
Naming: single-character identifier (s) (./src/domain/availability.ts:305)
Naming: single-character identifier (e) (./src/domain/availability.ts:306)
Naming: single-character identifier (d) (./src/domain/availability.ts:317)
Naming: single-character identifier (p) (./src/domain/availability.ts:379)
Naming: single-character identifier (n) (./src/domain/bookingLookup.ts:33)
Naming: single-character identifier (v) (./src/domain/bookingLookup.ts:39)
Naming: more than three parameters (postResendEmail) (./src/domain/email.ts:161)
Naming: more than three parameters (clientModel) (./src/domain/emailDirect.ts:336)
Naming: single-character identifier (e) (./src/domain/freeHour.ts:52)
Naming: single-character identifier (e) (./src/domain/freeHour.ts:89)
Naming: single-character identifier (p) (./src/domain/graphEventProperties.ts:66)
Naming: single-character identifier (d) (./src/domain/microsoftGraph.ts:75)
Naming: single-character identifier (n) (./src/domain/rateLimit.ts:36)
Naming: single-character identifier (y) (./src/domain/time.ts:37)
Naming: single-character identifier (d) (./src/domain/time.ts:39)
Naming: single-character identifier (h) (./src/domain/time.ts:40)
Naming: single-character identifier (s) (./src/domain/time.ts:42)
Naming: single-character identifier (e) (./src/domain/time.ts:77)
Naming: more than three parameters (UTC) (./src/domain/time.ts:104)
Naming: single-character identifier (d) (./src/domain/validation.ts:22)
Naming: single-character identifier (e) (./src/domain/webhookDedup.ts:81)
Null-discipline: return null (./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:65)
Null-discipline: return null (./src/pages/ResultViews.tsx:8)
Null-discipline: return null (./src/domain/reschedule.ts:67)
Null-discipline: return null (./src/domain/reschedule.ts:93)
Null-discipline: return null (./src/domain/availability.ts:21)
Null-discipline: return null (./src/domain/availability.ts:141)
Null-discipline: return null (./src/domain/pricing.ts:27)
Null-discipline: return null (./src/domain/pricing.ts:54)
Null-discipline: return null (./src/domain/graphEventProperties.ts:67)
Null-discipline: return null (./src/domain/graphEventProperties.ts:68)
Null-discipline: return null (./src/domain/graphEventProperties.ts:126)
Null-discipline: return null (./src/domain/graphEventProperties.ts:129)
Null-discipline: return null (./src/domain/graphEventProperties.ts:149)
Null-discipline: return null (./src/domain/meetingUrl.ts:25)
Null-discipline: return null (./src/domain/meetingUrl.ts:30)
Null-discipline: return null (./src/domain/meetingUrl.ts:33)
Null-discipline: return null (./src/domain/meetingUrl.ts:52)
Null-discipline: return null (./src/domain/meetingDuration.ts:15)
Null-discipline: return null (./src/domain/rescheduleUrl.ts:25)
Null-discipline: return null (./src/domain/rescheduleUrl.ts:27)
Null-discipline: return null (./src/domain/microsoftGraph.ts:86)
Null-discipline: return null (./src/domain/microsoftGraph.ts:95)
Null-discipline: return null (./src/domain/microsoftGraph.ts:97)
Null-discipline: return null (./src/domain/microsoftGraph.ts:282)
Null-discipline: return null (./src/domain/microsoftGraph.ts:290)
Null-discipline: return null (./src/domain/microsoftGraph.ts:343)
Null-discipline: return null (./src/domain/bookingLookup.ts:32)
Null-discipline: return null (./src/domain/bookingLookup.ts:34)
Null-discipline: return null (./src/domain/bookingLookup.ts:48)
Null-discipline: return null (./src/domain/bookingLookup.ts:73)
Null-discipline: return null (./src/domain/bookingLookup.ts:76)
Null-discipline: return null (./src/domain/microsoftAuth.ts:31)
Null-discipline: return null (./src/domain/microsoftAuth.ts:32)
Null-discipline: return null (./src/i18n/I18nContext.tsx:11)
Null-discipline: return null (./src/i18n/I18nContext.tsx:16)
Null-discipline: return null (./src/i18n/I18nContext.tsx:25)
Null-discipline: null argument (./src/components/booking/hooks/useBookingFields.ts:18)
Null-discipline: return null (./src/components/booking/fields/SlotField.tsx:72)
Null-discipline: null argument (./src/components/booking/BookingConfirmation.tsx:25)
Null-discipline: return null (./api/stripe-webhook.ts:67)
Null-discipline: return null (./api/stripe-webhook.ts:70)
Null-discipline: return null (./api/stripe-webhook.ts:76)
Null-discipline: return null (./api/stripe-webhook.ts:110)
Null-discipline: return null (./api/stripe-webhook.ts:236)
Null-discipline: return null (./api/stripe-webhook.ts:476)
Null-discipline: return null (./api/stripe-webhook.ts:580)
Null-discipline: return null (./api/availability.ts:56)
Null-discipline: return null (./api/availability.ts:62)
Null-discipline: return null (./api/availability.ts:66)
Null-discipline: return null (./api/availability.ts:78)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:76)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:81)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:87)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:179)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:181)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:191)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:192)
Null-discipline: return null (./api/_lib/rescheduleSubmit.ts:58)
Null-discipline: return null (./api/_lib/rescheduleSubmit.ts:200)
Null-discipline: return null (./api/_lib/rescheduleSubmit.ts:242)
Null-discipline: return null (./api/_lib/rescheduleBooking.ts:26)
Null-discipline: return null (./api/bookings.ts:78)
Null-discipline: return null (./api/bookings.ts:79)
Null-discipline: return null (./api/bookings.ts:81)
Null-discipline: return null (./api/bookings.ts:82)
Null-discipline: return null (./api/bookings/config.ts:14)
Null-discipline: return null (./api/bookings/checkout.ts:12)
Null-discipline: return null (./api/bookings/checkout.ts:73)
Null-discipline: return null (./api/bookings/checkout.ts:79)
Null-discipline: return null (./api/bookings/checkout.ts:101)
Null-discipline: return null (./api/bookings/checkout.ts:102)
Null-discipline: return null (./api/bookings/recorded-billing.ts:99)
Null-discipline: return null (./api/bookings/recorded-billing.ts:127)
Null-discipline: return null (./api/bookings/recorded-billing.ts:136)
Null-discipline: return null (./api/bookings/recorded-billing.ts:152)
Null-discipline: return null (./api/bookings/recorded-billing.ts:154)
Null-discipline: return null (./api/bookings/recorded-billing.ts:263)

## Evidence: scenario-to-behavior spot check

command: REXI_E2E_SITE_URL=http://localhost:4173 node tests/e2e/landing.e2e.ts (against `vite preview --port 4173` of fresh build) + reading src/__tests__/AC-022-landing-copy.test.ts, AC-020-faq/pricing, AC-019-proof diffs, src/i18n/locales/{es,en}.ts
exit: 0
at: 2026-11-24T14:46:09Z

2026-11-24T14:46:10.388Z [e2e:landing] ok: AC-020-25: 1.200 € appears on the ES landing
2026-11-24T14:46:10.388Z [e2e:landing] ok: AC-020-25: 600 € appears on the ES landing
2026-11-24T14:46:10.388Z [e2e:landing] ok: AC-020-25: no dollar sign on the ES landing
2026-11-24T14:46:10.388Z [e2e:landing] ok: AC-020-25: no "30 EUR" text on the landing
2026-11-24T14:46:10.388Z [e2e:landing] ok: AC-020-25: no EUR text on the landing
2026-11-24T14:46:10.388Z [e2e:landing] ok: AC-020-25: no "SaaS" text on the landing
2026-11-24T14:46:10.696Z [e2e:landing] ok: AC-022-01: four example rows render at 1280px (got 4)
2026-11-24T14:46:10.697Z [e2e:landing] ok: AC-022-01: wrapped example lines share one left x at 1280px ({"rows":4,"texts":8,"multi":2,"misaligned":0})
2026-11-24T14:46:11.006Z [e2e:landing] ok: AC-022-01: four example rows render at 390px (got 4)
2026-11-24T14:46:11.007Z [e2e:landing] ok: AC-022-01: wrapped example lines share one left x at 390px ({"rows":4,"texts":8,"multi":7,"misaligned":0})
2026-11-24T14:46:11.389Z [e2e:landing] ok: AC-020-25: EN landing shows from $1,200
2026-11-24T14:46:11.389Z [e2e:landing] ok: AC-020-25: EN landing shows from $600/month
2026-11-24T14:46:11.389Z [e2e:landing] ok: AC-020-25: no euro sign on the EN landing
2026-11-24T14:46:11.437Z [e2e:landing] AC-020-23…27 PASSED

Spot checks (Given/When/Then vs assertion):
- AC-022-02-01: test asserts pricing section textContent contains 'desde 1.200\u00A0€' and 'desde 600\u00A0€/mes' — matches scenario. es.ts L71/L76 byte-check shows U+00A0 (C2 A0) before €.
- AC-022-02-03: asserts rendered ES container has no '$' — matches; e2e confirms on live preview.
- AC-022-01 (wrap): e2e probe at 1280 ({"rows":4,"texts":8,"multi":2,"misaligned":0}) and 390 ({"rows":4,"texts":8,"multi":7,"misaligned":0}) — wrapped lines share one left x.
- AC-020-19 migration: amount matcher now catches '€' figures; allow-list per locale (en {$1,200,$600}, es {1.200 €, 600 €}) — satisfies AC-022-03-03 intent, but carries no AC-022-03 ID.

Requested confirmations:
- Migrated tests AC-020-14/19/25, AC-019-12/15/16, AC-011-03, AC-020-08: IDs kept in their files; changes follow tasks 2–5 (requirement changes), not defect-encoding edits.
- Unlisted updates (AC-019-21, AC-019-09/10, AC-002-02, AC-020-15, landing-020-units, landing-units): follow from spec — ES may contain € but \bEUR\b still forbidden in both; EN '€' still forbidden; 4 example rows; 1 proof item.
- Prices: ES only 1.200 €/600 € (NBSP), EN only $1,200/$600 — two figures per locale.
- grep -rni "pension|Inglés Ejecutivo" over non-test src: no matches.

## Finding: no unaccounted behavior

Diff (App.css, Services.tsx, es.ts, en.ts, tests) traces to tasks 1–5. No unaccounted logic found.

## Failure reasons and routing

1. **traceability** (exit 1): "AC-022-03 — scenario defined in specs/*/20-acceptance/ but no test references it." No test carries AC-022-03-01/02/03. **Route: Coder** — add tests named AC-022-03-01 (IDs preserved in their files), AC-022-03-02 (no ES assertion expects $1,200/$600), AC-022-03-03 (matcher rejects an unlisted € amount). Re-trigger scoped: `check-scenario-traceability.sh --checks <n>` + suite.

Phase-1 budget: 1 of 3 used.

## Raw log: full test suite

command: npm test
exit: 0
at: 2026-11-24T14:44:58Z


> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'


 RUN  v5.1.1 /home/dbueno/projects/rexiAI


 Test Files  107 passed (107)
      Tests  674 passed | 1 skipped (675)
   Start at  15:44:59
   Duration  16.45s (environment 64%, tests 19%, setup 9%, import 4%, transform 2%, worker 1%)

Environment  jsdom was created 107 times · 98.87s total, 64% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments


---

# Re-verification — attempt 2, phase 1

Scope: previously failing gate `traceability` (AC-022-03) re-run, PLUS full gates re-run because Task 6 (script complexity refactor, AC-022-06-01..08) changed production scripts. Env: SPEC_LOOP_COUNT=1, SPEC_PHASE1_RETRIES=1, SPEC_PHASE2_RETRIES=0. Attempt 1 results stand as history above; this section is the delta.

## Evidence: scenario traceability

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-11-24T15:04:07Z

{
  "checks": [1, 2],
  "passes": ["AC-022-01 — traced to a test", "AC-022-02 — traced to a test", "AC-022-03 — traced to a test", "AC-022-04 — traced to a test", "AC-022-05 — traced to a test", "AC-022-06 — traced to a test"],
  "fails": []
}

Delta vs attempt 1: AC-022-03 now traced (src/__tests__/AC-022-landing-copy.test.ts:172/187/210 — AC-022-03-01/02/03). Gate cleared.

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-11-24T15:04:08Z
Test-run hash: 75cc35accded333df319c6b467d17b69666fcbadde8c3ec89a0cfc1be00c1df2

SUMMARY: mode=run exit=0 signal=0 log_lines=17 log=/tmp/opencode/p/022-verifier-suite.log
      Tests  754 passed | 1 skipped (755)
full log: §Raw log: full test suite (attempt 2)

Pre-run hash = post-run hash (tree unchanged during run).
Skipped test note (flagged to Architect): the 1 skip is a pre-existing environment-gated test outside this spec — `describe.skipIf(!LIVE)` (src/__tests__/AC-006-bot-adapter.test.ts:705, live Jitsi/PulseAudio) or `it.skipIf(!hasFfmpeg)` (src/__tests__/AC-006-recording-output.test.ts:128). Same count as attempt 1; no AC-022 test is skipped (grep for skip/todo/only in AC-022-06-*.test.ts: none as modifiers).

Additional project gates (same tree):
- `npx eslint .` → exit 0, "✖ 14 problems (0 errors, 14 warnings)"
- `npm run build` (tsc -b && vite build) → exit 0, "✓ built in 199ms"
- `npm run format:check` → exit 0, "All matched files use Prettier code style!"
- AC-022-06-06 `node --check` on the 8 modified scripts → each exit 0: scripts/dev-api-server.mjs, scripts/m365-consent.mjs, scripts/recording-bot.mjs, scripts/recording/billing.mjs, scripts/recording/bot/capture.mjs, scripts/recording/bot/pulse.mjs, scripts/recording/bot/session.mjs, scripts/test-billing-chain.mjs
- E2E: `REXI_E2E_SITE_URL=http://localhost:4173 node tests/e2e/landing.e2e.ts` against `vite preview --port 4173` of the fresh build, at 2026-11-24T15:06:05Z → exit 0, 33 "ok:" lines, 0 fail lines, last line "AC-020-23…27 PASSED".

## Evidence: complexity gate

command: npx eslint --no-config-lookup --rule '{"complexity":["error",6]}' --parser-options=ecmaVersion:latest,sourceType:module scripts tests
exit: 0
at: 2026-11-24T15:05:00Z

(no output — 0 problems; -f json confirms 25 files linted: all scripts/**/*.mjs incl. the 8 Task-6 files, plus tests/e2e/auto-record-lib.mjs)

command: npx eslint -c /tmp/opencode/p/cx.cjs scripts tests src   (ad-hoc config: files **/*.{mjs,js,ts}, typescript-eslint parser, only rule complexity:[error,6])
exit: 0 (json formatter)
at: 2026-11-24T15:05:09Z

184 files; messages:3
src/__tests__/AC-004-issue-delivery.test.ts:136 null Unused eslint-disable directive (no problems were reported from 'no-console').
src/components/booking/hooks/useAvailability.ts:1 react-hooks/set-state-in-effect Definition for rule 'react-hooks/set-state-in-effect' was not found.
src/domain/stripeClient.ts:11 @typescript-eslint/no-explicit-any Definition for rule '@typescript-eslint/no-explicit-any' was not found.
→ 0 `complexity` messages across scripts/, tests/, src/ (the 3 messages are artifacts of the ad-hoc config not loading those plugins).

command: grep -rn 'eslint-disable' scripts tests | grep -i complex
exit: 1 (no match — no complexity disable comments)

**Divergence finding (AC-022-06-05 vs reality):** `npx eslint --print-config scripts/recording-bot.mjs | grep -c complexity` → 0. The repo `eslint.config.cjs` applies `complexity: ['error', 6]` only to `files: ['**/*.{js,jsx,ts,tsx}']`; the `**/*.mjs` block sets globals and `no-console` only. So the scenario's literal command `npx eslint scripts tests` with the unchanged config reports 0 complexity errors *vacuously* for .mjs — it would have reported 0 before the refactor too. Task 6's premise "(eslint complexity 6, from eslint.config.cjs)" is therefore inaccurate for .mjs files. The scenario's postcondition is nonetheless met in substance: with the rule explicitly applied (ad-hoc runs above), 0 complexity errors (attempt 1 recorded 11 pre-existing errors in scripts/*.mjs with the same ad-hoc rule; now 0). Not a gate failure (gate exit 0). Routing: **out-of-scope follow-up — human/Specifier**: extend the complexity rule to `**/*.mjs` in eslint.config.cjs (config change is off-limits to agents per Stop-and-Ask matrix; propose follow-up spec) and correct AC-022-06-05 wording so the gate is not vacuous.

## Evidence: design-principles gate

command: .standards/scripts/check-code-principles.sh --json
exit: 0
at: 2026-11-24T15:05:20Z

{"tier": "mvp", "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests", "comments", "naming", "null-discipline"], "fails": [], "warns": [222 entries]}

fails: [] — WARN lines verbatim for repo files (the remaining warns are under ./.standards/, not this repo's code). None touches the 8 Task-6 scripts or the AC-022-* tests:
Method body >20 lines (node): ./src/pages/Privacy.tsx:10:52:SectionView:KISS_LINES=43
Method body >20 lines (node): ./src/pages/Privacy.tsx:54:102:Privacy:KISS_LINES=42
Method body >20 lines (node): ./api/stripe-webhook.ts:143:165:getRawBookingFields:KISS_LINES=24
Method body >20 lines (node): ./api/bookings/checkout.ts:38:63:buildSessionParams:KISS_LINES=27
Method body >20 lines (node): ./api/bookings/recorded-billing.ts:218:240:?:KISS_LINES=24
Method body >20 lines (python): ./scripts/recording/whisper_transcribe.py:37:64:main:KISS_LINES=23 [approximate heuristic — comprehension/decorator forms can inflate the count; ADR 0006 warn phase]
Possible duplication (5x identical 4-line block, first at ./api/stripe-webhook.ts:294): startTime: string /hours: number /joinUrl?: string | null /date: string
Possible duplication (5x identical 4-line block, first at ./api/_lib/bookingsTypes.ts:16): date: string /startTime: string /hours: number /email: string
Possible duplication (4x identical 4-line block, first at ./api/_lib/bookingsValidation.ts:131): name: string /date: string /startTime: string /email: string
Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:118): startTime: string /hours: number /amountTotal: number /date: string
Possible duplication (3x identical 4-line block, first at ./api/_lib/bookingsValidation.ts:172): date: string /startTime: string /hours: number /name: string
Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:463): date: string /startTime: string /hours: number /bookingId: string
Possible duplication (2x identical 4-line block, first at ./src/content/privacy.ts:143): }, /}, /id: 'transferencias', /],
Possible duplication (2x identical 4-line block, first at ./src/content/privacy.ts:104): }, /}, /id: 'grabacion', /],
SRP: possible god file (node) — ./api/stripe-webhook.ts: 627 lines, 8 methods (split by responsibility)
LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)
Comments: commented-out code (./src/__tests__/AC-006-bot-adapter.test.ts:10)
Comments: section-divider comment (./src/__tests__/AC-006-bot-adapter.test.ts:513)
Comments: section-divider comment (./src/__tests__/AC-006-bot-adapter.test.ts:524)
Comments: TODO/FIXME without an issue reference (./src/domain/pricing.ts:10)
Comments: TODO/FIXME without an issue reference (./api/stripe-webhook.ts:338)
Comments: commented-out code (./api/_lib/rescheduleSubmit.ts:6)
Comments: comment restates the following line (./session-start-check.sh:25)
Comments: comment restates the following line (./session-start-check.sh:43)
Comments: comment restates the following line (./session-end-check.sh:14)
Comments: comment restates the following line (./session-end-check.sh:38)
Comments: commented-out code (./deploy/home/install-recording-host.sh:8)
Naming: single-character identifier (b) (./api/_lib/bookingsValidation.ts:138)
Naming: single-character identifier (e) (./api/_lib/errorText.ts:8)
Naming: more than three parameters (moveOrFail) (./api/_lib/rescheduleSubmit.ts:212)
Naming: more than three parameters (completeMove) (./api/_lib/rescheduleSubmit.ts:254)
Naming: more than three parameters (filterSlotsByBusy) (./api/availability.ts:92)
Naming: more than three parameters (reserve) (./api/bookings.ts:86)
Naming: more than three parameters (reserve) (./api/bookings.ts:119)
Naming: single-character identifier (d) (./api/bookings/calendar.ts:36)
Naming: single-character identifier (s) (./api/bookings/calendar.ts:59)
Naming: single-character identifier (e) (./api/bookings/calendar.ts:60)
Naming: single-character identifier (h) (./api/bookings/checkout.ts:18)
Naming: single-character identifier (p) (./api/bookings/checkout.ts:20)
Naming: more than three parameters (createCalendarSideEffect) (./api/bookings/direct.ts:151)
Naming: more than three parameters (failStatic) (./api/bookings/direct.ts:153)
Naming: more than three parameters (failStatic) (./api/bookings/direct.ts:162)
Naming: single-character identifier (h) (./api/bookings/recorded-billing.ts:56)
Naming: single-character identifier (p) (./api/bookings/recorded-billing.ts:58)
Naming: single-character identifier (b) (./api/bookings/recorded-billing.ts:69)
Naming: more than three parameters (handlePaidCheckout) (./api/bookings/recorded-billing.ts:343)
Naming: more than three parameters (handleCheckoutResult) (./api/bookings/recorded-billing.ts:377)
Naming: single-character identifier (v) (./api/stripe-webhook.ts:81)
Naming: single-character identifier (e) (./api/stripe-webhook.ts:92)
Naming: single-character identifier (a) (./api/stripe-webhook.ts:98)
Naming: noise word in type name (BookingData) (./api/stripe-webhook.ts:113)
Naming: single-character identifier (v) (./api/stripe-webhook.ts:168)
Naming: single-character identifier (v) (./api/stripe-webhook.ts:174)
Naming: single-character identifier (d) (./api/stripe-webhook.ts:401)
Naming: single-character identifier (d) (./api/stripe-webhook.ts:494)
Naming: more than three parameters (dump) (./scripts/recording/whisper_transcribe.py:60)
Naming: single-character identifier (e) (./src/components/booking/form/validateBookingForm.ts:49)
Naming: more than three parameters (handleBookingResponse) (./src/components/booking/hooks/useBookingSubmit.ts:90)
Naming: single-character identifier (v) (./src/components/booking/hooks/useBookingSubmit.ts:101)
Naming: single-character identifier (m) (./src/domain/availability.ts:20)
Naming: single-character identifier (h) (./src/domain/availability.ts:22)
Naming: single-character identifier (h) (./src/domain/availability.ts:28)
Naming: single-character identifier (m) (./src/domain/availability.ts:29)
Naming: single-character identifier (p) (./src/domain/availability.ts:297)
Naming: single-character identifier (s) (./src/domain/availability.ts:305)
Naming: single-character identifier (e) (./src/domain/availability.ts:306)
Naming: single-character identifier (d) (./src/domain/availability.ts:317)
Naming: single-character identifier (p) (./src/domain/availability.ts:379)
Naming: single-character identifier (n) (./src/domain/bookingLookup.ts:33)
Naming: single-character identifier (v) (./src/domain/bookingLookup.ts:39)
Naming: more than three parameters (postResendEmail) (./src/domain/email.ts:161)
Naming: more than three parameters (clientModel) (./src/domain/emailDirect.ts:336)
Naming: single-character identifier (e) (./src/domain/freeHour.ts:52)
Naming: single-character identifier (e) (./src/domain/freeHour.ts:89)
Naming: single-character identifier (p) (./src/domain/graphEventProperties.ts:66)
Naming: single-character identifier (d) (./src/domain/microsoftGraph.ts:75)
Naming: single-character identifier (n) (./src/domain/rateLimit.ts:36)
Naming: single-character identifier (y) (./src/domain/time.ts:37)
Naming: single-character identifier (d) (./src/domain/time.ts:39)
Naming: single-character identifier (h) (./src/domain/time.ts:40)
Naming: single-character identifier (s) (./src/domain/time.ts:42)
Naming: single-character identifier (e) (./src/domain/time.ts:77)
Naming: more than three parameters (UTC) (./src/domain/time.ts:104)
Naming: single-character identifier (d) (./src/domain/validation.ts:22)
Naming: single-character identifier (e) (./src/domain/webhookDedup.ts:81)
Null-discipline: return null (./src/pages/ResultViews.tsx:8)
Null-discipline: return null (./src/domain/reschedule.ts:67)
Null-discipline: return null (./src/domain/reschedule.ts:93)
Null-discipline: return null (./src/domain/availability.ts:21)
Null-discipline: return null (./src/domain/availability.ts:141)
Null-discipline: return null (./src/domain/pricing.ts:27)
Null-discipline: return null (./src/domain/pricing.ts:54)
Null-discipline: return null (./src/domain/graphEventProperties.ts:67)
Null-discipline: return null (./src/domain/graphEventProperties.ts:68)
Null-discipline: return null (./src/domain/graphEventProperties.ts:126)
Null-discipline: return null (./src/domain/graphEventProperties.ts:129)
Null-discipline: return null (./src/domain/graphEventProperties.ts:149)
Null-discipline: return null (./src/domain/meetingUrl.ts:25)
Null-discipline: return null (./src/domain/meetingUrl.ts:30)
Null-discipline: return null (./src/domain/meetingUrl.ts:33)
Null-discipline: return null (./src/domain/meetingUrl.ts:52)
Null-discipline: return null (./src/domain/meetingDuration.ts:15)
Null-discipline: return null (./src/domain/rescheduleUrl.ts:25)
Null-discipline: return null (./src/domain/rescheduleUrl.ts:27)
Null-discipline: return null (./src/domain/microsoftGraph.ts:86)
Null-discipline: return null (./src/domain/microsoftGraph.ts:95)
Null-discipline: return null (./src/domain/microsoftGraph.ts:97)
Null-discipline: return null (./src/domain/microsoftGraph.ts:282)
Null-discipline: return null (./src/domain/microsoftGraph.ts:290)
Null-discipline: return null (./src/domain/microsoftGraph.ts:343)
Null-discipline: return null (./src/domain/bookingLookup.ts:32)
Null-discipline: return null (./src/domain/bookingLookup.ts:34)
Null-discipline: return null (./src/domain/bookingLookup.ts:48)
Null-discipline: return null (./src/domain/bookingLookup.ts:73)
Null-discipline: return null (./src/domain/bookingLookup.ts:76)
Null-discipline: return null (./src/domain/microsoftAuth.ts:31)
Null-discipline: return null (./src/domain/microsoftAuth.ts:32)
Null-discipline: return null (./src/i18n/I18nContext.tsx:11)
Null-discipline: return null (./src/i18n/I18nContext.tsx:16)
Null-discipline: return null (./src/i18n/I18nContext.tsx:25)
Null-discipline: null argument (./src/components/booking/hooks/useBookingFields.ts:18)
Null-discipline: return null (./src/components/booking/fields/SlotField.tsx:72)
Null-discipline: null argument (./src/components/booking/BookingConfirmation.tsx:25)
Null-discipline: return null (./api/stripe-webhook.ts:67)
Null-discipline: return null (./api/stripe-webhook.ts:70)
Null-discipline: return null (./api/stripe-webhook.ts:76)
Null-discipline: return null (./api/stripe-webhook.ts:110)
Null-discipline: return null (./api/stripe-webhook.ts:236)
Null-discipline: return null (./api/stripe-webhook.ts:476)
Null-discipline: return null (./api/stripe-webhook.ts:580)
Null-discipline: return null (./api/availability.ts:56)
Null-discipline: return null (./api/availability.ts:62)
Null-discipline: return null (./api/availability.ts:66)
Null-discipline: return null (./api/availability.ts:78)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:76)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:81)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:87)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:179)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:181)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:191)
Null-discipline: return null (./api/_lib/bookingsValidation.ts:192)
Null-discipline: return null (./api/_lib/rescheduleSubmit.ts:58)
Null-discipline: return null (./api/_lib/rescheduleSubmit.ts:200)
Null-discipline: return null (./api/_lib/rescheduleSubmit.ts:242)
Null-discipline: return null (./api/_lib/rescheduleBooking.ts:26)
Null-discipline: return null (./api/bookings.ts:78)
Null-discipline: return null (./api/bookings.ts:79)
Null-discipline: return null (./api/bookings.ts:81)
Null-discipline: return null (./api/bookings.ts:82)
Null-discipline: return null (./api/bookings/config.ts:14)
Null-discipline: return null (./api/bookings/checkout.ts:12)
Null-discipline: return null (./api/bookings/checkout.ts:73)
Null-discipline: return null (./api/bookings/checkout.ts:79)
Null-discipline: return null (./api/bookings/checkout.ts:101)
Null-discipline: return null (./api/bookings/checkout.ts:102)
Null-discipline: return null (./api/bookings/recorded-billing.ts:99)
Null-discipline: return null (./api/bookings/recorded-billing.ts:127)
Null-discipline: return null (./api/bookings/recorded-billing.ts:136)
Null-discipline: return null (./api/bookings/recorded-billing.ts:152)
Null-discipline: return null (./api/bookings/recorded-billing.ts:154)
Null-discipline: return null (./api/bookings/recorded-billing.ts:263)

## Evidence: scenario-to-behavior spot check

command: manual read of src/__tests__/AC-022-landing-copy.test.ts:172-218, src/__tests__/AC-022-06-parse-args.test.ts, src/__tests__/landing-harness.ts imports; plus characterization-before-refactor replay: git worktree add --detach /tmp/opencode/wt022 HEAD; cp src/__tests__/AC-022-06-*.test.ts into it; sed add `export` to runWatch (the only allowed non-behavioral script edit); npx vitest run src/__tests__/AC-022-06
exit: 0
at: 2026-11-24T15:05:55Z

Replay against UNREFACTORED scripts (HEAD + export only):
 Test Files  9 passed (9)
      Tests  77 passed (77)
Same 9 files pass unchanged against the refactored tree (full suite above). Since the identical test files pin both versions, no characterization assertion was edited/weakened to fit the refactor (AC-022-06-01, -07). expect() counts per file: billing-chain 20, billing-reservation 10, dev-api-server 16, m365-consent 35, parse-args 26, pulse-sink 12, record-room 16, run-watch 19, session 21. No .skip/.todo/.only; no toBeTruthy/toBeDefined/expect.anything weak matchers.

Spot checks:
- AC-022-03-03 (Given AC-020-19 guard; When ES answer has unlisted € amount; Then fails): test uses the SAME `amounts`/`ALLOWED_AMOUNTS` exported from landing-harness.ts that AC-020-faq.test.ts:63-64 uses; asserts '250\u00A0€' is extracted and rejected, and listed amounts pass. Matches.
- AC-022-03-01: asserts each of AC-020-14/19/25 (unit + tests/e2e/landing.e2e.ts), AC-019-15/16, AC-011-03 present in its original file. Matches.
- AC-022-06-02 (no args, each flag, unknown flag, missing value): parse-args test covers [], unknown first flag, --run with/without room, --watch options, --finalize positional + room required, --decide/--missed positional, unknown/missing-value → usage, repeated option last-wins. Matches.

Semantic-equivalence review of each Task-6 refactor (read vs `git diff scripts/`):
- dev-api-server `respondUnrouted`: verbatim move; same 302 to SPA_PORT||5173 for non-/api, same 404 JSON body. Equivalent.
- m365-consent `exchangeAndReport`: verbatim move of try/catch incl. process.exit(0/1); awaited at same position after server.close(). Equivalent.
- recording-bot `parseArgs`: removed `if (mode === 'run' && !parsed.room)` in the positional path — unreachable: VALUE_MODES = { finalize, decide, missed } (scripts/recording-bot.mjs:65) never contains 'run'. Equivalent.
- recording-bot `runWatch`/`startNewWindows`: loop body moved verbatim; `export` added (allowed by Task 6). Equivalent.
- billing `reservationFields` `text`: `text(a || b)` ≡ `a || b || ''`. Equivalent.
- capture `recordRoom` `resolveSinkFns`: `unloadSink` now resolved before the session instead of in finally. Differs only if the caller mutates `deps.unloadSink` mid-session — no caller does. Effectively equivalent; the default (non-injected) side of each `||` is untested (see remaining risk).
- pulse `parseModuleId`: verbatim extraction, same throw text. Equivalent.
- session `nextStep`/`graceStep`: `belowSinceMs ?? nowMs` ≡ `=== null || === undefined ? nowMs : belowSinceMs`. Equivalent.
- session `runSession`/`sessionSettings`: default only when `=== undefined`, same as destructuring defaults; null/0 kept as-is in both. Same defaults/constants. Equivalent.
- test-billing-chain `isBillingRequest`: `!(POST && path===X)` ≡ old `!POST || path!==X` (De Morgan). `readJsonBody`: body read loop outside try as before, parse errors → {} as before. `recordingInSession`: early-return form of the same nested ifs; null → continue scanning. Equivalent.
- AC-022-06-08: no flag names, defaults, output strings, exit codes, HTTP routes/status codes changed in the diff.

## Finding: no unaccounted behavior (attempt 2)

Task-6 diff (8 scripts) is pure extraction/reshaping traced to Task 6; the one surface change (`export runWatch`) is explicitly permitted. New tests AC-022-03-* and AC-022-06-* trace to their scenarios. No unaccounted logic.

## Remaining risk (folded from .task6-untestable.md, Coder scratch — deleted after folding)

All 11 Task-6 target functions are pinned by src/__tests__/AC-022-06-*.test.* against the unrefactored code (confirmed by the replay above). No function is wholly untestable. Residual gaps needing real external I/O, deliberately not mocked:
1. `recordRoom` (scripts/recording/bot/capture.mjs) — the `deps.X || X` fall-through for the real ensurePulseServer, loadSink, joinRoom, runSession, unloadSink. Tests inject all five fakes, so only the injected side of each `||` runs; the default side needs a real PulseAudio + Chrome/Jitsi session. Reviewed by reading: defaults wired unchanged (resolveSinkFns maps each to its module function).
2. `scripts/test-billing-chain.mjs` Stripe path — findRecordingForRoom and the request handler are pinned, but everything after the "Refusing: STRIPE_SECRET_KEY is not sk_test" guard (real Stripe test-mode customers/checkout, spawning process-recording.mjs, server.listen) is untested; needs real Stripe test credentials. Likewise the real Microsoft token endpoint in m365-consent.mjs is stubbed via global fetch.
Harness coupling: tests importing action-on-import scripts (test-billing-chain, m365-consent, dev-api-server) mock node:http / API handlers and process.exit, and capture whatever is passed to http.createServer — they depend on those scripts keeping a module-level createServer(handler) call.

## Verdict — attempt 2, phase 1: **PASS**

Every gate ran; traceability exit 0, test suite exit 0, complexity linter exit 0 (0 complexity findings), design-principles exit 0 (fails: []), spot checks match. Previously failing gate `traceability` (AC-022-03) cleared at attempt 2 of phase 1.
Flagged to Architect (non-blocking): (a) AC-022-06-05 is vacuous under the unchanged eslint.config.cjs for .mjs — route as follow-up spec to human/Specifier (config change off-limits); (b) 1 pre-existing env-gated skipped AC-006 test; (c) design-principles WARNs above; (d) remaining risk section.
Phase-1 budget: 2 of 3 attempts used; BLOCK resolved at attempt 2.

## Raw log: full test suite (attempt 2)

command: npm test
exit: 0
at: 2026-11-24T15:04:08Z


> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'


 RUN  v5.1.1 /home/dbueno/projects/rexiAI


 Test Files  116 passed (116)
      Tests  754 passed | 1 skipped (755)
   Start at  16:04:09
   Duration  17.80s (environment 65%, tests 19%, setup 9%, import 4%, transform 2%, worker 1%)

Environment  jsdom was created 116 times · 108.22s total, 65% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments


---

# Re-verification — attempt 3 (scope addition), phase 1 — NOT a remediation cycle

Trigger: owner-authorized scope addition after the attempt-2 PASS — `eslint.config.cjs` `**/*.mjs` block gains `complexity: ['error', 6]`; AC-022-06-05 reworded; AC-022-06-09 added; new test src/__tests__/AC-022-06-complexity-gate.test.ts (5 tests). Not a BLOCK; phase-1 remediation counter unchanged (2 of 3 used). Env: SPEC_LOOP_COUNT=1, SPEC_PHASE1_RETRIES=1, SPEC_PHASE2_RETRIES=0.

Config change confirmation: `git diff eslint.config.cjs` → 3 insertions only (2 comment lines + `complexity: ['error', 6],` inside the `files: ['**/*.mjs']` block rules). No other rule, threshold, or block changed; `git diff --stat` over *.cjs/*.json/prettier/tsconfig/vite config shows only `eslint.config.cjs | 3 +++`. `npx eslint --print-config scripts/recording-bot.mjs` → rules.complexity = [2,6].

Scratch file: `specs/022-landing-copy-currency-receptionist/.task6-untestable.md` absent (`ls -a` confirms); content was folded into the attempt-2 "Remaining risk" section.

## Evidence: scenario traceability

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-11-24T15:49:43Z

{
  "checks": [1, 2],
  "passes": ["AC-022-01 — traced to a test", "AC-022-02 — traced to a test", "AC-022-03 — traced to a test", "AC-022-04 — traced to a test", "AC-022-05 — traced to a test", "AC-022-06 — traced to a test"],
  "fails": []
}

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-11-24T15:49:44Z
Test-run hash: 23d77ae7bfcd7cd3f67c11a329f14c4b5ab46f505d9fa8c562c2758a1c2c455d

SUMMARY: mode=run exit=0 signal=0 log_lines=17 log=/tmp/opencode/p/022-v3-suite.log
 Test Files  117 passed (117)
      Tests  759 passed | 1 skipped (760)
full log: §Raw log: full test suite (attempt 3)

Pre-run hash = post-run hash. +5 tests vs attempt 2 = the 5 new AC-022-06-05/09 tests (isolated run `npx vitest run src/__tests__/AC-022-06-complexity-gate.test.ts` → Tests 5 passed (5)). The 1 skip is the same pre-existing env-gated AC-006 test flagged in attempt 2.

Other project gates:
- `npm run build` → exit 0, "✓ built in 176ms"
- `npm run format:check` → exit 0, "All matched files use Prettier code style!"
- E2E: `REXI_E2E_SITE_URL=http://localhost:4173 node tests/e2e/landing.e2e.ts` vs `vite preview --port 4173`, at 2026-11-24T15:50:42Z → exit 0, 33 "ok:" lines, 0 fail lines, "AC-020-23…27 PASSED".

## Evidence: complexity gate

command: npx eslint scripts tests -f json   (real repo config, no overrides)
exit: 0
at: 2026-11-24T15:50:05Z

31 files; complexity:0 errors(sev2):0

command: npx eslint . -f json   (repo-wide, real config)
exit: 0
at: 2026-11-24T15:50:08Z

251 files; complexity:0 errors:0 warnings:14

Independent non-vacuity probe (real config, stdin, nothing written to the repo):
command: printf '<function, 1 + six ifs>' | npx eslint --stdin --stdin-filename scripts/probe.mjs
exit: 1
at: 2026-11-24T15:50:40Z

/home/dbueno/projects/rexiAI/scripts/probe.mjs
  1:8  error  Function 'p' has a complexity of 7. Maximum allowed is 6  complexity

✖ 1 problem (1 error, 0 warnings)

command: same with five ifs (complexity 6)
exit: 0
→ the gate is live for .mjs at exactly the 6/7 boundary; the attempt-2 divergence finding (AC-022-06-05 vacuous for .mjs) is resolved.

## Evidence: design-principles gate

command: .standards/scripts/check-code-principles.sh --json
exit: 0
at: 2026-11-24T15:50:22Z

{"tier": "mvp", "gates": [...9 gates...], "fails": [], "warns": [222 entries]}
fails: [] — WARN count unchanged from attempt 2 (222); no WARN in scripts/*.mjs, eslint.config.cjs, or AC-022-06-* tests. Repo WARN lines are the same set recorded verbatim in attempt 2.

## Evidence: scenario-to-behavior spot check

command: read src/__tests__/AC-022-06-complexity-gate.test.ts against AC-022-06-05 and AC-022-06-09 Given/When/Then; npx vitest run src/__tests__/AC-022-06-complexity-gate.test.ts
exit: 0
at: 2026-11-24T15:49:44Z

- AC-022-06-05 (Given **/*.mjs block sets complexity ['error',6], no disable comments; When `npx eslint scripts tests`; Then exit 0, 0 complexity errors): test 1 asserts exactly one `**/*.mjs` block with rules.complexity toEqual ['error', 6]; test 2 walks scripts/ + tests/ (asserts >10 files, so not empty) and expects no `eslint-disable…complexity`; test 3 spawns the literal `npx eslint scripts tests --format json`, asserts 0 complexity severity-2 messages and status 0. Matches; now non-vacuous because test 1 + the probe pin that the rule applies to .mjs.
- AC-022-06-09 (Given complexity-7 probe.mjs; When lintText with repo config via ESLint Node API; Then exactly one complexity message, severity 2): test 4 uses `new ESLint({ cwd: root, overrideConfigFile: eslint.config.cjs })`, `lintText(PROBE_SOURCE, { filePath: scripts/probe.mjs })` (no file written), asserts length 1, severity 2, message /complexity of 7/. Probe = 1 + six `if` = 7, confirmed by my independent stdin run. Test 5 control: same source minus one `if` (= 6) → 0 complexity messages, so the probe cannot pass on a rule that fires for everything. No eslint-disable in the test. Matches.

## Finding: no unaccounted behavior (attempt 3)

Delta = 3-line config change (owner-authorized, traced to AC-022-06-05/09), spec text, and one new test file traced to AC-022-06-05/09. No production-code change; nothing unaccounted.

## Verdict — attempt 3 (scope addition), phase 1: **PASS**

All gates exit 0: traceability, suite (759 passed / 1 pre-existing env-gated skip), complexity (real config: 0 complexity errors on scripts+tests and repo-wide; probe proves the gate is live), design-principles (fails []), spot checks match. Attempt-2 flag (a) resolved. Still flagged to Architect (non-blocking): pre-existing env-gated AC-006 skip; design-principles WARNs; attempt-2 remaining-risk section. Phase-1 remediation budget unchanged: 2 of 3 (this run is a scope addition, not a remediation cycle).

## Raw log: full test suite (attempt 3)

command: npm test
exit: 0
at: 2026-11-24T15:49:44Z


> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'


 RUN  v5.1.1 /home/dbueno/projects/rexiAI


 Test Files  117 passed (117)
      Tests  759 passed | 1 skipped (760)
   Start at  16:49:44
   Duration  17.02s (environment 65%, tests 19%, setup 9%, import 5%, transform 1%, worker 1%)

Environment  jsdom was created 117 times · 103.81s total, 65% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments


## Post-PR CI check — round 1, phase 2

PR: https://github.com/RexiAI/rexiAI/pull/119 — head SHA `1dd4a900b75aa0b32983a2f080f5b30846a93ebf` (matches local HEAD). Pending checks polled to terminal with `gh pr checks 119 --watch --interval 20` (exit 0).

## Evidence: post-PR CI check

command: gh pr checks 119 --json name,state,bucket,workflow,link
exit: 0
at: 2026-11-24T15:54:52Z

[{"bucket":"skipping","link":"https://github.com/RexiAI/rexiAI/actions/runs/45430693814/job/138575206785","name":"Docker Build & Push","state":"SKIPPED","workflow":"CI"},{"bucket":"pass","link":"https://vercel.com/github","name":"Vercel Preview Comments","state":"SUCCESS","workflow":""},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/45430693814/job/138574872320","name":"Lint & Format","state":"SUCCESS","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/45430693814/job/138574872014","name":"Build","state":"SUCCESS","workflow":"CI"},{"bucket":"pass","link":"https://github.com/RexiAI/rexiAI/actions/runs/45430693814/job/138574871976","name":"Unit Tests","state":"SUCCESS","workflow":"CI"},{"bucket":"pass","link":"https://vercel.com/danielbueno76-4270s-projects/rexi-ai/8kBTXCxAQaVCJ5wem9WxMLKgwCw2","name":"Vercel","state":"SUCCESS","workflow":""}]

| Check | Bucket | Result |
|---|---|---|
| Lint & Format (CI) | pass | PASS |
| Build (CI) | pass | PASS |
| Unit Tests (CI) | pass | PASS |
| Vercel | pass | PASS |
| Vercel Preview Comments | pass | PASS |
| Docker Build & Push (CI) | skipping | SKIPPED — not a pass, not a fail (job conditional, push-to-main only) |

Failing check IDs: none. Last log excerpt: n/a (no `conclusion == "failure"` runs). Routing: none required.

PR body vs `.github/PULL_REQUEST_TEMPLATE.md` (report only, not edited): template headings `What changed / Why / How to verify / Dependencies / Checklist`; PR body has `What changed / Why / How to verify / Honest notes` — **missing `## Dependencies` and `## Checklist`**; extra `## Honest notes`.

## Verdict — post-PR CI round 1, phase 2: **PASS**

Phase-2 budget used: 0 of 3.

## Quality gates

# 30-report — spec 022 landing-copy-currency-receptionist

Pipeline mode: full. Autopilot: false.

## Verdict rows

- Verifier's verdict (carried forward): PASS (25-verification.md, attempt 3, phase 1).
- Mutation score: **skipped — no tier declared on this branch (default `mvp`); Stryker not configured here.**
- Complexity summary (carried from Refactorer/Verifier): 0 complexity errors at limit 6 on changed files, on scripts + tests, and repo-wide; the 11 prior errors in scripts/*.mjs were refactored away. The eslint `**/*.mjs` block now sets `complexity: ['error', 6]` (owner scope addition), pinned by AC-022-06-05/09 with a 6/7 boundary probe.
- Equivalent mutants: none (no mutation run).
- Design-principles gate: fails [] (222 pre-existing WARNs, unchanged).

## Mutation: skipped, reason

Tier: no tier declared on this branch cut from main, so default `mvp`. Mutation is a `production`-tier gate. In addition: `stryker.config.json`, `scripts/run-mutation.sh` and `AGENTS_REXIAI.md` (spec 021, PR #118, still open) are absent. `@stryker-mutator/*` packages sit in node_modules but are not in package.json and have no config. The brief says not to install dependencies or add config in this spec, and ADR 0028 forbids running Stryker directly.

## Evidence: final test status

command: npm test (via .standards/scripts/agent-test-summary.sh --run /tmp/opencode/t022.log)
exit: 0
at: 2026-11-24T15:51:55Z
Test-run hash: 23d77ae7bfcd7cd3f67c11a329f14c4b5ab46f505d9fa8c562c2758a1c2c455d

`test-run-reuse.sh --check` returned `RERUN hash-mismatch`, because the check compares against the earlier attempt-1/2 record. The suite was therefore re-run. The post-run hash equals the Verifier's attempt-3 hash, so the tree is unchanged. Result matches the Verifier: 759 passed / 1 pre-existing env-gated skip (AC-006 live Jitsi/ffmpeg).

## Remediation record

- Phase 1: Verifier BLOCK at attempt 1 (traceability, AC-022-03 untraced). Fixed in cycle 1 and resolved at attempt 2 (PASS). Budget used: 2 of 3.
- Attempt 3 was an owner-authorized scope addition, not a remediation cycle: Task 6 (refactor of the 11 scripts/*.mjs) and the eslint `.mjs` complexity rule with AC-022-06-05/09 and a new test. The counter is unchanged.
- Phase 2: not started (no PR opened). Phase 3: not applicable.

## Remaining risk

- Mutation testing never ran, so test strength for Services.tsx and the refactored scripts/*.mjs is unmeasured.
- The real-service paths of the refactored scripts are untested: live Jitsi/PulseAudio recording bot, M365 consent, billing chain against real services, dev API server. Only the env-gated AC-006 test touches them, and it was skipped. See the "Remaining risk" section of 25-verification.md.
- The 222 design-principles WARNs and the AC-006 skip are pre-existing and flagged to the Architect.

PR: https://github.com/RexiAI/rexiAI/pull/119 (6 task commits + 1 docs commit)

## 15-design.md

# Design Spec: 022-landing-copy-currency-receptionist

Scope: frontend tasks 1, 2, 5 (layout fix, euro copy, 4th example row). Tasks 3, 4 are test/content-only (out of scope). Inherits all global tokens and theme from spec 020 (`docs/changes/020-neighborhood-business-landing.md`); nothing new is introduced.

## Design Read
Small bugfix on an existing warm neighborhood-business landing: repair text alignment in before→after rows, keep the visual language untouched.

## Dial Values
- DESIGN_VARIANCE: 2 — fix only, keep the existing layout family.
- MOTION_INTENSITY: 1 — static; no motion added or changed.
- VISUAL_DENSITY: 4 — a 4th row is added to the existing 3-up grid at the same density.

## Design System / Foundation
Existing spec-020 stylesheet (`src/App.css`) and its CSS variables. No install, no new dependency.

## Global Tokens
Unchanged from spec 020: existing font, accent, neutral base, corner radius, theme and icon set. Use only existing `var(--…)` tokens; no new hex or px literals except the cell's label column width, which must reuse the token or value already used by `.example-row__label` `min-width`.

## Design Laws

| Task | Law | Applies to | Concrete consequence | How a reviewer checks it |
|---|---|---|---|---|
| 1 | Gestalt (Proximity, Common Region) | label + text in a cell | Label and text sit in one cell as two boxes; the text block stays beside/below its own label, with a larger gap between cells than inside a cell | Visual check at 375 px and 1280 px, ES and EN: wrapped lines start at the same x as line 1 |
| 1 | Prägnanz | wrapped text | Hanging indent: text is a block box, so lines 2–3 align with line 1 | Computed style: the text element is block-level inside a grid/flex cell |
| 1 | Fitts's | any tappable element in the section | Existing 44×44 rules unchanged; the fix adds no new targets and shrinks none | Diff shows no change to 44px rules |
| 2 | Jakob's | prices | ES uses the Spanish convention `1.200 €`, EN keeps `$1,200` | Rendered text per locale |
| 2 | Gestalt (Proximity) | price figure | NBSP (U+00A0) between number and `€` (and before `€/mes`) so the symbol never orphans onto its own line | Narrow viewport: `€` is never alone at the start of a line |
| 5 | Miller's | examples list | 4 items per group, within chunk limits; the receptionist row is last, in the same markup and rhythm as the others | Count 4 rows, same structure |
| 5 | Serial Position | 4th row | Last position is acceptable; no extra emphasis | No special class on the new row |

**Deliberate violations:** none.

**Judged inapplicable:** Hick's (no new choices), Doherty (no interaction or async), Tesler's (no hidden complexity), Von Restorff (no accent added), Peak-End (not a flow).

## Per-Task Directives

### Task 1: Example rows wrap as an aligned block
- Layout: each `.example-row__cell` uses `display: grid` (or flex) with two boxes: label column (auto/fixed existing min-width) and `.example-row__text` as a block box in the remaining column. Same rule applies at the mobile 1-col layout and the `min-width: 641px` 3-col layout. No `@media` rule restores inline label+text flow.
- Components: existing `.example-row`, `.example-row__pair`, `.example-row__cell`, `.example-row__label`, new `.example-row__text` span/div.
- Typography: unchanged sizes and weights, via existing tokens.
- Motion: static.
- A11y: keep the visible `antes`/`después` (`before`/`after`) labels and the arrow exactly as they are; semantic markup is unchanged, and no `aria-hidden` on labels. Contrast is unchanged.
- Anti-patterns: `display: inline-block` label flowing with the text; `padding-left`/`text-indent` hacks with magic numbers; new inline `style=` props; `!important`.
- Watch items: check the longest ES string ("Aviso automático cuando algo se va a acabar.") at 320, 375, 641, 1024 px; the label column must not stretch the row; the arrow stays aligned.

### Task 2: Euros in ES
- Layout: none changed.
- Components: copy strings only (`es.ts`).
- Typography: unchanged.
- A11y: NBSP keeps the amount and symbol read as a unit; screen readers read it normally.
- Anti-patterns: a regular space before `€`; converting numbers; a third price; `$` surviving in ES.
- Watch items: price wraps at narrow widths (pricing card, FAQ, contact line): `€` must not orphan.

### Task 5: 4th example row (receptionist)
- Layout: the same row component, 4th in order; in the 3-col desktop layout confirm the grid still reads cleanly with 4 rows (rows stack vertically, each row has its three-column pair).
- Components: the existing example-row markup, no link, no icon or digit added.
- Typography: unchanged.
- Motion: static.
- A11y: same antes/después labels; plain text only.
- Anti-patterns: a special-case class, badge, link, price, client claim or metric on this row.
- Watch items: the long "after" text (~75 chars) wraps in 3+ lines in EN at 375 px; the hanging indent from Task 1 must hold.

## Out-of-scope tasks
- Task 3 (price tests), Task 4 (remove pensions-system from Proof: data/test only).

## 40-deploy.md

# 40-deploy — spec 022

Verdict: PASS
Phase-3 attempt: 1 of 3
Repo class: frontend (Vercel Git integration)
PR: https://github.com/RexiAI/rexiAI/pull/119
Head SHA: 1dd4a900b75aa0b32983a2f080f5b30846a93ebf
Deploy URL: https://rexi-2h7jqq6d6-danielbueno76-4270s-projects.vercel.app
Build: pass | Health: pass | E2E: pass

## Deployment identity
command: gh api repos/RexiAI/rexiAI/deployments?sha=<head>; deployments/8033083941 (.sha) ; statuses
exit: 0
at: 2026-11-24T15:55:00Z
Deployment 8033083941 (Preview) sha == PR head; status success; `Vercel` commit status success ("Deployment has completed").

## Health check
command: curl with protection bypass (secret masked: ***)
at: 2026-11-24T15:55:43Z
Unauthenticated: 302 (deployment protection). With bypass: 307 (cookie-set redirect), followed with -L: 200.

## E2E
command: REXI_E2E_SITE_URL="<url>/?x-vercel-protection-bypass=***&x-vercel-set-bypass-cookie=true" node tests/e2e/landing.e2e.ts
exit: 0
at: 2026-11-24T15:55:46Z
"AC-020-23…27 PASSED". AC-022-01 example rows: 4 rows, 0 misaligned at 1280px and 390px. ES shows "1.200 €" and "600 €", no $ / EUR / SaaS; EN shows "from $1,200", "from $600/month", no €. No pension text. 

No `vercel deploy` run. No VERCEL_TOKEN needed.

## 45-decisions.md

Condition: Pipeline mode for /home/dbueno/projects/rexiAI/specs/022-landing-copy-currency-receptionist
Options: lite, full
Chosen: full
Why: classifier: 13 named path(s) include 'RexiAI/pensions-system', outside docs/, specs/, *.md and scripts/
Reversibility: append a new entry with an explicit lite or full token
At: 2026-11-24T14:39:02Z

