# 019 — English-first landing: independent verification

Stage 4 of `docs/SPEC_PIPELINE.md`.

- **attempt:** 1, phase 1 (first full run — no prior `25-verification.md` existed)
- **spec:** `specs/019-english-first-landing` — verified against `10-tasks.md`
  (including the Test changes record and the resolved Open questions block),
  `20-acceptance/*.md` and `15-design.md`. `00-informal.md` was not read.
- **branch:** `spec/019-english-first-landing`
- **tree:** one uncommitted working tree on top of `24bd5ab` (no spec commit exists
  yet) — see finding 13
- **verdict:** **FAIL** — 1 blocking finding, 12 advisory findings

Everything below was executed by the Verifier in this run. Prior stages' claims
were treated as unverified until re-run.

## Evidence: scenario traceability

command: bash .standards/scripts/check-scenario-traceability.sh
exit: 0
at: 2026-11-08T16:47:02Z

Scenario IDs found: 24 live, 279 archived

PASS AC-019-01 — traced to a test
PASS AC-019-02 — traced to a test
PASS AC-019-03 — traced to a test
PASS AC-019-04 — traced to a test
PASS AC-019-05 — traced to a test
PASS AC-019-06 — traced to a test
PASS AC-019-07 — traced to a test
PASS AC-019-08 — traced to a test
PASS AC-019-09 — traced to a test
PASS AC-019-10 — traced to a test
PASS AC-019-11 — traced to a test
PASS AC-019-12 — traced to a test
PASS AC-019-13 — traced to a test
PASS AC-019-14 — traced to a test
PASS AC-019-15 — traced to a test
PASS AC-019-16 — traced to a test
PASS AC-019-17 — traced to a test
PASS AC-019-18 — traced to a test
PASS AC-019-19 — traced to a test
PASS AC-019-20 — traced to a test
PASS AC-019-21 — traced to a test
PASS AC-019-22 — traced to a test
PASS AC-019-23 — traced to a test
PASS AC-019-24 — traced to a test

✔ Scenario traceability check: every scenario traced, every reference resolves.

Machine-readable transcript, `bash .standards/scripts/check-scenario-traceability.sh --json`
(exit 0):

{"checks":[1,2],"passes":["AC-019-01 — traced to a test", … 24 entries …],"fails":[]}

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-11-08T16:47:06Z

> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  93 passed (93)
      Tests  621 passed | 1 skipped (622)
   Start at  17:47:07
   Duration  16.72s (environment 68%, tests 17%, setup 7%, transform 4%, import 3%, worker 1%)

Matches the expected 93 files / 621 passing / 1 skipped exactly.

The single skip is pre-existing and not introduced by this spec:
`src/__tests__/AC-006-bot-adapter.test.ts:705 describe.skipIf(!LIVE)` — present
at `HEAD` too (`git show HEAD:src/__tests__/AC-006-bot-adapter.test.ts | grep -c skipIf`
→ 1). No `.only`, no `it.skip`, no `describe.skip` was added anywhere
(`grep -rn "\.only(\|\.skip(\|it\.todo\|xit(\|xdescribe(\|describe\.skip" src/__tests__`
returns only that one pre-existing `skipIf`).

Type check, run separately because two scenarios name it as a gate:

command: npx tsc --noEmit
exit: 0
at: 2026-11-08T16:54:04Z

(no output)

Production build, which also exercises `tsc -b`:

command: npm run build
exit: 0
at: 2026-11-08T16:48:34Z

vite v8.3.1 building client environment for production...
✓ 48 modules transformed.
dist/index.html                   1.93 kB │ gzip:  0.61 kB
dist/assets/index-5JNv8OKY.css   12.35 kB │ gzip:  2.54 kB
dist/assets/index-CweKhoYg.js   261.68 kB │ gzip: 82.92 kB
✓ built in 159ms

## Evidence: complexity gate

command: npm run lint
exit: 0
at: 2026-11-08T16:47:26Z

> rexiai-website@0.0.0 lint
> eslint .

/home/dbueno/projects/rexiAI/api/bookings/checkout.ts
  5:1  warning  There should be at least one empty line between import groups  import/order

/home/dbueno/projects/rexiAI/tests/e2e/funnel-consent-boundary.e2e.ts
  30:5  warning  Unexpected console statement  no-console
  34:3  warning  Unexpected console statement  no-console
  63:5  warning  Unexpected console statement  no-console
  92:3  warning  Unexpected console statement  no-console

/home/dbueno/projects/rexiAI/tests/e2e/home-timer-scan.e2e.ts
  35:5  warning  Unexpected console statement  no-console
  39:3  warning  Unexpected console statement  no-console
  90:3  warning  Unexpected console statement  no-console

/home/dbueno/projects/rexiAI/tests/e2e/switch-refusal.e2e.ts
  30:5  warning  Unexpected console statement  no-console
  34:3  warning  Unexpected console statement  no-console
  81:3  warning  Unexpected console statement  no-console

✖ 11 problems (0 errors, 11 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.

Zero errors. All 11 warnings are in files this spec does not touch
(`api/bookings/checkout.ts`, `tests/e2e/*`).

The lint summary alone is not proof of the ≤6 rule, so the changed/new functions
were read individually: the project config sets `complexity: ['error', 6]`, and
re-running ESLint with the threshold forced to 1 prints the real per-function
value for every function above it.

command: npx eslint --rule '{"complexity":["error",1]}' --no-warn-ignored src/components/About.tsx src/components/Proof.tsx src/components/Services.tsx src/pages/Landing.tsx src/i18n/dictionary.ts src/i18n/I18nContext.tsx src/components/booking/BookingLayout.tsx src/content/legalEntity.ts
exit: 1  (exit 1 is expected here: the forced threshold of 1 reports every function above it; the values are the evidence)
at: 2026-11-08T16:51:56Z

  11:8  error  Function 'About' has a complexity of 2. Maximum allowed is 1  complexity
  19:1  error  Function 'submitButtonLabel' has a complexity of 4. Maximum allowed is 1  complexity
  26:8  error  Function 'BookingLayout' has a complexity of 4. Maximum allowed is 1  complexity
  34:1  error  Function 'env' has a complexity of 3. Maximum allowed is 1  complexity
   9:1  error  Function 'getInitialLocale' has a complexity of 4. Maximum allowed is 1  complexity
  46:45  error  Arrow function has a complexity of 3. Maximum allowed is 1  complexity
  14:8  error  Function 'Landing' has a complexity of 5. Maximum allowed is 1  complexity

✖ 7 problems (7 errors, 0 warnings)

Highest observed: `Landing` at 5 (≤6). `Services` and `Proof` are pure JSX with
a single `map` and do not register above 1. Under the project's configured
threshold of 6 this is 0 errors, which is what `npm run lint` reported.

## Evidence: design-principles gate

command: bash .standards/scripts/check-code-principles.sh
exit: 0
at: 2026-11-08T16:52:22Z

(ANSI colour codes stripped; text otherwise verbatim. The `--json` transcript of
the same run carries `"tier": "mvp"`, `"fails": []`, 210 `warns`.)

Checking design principles in: . (tier: mvp)

PASS Complexity/KISS (java): no violations found
WARN Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:45:71:main:KISS_LINES=28
WARN Method body >20 lines (go): ./.standards/ci/templates/go-saga-lint.go:101:124:checkCompensationPairs:KISS_LINES=25
WARN Method body >20 lines (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:111:242::KISS_LINES=38
WARN Method body >20 lines (node): ./src/pages/Landing.tsx:14:110:Landing:KISS_LINES=87
WARN Method body >20 lines (node): ./src/pages/Privacy.tsx:9:51:SectionView:KISS_LINES=43
WARN Method body >20 lines (node): ./src/pages/Privacy.tsx:53:100:Privacy:KISS_LINES=41
WARN Method body >20 lines (node): ./api/stripe-webhook.ts:143:165:getRawBookingFields:KISS_LINES=24
WARN Method body >20 lines (node): ./api/bookings/checkout.ts:38:63:buildSessionParams:KISS_LINES=27
WARN Method body >20 lines (node): ./api/bookings/recorded-billing.ts:218:240:?:KISS_LINES=24
WARN Method body >20 lines (python): ./scripts/recording/whisper_transcribe.py:37:64:main:KISS_LINES=23 [approximate heuristic — comprehension/decorator forms can inflate the count; ADR 0006 warn phase]

--- DRY ---
WARN Possible duplication (5x identical 4-line block, first at ./api/stripe-webhook.ts:294): startTime: string /hours: number /joinUrl?: string | null /date: string
WARN Possible duplication (5x identical 4-line block, first at ./api/bookings/types.ts:16): date: string /startTime: string /hours: number /email: string
WARN Possible duplication (4x identical 4-line block, first at ./api/bookings/validation.ts:131): name: string /date: string /startTime: string /email: string
WARN Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:115): type: "problem", /docs: { /description: /meta: {
WARN Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:118): startTime: string /hours: number /amountTotal: number /date: string
WARN Possible duplication (3x identical 4-line block, first at ./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:132): schema: [], /}, /create(context) { /},
WARN Possible duplication (3x identical 4-line block, first at ./api/bookings/validation.ts:172): date: string /startTime: string /hours: number /name: string
WARN Possible duplication (3x identical 4-line block, first at ./api/stripe-webhook.ts:463): date: string /startTime: string /hours: number /bookingId: string
WARN Possible duplication (2x identical 4-line block, first at ./src/content/privacy.ts:143): }, /}, /id: 'transferencias', /],
WARN Possible duplication (2x identical 4-line block, first at ./src/content/privacy.ts:104): }, /}, /id: 'grabacion', /],

