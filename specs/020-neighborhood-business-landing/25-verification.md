# 25-verification — spec 020-neighborhood-business-landing

Attempt 1, phase 1 (full run). Mode: full, not autopilot.
Overall verdict: **PASS**

Gates failed: none. Routing: none required.

## Evidence: scenario traceability

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-11-24T08:50:28Z

{
  "checks": [1, 2],
  "passes": ["AC-020-01 — traced to a test", "AC-020-02 — traced to a test", "AC-020-03 — traced to a test", "AC-020-04 — traced to a test", "AC-020-05 — traced to a test", "AC-020-06 — traced to a test", "AC-020-07 — traced to a test", "AC-020-08 — traced to a test", "AC-020-09 — traced to a test", "AC-020-10 — traced to a test", "AC-020-11 — traced to a test", "AC-020-12 — traced to a test", "AC-020-13 — traced to a test", "AC-020-14 — traced to a test", "AC-020-15 — traced to a test", "AC-020-16 — traced to a test", "AC-020-17 — traced to a test", "AC-020-18 — traced to a test", "AC-020-19 — traced to a test", "AC-020-20 — traced to a test", "AC-020-21 — traced to a test", "AC-020-22 — traced to a test", "AC-020-23 — traced to a test", "AC-020-24 — traced to a test", "AC-020-25 — traced to a test", "AC-020-26 — traced to a test", "AC-020-27 — traced to a test"],
  "fails": []
}

Verdict: PASS (27/27 scenario IDs AC-020-01…27 traced, fails: []).

## Evidence: full test suite

command: npm test   (vitest run --exclude '.standards/**')
exit: 0
at: 2026-11-24T08:50:30Z

 Test Files  106 passed (106)
      Tests  658 passed | 1 skipped (659)

