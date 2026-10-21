# 25-verification.md — Spec 003: Booking communications polish under disabled billing

- **Stage**: 4 (Verifier), independent re-check of stages 2-3
- **Branch**: `spec/003-booking-comms-polish` (verified in place; no branch switch, no commit, no push, no fix)
- **Attempt**: 1, phase 1 (full run; no prior verification of this spec exists)
- **Verified**: 2026-10-21 (all timestamps UTC)
- **Information barrier**: `specs/003-booking-comms-polish/00-informal.md` was NOT read. Verification is against `10-tasks.md` (5 tasks, 11 documented decisions), `20-acceptance/` (25 scenarios AC-003-10…34, 5 files), and `15-design.md` (locked strings) only.
- **Method**: every prior green claim (Coder, Refactorer) was treated as unverified and re-executed. The verdict below is a transcription of gate exit codes and outputs, not a judgment over them.

## Scope under verification (stage 2+3 uncommitted output)

NEW: `src/domain/calendarLink.ts`, `src/domain/emailHtml.ts`, `src/domain/emailDirect.ts`,
`src/__tests__/AC-003-{calendar-link,operator-email,client-email,direct-path-emails,inflight-copy,confirmation-panel}.test.ts`.
MODIFIED: `src/domain/email.ts` (incl. Refactorer's Resend-transport consolidation into `postResendEmail` + pass-through removal), `api/bookings/direct.ts`, `src/i18n/dictionary.ts`, `src/components/booking/BookingLayout.tsx`, `src/components/booking/BookingConfirmation.tsx`, `src/components/BookingWidget.css`, and the two OWNER-AUTHORIZED test edits `src/__tests__/AC-002-frontend-confirmation.render.test.tsx` + `src/__tests__/AC-002-frontend-confirmation.test.ts`.
`git diff main --name-only` confirms exactly these 8 modified files; untracked in-scope files are exactly the 9 new files above. Out of scope and untouched by this verification: `runs.jsonl`, `specs/` scratch, `.env*`, `config/availability.yaml`, `.gitignore`, `opencode.json`, `.standards/**`.

## Verdict summary

| # | Check | Result | Exit |
|---|---|---|---|
| 1 | Scenario traceability | PASS | 0 |
| 2 | Full test suite (`npm test`) | PASS | 0 |
| 3 | Complexity gate (eslint + tsc + vite build) | PASS | 0 / 0 / 0 |
| 3.5 | Design-principles gate | PASS (scoped authoritative exit 0; unscoped exit 1 adjudicated OUT-OF-SCOPE, ruling below) | 0 scoped / 1 unscoped |
| 4 | Scenario-to-behavior spot check (AC-003-14, AC-003-10; AC-003-19/25/20/27 additionally confirmed for audit (b)) | PASS | 0 |
| 5 | No unaccounted behavior | PASS (finding line below) | — |
| (a) | Authorized-change audit | PASS | — |
| (b) | Byte-identity audit | PASS | — |
| (c) | Phase-2 risk note | RECORDED for PR Opener | — |

**OVERALL VERDICT: PASS** — Architect (stage 5a Mutation Runner) may proceed.

## Evidence: scenario traceability

command: bash .standards/scripts/check-scenario-traceability.sh
exit: 0
at: 2026-10-21T18:32:37Z

```
Scenario IDs found: 25 live, 84 archived

PASS AC-003-10 — traced to a test
PASS AC-003-11 — traced to a test
PASS AC-003-12 — traced to a test
PASS AC-003-13 — traced to a test
PASS AC-003-14 — traced to a test
PASS AC-003-15 — traced to a test
PASS AC-003-16 — traced to a test
PASS AC-003-17 — traced to a test
PASS AC-003-18 — traced to a test
PASS AC-003-19 — traced to a test
PASS AC-003-20 — traced to a test
PASS AC-003-21 — traced to a test
PASS AC-003-22 — traced to a test
PASS AC-003-23 — traced to a test
PASS AC-003-24 — traced to a test
PASS AC-003-25 — traced to a test
PASS AC-003-26 — traced to a test
PASS AC-003-27 — traced to a test
PASS AC-003-28 — traced to a test
PASS AC-003-29 — traced to a test
PASS AC-003-30 — traced to a test
PASS AC-003-31 — traced to a test
PASS AC-003-32 — traced to a test
PASS AC-003-33 — traced to a test
PASS AC-003-34 — traced to a test


✔ Scenario traceability check: every scenario traced, every reference resolves.
```

(ANSI color codes stripped from the human output; text verbatim. Machine-readable
transcript, `bash .standards/scripts/check-scenario-traceability.sh --json`, run at
2026-10-21T18:32:53Z, exit 0:)

```json
{
  "checks": [1, 2],
  "passes": ["AC-003-10 — traced to a test", "AC-003-11 — traced to a test", "AC-003-12 — traced to a test", "AC-003-13 — traced to a test", "AC-003-14 — traced to a test", "AC-003-15 — traced to a test", "AC-003-16 — traced to a test", "AC-003-17 — traced to a test", "AC-003-18 — traced to a test", "AC-003-19 — traced to a test", "AC-003-20 — traced to a test", "AC-003-21 — traced to a test", "AC-003-22 — traced to a test", "AC-003-23 — traced to a test", "AC-003-24 — traced to a test", "AC-003-25 — traced to a test", "AC-003-26 — traced to a test", "AC-003-27 — traced to a test", "AC-003-28 — traced to a test", "AC-003-29 — traced to a test", "AC-003-30 — traced to a test", "AC-003-31 — traced to a test", "AC-003-32 — traced to a test", "AC-003-33 — traced to a test", "AC-003-34 — traced to a test"],
  "fails": []
}
```

Prior claim (exit 0, 25 live AC-003 IDs traced) **independently confirmed**. Check 1
(scenario→test) and check 2 (reference→scenario) both clean; the 84 archived IDs
resolve against `docs/changes/` (legacy AC-003-01…09 citations in
`AC-003-availability-config.test.ts` included — Decision 1 holds).

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-21T18:33:01Z

```
> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'


 RUN  v5.0.1 /home/dbueno/projects/rexiAI


 Test Files  30 passed (30)
      Tests  171 passed (171)
   Start at  20:32:55
   Duration  6.15s (environment 64%, tests 19%, setup 6%, transform 6%, import 4%, worker 1%)

Environment  jsdom was created 30 times · 35.82s total, 64% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments
```

Prior claim (exit 0, 30 files / 171 tests) **independently confirmed**. Hidden-skip
audit: zero `skipped`/`todo` markers in the run output; `grep -rEn "\.(skip|todo|only)\("`
across `src/__tests__/` returns nothing — no test is skipped, disabled, or
`.only`-isolated. This was a real full-suite execution, not a report transcription.

## Evidence: complexity gate

command: npm run lint && npx tsc -b && npm run build
exit: 0
at: 2026-10-21T18:33:31Z

Three real executions, each exit 0 (individual timestamps recorded per command):

    [1/3] npm run lint  (= eslint . — includes complexity ≤6 as error)
          exit 0, at 2026-10-21T18:33:24Z, output:

```
> rexiai-website@0.0.0 lint
> eslint .
```

    [2/3] npx tsc -b
          exit 0, at 2026-10-21T18:33:27Z, output: (empty — clean compile)

    [3/3] npm run build  (= tsc -b && vite build)
          exit 0, at 2026-10-21T18:33:31Z, output:

```
> rexiai-website@0.0.0 build
> tsc -b && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 43 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-RxdbQujM.css   11.56 kB │ gzip:  2.50 kB
dist/assets/index-D7lmfMI7.js   242.12 kB │ gzip: 75.62 kB

✓ built in 146ms
```

Prior claims (all 0) **independently confirmed**. The Refactorer's claimed structure
holds under the real tool: ESLint `complexity ≤6` (error severity) reports zero
violations across all changed and new files.

## Evidence: design-principles gate

command: bash .standards/scripts/check-code-principles.sh -BaseRef main
exit: 0
at: 2026-10-21T18:34:28Z

Authoritative blame-scoped run (judges only the change: diff of `main`…working tree).
Human output (ANSI stripped, excerpt — all gate sections PASS):

```
Checking design principles in: . (tier: mvp)
...
PASS SOLID-ISP (node): no fat interfaces
PASS SOLID-DIP (node): no domain→infrastructure imports
...
--- Component-per-file ---
PASS Component-per-file: no violations

--- Property tests ---
Property tests: skipped (project tier is mvp — production+ required)

---------------------------------------------
✔ Design-principles check: 0 FAIL(s), 0 WARN(s).
```

Machine-readable transcript (`-BaseRef main --json`, run at 2026-10-21T18:34:33Z, exit 0):

```json
{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [],
  "warns": []
}
```

    Unscoped full-tree contract run (recorded per the gate contract; adjudication below)
    (unscoped) command: bash .standards/scripts/check-code-principles.sh
    (unscoped) exit: 1
    (unscoped) at: 2026-10-21T18:34:00Z

Unscoped human output (ANSI stripped) — the sole FAIL line and all 22 WARN lines, verbatim:

```
Checking design principles in: . (tier: mvp)
FAIL Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10
WARN Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28
WARN Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25
WARN Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::KISS_LINES=41
WARN Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:93:225::KISS_LINES=43
WARN Method body >20 lines (node): ./src/pages/Landing.tsx:13:96:Landing:KISS_LINES=75
WARN Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:32:52:Chevron:KISS_LINES=22
WARN Method body >20 lines (node): ./src/components/ServicesCarousel.tsx:54:160:ServicesCarousel:KISS_LINES=79
WARN Method body >20 lines (node): ./api/bookings/recorded-billing.ts:222:244:?:KISS_LINES=24
WARN Possible duplication (9x identical 4-line block, first at ./api/bookings/checkout.ts:26): date: string /startTime: string /hours: number /email: string
WARN Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:304): startTime: string /hours: number /joinUrl?: string | null /date: string
WARN Possible duplication (4x identical 4-line block, first at ./api/stripe-webhook.ts:138): email: string /date: string /startTime: string /bookingId: string
WARN Possible duplication (3x identical 4-line block, first at ./src/domain/microsoftGraph.ts:178): }) /if (!res.ok) { /const text = await res.text().catch(() => '') /headers: { Authorization: `Bearer ${token}` },
WARN Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: "problem", /docs: { /description: /meta: {
WARN Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:140): startTime: string /hours: number /amountTotal: number /date: string
WARN Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},
WARN Possible duplication (3x identical 4-line block, first at ./api/bookings.ts:13): res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) /return false /return true /if (req.method !== 'POST') {
WARN Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:116): .status(400) /.json({ error: { code: 'INVALID_METADATA', message: 'Missing booking metadata' } }) /return false /res
WARN Possible duplication (2x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:133): }, /create(context) { /return { /schema: [],
WARN Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30
WARN Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33
WARN SRP: possible god file (node) — ./api/stripe-webhook.ts: 621 lines, 14 methods (split by responsibility)
WARN LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)

---------------------------------------------
✘ Design-principles check: 1 FAIL(s), 22 WARN(s).
```

Machine-readable transcript (`--json`, unscoped, run at 2026-10-21T18:34:23Z, exit 1):
`fails` = exactly 1 entry — `{"message": "Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10", "file": "./.standards/skills/hallmark/site/examples/cobalt-01/script.js", "line": "7"}`; `warns` = the 22 entries transcribed above; `tier: "mvp"`.

### RULING on the unscoped exit 1 (verbatim adjudication, spec-002 precedent + Stop-and-Ask matrix)

The sole unscoped FAIL is `./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10`
— a vendored example file inside the `.standards` git submodule. Evidence gathered at
2026-10-21T18:34:50Z–18:35:10Z:

- `git diff main -- .standards` → empty (submodule pointer unchanged vs main);
- `git submodule status .standards` → ` 3b1879050fbc295df9cdd64753e4704cca87be74 .standards (v1.7.0-119-g3b18790)` (no `+`/`-` prefix: checked-out commit == recorded pointer, clean);
- `git -C .standards status --porcelain` → empty (zero modified vendored files);
- `git diff main --name-only | grep -c '^\.standards'` → `0`.

RULING: the FAIL is pre-existing debt in the pinned clean submodule, untouched by this
spec, identical in kind and in the exact same file to the spec-002 phase-1 run
(recorded in `runs.jsonl`, runId 2836ee65: "sole FAIL is vendored
.standards/skills/hallmark/site/examples/cobalt-01/script.js CC=10 ... ruled
OUT-OF-SCOPE finding per Stop-and-Ask matrix, run not blocked; authoritative
-BaseRef main blame-scoped run exit 0"). Per the Stop-and-Ask decision matrix
("Out-of-scope finding → Record it; do not fix; propose a follow-up spec"), it is
recorded as an OUT-OF-SCOPE finding and does not block this run; the authoritative
blame-scoped run (`-BaseRef main`, the same authority the 002 precedent used) exits 0
with 0 FAIL / 0 WARN. The follow-up proposal to the standards repo (fix or exclude
the vendored hallmark example) was already emitted in the 002 telemetry and stands;
no new follow-up is opened here.

WARN adjudication: all 22 unscoped WARNs sit in vendored `.standards/**` files (9) or
in project files NOT in this spec's change set (13: `Landing.tsx`,
`ServicesCarousel.tsx` ×2, `recorded-billing.ts`, `checkout.ts`, `stripe-webhook.ts` ×5,
`microsoftGraph.ts`, `bookings.ts`, `time.ts`, `cobalt-01` ×2 counted in the 9) —
pre-existing debt, zero of them attributable to a file this spec touched. Per the
matrix ("Design gate WARN (not FAIL) → Record in the report; do not stop; flag to the
Architect") they are recorded and flagged, not blocking. The scoped run's 0 WARN
confirms the change itself introduces none.

**Design-principles gate result for spec 003: PASS** (scoped exit 0; unscoped exit 1
adjudicated OUT-OF-SCOPE per the ruling above).

## Evidence: scenario-to-behavior spot check

command: npx vitest run src/__tests__/AC-003-calendar-link.test.ts src/__tests__/AC-003-operator-email.test.ts src/__tests__/AC-003-client-email.test.ts
exit: 0
at: 2026-10-21T18:41:13Z

```
 RUN  v5.0.1 /home/dbueno/projects/rexiAI


 Test Files  3 passed (3)
      Tests  25 passed (25)
   Start at  20:41:12
   Duration  1.13s (environment 75%, setup 8%, transform 7%, tests 5%, import 3%, worker 1%)
```

Per-scenario filtered re-runs (the `skipped` counts are the `-t` filter excluding
non-matching tests within the file — not hidden suite skips; the full suite evidence
above shows 171 passed / 0 skipped):

    npx vitest run src/__tests__/AC-003-operator-email.test.ts -t "AC-003-14"
      → exit 0, at 2026-10-21T18:41:14Z: "Tests  1 passed | 9 skipped (10)"
    npx vitest run src/__tests__/AC-003-calendar-link.test.ts -t "AC-003-10"
      → exit 0, at 2026-10-21T18:41:15Z: "Tests  1 passed | 5 skipped (6)"

### Spot check 1 — AC-003-14 (disabled-mode operator email carries zero billing language)

Read `src/__tests__/AC-003-operator-email.test.ts` lines 33-109 against
`20-acceptance/AC-003-operator-email.md` AC-003-14. The test is NOT name-matching; it
genuinely enforces every Then-clause against the REAL builder output: it calls the
production `sendOperatorEmail(input, fetchImpl, {billingDisabled: true})`, captures
the actual Resend request body via the fetch stub (`JSON.parse(init.body)`, exactly
one call asserted), and then:

- Then-1 ("none of the banned billing words ... case-insensitively"): `expectNoBillingLanguage(subject, text, html)` sweeps all 17 substring stems (`€`, `pro-rata`, `prorrateo`, `factur`, `cargo`, `cobr`, `pago`, `pagar`, `precio`, `tarifa`, `importe`, `stripe`, `reembols`, `gratis`, `gratuit`, `billing`, `charge`) via `field.toLowerCase()).not.toContain(stem)` over all three payload parts.
- Then-2 ("'Reserva sin cargo', 'pro-rata', '0,50 EUR/min', 'Importe cobrado', '€' appear in none of the three"): explicit `not.toContain` per named string across subject/text/html (`pro-rata` covered by the stem sweep).
- Then-3 ("entirely in Spanish, final copy per 15-design.md"): pins the exact 15-design locked subject `Nueva reserva: 2027-03-01 10:00 (Europe/Madrid)` (`toBe`, byte-exact) and the locked H1 `Nueva reserva recibida`.

**Documented EUR word-token interpretation (recorded per instruction):** the test
checks `EUR` as `/\bEUR\b/i` (word token), not as a raw substring, and documents why
in a comment at lines 33-36: a case-insensitive raw substring `eur` matches the
timezone label `Europe/Madrid`, which AC-003-15 REQUIRES in the same html — a naive
substring reading would make AC-003-14 and AC-003-15 mutually unsatisfiable. The
word-token reading is the only self-consistent interpretation of the scenario pair,
and the actual currency phrase is still banned as an exact substring
(`'0,50 EUR/min'`, Then-2). I independently confirm the claim: `/\bEUR\b/i` does not
match `Europe` (no word boundary mid-token) and does match `0,50 EUR/min`. Accepted
as a faithful enforcement of the scenario, not a weakening.

Finding: **PASS** — assertions match the Given/When/Then; false-green risk excluded.

### Spot check 2 — AC-003-10 (TEMPLATE URL shape, UTC dates, duration, full encoding)

Read `src/__tests__/AC-003-calendar-link.test.ts` lines 59-70 against
`20-acceptance/AC-003-calendar-link.md` AC-003-10. The test calls the production
`buildCalendarTemplateUrl` with the scenario's Given values (2027-03-01, 10:00, 2h,
Europe/Madrid default via `beforeEach` env deletion) and enforces every Then-clause:

- Then-1 (exact link): `toBe` on the FULL URL — `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<enc>&dates=20270301T090000Z/20270301T110000Z&details=<enc>` — byte-exact, param order pinned (Decision 7).
- Then-2/3 (`<E>`/`<D>` are `encodeURIComponent` of title/details): asserted by constructing the expected string with `encodeURIComponent(TITLE)` / `encodeURIComponent(DETAILS)` and comparing the whole URL.
- Then-4 (decoding `<D>` contains the join URL): `decodeURIComponent(url.split('&details=')[1])).toContain('https://meet.jit.si/rexi-cal')`.
- Then-5 (end = start + exactly 2 hours): `parseStamp(end) - parseStamp(start) === 2 * 3600000` over the real output's `dates` param.

The sibling tests confirm the scenario family is genuinely enforced, not decorated:
AC-003-11 walks all four env-chain branches (America/New_York, TIMEZONE=Europe/Lisbon,
empty-string-as-unset, default Madrid) with exact `dates` strings; AC-003-12 pins the
DST pair (summer 08:00Z vs winter 09:00Z for the same wall clock); AC-003-13 counts
raw separators (exactly 3 `&`, exactly 4 `=`), bans raw space/angle/quote characters,
and re-checks both encoded params against `encodeURIComponent` of hostile inputs.

Finding: **PASS** — assertions match the Given/When/Then; false-green risk excluded.

### Additional confirmations under audit (b) (not part of the random-2 minimum)

- **AC-003-19** (operator enabled-path golden): asserts `toBe` on subject `Nueva reserva: client@example.com - 2027-03-01 10:00`, the exact five text lines (incl. `Reserva sin cargo — se factura tras la reunión (pro-rata 0,50 EUR/min)`), and html `<p>` + `<br/>` join — matching the 10-tasks §Global-context goldens byte-for-byte, captured through the real `sendOperatorEmail(input, fetchImpl, {})` → `buildBody` → consolidated `postResendEmail`.
- **AC-003-25** (client enabled-path golden): asserts `toBe` on subject `Reserva confirmada: 2027-03-01 10:00`, the exact seven lines (incl. both billing-model lines and `Enlace de la reunión`), html shape, and `payload.to === clientEmail` — through the real `sendClientEmail(..., {})` → `buildClientBody` → `postResendEmail`.
- **AC-003-20/27** (direct-path e2e): full-handler runs asserting the 200 body `{checkoutUrl: null, joinUrl, billingDisabled: true}`, exactly-one Resend request per recipient (operator@example.com / client@example.com, never EMAIL_TO for the client copy), banned-stem sweep on the captured payloads, join anchor, and `Añadir a Google Calendar` anchor with `dates=20270301T090000Z/20270301T100000Z`.

## Check 5 — No unaccounted behavior (finding line, not a command)

FINDING: PASS. Every production-side change in the diff traces to a task/decision:
`calendarLink.ts` → Task 1 (Decision 7 param contract; reuses `slotIntervalUtc`, no
second conversion); `emailHtml.ts` → shared-primitive extraction supporting Tasks 2-3
(`escapeHtml`/`renderText`/`renderHtml` moved verbatim, re-exported from `email.ts` so
the module surface is unchanged); `emailDirect.ts` → Tasks 2-3 (all locked strings
match 15-design byte-for-byte: subjects, preheaders, H1s, reassurance, help lines,
CTA labels `Unirse a la reunión` / `Añadir a Google Calendar`, calendar title
`Sesión con RexiAI`, details prefix `Enlace de acceso a la sesión: `, conflict
lead/body; `getConfiguredTimezone()` for the display label per Decision 9;
grammar-aware duration is disabled-variant-only); `email.ts` mode dispatch →
Decision 3 (mode as additional argument position; `calls[0][0]` untouched);
`direct.ts` → Tasks 2-3 wiring (client first-arg EXACTLY the pinned shape, mode in
third position, `undefined` fetchImpl preserving the default-global-fetch behavior);
`dictionary.ts` → Tasks 4-5 (exactly the design-mandated diff); `BookingLayout.tsx`
→ Task 4 (`submitButtonLabel` implements the 15-design selection formula verbatim);
`BookingConfirmation.tsx` + `BookingWidget.css` → Task 5 (CTA block deleted; the
`.booking-confirmation__cta` rules incl. hover/focus-visible deleted as
design-mandated dead styles). Supplementary ID-less unit tests (builder boundaries,
duration grammar, mode-signal regression guard) trace to Task acceptance criteria and
Decision 8 (the mode-wiring proof is the stated purpose of the e2e pair); they assert
spec-scoped behavior only. No logic found that lacks a task/scenario/decision origin.

## Audit (a) — AUTHORIZED-CHANGE AUDIT (executed at 2026-10-21T18:35:27Z)

command: `git diff main -- src/__tests__/` → exit 0. Result: **PASS**.

- `--stat`: exactly 2 pre-existing test files modified — `AC-002-frontend-confirmation.render.test.tsx` (+5/-4) and `AC-002-frontend-confirmation.test.ts` (+4/-1). These are precisely the two OWNER-AUTHORIZED files (10-tasks §Global context). No other pre-existing test file appears in the diff: `AC-016-email-safety.test.ts`, `AC-018-billing-guards.test.ts`, `AC-002-direct-booking.test.ts` (AC-002-05…15), `AC-001-i18n.test.tsx`, `billing-free-mode.test.tsx`, `AC-011-booking-ui.test.tsx`, `AC-003-availability-config.test.ts`, and `AC-010-email.test.ts` are byte-untouched (confirmed: not in `git diff main --stat -- src/__tests__/`; the 6 new AC-003 test files are untracked additions, not modifications).
- Render-test change matches the documented before/after: the old `getByRole('link', {name: dict.booking.confirmation.joinLink})` + `href === JOIN_URL` expectation is replaced by `queryAllByRole('link')).toHaveLength(0)` (zero links) + `innerHTML).not.toContain(JOIN_URL)` (no JOIN_URL in html) — exactly the authorized inversion, with an authorization comment citing spec 003.
- Unit-test change matches the documented before/after: AC-002-17's key list `['title','joinLink','dateLabel','timeLabel','note']` → `['title','dateLabel','timeLabel','note']` (`joinLink` dropped, Decision 6) — and nothing else in the file changed (the diff hunk touches only the key-list line plus an authorization comment; the untouched `'billingDisabled without a joinUrl still confirms and never navigates'` test and all non-AC-002-17 tests are unmodified, as required).
- Scenario IDs preserved verbatim: the `it('AC-002-17: ...')` heading is unchanged; no ID renumbering anywhere in the diff.
- OBSERVATION (cosmetic, not a violation): the AC-002-17 test TITLE still reads "Both dictionaries define booking.confirmation title and joinLink" while the key list no longer includes `joinLink`. The authorization scoped the change to "exactly the key-list update" — editing the title text would have EXCEEDED the authorized scope, so keeping it is the conservative, correct choice under docs/TESTING.md §Tests That Encode a Defect (ID preserved verbatim). Flagged to the Architect as a candidate wording tweak for a future authorized pass; not blocking.
- PR-body duty re-stated for stage 5b (per Task 5 criterion): the PR body must list both files, the changed assertions, and spec 003 as the authorization.

## Audit (b) — BYTE-IDENTITY AUDIT (executed at 2026-10-21T18:36:05Z)

Result: **PASS**.

1. **Enabled-path builders byte-identical vs main**: function-level `diff` of `git show main:src/domain/email.ts` extractions against the working tree for `amountLine`, `buildLines`, `buildBody`, `buildClientLines`, `billingModelLines`, `buildClientBody` → all six report IDENTICAL (empty diffs). The 15-design watch item ("enabled-path builders must not be edited") holds.
2. **Moved primitives verbatim**: `escapeHtml` (five replacements, `&` first), `renderText`, `renderHtml` (`<p>` + `<br/>` shape), and the `BodyLine` interface in `emailHtml.ts` are character-for-character the blocks removed from `email.ts` (compared against the diff hunks); `email.ts` re-exports `escapeHtml`, preserving its documented surface.
3. **Dictionary**: `git diff main -- src/i18n/dictionary.ts` is exactly the design-mandated edit set and nothing else — ADD `booking.form.submittingDirect` (es `Enviando tu reserva...` / en `Sending your reservation...`, matching 15-design Task 4 byte-for-byte); REMOVE `booking.confirmation.joinLink` from BOTH locales (Decision 6); REFRESH `note` (es `Te hemos enviado la confirmación por email, con el enlace para unirte a la sesión.` / en `We emailed your confirmation, including the link to join your session.`, matching 15-design Task 5 byte-for-byte). `title` (`Reserva confirmada`/`Booking confirmed`), `dateLabel` (`Fecha`/`Date`), `timeLabel` (`Hora`/`Time`), and `submitting` (`Redirigiendo a Stripe...`/`Redirecting to Stripe...`) appear only as unchanged context lines — byte-stable. No em/en dash introduced (AC-001-05 green unmodified in the full suite).
4. **Goldens genuinely exercise the consolidated `postResendEmail`**: the Refactorer deleted `sendViaResend`/`sendClientViaResend`/`sendPaymentLinkViaResend` and routed all three sends through one `postResendEmail(fetchImpl, apiKey, payload, errorLabel)`. Behavior-preservation evidence: (i) same URL `https://api.resend.com/emails`, same method/headers, `res.text().catch(() => '')` preserved; (ii) payload key order `from,to,subject,text,html` preserved at every call site (JSON.stringify insertion order → serialized body byte-identical); (iii) per-send error prefixes preserved via `errorLabel`: `Resend failed`, `Resend client email failed`, `Resend payment-link email failed`; (iv) `assertClientSenderUsable` still runs BEFORE body build and before any fetch in both client-facing sends (AC-003-26 semantics); (v) EMPIRICAL pins: unmodified `AC-010-email.test.ts` AC-010-03 drives `sendOperatorEmail` against a 500 stub and asserts `rejects.toThrow(/Resend failed/)` — that prefix now only exists inside `postResendEmail`, so the consolidated mapping is exercised by an untouched pinned test; unmodified AC-016 (incl. both payment-link tests) and AC-018 (AC-018-05 enabled client wording) pass through the same consolidated transport; new AC-003-19/25 goldens capture the real request body end-to-end through it (assertions listed in the spot-check section). The full 171-test suite green over these pins is the byte-identity proof of the transport consolidation.
5. **Pass-through removal**: `sendOperatorEmail`/`sendClientEmail`/`sendPaymentLinkEmail` no longer delegate with identical signatures (the CODING_CONVENTIONS pass-through smell); their public signatures are backward-compatible (new optional third `mode` parameter; existing 1- and 2-argument calls behave as before — proven by untouched AC-010/AC-016/AC-018 passing).

## Audit (c) — PHASE-2 RISK NOTE for the PR Opener (recorded, NOT fixed)

After stage 5b runs `archive-spec.sh`, CI (Self CI `Lint & Format` → `prettier --check`)
sees only `docs/changes/003-booking-comms-polish.md` from this spec's artifacts. The
spec-002 phase-2 round-1 failure (runs.jsonl runId f94f27a9, check id 118047893864)
established the failure mode: the stage-5b PR-record append (`PR:` / `Commits:` lines)
lands at column 0 directly after a list item and violates prettier's 2-space
lazy-continuation indent — the append happens after any pre-push formatter pass by
construction. REQUIRED of stage 5b for spec 003: run `npx prettier --write
docs/changes/003-booking-comms-polish.md` AFTER the PR-record append and BEFORE the
push (the root-cause fix in `archive-spec.sh` remains an open standards-repo
follow-up, out of this spec's scope). Also noted from phase 1 of spec 002:
`.prettierignore` lacks `specs/`, so local whole-repo prettier runs warn on spec
scratch — invisible to CI post-archive; deliberately left unfixed here.

## Warnings / review hints for the Architect (non-blocking)

1. Unscoped design-principles: 1 FAIL (vendored `.standards/skills/hallmark/.../cobalt-01/script.js` CC=10) adjudicated OUT-OF-SCOPE per the ruling above; 22 WARNs all in vendored/untouched files (pre-existing debt). Standards-repo follow-up (already proposed in 002 telemetry) stands.
2. Cosmetic: AC-002-17 test title still says "title and joinLink" after the authorized key-list change (see audit (a) observation) — candidate for a future authorized wording tweak; changing it now would exceed the authorization.
3. Phase-2 risk (audit (c)): the PR-record append must be prettier-formatted before push or Lint & Format will fail exactly as in spec-002 round 1.

## Overall verdict

**PASS** (attempt 1, phase 1). All five contract checks ran and produced no findings
attributable to this spec; both mandatory audits pass; the phase-2 risk note is
recorded for the PR Opener. Stage 5a (Mutation Runner) may proceed.

- Gates failed: none.
- BLOCKs relayed this phase: 0 of 3 (phase-1 budget untouched).