--- YAGNI ---
WARN Empty method body (java): ./.standards/ci/templates/archunit/OutboxArchRules.java:30
WARN Empty method body (java): ./.standards/ci/templates/archunit/SagaArchRules.java:33
PASS YAGNI (go): no premature abstractions detected
PASS YAGNI (node): no premature abstractions detected
PASS YAGNI (python): no premature abstractions detected

--- SOLID ---
PASS SOLID-SRP (java): no oversized files
PASS SOLID-SRP (go): no oversized files
WARN SRP: possible god file (node) — ./api/stripe-webhook.ts: 627 lines, 8 methods (split by responsibility)
PASS SOLID-SRP (python): no oversized files
PASS SOLID-OCP (java): no large type-dispatch chains
PASS SOLID-OCP (go): no large type-dispatch chains
PASS SOLID-OCP (node): no large type-dispatch chains
PASS SOLID-OCP (python): no large type-dispatch chains
PASS SOLID-LSP (java): no heavy instanceof dispatch
WARN LSP: 4 instanceof checks in one file (node) — ./src/domain/time.ts (suggests broken substitutability or type dispatch)
PASS SOLID-LSP (python): no heavy isinstance dispatch
PASS SOLID-ISP (java): no fat interfaces
PASS SOLID-ISP (node): no fat interfaces
PASS SOLID-ISP (python): no fat interfaces
PASS SOLID-DIP (java): no domain→infrastructure imports
PASS SOLID-DIP (go): no domain→infrastructure imports
PASS SOLID-DIP (node): no domain→infrastructure imports
PASS SOLID-DIP (python): no domain→infrastructure imports
PASS SOLID-DIP (rust): no domain→infrastructure imports

--- Component-per-file ---
PASS Component-per-file: no violations

--- Property tests ---
Property tests: skipped (project tier is mvp — production+ required)

--- Comments ---
WARN Comments: commented-out code (./src/__tests__/AC-006-bot-adapter.test.ts:10)
WARN Comments: section-divider comment (./src/__tests__/AC-006-bot-adapter.test.ts:513)
WARN Comments: section-divider comment (./src/__tests__/AC-006-bot-adapter.test.ts:524)
WARN Comments: TODO/FIXME without an issue reference (./src/domain/pricing.ts:10)
WARN Comments: TODO/FIXME without an issue reference (./api/stripe-webhook.ts:338)
WARN Comments: commented-out code (./api/reschedule/submit.ts:6)
WARN Comments: comment restates the following line (./session-start-check.sh:25)
WARN Comments: comment restates the following line (./session-start-check.sh:43)
WARN Comments: commented-out code (./.standards/scripts/check-code-principles.selftest.sh:641)
WARN Comments: section-divider comment (./.standards/scripts/check-code-principles.selftest.sh:639)
WARN Comments: comment restates the following line (./.standards/scripts/tests/gate-telemetry.selftest.sh:150)
WARN Comments: commented-out code (./.standards/scripts/check-bats-assertions.sh:21)
WARN Comments: TODO/FIXME without an issue reference (./.standards/scripts/gate-clean-code-lib.sh:97)
WARN Comments: commented-out code (./.standards/scripts/verify-production-deploy.sh:30)
WARN Comments: commented-out code (./.standards/scripts/check-code-principles.sh:58)
WARN Comments: commented-out code (./.standards/scripts/check-code-principles.sh:121)
WARN Comments: TODO/FIXME without an issue reference (./.standards/scripts/check-code-principles.sh:57)
WARN Comments: attribution comment (./.standards/scripts/check-code-principles.sh:59)
WARN Comments: comment restates the following line (./.standards/scripts/check-remediation-budget.sh:139)
WARN Comments: comment restates the following line (./.standards/scripts/check-remediation-budget.sh:209)
WARN Comments: commented-out code (./.standards/scripts/lint-outbox-schema.sh:13)
WARN Comments: commented-out code (./.standards/scripts/lint-outbox-schema.sh:22)
WARN Comments: TODO/FIXME without an issue reference (./.standards/scripts/check-saga-timeouts.sh:185)
WARN Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:51)
WARN Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:53)
WARN Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:90)
WARN Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:92)
WARN Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:132)
WARN Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:134)
WARN Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:149)
WARN Comments: section-divider comment (./.standards/scripts/ci-smoke-test.sh:151)
WARN Comments: commented-out code (./.standards/scripts/check-loop-files.sh:10)
WARN Comments: section-divider comment (./.standards/scripts/init-ci.sh:6)
WARN Comments: section-divider comment (./.standards/scripts/init-ci.sh:43)
WARN Comments: commented-out code (./.standards/scripts/check-loop-triage.sh:39)
WARN Comments: commented-out code (./.standards/scripts/check-loop-triage.sh:49)
WARN Comments: commented-out code (./.standards/scripts/check-loop-triage.sh:67)
WARN Comments: commented-out code (./.standards/scripts/token-stats.sh:10)
WARN Comments: commented-out code (./.standards/scripts/classify-spec-size.sh:28)
WARN Comments: commented-out code (./.standards/scripts/guard-env.sh:21)
WARN Comments: commented-out code (./.standards/scripts/check-ci-sweeper.sh:37)
WARN Comments: commented-out code (./.standards/scripts/check-security-hardening.sh:39)
WARN Comments: commented-out code (./.standards/scripts/judgment-preflight.sh:16)
WARN Comments: commented-out code (./.standards/scripts/check-model-env.sh:30)
WARN Comments: commented-out code (./.standards/scripts/gate-stats.sh:20)
WARN Comments: commented-out code (./.standards/scripts/check-pr-babysitter.sh:56)
WARN Comments: TODO/FIXME without an issue reference (./.standards/scripts/check-saga-tests.sh:85)
WARN Comments: comment restates the following line (./session-end-check.sh:14)
WARN Comments: comment restates the following line (./session-end-check.sh:38)
WARN Comments: commented-out code (./deploy/home/install-recording-host.sh:8)