Skipped: 1 — pre-existing conditional skip `describe.skipIf(!LIVE)` in
src/__tests__/AC-006-bot-adapter.test.ts (live-bot, needs credentials; ffmpeg is
installed so AC-006-recording-output's skipIf does not trigger). Not a spec-020
test; no `.skip/.only/.todo` in any AC-020 test.

Supporting checks (same run):

command: npm run build
exit: 0
at: 2026-11-24T08:51:22Z
dist/assets/index-Cp68o4Ka.css   15.06 kB │ gzip:  2.96 kB
dist/assets/index-Trb5VvaX.js   273.48 kB │ gzip: 86.92 kB

✓ built in 313ms

command: npm run format:check
exit: 0
Checking formatting...
All matched files use Prettier code style!

command: npm run lint
exit: 0
✖ 14 problems (0 errors, 14 warnings)   (no-console warnings in tests/e2e/*.e2e.ts scripts)

E2E journey against local preview:

command: npx vite preview --port 4173 --strictPort & REXI_E2E_SITE_URL=http://localhost:4173 node tests/e2e/landing.e2e.ts
exit: 0
at: 2026-11-24T08:52:07Z

2026-11-24T08:52:09.145Z [e2e:landing] ok: AC-020-26: the FAQ renders 4 pairs (got 4)
2026-11-24T08:52:09.154Z [e2e:landing] ok: AC-020-26: the nav label is Hablemos (got "Hablemos")
2026-11-24T08:52:09.157Z [e2e:landing] ok: AC-020-27: exactly one service offer (got 1)
2026-11-24T08:52:09.159Z [e2e:landing] ok: AC-020-27: the primary CTA targets #booking (got "#booking")
2026-11-24T08:52:09.186Z [e2e:landing] ok: AC-020-27: the primary CTA is clickable
2026-11-24T08:52:09.187Z [e2e:landing] ok: AC-020-27: the CTA reaches #booking (hash "#booking", inViewport true)
2026-11-24T08:52:09.206Z [e2e:landing] ok: AC-020-27: the EN switcher is present
2026-11-24T08:52:09.218Z [e2e:landing] ok: AC-020-27: the English headline is "You tell me. I build it." (got "You tell me. I build it.")
2026-11-24T08:52:09.219Z [e2e:landing] ok: AC-020-27: the document title changes with the locale
2026-11-24T08:52:09.253Z [e2e:landing] ok: AC-020-27: the ES switcher is present
2026-11-24T08:52:09.262Z [e2e:landing] ok: AC-020-27: the Spanish title returns (got "RexiAI: apps a medida para plomeros y tiendas de Miami")
2026-11-24T08:52:09.262Z [e2e:landing] AC-020-23…27 PASSED

Verdict: PASS.

## Evidence: complexity gate

Refactorer ran no complexity linter; independently run here.

command: npx eslint --rule '{"complexity":["error",6]}' src/__tests__/AC-001-i18n.test.tsx src/__tests__/AC-002-landing-content.test.tsx src/__tests__/AC-011-booking-ui.test.tsx src/__tests__/AC-019-about.test.ts src/__tests__/AC-019-booking-money-story.test.ts src/__tests__/AC-019-contact-email.test.ts src/__tests__/AC-019-document-head.test.ts src/__tests__/AC-019-hero.test.ts src/__tests__/AC-019-locale-default.test.ts src/__tests__/AC-019-locale-parity.test.ts src/__tests__/AC-019-page-assembly.test.ts src/__tests__/AC-019-proof.test.ts src/__tests__/AC-019-retire-superseded-tests.test.ts src/__tests__/AC-019-services.test.ts src/__tests__/landing-harness.ts src/__tests__/landing-units.test.ts src/__tests__/privacy-page.test.tsx src/components/About.tsx src/components/Services.tsx src/i18n/dictionary.ts src/pages/Landing.tsx src/__tests__/AC-020-about.test.ts src/__tests__/AC-020-document-head.test.ts src/__tests__/AC-020-e2e-landing.test.ts src/__tests__/AC-020-faq.test.ts src/__tests__/AC-020-hero.test.ts src/__tests__/AC-020-locale-parity.test.ts src/__tests__/AC-020-nav.test.ts src/__tests__/AC-020-pricing.test.ts src/__tests__/AC-020-proof.test.ts src/__tests__/AC-020-services.test.ts src/__tests__/landing-020-units.test.ts src/components/BookingSection.tsx src/components/Faq.tsx src/components/Footer.tsx src/components/Hero.tsx src/components/Nav.tsx src/components/Pricing.tsx tests/e2e/landing.e2e.ts 
exit: 0
at: 2026-11-24T08:52:23Z


✖ 4 problems (0 errors, 4 warnings)

Verdict: PASS on all changed/added .ts/.tsx files (0 complexity errors).

Out-of-scope finding (repo-wide run, not part of this change):

command: npx eslint --rule '{"complexity":["error",6]}' src tests
exit: 1
at: 2026-11-24T08:51:06Z

/home/dbueno/projects/rexiAI/tests/e2e/auto-record-lib.mjs
  326:8  error  Async function 'joinMeeting' has a complexity of 7. Maximum allowed is 6  complexity

tests/e2e/auto-record-lib.mjs is untouched by spec 020 (last commit 2a4de00,
pre-existing). Recorded, not fixed; propose a follow-up spec.

## Evidence: design-principles gate

command: .standards/scripts/check-code-principles.sh --json
exit: 0
at: 2026-11-24T08:51:43Z

WARN: Method body >20 lines (node): ./src/pages/Landing.tsx:19:53:Landing:KISS_LINES=31
WARN: Method body >20 lines (node): ./src/components/Nav.tsx:14:41:Nav:KISS_LINES=29
WARN: Method body >20 lines (node): ./src/components/BookingSection.tsx:6:42:BookingSection:KISS_LINES=36
WARN: SRP: possible god file (node) — ./src/i18n/dictionary.ts: 402 lines, 0 methods (split by responsibility)
fails: []  total warns (repo-wide incl. .standards): 216

Verdict: PASS (no FAIL). WARNs above (changed files only, verbatim) flagged to
the Architect: Landing/Nav/BookingSection component bodies >20 lines;
dictionary.ts 402 lines (god-file heuristic). Remaining WARNs are in
.standards/ and pre-existing files.

## Evidence: scenario-to-behavior spot check

command: manual read of 20-acceptance/AC-020-05-pricing.md, AC-020-07-faq.md vs src/__tests__/AC-020-pricing.test.ts, AC-020-faq.test.ts; plus git diff src/__tests__/AC-019-hero.test.ts
exit: 0
at: 2026-11-24T08:52:30Z

- AC-020-14: test asserts 'desde $1,200', 'desde $600/mes' (ES), 'from $1,200',
  'from $600/month' (EN), $1,200/$600 present — matches Then clauses.
- AC-020-15: asserts no '30 EUR', /\bEUR\b/, '€', 'por hora', 'per hour', hourly
  ladder, milestone line in dictionaries/booking strings/rendered landing; asserts
  /llamada gratis|call free/ — matches.
- AC-020-19: asserts exactly 4 pairs per locale, the four topics, no '%', no
  '99.9', only allowed amounts, no Nx metric — matches.
- Spec-019 test rewrites (17 files under src/__tests__, IDs preserved): e.g.
  AC-019-hero now asserts 'You tell me. I build it.' instead of the spreadsheet
  headline. 10-tasks.md §"Retired offer copy" and Task 9 explicitly retire the
  prior offer copy/ids, and AC-020-01 specifies the new hero. These are
  requirement changes from spec 020, not defect-encoding edits
  (docs/TESTING.md §Tests That Encode a Defect does not apply).

Verdict: PASS.

## No unaccounted behavior

Finding: new components Hero, Nav, Faq, Pricing, Footer, BookingSection map to
Tasks 1–8; dictionary/index.html changes map to Tasks 4 and 9; landing-harness
and landing-020-units helpers are test support. No logic found that does not
trace to a task. Pre-existing ` M .standards` pointer excluded from scope.

## Telemetry

command: .standards/scripts/record-gate-run.sh -record '{specSlug 020…, outcome pass, durationSec 148}' → exit 0 (appended to runs.jsonl).

---

# Re-verification — attempt 2, phase 1 (owner-requested refactor round, not a BLOCK)

Trigger: owner-requested refactor (Landing/Nav/BookingSection split into
LandingSections, ContactSection, NavLinks, NavMeta, BookingIntro, BookingSteps;
dictionary.ts split into src/i18n/locales/{es,en}.ts; joinMeeting in
tests/e2e/auto-record-lib.mjs reduced to complexity 6; AC-019-18 test now reads
ContactSection.tsx). SPEC_LOOP_COUNT=1, SPEC_PHASE1_RETRIES=0,
SPEC_PHASE2_RETRIES=0. Full gate re-run (refactor touched every area).

## Evidence: scenario traceability (attempt 2)

command: .standards/scripts/check-scenario-traceability.sh --json
exit: 0
at: 2026-11-24T09:01:16Z

  "fails": []
(27 unique AC-020-NN IDs in passes, AC-020-01…27 — "traced to a test")

Verdict: PASS.

## Evidence: full test suite (attempt 2)

command: npm test
exit: 0
at: 2026-11-24T08:59:54Z

      Tests  658 passed | 1 skipped (659)

command: npm run lint
exit: 0
at: 2026-11-24T09:00:35Z

✖ 14 problems (0 errors, 14 warnings)   (no-console warnings in tests/e2e/*.e2e.ts)

command: npm run build
exit: 0
at: 2026-11-24T09:00:44Z

dist/assets/index-DzIIbBqw.js   273.82 kB │ gzip: 87.12 kB
✓ built in 295ms

command: npm run format:check
exit: 0
at: 2026-11-24T09:00:53Z

All matched files use Prettier code style!

command: npx vite preview --port 4173 --strictPort & REXI_E2E_SITE_URL=http://localhost:4173 node tests/e2e/landing.e2e.ts
exit: 0
at: 2026-11-24T09:01:44Z

2026-11-24T09:01:45.330Z [e2e:landing] ok: AC-020-27: the Spanish title returns (got "RexiAI: apps a medida para plomeros y tiendas de Miami")
2026-11-24T09:01:45.330Z [e2e:landing] AC-020-23…27 PASSED

Note: 1 skipped test is unchanged from attempt 1. Verdict: PASS.

## Evidence: complexity gate (attempt 2)

command: npx eslint --rule '{"complexity":["error",6]}' src tests
exit: 0
at: 2026-11-24T09:00:59Z

✖ 14 problems (0 errors, 14 warnings)   (all no-console; zero complexity errors)

Attempt-1 finding (joinMeeting complexity 7, auto-record-lib.mjs:326) is
resolved. Verdict: PASS.

## Evidence: design-principles gate (attempt 2)

command: .standards/scripts/check-code-principles.sh --json
exit: 0
at: 2026-11-24T09:01:22Z

  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests", "comments", "naming", "null-discipline"],
  "fails": [],

WARNs on spec-020 changed files: none (grep for Landing, Nav*, Booking*,
ContactSection, locales, component-per-file, auto-record returned no WARN).
The attempt-1 WARNs (Landing/Nav/BookingSection KISS_LINES, dictionary.ts god
file) are gone. NavLinks.tsx: one exported component (`export function NavLinks`
line 21); the second component is module-private, and component-per-file
emitted no finding. Remaining WARNs are pre-existing files and .standards/.
Verdict: PASS.

## Evidence: scenario-to-behavior spot check (attempt 2)

command: manual read of src/__tests__/AC-019-contact-email.test.ts (AC-019-18) + git diff of that file
exit: 0
at: 2026-11-24T09:01:30Z

    const landing = repoFile('src/pages/Landing.tsx')
    expect(landing).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
    const contact = repoFile('src/components/ContactSection.tsx')
    expect(contact).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
    expect(contact).toContain('dict.contact.email')

Assertion intent preserved: "address comes from the dictionary, never a JSX
literal" is still asserted on Landing.tsx (no literal) and now also on the file
that renders the contact block (no literal + reads dict.contact.email). The
assertion moved with the code, it was not weakened; scenario ID kept. The
attempt-1 spot checks (AC-020-14/15/19) stand — the e2e run re-exercises
AC-020-23…27 against the built site. Verdict: PASS.

## No unaccounted behavior (attempt 2)

Finding: new files LandingSections, ContactSection, NavLinks, NavMeta,
BookingIntro, BookingSteps, i18n/locales/{es,en}.ts are structural extractions
of attempt-1 code (Tasks 1–9); no new behavior observed. auto-record-lib.mjs
change is a complexity reduction outside spec 020 scope, requested by owner.

## Verdict (attempt 2, phase 1): PASS

All gates exit 0 with no findings. Routing: proceed to stage 5a (Mutation
Runner). No remediation needed; phase-1 budget unconsumed.