--- Naming ---
WARN Naming: boolean flag parameter (hasDedupStore) (./.standards/ci/templates/archunit/OutboxArchRules.java:197)
WARN Naming: boolean flag parameter (hasCompensation) (./.standards/ci/templates/archunit/SagaArchRules.java:147)
WARN Naming: boolean flag parameter (hasStateStore) (./.standards/ci/templates/archunit/SagaArchRules.java:201)
WARN Naming: more than three parameters (Fprintf) (./.standards/ci/templates/go-saga-lint.go:61)
WARN Naming: more than three parameters (filterSlotsByBusy) (./api/availability.ts:92)
WARN Naming: more than three parameters (reserve) (./api/bookings.ts:86)
WARN Naming: more than three parameters (reserve) (./api/bookings.ts:119)
WARN Naming: single-character identifier (d) (./api/bookings/calendar.ts:36)
WARN Naming: single-character identifier (s) (./api/bookings/calendar.ts:59)
WARN Naming: single-character identifier (e) (./api/bookings/calendar.ts:60)
WARN Naming: single-character identifier (h) (./api/bookings/checkout.ts:18)
WARN Naming: single-character identifier (p) (./api/bookings/checkout.ts:20)
WARN Naming: more than three parameters (createCalendarSideEffect) (./api/bookings/direct.ts:152)
WARN Naming: more than three parameters (failStatic) (./api/bookings/direct.ts:154)
WARN Naming: more than three parameters (failStatic) (./api/bookings/direct.ts:163)
WARN Naming: single-character identifier (h) (./api/bookings/recorded-billing.ts:56)
WARN Naming: single-character identifier (p) (./api/bookings/recorded-billing.ts:58)
WARN Naming: single-character identifier (b) (./api/bookings/recorded-billing.ts:69)
WARN Naming: more than three parameters (handlePaidCheckout) (./api/bookings/recorded-billing.ts:343)
WARN Naming: more than three parameters (handleCheckoutResult) (./api/bookings/recorded-billing.ts:377)
WARN Naming: single-character identifier (b) (./api/bookings/validation.ts:138)
WARN Naming: single-character identifier (e) (./api/errorText.ts:8)
WARN Naming: more than three parameters (moveOrFail) (./api/reschedule/submit.ts:212)
WARN Naming: more than three parameters (completeMove) (./api/reschedule/submit.ts:254)
WARN Naming: single-character identifier (v) (./api/stripe-webhook.ts:81)
WARN Naming: single-character identifier (e) (./api/stripe-webhook.ts:92)
WARN Naming: single-character identifier (a) (./api/stripe-webhook.ts:98)
WARN Naming: noise word in type name (BookingData) (./api/stripe-webhook.ts:113)
WARN Naming: single-character identifier (v) (./api/stripe-webhook.ts:168)
WARN Naming: single-character identifier (v) (./api/stripe-webhook.ts:174)
WARN Naming: single-character identifier (d) (./api/stripe-webhook.ts:401)
WARN Naming: single-character identifier (d) (./api/stripe-webhook.ts:494)
WARN Naming: more than three parameters (dump) (./scripts/recording/whisper_transcribe.py:60)
WARN Naming: single-character identifier (e) (./src/components/booking/form/validateBookingForm.ts:49)
WARN Naming: more than three parameters (handleBookingResponse) (./src/components/booking/hooks/useBookingSubmit.ts:90)
WARN Naming: single-character identifier (v) (./src/components/booking/hooks/useBookingSubmit.ts:101)
WARN Naming: single-character identifier (m) (./src/domain/availability.ts:20)
WARN Naming: single-character identifier (h) (./src/domain/availability.ts:22)
WARN Naming: single-character identifier (h) (./src/domain/availability.ts:28)
WARN Naming: single-character identifier (m) (./src/domain/availability.ts:29)
WARN Naming: single-character identifier (p) (./src/domain/availability.ts:297)
WARN Naming: single-character identifier (s) (./src/domain/availability.ts:305)
WARN Naming: single-character identifier (e) (./src/domain/availability.ts:306)
WARN Naming: single-character identifier (d) (./src/domain/availability.ts:317)
WARN Naming: single-character identifier (p) (./src/domain/availability.ts:379)
WARN Naming: single-character identifier (n) (./src/domain/bookingLookup.ts:33)
WARN Naming: single-character identifier (v) (./src/domain/bookingLookup.ts:39)
WARN Naming: more than three parameters (postResendEmail) (./src/domain/email.ts:161)
WARN Naming: more than three parameters (clientModel) (./src/domain/emailDirect.ts:336)
WARN Naming: single-character identifier (e) (./src/domain/freeHour.ts:52)
WARN Naming: single-character identifier (e) (./src/domain/freeHour.ts:89)
WARN Naming: single-character identifier (p) (./src/domain/graphEventProperties.ts:66)
WARN Naming: single-character identifier (d) (./src/domain/microsoftGraph.ts:75)
WARN Naming: single-character identifier (n) (./src/domain/rateLimit.ts:36)
WARN Naming: single-character identifier (y) (./src/domain/time.ts:37)
WARN Naming: single-character identifier (d) (./src/domain/time.ts:39)
WARN Naming: single-character identifier (h) (./src/domain/time.ts:40)
WARN Naming: single-character identifier (s) (./src/domain/time.ts:42)
WARN Naming: single-character identifier (e) (./src/domain/time.ts:77)
WARN Naming: more than three parameters (UTC) (./src/domain/time.ts:104)
WARN Naming: single-character identifier (d) (./src/domain/validation.ts:22)
WARN Naming: single-character identifier (e) (./src/domain/webhookDedup.ts:81)

--- Null discipline ---
WARN Null-discipline: return null (./.standards/ci/templates/eslint-saga-rules/saga-compensation.js:65)
WARN Null-discipline: return null (./src/pages/ResultViews.tsx:8)
WARN Null-discipline: return null (./src/domain/reschedule.ts:67)
WARN Null-discipline: return null (./src/domain/reschedule.ts:93)
WARN Null-discipline: return null (./src/domain/availability.ts:21)
WARN Null-discipline: return null (./src/domain/availability.ts:141)
WARN Null-discipline: return null (./src/domain/pricing.ts:27)
WARN Null-discipline: return null (./src/domain/pricing.ts:54)
WARN Null-discipline: return null (./src/domain/graphEventProperties.ts:67)
WARN Null-discipline: return null (./src/domain/graphEventProperties.ts:68)
WARN Null-discipline: return null (./src/domain/graphEventProperties.ts:126)
WARN Null-discipline: return null (./src/domain/graphEventProperties.ts:129)
WARN Null-discipline: return null (./src/domain/graphEventProperties.ts:149)
WARN Null-discipline: return null (./src/domain/meetingUrl.ts:25)
WARN Null-discipline: return null (./src/domain/meetingUrl.ts:30)
WARN Null-discipline: return null (./src/domain/meetingUrl.ts:33)
WARN Null-discipline: return null (./src/domain/meetingUrl.ts:52)
WARN Null-discipline: return null (./src/domain/meetingDuration.ts:15)
WARN Null-discipline: return null (./src/domain/rescheduleUrl.ts:25)
WARN Null-discipline: return null (./src/domain/rescheduleUrl.ts:27)
WARN Null-discipline: return null (./src/domain/microsoftGraph.ts:86)
WARN Null-discipline: return null (./src/domain/microsoftGraph.ts:95)
WARN Null-discipline: return null (./src/domain/microsoftGraph.ts:97)
WARN Null-discipline: return null (./src/domain/microsoftGraph.ts:282)
WARN Null-discipline: return null (./src/domain/microsoftGraph.ts:290)
WARN Null-discipline: return null (./src/domain/microsoftGraph.ts:343)
WARN Null-discipline: return null (./src/domain/bookingLookup.ts:32)
WARN Null-discipline: return null (./src/domain/bookingLookup.ts:34)
WARN Null-discipline: return null (./src/domain/bookingLookup.ts:48)
WARN Null-discipline: return null (./src/domain/bookingLookup.ts:73)
WARN Null-discipline: return null (./src/domain/bookingLookup.ts:76)
WARN Null-discipline: return null (./src/domain/microsoftAuth.ts:31)
WARN Null-discipline: return null (./src/domain/microsoftAuth.ts:32)
WARN Null-discipline: null argument (./src/components/booking/hooks/useBookingFields.ts:18)
WARN Null-discipline: return null (./src/components/booking/fields/SlotField.tsx:72)
WARN Null-discipline: null argument (./src/components/booking/BookingConfirmation.tsx:25)
WARN Null-discipline: return null (./api/stripe-webhook.ts:67)
WARN Null-discipline: return null (./api/stripe-webhook.ts:70)
WARN Null-discipline: return null (./api/stripe-webhook.ts:76)
WARN Null-discipline: return null (./api/stripe-webhook.ts:110)
WARN Null-discipline: return null (./api/stripe-webhook.ts:236)
WARN Null-discipline: return null (./api/stripe-webhook.ts:476)
WARN Null-discipline: return null (./api/stripe-webhook.ts:580)
WARN Null-discipline: return null (./api/availability.ts:56)
WARN Null-discipline: return null (./api/availability.ts:62)
WARN Null-discipline: return null (./api/availability.ts:66)
WARN Null-discipline: return null (./api/availability.ts:78)
WARN Null-discipline: return null (./api/bookings.ts:78)
WARN Null-discipline: return null (./api/bookings.ts:79)
WARN Null-discipline: return null (./api/bookings.ts:81)
WARN Null-discipline: return null (./api/bookings.ts:82)
WARN Null-discipline: return null (./api/bookings/validation.ts:76)
WARN Null-discipline: return null (./api/bookings/validation.ts:81)
WARN Null-discipline: return null (./api/bookings/validation.ts:87)
WARN Null-discipline: return null (./api/bookings/validation.ts:179)
WARN Null-discipline: return null (./api/bookings/validation.ts:181)
WARN Null-discipline: return null (./api/bookings/validation.ts:191)
WARN Null-discipline: return null (./api/bookings/validation.ts:192)
WARN Null-discipline: return null (./api/bookings/config.ts:14)
WARN Null-discipline: return null (./api/bookings/checkout.ts:12)
WARN Null-discipline: return null (./api/bookings/checkout.ts:73)
WARN Null-discipline: return null (./api/bookings/checkout.ts:79)
WARN Null-discipline: return null (./api/bookings/checkout.ts:101)
WARN Null-discipline: return null (./api/bookings/checkout.ts:102)
WARN Null-discipline: return null (./api/bookings/recorded-billing.ts:99)
WARN Null-discipline: return null (./api/bookings/recorded-billing.ts:127)
WARN Null-discipline: return null (./api/bookings/recorded-billing.ts:136)
WARN Null-discipline: return null (./api/bookings/recorded-billing.ts:152)
WARN Null-discipline: return null (./api/bookings/recorded-billing.ts:154)
WARN Null-discipline: return null (./api/bookings/recorded-billing.ts:263)
WARN Null-discipline: return null (./api/reschedule/booking.ts:26)
WARN Null-discipline: return null (./api/reschedule/submit.ts:58)
WARN Null-discipline: return null (./api/reschedule/submit.ts:200)
WARN Null-discipline: return null (./api/reschedule/submit.ts:242)

---------------------------------------------
✔ Design-principles check: 0 FAIL(s), 210 WARN(s).
  WARNs are review hints — verify each before merging.

Reading of the gate: **0 FAIL, 210 WARN**. No FAIL is a pipeline stop; the WARNs
are review hints (Stop-and-Ask matrix: "Design gate WARN (not FAIL) | Record in
the report; do not stop; flag to the Architect").

WARNs that land on files this spec creates or changes — one:

WARN Method body >20 lines (node): ./src/pages/Landing.tsx:14:110:Landing:KISS_LINES=87

(`Landing` is an 87-line JSX body; ESLint's own cyclomatic metric puts it at 5,
under the ≤6 rule. The KISS line-count guideline is a WARN, not a FAIL. Recorded,
not blocking.)

Every other WARN is pre-existing and in files this spec does not touch: `api/*`,
`src/domain/*`, `src/pages/Privacy.tsx`, `src/content/privacy.ts`, `scripts/*`,
and `.standards/*` (the submodule is inside the scanned tree). No WARN lands on
`About.tsx`, `Proof.tsx`, `Services.tsx`, `dictionary.ts`, `I18nContext.tsx`,
`BookingLayout.tsx`, `legalEntity.ts`, `App.css`, `index.html` or any test file
this spec adds.

## Evidence: scenario-to-behavior spot check

command: node /tmp/opencode/spot-check.mjs   (real Chrome via CDP against `npm run build` output served by `vite preview`; each rendered value below is the product, then compared with the test's assertion)
exit: 0
at: 2026-11-08T16:52:04Z

[
  {
    "billingEnabled": false,
    "h1": "Your business runs on a spreadsheet only one person understands.",
    "h2_services": "What I build",
    "serviceTitles": ["Internal tools", "SaaS products", "Websites and apps"],
    "proofHrefs": ["https://github.com/RexiAI/tax-advisor", "https://github.com/RexiAI/pensions-system", "https://github.com/RexiAI/my-engineering-standards"],
    "proofTexts": ["tax-advisorAI tax guidance for Spanish freelancers.", "pensions-systemPension calculation, end to end.", "my-engineering-standardsThe engineering standard everything above is built against: spec pipeline, CI gates, mutation-tested."],
    "priceLine": "Free session: nothing is charged now.",
    "priceTag": "P",
    "durationGroup": false,
    "submit": "Book the free hour",
    "narrative": "The first hour is free. You describe the process that is eating your week; you leave with a one-page plan and a fixed price for the build. No charge, no obligation, no slide deck.",
    "cards": 3,
    "buttonsInServices": 0
  },
  {
    "billingEnabled": true,
    "h1": "Your business runs on a spreadsheet only one person understands.",
    "h2_services": "What I build",
    "serviceTitles": ["Internal tools", "SaaS products", "Websites and apps"],
    "proofHrefs": ["https://github.com/RexiAI/tax-advisor", "https://github.com/RexiAI/pensions-system", "https://github.com/RexiAI/my-engineering-standards"],
    "proofTexts": ["tax-advisorAI tax guidance for Spanish freelancers.", "pensions-systemPension calculation, end to end.", "my-engineering-standardsThe engineering standard everything above is built against: spec pipeline, CI gates, mutation-tested."],
    "priceLine": "1h free · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR",
    "priceTag": "P",
    "durationGroup": true,
    "submit": "Book and pay",
    "narrative": "First hour free. After that, 30 EUR per hour, prepaid — you pay for the block you book, nothing is metered afterwards.",
    "cards": 3,
    "buttonsInServices": 0
  }
]

Scenarios picked, and what the test actually asserts (not just that a test with
the matching ID passes):

| Scenario | Test | Assertion actually verified |
|---|---|---|
| AC-019-01 (first-time visitor gets `en`) | `AC-019-locale-default.test.ts:32-37` | `heading level 1` textContent `.toBe(EN_HEADLINE)`, `document.documentElement.lang` `.toBe('en')`, ES headline absent. Real assertion of the given/when/then. |
| AC-019-05 (hero CTA labels/targets) | `AC-019-hero.test.ts:41-54` | primary `href === '#booking'` and `textContent` `.toMatch(/^Book a free hour\s*→$/)`; secondary text `toBe('Email me')`, href `toBe('mailto:info@rexi-ai.com')`; `en.hero.ctaBooking` `toBe('Book a free hour')`. **Copy-critical check 1: the exact H1 and CTA string are asserted as literals, and the built page returns the same literal (see `h1` above).** |
| AC-019-09 (three cards, exact lines) | `AC-019-services.test.ts:58-75` | `cardTitles`/`cardLines` compared with `toEqual` against the three exact strings; old tags absent; no `img`/`svg`. |
| AC-019-12 (three real links, exact targets) | `AC-019-proof.test.ts:75-87` | per-anchor `href` `toBe` the exact GitHub URL, text `toContain` name and line, `target` `toBeNull()`. |
| AC-019-14 (bio only when supplied) | `AC-019-about.test.ts:80-106` | `''` → no `.about__bio` and no empty `<p>`; `'   '` → none; supplied bio → exactly one element with `textContent` `toBe(BIO)` and a `compareDocumentPosition` check that it follows the name. |
| AC-019-16 (paid price line) | `AC-019-booking-money-story.test.ts:83-112` | exactly one `<p>` whose `textContent === '1h free · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR'`, `closest('s, del, strike')` null, class contains neither `was` nor `line-through`, paid narrative exact, free narrative absent, submit name `Book and pay`. **Copy-critical check 2: the exact paid price line is asserted and the built paid page returns it unchanged (see `priceLine` above).** |

Also opened and read for coverage (not counted in the six): `AC-019-04` /
`AC-019-06` (`AC-019-hero.test.ts`), `AC-019-07`/`AC-019-08`
(`AC-019-free-banner-removed.test.ts`), `AC-019-11` (`AC-019-proof.test.ts`),
`AC-019-13` (`AC-019-about.test.ts`), `AC-019-17`/`AC-019-18`
(`AC-019-contact-email.test.ts`), `AC-019-19`/`AC-019-20`
(`AC-019-document-head.test.ts`), `AC-019-21`/`AC-019-22`
(`AC-019-locale-parity.test.ts`), `AC-019-24` (`AC-019-page-assembly.test.ts`).

Three spot-check findings (advisory, detailed in §Findings): AC-019-10's width
dimension is not actually exercised by its test; AC-019-18's
"changed dictionary" clause is only executed against `About`; AC-019-16's
document-wide "no `Tell me what is broken`" clause is asserted scoped to
`#booking`.

## Additional verifications

Each of these was executed; results are recorded verbatim.

**1. Retired string: old mailbox**

command: grep -rn "danielbueno76@gmail.com" src/ .env.example index.html
exit: 1
at: 2026-11-08T16:54:04Z

(no output — no match)

`.env.example:91` now reads `VITE_LEGAL_EMAIL=info@rexi-ai.com` (Open question 7).
`src/content/legalEntity.ts:35` is `const DEFAULT_EMAIL = 'info@rexi-ai.com'`.

**2. Retired string: old hero copy**

command: grep -rn "with or without AI" src/
exit: 0
at: 2026-11-08T16:54:04Z

src/__tests__/AC-019-hero.test.ts:13:const OLD_EN = "Forget your Excel. Let's automate, with or without AI."

This is the one deviation from the commanded check (which expected no output), and
it is **advisory, not blocking**: `OLD_EN` exists only so
`AC-019-hero.test.ts:36` can assert `container.textContent).not.toContain(OLD_EN)`.
The requirement itself holds — `grep -rn "Excel\|Automatiza\|automate" src/i18n/`
exits 1 (no dictionary string carries the retired copy) and the built page does
not contain it. Every other test in this spec assembles a retired string at
runtime (`['danielbueno','76'].join('')`, `['Free','Mode'].join('')`,
`['carou','sel'].join('')`) precisely so these greps stay clean; this one fixture
does not. See finding 2.

**3. Removed components / classes / machinery**

command: grep -rn "FreeModeBanner" src/           → exit 1 (no output)
command: grep -rn "ServicesCarousel\|services-carousel" src/ → exit 1 (no output)
command: grep -rn "free-banner" src/              → exit 0, one hit: a comment at src/__tests__/AC-019-free-banner-removed.test.ts:2
command: grep -rn "line-through\|<s>\|<del>\|<strike>" src/ | grep -v __tests__ → exit 1 (no output)
at: 2026-11-08T16:54:04Z

`.free-banner*` rules are gone from `src/App.css` (the whole block was deleted);
`.booking-pricing--free`, `.booking-pricing__was`, `.booking-pricing__free`,
`.booking-pricing-note`, `.booking-pricing-example` are gone from
`src/components/BookingWidget.css`. `src/components/FreeModeBanner.tsx`,
`src/components/ServicesCarousel.tsx` and `src/components/ServicesCarousel.css`
are deleted. `"Pay securely with Stripe"` remains **only** in
`src/i18n/dictionary.ts:228` (`stepsPaid`) and `:90` (ES `stepsPaid`) — required
paid-mode copy, and the free-mode step array does not contain it
(`dictionary.ts:227`, `:89`).

**4. Document head**

command: node --input-type=module -e "<jsdom extraction of index.html>"   (full script in the run log)
exit: 0
at: 2026-11-08T16:54:11Z

{
  "lang": "en",
  "title": "RexiAI — fixed-price software for teams stuck on spreadsheets",
  "description": "I replace the spreadsheet your business depends on with software that runs itself. Fixed price, scoped in one call, shipped in weeks. First hour free.",
  "og": {
    "og:type": "website",
    "og:title": "RexiAI — fixed-price software for teams stuck on spreadsheets",
    "og:description": "I replace the spreadsheet your business depends on with software that runs itself. Fixed price, scoped in one call, shipped in weeks. First hour free.",
    "og:url": "https://www.rexi-ai.com/",
    "og:site_name": "RexiAI",
    "og:locale": "en_GB",
    "og:locale:alternate": "es_ES",
    "og:image": "/logo.png"
  },
  "twitter": {
    "twitter:card": "summary_large_image",
    "twitter:title": "RexiAI — fixed-price software for teams stuck on spreadsheets",
    "twitter:description": "I replace the spreadsheet your business depends on with software that runs itself. Fixed price, scoped in one call, shipped in weeks. First hour free."
  },
  "canonical": "https://www.rexi-ai.com/",
  "hreflangs": [["x-default", "https://www.rexi-ai.com/"]],
  "charset": true,
  "icon": "/favicon.png",
  "viewport": true,
  "root": true,
  "script": "/src/main.tsx",
  "robots": false,
  "ldjson": 0,
  "ogTitleEqualsTitle": true,
  "twitterTitleEqualsTitle": true,
  "ogDescEqualsDescription": true,
  "twitterDescEqualsDescription": true
}

Every string in Task 9 is byte-identical; `og:title`/`twitter:title` equal
`<title>`, `og:description`/`twitter:description` equal `description`; the only
`hreflang` is `x-default`; no robots meta, no JSON-LD.

**5. Default locale and `<html lang>`**

Real Chrome, fresh profile, no stored preference, at 390/768/1440
(`node /tmp/opencode/verify-browser.mjs`, exit 0, at 2026-11-08T16:54:16Z):
`lang: "en"`, `h1: "Your business runs on a spreadsheet only one person understands."`
in all six measurements (two billing modes × three widths).
With `localStorage['rexi-locale']='es'` (`node /tmp/opencode/verify-es.mjs`,
exit 0, at 2026-11-08T16:54:24Z): `lang: "es"` and the ES H1 at 390/768/1440.
An unreadable `localStorage` falls back to English
(`src/__tests__/landing-units.test.ts:53-60`, which throws from
`Storage.prototype.getItem` and asserts the EN H1 and `lang === 'en'`).

**6. Proof links resolve**

command: for u in …; do curl -s -o /dev/null -w "%{http_code}  $u" -L --max-time 20 "$u"; done
exit: 0
at: 2026-11-08T16:54:04Z

200  https://github.com/RexiAI/tax-advisor
200  https://github.com/RexiAI/pensions-system
200  https://github.com/RexiAI/my-engineering-standards

**7. Three service cards at 390 / 768 / 1440 — real browser, built output**

Method: `npm run build`, served with `vite preview` on :4173, measured in
headless Chrome via CDP with `Emulation.setDeviceMetricsOverride` and
`getBoundingClientRect` / `getComputedStyle` (jsdom cannot evaluate layout, so
the jsdom test alone is not evidence for this criterion). Both billing modes.

| width | `.services-grid` computed columns | `article.service-card` | `documentElement.scrollWidth` vs `innerWidth` | overflowing elements | `#services button` | carousel/`aria-roledescription` |
|---|---|---|---|---|---|---|
| 390 | `342px` (1 col) | 3 | 390 = 390 | [] | 0 | 0 |
| 768 | `344.5px 344.5px` (2 cols) | 3 | 753 ≤ 768 (scrollbar) | [] | 0 | 0 |
| 1440 | `340px 340px 340px` (3 cols) | 3 | 1425 ≤ 1440 (scrollbar) | [] | 0 | 0 |

No horizontal overflow at any width, in either mode, and the same holds in
Spanish at 390/768/1440 (ES `scrollWidth` 390 / 753 / 1425, overflowing `[]`).
No inline `overflow-x: auto|scroll` on any element.

**8. Free mode hides the duration selector and posts `hours: 1`; paid mode keeps it**

Code: `src/components/booking/BookingLayout.tsx:75` renders
`{billingEnabled && <DurationField …/>}` — the fieldset is not rendered at all in
free mode (no `display:none`, no empty fieldset). `src/components/booking/hooks/useBookingFields.ts:10`
seeds `useState<number>(1)`, and `src/components/booking/hooks/useBookingSubmit.ts:20-31`
sends `hours` in the POST body. Tests: `src/__tests__/landing-units.test.ts:62-91`
— free mode asserts no `role=group` named `Duration`, no `2h` button, no
`.duration-group`, then fills the form, submits and asserts the captured fetch
body's `hours === 1`; paid mode asserts `.duration-group` exists and 1h–4h are
present and `5h` is not. Real browser confirms: `durationGroup: false` (free) /
`true` (paid), `submit: "Book the free hour"` / `"Book and pay"`.

**9. Dependencies, `any`, inline styles, focused tests**

command: git diff package.json           → empty (no dependency added or removed)
command: git diff --stat package-lock.json → empty
command: grep -rn ": any\b\|as any\|<any>\|any\[\]" <changed source files> → exit 1 (no output)
command: grep -rn "style={{" src --include=*.tsx | grep -v __tests__ → exit 1 (no output)
command: grep -rn "\.only(\|<test>.skip(\|it.todo\|xit(\|xdescribe(\|describe\.skip" src/__tests__ → one pre-existing `describe.skipIf(!LIVE)` (AC-006)
at: 2026-11-08T16:54:06Z

**10. Bookkeeping claim: "no test touched by the Refactorer"**

command: git diff --stat src/__tests__
exit: 0
at: 2026-11-08T16:54:06Z

 src/__tests__/AC-001-i18n.test.tsx                 | 22 +++++++++++++---
 src/__tests__/AC-002-frontend-confirmation.render.test.tsx |  4 +--
 src/__tests__/AC-002-landing-content.test.tsx      | 30 +++++++++++++++-------
 src/__tests__/AC-003-confirmation-panel.test.ts    |  3 ++-
 src/__tests__/AC-003-inflight-copy.test.ts         | 19 ++++++++++----
 src/__tests__/AC-007-reschedule-page.test.ts       |  4 ++-
 src/__tests__/AC-008-customer-name-form.test.tsx   |  3 +++
 src/__tests__/AC-011-booking-ui.test.tsx           |  3 +++
 src/__tests__/billing-free-mode.test.tsx           | 13 ----------
 src/__tests__/brand-home-link.test.tsx             |  6 +++--
 src/__tests__/privacy-page.test.tsx                |  3 +++
 11 files changed, 73 insertions(+), 37 deletions(-)

What this can and cannot prove: **the per-stage attribution cannot be checked
from VCS in this run** — the whole spec is one uncommitted working tree on top of
`24bd5ab` (`git log --oneline -1` = `24bd5ab chore: bump engineering standards
submodule to v1.51.1`), so there is no Coder commit and no Refactorer commit to
diff against. What *can* be checked, and was: all 11 modified test files are
exactly the files named in `10-tasks.md` §Test changes 1 and 2 (6 authorised by
Task 11 + 5 forced, with `AC-003-inflight-copy` / `AC-003-confirmation-panel` /
`AC-002-frontend-confirmation.render` counted once), every hunk in all 11 files
was read and maps to a row in those tables, no test file outside the tables was
modified, and no test file was deleted (`billing-free-mode.test.tsx` survives
with only its `FreeModeBanner` describe block removed). The 14 untracked files
under `src/__tests__/` are the 12 new AC-019 test files plus
`landing-units.test.ts` and `landing-harness.ts`. No hunk in the diff weakens an
assertion beyond the authorised change. See finding 13.

**11. Design-checklist greps**

command: grep -rn "overflow-x" src/ | grep -v __tests__ → one hit, `src/pages/Privacy.css:64` (not the landing)
command: grep -rn 'free-banner\|pricing--free\|pricing__was\|pricing__free\|pricing-note\|pricing-example' src/ → one hit, a comment in AC-019-free-banner-removed.test.ts
command: grep -rn "carousel" src/ | grep -v __tests__ → one hit, a prose comment in `src/components/Services.tsx:5`
command: node -e "<count dashes in dictionary.ts>" → `{"emDashCount":3,"enDashCount":0}`
at: 2026-11-08T16:54:06Z

The three `—` are the two `booking.narrativePaid` values (`dictionary.ts:88`,
`:226`) and one prose comment (`:7`); the exported dictionary values carry
exactly one em dash per locale, as Task 10 requires. Zero en dashes.

## No unaccounted behaviour

Finding line (not a command):

- **`public/services/{apps,consulting,saas,webs}.svg` deleted.** No task
  authorises it and Open question 4 forbids it — see blocking finding 1.
- `src/index.css` loses `--text-xs` (a token removal, not required by any task;
  its three consumers were all deleted with this spec) — advisory finding 3.
- `a:focus-visible, button:focus-visible { outline: … }` in `src/App.css` is a
  page-wide selector applied to every surface the app renders (`/privacy`, the
  result views, the reschedule flow), not just the landing. It is asked for by
  `15-design.md` §Accessibility but no acceptance scenario covers it — advisory
  finding 5.
- `.gitignore` gains `.vitest/` and `.prettierignore` gains `.vitest`; neither is
  traceable to a task in `10-tasks.md` (housekeeping for the gate scripts'
  reporter output) — advisory finding 4.
- `scroll-margin-top` is applied via `.landing > section` instead of the id list
  `15-design.md` prints; functionally equivalent and explained in the CSS
  comment. Not a finding.
- No other logic in the diff is unexplained: `Services`, `Proof`, `About`, the
  mode-selected narrative/steps in `Landing.tsx:30-31`, the `billingEnabled &&
  <DurationField/>` guard and the `submitFree` label all map to Tasks 4, 5, 6, 7
  and Open question 6.

## Findings

### Blocking

**1. `public/services/{apps,consulting,saas,webs}.svg` were deleted, against an
explicit "do not delete".**

- Exact files: `public/services/apps.svg`, `public/services/consulting.svg`,
  `public/services/saas.svg`, `public/services/webs.svg` — all `D` in
  `git status --short public/`; restore with
  `git checkout -- public/services/`.
- Instruction violated: `specs/019-english-first-landing/10-tasks.md:706-708`
  (Open question 4, resolved and binding): *"Service cards — TEXT ONLY. No new
  artwork. **Do not delete the existing `/services/*.svg` assets** (other
  references may exist), just stop rendering images on these three cards."* No
  task lists these files under "Files likely touched", and nothing in
  `10-tasks.md` or `15-design.md` authorises a deletion.
- Impact: no functional break — the only reference was the deleted
  `ServicesCarousel.tsx:135` (`/services/${s.id}.svg`) and no tracked file
  references those paths any more — but the files are gone from the tree and the
  instruction was unambiguous. This is not an "out-of-scope extra"; it is a
  prohibited deletion, so it needs the human's decision: restore the assets, or
  amend the tasks file to record that deleting them is now intended.

### Advisory

**2. `grep -rn "with or without AI" src/` is not clean** —
`src/__tests__/AC-019-hero.test.ts:13` holds the retired copy as a literal
(`const OLD_EN = "Forget your Excel. Let's automate, with or without AI."`). The
behavioural requirement (no dictionary string, nothing rendered) holds; the test
fixture merely could be assembled at runtime, as every other retired string in
this spec is, so that the commanded grep returns nothing.

**3. `src/index.css` was changed** (one line: `--text-xs: 12px` removed).
`15-design.md` §Locked foundation lists `--text-xs` in the type scale and the
Coder checklist asks for `git diff src/index.css` to be empty. Nothing references
`--text-xs` any more (its three consumers — `.free-banner__fineprint`,
`.booking-pricing-example`, `.booking-pricing-note` — were all deleted by this
spec), so the removal is harmless, but it is outside the stated "no token value
changed" boundary.

**4. `.gitignore` / `.prettierignore` gain `.vitest` entries** with no matching
task. Harmless housekeeping; recorded so it is not mistaken for spec behaviour.

**5. Global `a:focus-visible, button:focus-visible` rule in `src/App.css`**
changes focus styling on every surface (privacy page, result views, reschedule),
not only the landing. Asked for by `15-design.md` §Accessibility; no scenario
covers it.

**6. ES `#hero` is 566px tall at 390×844**, over the `15-design.md` Task 2 budget
of ≤560px (measured live: EN 505px, ES 566px; microcopy bottom 548/609 of 844, so
the "visible without scrolling" intent holds). This is the deviation the Coder
already recorded in `10-tasks.md` §5 finding 2, and my independent measurement
reproduces their number exactly (`node /tmp/opencode/verify-hero.mjs`, exit 0,
at 2026-11-08T16:54:27Z). Not an acceptance criterion.

**7. AC-019-10's width dimension is not exercised by its test.**
`src/__tests__/AC-019-services.test.ts:87-102` sets `window.innerWidth` via
`Object.defineProperty`, which does not drive CSS layout in jsdom; the assertion
(3 cards, 3 titles, no inline `overflow-x`) is width-invariant, so the test would
pass identically if a carousel track returned. The *behaviour* is correct — I
verified 1/2/3 computed grid columns and zero overflow in a real browser (§7) —
but the test as written does not prove the "at every width" clause it claims.

**8. AC-019-18's "dictionary changed to other@example.com → both anchors change"
clause is only executed against `About`.**
`src/__tests__/AC-019-contact-email.test.ts:84-95` re-renders `About` with a
modified dictionary; the hero and contact anchors are proven by source
inspection (`src/pages/Landing.tsx:61`, `:94` both read `dict.contact.email`) and
by their exact `href`s, not by a modified-dictionary render of `Landing`.

**9. AC-019-16's "the document contains no occurrence of `Tell me what is
broken`" is asserted scoped to `#booking`**
(`AC-019-booking-money-story.test.ts:109`). The acceptance text says
*document*, and binding Open question 9 renders that sentence as the contact
title in the same document, so the literal document-wide assertion is impossible.
The interpretation is recorded in `10-tasks.md` §4 item 2; the acceptance file
itself still reads document-wide and should be corrected at the next spec edit.

**10. `About` renders `dict.about.bio.trim()`** (`src/components/About.tsx:12`),
so a bio with leading/trailing whitespace is not rendered "verbatim" as Task 6
states. The tested value has no surrounding whitespace, so no scenario fails; the
`trim()` also drives the whitespace-only → absent rule, which is correct.

**11. `10-tasks.md` §5 finding 1 is not reproducible.** It claims
`src/__tests__/AC-019-email.test.ts` (spec 002's operator-email tests) already
uses `AC-019-01/02/03`. No such file exists (`ls src/__tests__/AC-019-email.test.ts`
→ not found) and no `AC-019-01/02/03` ID occurs outside this spec's own test
files. The recorded collision should be struck.

**12. Numbering is inconsistent in the artifacts**: the folder and all scenario
IDs are `019`, but `10-tasks.md:1` is titled "010", the body says "spec 010"
throughout, and source comments say `spec 010` (e.g.
`src/pages/Landing.tsx:27`, `src/components/booking/BookingLayout.tsx:15`). The
`--spec 010` comments are harmless; the stale title invites the wrong archive
slug later.

**13. Stage attribution is not verifiable from VCS.** Everything this spec
changes is uncommitted on top of `24bd5ab`; there is no Coder commit and no
Refactorer commit. The claim "no test touched by the Refactorer" therefore cannot
be confirmed or refuted with git. What is confirmable, and confirmed: the 11
modified test files are exactly the authorised set and every hunk matches the
record (§10). If stage attribution is meant to be auditable, the tail stages need
per-stage commits — a pipeline-level concern, not this spec's.

**14. Out of scope, recorded not fixed:** an untracked `.env.bak-rexi-20261025132256`
sits at the repo root containing `EMAIL_TO=danielbueno76@gmail.com` and other
environment values. It is gitignored (`.gitignore:57 .env*`) and outside `src/`,
so it is not a spec finding — but it is a plaintext env backup with credentials
in a working tree, worth deleting by hand.

## Telemetry

command: bash .standards/scripts/record-gate-run.sh -f "$PWD/runs.jsonl"  (record on stdin)
exit: 0
at: 2026-11-08T16:54:52Z

record-gate-run: appended record to /home/dbueno/projects/rexiAI/runs.jsonl

Record fields: `specSlug: 019-english-first-landing`,
`gatesFailed: ["unaccounted"]`, 15 warning strings (the blocking finding's summary
plus the 13 advisories and this tooling note), `outcome: "fail"`,
`durationSec` from the run clock.

Tooling note, recorded rather than hidden: the helper resolves its repo root from
its own location, so invoked as `.standards/scripts/record-gate-run.sh` from a
child repo it appends to `.standards/runs.jsonl` (a tracked file in the standards
submodule), not to the child repo's `runs.jsonl`. That append was reverted
(`git -C .standards checkout -- runs.jsonl`, submodule clean afterwards) and the
record written with `-f <child-repo>/runs.jsonl`. A child repo must pass `-f`.

## Verdict

**FAIL** — one blocking finding (deleted `public/services/*.svg`, against binding
Open question 4), plus advisory findings 2–14 above.

The five contract checks themselves all pass: traceability exit 0, the full suite
93 files / 621 passing / 1 pre-existing skip, `npm run lint` 0 errors with every
changed function ≤5 cyclomatic complexity, the design-principles gate 0 FAIL /
210 WARN (one WARN on a changed file: `Landing` KISS line count), and the
scenario-to-behaviour spot check holds on both copy-critical strings. The FAIL is
for a scope violation outside those gates, not for a red gate.

Attempt: 1, phase 1 — no remediation round has been run yet.

---

## Attempt 2 — scoped re-verification

**This section supersedes attempt 1's verdict. Current verdict: PASS (attempt 2, phase 1).**

- **attempt:** 2, phase 1
- **scope:** the blocking finding (deleted `public/services/*.svg`) and the
  numbering advisory (attempt-1 finding 12). Everything else stands on attempt
  1's evidence and was not re-executed — per `docs/SPEC_PIPELINE.md`
  §Re-verification, a re-trigger re-runs only the gates that failed.
- **attempt-1 report preserved above, unedited.**

### Evidence: public/services restored (attempt 2)

command: git status --porcelain public/services
exit: 0
at: 2026-11-08T16:55:54Z

(no output — empty, as required)

Tracked and present, byte-identical to `HEAD` (a tracked file with no
modification produces no porcelain line):

public/services/apps.svg
public/services/consulting.svg
public/services/saas.svg
public/services/webs.svg

`git diff --stat public/` is also empty. Blocking finding 1 is resolved: the
"do not delete" in `10-tasks.md:706-708` (Open question 4) is satisfied again.

### Evidence: stray spec-number references (attempt 2)

command: grep -rn "spec 010\|spec-010\|# 010 —" src/ specs/019-english-first-landing/10-tasks.md specs/019-english-first-landing/15-design.md
exit: 1
at: 2026-11-08T16:55:54Z

(no output — no match)

`specs/019-english-first-landing/00-informal.md` was checked with
`grep -l` (filename-only, no line content) so the information barrier holds:

command: grep -l "spec 010\|spec-010\|# 010 —" specs/019-english-first-landing/00-informal.md
exit: 1
(no output — no match; file content not read)

The fix landed where attempt 1 pointed: `10-tasks.md:1` is now
`# 019 — English-first landing relaunch: tasks`, `src/pages/Landing.tsx:27`
reads `(spec 019 Task 7)`, `src/components/booking/BookingLayout.tsx:15` reads
`Since spec 019 the idle free label …`. 18 `spec 019` occurrences in `src/`;
zero `010` tokens remain in any file this spec creates or changes
(`grep -rn "010" <changed source files>` → exit 1). Advisory finding 12 is
resolved.

### Evidence: full test suite (attempt 2)

command: npm test
exit: 0
at: 2026-11-08T16:55:58Z

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  93 passed (93)
      Tests  621 passed | 1 skipped (622)
   Start at  17:55:58
   Duration  16.70s (environment 68%, tests 17%, setup 7%, transform 4%, import 3%, worker 1%)

Unchanged from attempt 1: 93 files / 621 passing / 1 skipped, and the skip is
still the pre-existing `describe.skipIf(!LIVE)` in `AC-006-bot-adapter.test.ts:705`.

### Evidence: complexity gate (attempt 2)

command: npm run lint
exit: 0
at: 2026-11-08T16:56:20Z

✖ 11 problems (0 errors, 11 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.

Same 11 pre-existing warnings as attempt 1, all in `api/bookings/checkout.ts`
and `tests/e2e/*`. No changed function gained complexity: per-function values
were 2/3/4/4/4/5 in attempt 1 and no changed source line moved in this fix
(the two edits are comments — see the test-diff guard below), so the ≤6 rule
holds without re-forcing the threshold.

### Evidence: format check (attempt 2)

command: npm run format:check
exit: 0
at: 2026-11-08T16:56:24Z

> rexiai-website@0.0.0 format:check
> prettier --check .

Checking formatting...
All matched files use Prettier code style!

### Evidence: build (attempt 2)

command: npm run build
exit: 0
at: 2026-11-08T16:56:28Z

vite v8.3.1 building client environment for production...
✓ 48 modules transformed.
dist/index.html                   1.93 kB │ gzip:  0.61 kB
dist/assets/index-5JNv8OKY.css   12.35 kB │ gzip:  2.54 kB
dist/assets/index-CweKhoYg.js   261.68 kB │ gzip: 82.92 kB
✓ built in 160ms

(`npm run build` is `tsc -b && vite build`, so the TypeScript gate attempt 1
recorded separately is covered here too.)

### Evidence: design-principles gate (attempt 2)

command: bash .standards/scripts/check-code-principles.sh
exit: 0
at: 2026-11-08T16:56:21Z

---------------------------------------------
✔ Design-principles check: 0 FAIL(s), 210 WARN(s).
  WARNs are review hints — verify each before merging.

Identical to attempt 1: 0 FAIL, 210 WARN, and the same single WARN on a file
this spec touches —

WARN Method body >20 lines (node): ./src/pages/Landing.tsx:14:110:Landing:KISS_LINES=87

(no new WARN in any spec-019 file; the other 209 are pre-existing `api/*`,
`src/domain/*`, `src/pages/Privacy.tsx`, `src/content/privacy.ts`, `scripts/*`,
`.standards/*`). The full 210-line list is the attempt-1 block above and did not
change.

### Evidence: scenario traceability (attempt 2)

command: bash .standards/scripts/check-scenario-traceability.sh
exit: 0
at: 2026-11-08T16:56:20Z

PASS AC-019-22 — traced to a test
PASS AC-019-23 — traced to a test
PASS AC-019-24 — traced to a test

✔ Scenario traceability check: every scenario traced, every reference resolves.

All 24 `AC-019-*` scenarios still traced; the two fixes touched no scenario ID
and no test.

### Guard: the fix did not move any test or production behaviour

command: git status --short ; git diff --stat src/__tests__ ; git diff --stat public/
exit: 0
at: 2026-11-08T16:56:39Z

- `public/services` no longer appears in `git status --short` (restored).
- `git diff --stat src/__tests__` → `11 files changed, 73 insertions(+), 37 deletions(-)`
  — byte-for-byte the same summary as attempt 1: **no test was added, edited or
  removed by the fix.**
- `git diff --stat public/` → empty.
- The intended deletions remain deleted: `FreeModeBanner.tsx`,
  `ServicesCarousel.tsx`, `ServicesCarousel.css`. `About.tsx`, `Proof.tsx`,
  `Services.tsx` remain new.
- The only working-tree deltas versus attempt 1 are the four restored SVGs and
  comment/title text (`spec 010` → `spec 019`, `# 010 —` → `# 019 —`); the
  suites, lint, format and build all confirm no behavioural drift.

### Advisory status

| # (attempt 1) | Item | Status |
|---|---|---|
| 1 | deleted `public/services/*.svg` | **CLOSED** — restored and tracked, `git status --porcelain public/services` empty |
| 12 | numbering mixes 010 / 019 | **CLOSED** — no `spec 010` / `spec-010` / `# 010 —` anywhere in `src/`, `10-tasks.md`, `15-design.md` or `00-informal.md`; 18 `spec 019` references |
| 2 | `AC-019-hero.test.ts:13` keeps the retired hero copy as a literal, so `grep "with or without AI" src/` is not clean | OPEN — not in this round's scope, stands as recorded |
| 3 | `src/index.css` drops `--text-xs`, outside the locked "no token change" boundary | OPEN — `src/index.css` still modified in the working tree |
| 4 | `.gitignore` / `.prettierignore` `.vitest` entries with no task | OPEN |
| 5 | global `a:focus-visible, button:focus-visible` styles every surface | OPEN |
| 6 | ES `#hero` 566px > 15-design's ≤560px budget | OPEN (design-file budget, not an acceptance criterion) |
| 7 | AC-019-10's width dimension not exercised in jsdom | OPEN (behaviour verified in a real browser at attempt 1) |
| 8 | AC-019-18's modified-dictionary clause only runs against `About` | OPEN |
| 9 | AC-019-16's "Tell me what is broken" asserted scoped to `#booking` | OPEN |
| 10 | `About` trims `about.bio` | OPEN |
| 11 | `10-tasks.md` claim of an `AC-019-email.test.ts` ID collision is not reproducible | OPEN — the Test changes record still carries it |
| 13 | per-stage test attribution not verifiable from VCS (no Coder/Refactorer commits) | OPEN — structural to one-working-tree runs |
| 14 | untracked `.env.bak-rexi-*` at repo root | OPEN — out of scope, gitignored |

None of the open items is a FAIL or BLOCK: items 2–11 are advisory WARN-level
observations already routed to the Architect, 13 is a pipeline-process note and
14 is outside this spec.

### Verdict

Verdict: PASS (attempt 2, phase 1)

The blocking finding is resolved with direct evidence: all four
`public/services/*.svg` are tracked and unmodified
(`git status --porcelain public/services` empty, `git diff --stat public/` empty),
so Open question 4's "do not delete" holds again. The numbering advisory is
resolved: zero `spec 010` / `spec-010` / `# 010 —` references remain, and the
tasks title now reads `# 019`. Every gate re-run in this round is green — suite
93/621/1-skip, lint 0 errors, prettier clean, build clean (includes `tsc -b`),
design-principles 0 FAIL / 210 pre-existing WARN, traceability 24/24 — and the
fix touched no test and no production behaviour.

Attempt 2, phase 1 — one remediation round consumed (of 3), 11 advisories remain
open and routed to the Architect.
