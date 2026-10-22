# 25-verification.md — Spec 004: Auto-record, transcribe, extract insights

Stage 4 (Verifier) — independent re-execution of every stage 2+3 claim.
Branch: `spec/004-auto-record-transcribe-insights` (checked out; no branch switch,
no commit, no push, no fix by the Verifier).
Attempt 1, phase 1 (full run — first verification of this spec).
Verification target: the UNCOMMITTED stage 2+3 output (9 modified tracked files +
new untracked `scripts/recording/` (7 `.mjs`), `deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua`,
`e2e.config.ts`, `tests/e2e/` (2 journeys), `src/__tests__/AC-004-*.test.ts` (8) +
`src/__tests__/recording-harness.ts`) against `10-tasks.md` (8 tasks, 13 decisions)
and `20-acceptance/` (34 scenarios AC-004-20…53, 8 files).
Information barrier honored: `00-informal.md` was NOT read.

## Overall verdict

**PASS** (attempt 1, phase 1).

| # | Check | Result | Exit |
|---|---|---|---|
| 1 | Scenario traceability | PASS — 34 live IDs, all traced; every reference resolves | 0 |
| 2 | Full test suite | PASS — 38 files / 228 tests, 0 skipped | 0 |
| 3 | Complexity gate (lint + tsc + build) | PASS — 0 / 0 / 0 | 0 |
| 4 | Design-principles gate | PASS — scoped `-BaseRef main` exit 0 (0 FAIL / 0 WARN); unscoped exit 1 adjudicated OUT-OF-SCOPE (sole FAIL = vendored cobalt-01, 002/003 precedent) | 0 (scoped, authoritative) / 1 (unscoped, adjudicated) |
| 5 | Scenario-to-behavior spot check (AC-004-42, AC-004-44) | PASS — assertions genuinely enforce every Then-clause | 0 |
| — | No unaccounted behavior | PASS (finding line below; nothing untraced) | — |

Mandatory 004-specific audits (a)–(g): all ruled PASS / recorded — details in §Audits.
Gates failed: **none**. BLOCKs relayed this phase: **0 of 3** (phase-1 budget untouched).

Stage 1.5 confirmation: no `15-design.md` (SKIPPED — no frontend surface), and the
change set ships **no frontend surface**: zero modified files under `src/components/`,
`src/pages/`, or any non-test `src/` path (`git diff main --name-only -- src/ ':!src/__tests__'`
→ empty; see audit (d)). The skip was correct.

## Evidence: scenario traceability

command: bash .standards/scripts/check-scenario-traceability.sh
exit: 0
at: 2026-10-21T23:44:29Z

```
Scenario IDs found: 34 live, 109 archived

PASS AC-004-20 — traced to a test
PASS AC-004-21 — traced to a test
PASS AC-004-22 — traced to a test
PASS AC-004-23 — traced to a test
PASS AC-004-24 — traced to a test
PASS AC-004-25 — traced to a test
PASS AC-004-26 — traced to a test
PASS AC-004-27 — traced to a test
PASS AC-004-28 — traced to a test
PASS AC-004-29 — traced to a test
PASS AC-004-30 — traced to a test
PASS AC-004-31 — traced to a test
PASS AC-004-32 — traced to a test
PASS AC-004-33 — traced to a test
PASS AC-004-34 — traced to a test
PASS AC-004-35 — traced to a test
PASS AC-004-36 — traced to a test
PASS AC-004-37 — traced to a test
PASS AC-004-38 — traced to a test
PASS AC-004-39 — traced to a test
PASS AC-004-40 — traced to a test
PASS AC-004-41 — traced to a test
PASS AC-004-42 — traced to a test
PASS AC-004-43 — traced to a test
PASS AC-004-44 — traced to a test
PASS AC-004-45 — traced to a test
PASS AC-004-46 — traced to a test
PASS AC-004-47 — traced to a test
PASS AC-004-48 — traced to a test
PASS AC-004-49 — traced to a test
PASS AC-004-50 — traced to a test
PASS AC-004-51 — traced to a test
PASS AC-004-52 — traced to a test
PASS AC-004-53 — traced to a test

✔ Scenario traceability check: every scenario traced, every reference resolves.
```

Machine-readable transcript (`--json`, run at 2026-10-21T23:44:42Z, exit 0):
`{"checks":[1,2],"passes":[…34 entries, AC-004-20…53 each "— traced to a test"…],"fails":[]}`.

Claim confirmed: exit 0, 34 live IDs — every stage-1 FAIL (34 untraced IDs, per
10-tasks.md §Traceability verification record) is now traced by the Coder's tests;
check 2 resolves every citation (incl. the legacy AC-004-01…06 pricing citations
via `docs/changes/001-landing-booking.md`).

## Evidence: full test suite

command: npm test
exit: 0
at: 2026-10-21T23:45:00Z

```
> rexiai-website@0.0.0 test
> vitest run --exclude '.standards/**'

 RUN  v5.0.1 /home/dbueno/projects/rexiAI

 Test Files  38 passed (38)
      Tests  228 passed (228)
   Start at  01:44:53
   Duration  7.44s (environment 67%, tests 16%, setup 7%, transform 5%, import 3%, worker 1%)
```

Claim confirmed: exit 0, 38 files / 228 tests. Skip/disable audit:
`grep -Ei "skip|todo|only"` over the full vitest log → **zero hits** — no skipped,
disabled, or filtered tests; the 228 count is real execution, not a silent subset.

## Evidence: complexity gate

command: npm run lint && npx tsc -b && npm run build   (each also run individually, exits/timestamps below)
exit: 0
at: 2026-10-21T23:45:44Z

```
$ npm run lint        (eslint .)          → EXIT=0  at 2026-10-21T23:45:17Z   (zero findings)
$ npx tsc -b                              → EXIT=0  at 2026-10-21T23:45:31Z   (zero output)
$ npm run build       (tsc -b && vite build) → EXIT=0 at 2026-10-21T23:45:44Z

vite v8.3.1 building client environment for production...
✓ 43 modules transformed.
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-RxdbQujM.css   11.56 kB │ gzip:  2.50 kB
dist/assets/index-D7lmfMI7.js   242.12 kB │ gzip: 75.62 kB
✓ built in 162ms
```

Claims confirmed: 0 / 0 / 0. Note (see audit (a)): `eslint .` exit 0 does NOT prove
CC≤6 for the new `.mjs` units — the repo config's `complexity` rule does not match
`**/*.mjs`. Independent CC re-measurement was performed under audit (a): max CC = 6.

## Evidence: design-principles gate

command: bash .standards/scripts/check-code-principles.sh -BaseRef main --json
exit: 0
at: 2026-10-21T23:47:12Z

```
{
  "tier": "mvp",
  "gates": ["complexity", "dry", "yagni", "solid", "component-per-file", "property-tests"],
  "fails": [],
  "warns": []
}
```

The authoritative blame-scoped run (`-BaseRef main`, the same authority the
002/003 precedents used) exits **0 with 0 FAIL / 0 WARN** — the change itself
introduces no design-principles finding. Claim confirmed.

Unscoped run (`bash .standards/scripts/check-code-principles.sh --json`,
at 2026-10-21T23:46:29Z, **exit 1**) — full transcription:

```
tier: "mvp"; gates: ["complexity","dry","yagni","solid","component-per-file","property-tests"]
fails (exactly 1):
FAIL Cyclomatic complexity >6 (node): ./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10
warns (exactly 22):
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
```

### RULING on the unscoped exit 1 (002/003 precedent + Stop-and-Ask matrix)

The sole unscoped FAIL is `./.standards/skills/hallmark/site/examples/cobalt-01/script.js:7:90::CC=10`
— a vendored example file inside the `.standards` git submodule, byte-identical to
the file that failed the spec-002 and spec-003 unscoped runs (003 archive
§RULING; runs.jsonl runId 2836ee65). Submodule-untouched evidence gathered at
2026-10-21T23:48:13Z:

```
$ git diff main -- .standards                       → empty (pointer unchanged vs main)
$ git submodule status .standards
 3b1879050fbc295df9cdd64753e4704cca87be74 .standards (v1.7.0-119-g3b18790)   ← no +/- prefix: clean, == recorded pointer
$ git -C .standards status --porcelain              → empty (zero modified vendored files)
$ git diff main --name-only | grep -c '^\.standards' → 0
```

RULING: pre-existing debt in the pinned clean submodule, untouched by this spec,
identical in kind and in the exact same file to the 002/003 phase-1 runs. Per the
Stop-and-Ask decision matrix ("Out-of-scope finding → Record it; do not fix;
propose a follow-up spec") it is recorded as an **OUT-OF-SCOPE finding** and does
not block this run; the authoritative blame-scoped run (`-BaseRef main`) exits 0
with 0 FAIL / 0 WARN. The standards-repo follow-up (fix or exclude the vendored
hallmark example) was already emitted in the 002 telemetry and stands; no new
follow-up is opened here.

WARN adjudication: all 22 unscoped WARNs sit in vendored `.standards/**` files (9)
or in project files NOT in this spec's change set (13: `Landing.tsx`,
`ServicesCarousel.tsx` ×2, `recorded-billing.ts`, `checkout.ts`, `stripe-webhook.ts` ×6,
`microsoftGraph.ts`, `bookings.ts`, `time.ts`) — pre-existing debt, zero attributable
to a file this spec touched (change set: `scripts/**`, `deploy/**`, `docs/**`,
`tsconfig.app.json`, tests). Per the matrix ("Design gate WARN (not FAIL) → Record
in the report; do not stop; flag to the Architect") they are recorded and flagged,
not blocking. The scoped run's 0 WARN confirms the change introduces none.

**Design-principles gate result for spec 004: PASS** (scoped exit 0; unscoped
exit 1 adjudicated OUT-OF-SCOPE per the ruling above).

## Evidence: scenario-to-behavior spot check

command: npx vitest run src/__tests__/AC-004-processor-rewiring.test.ts --reporter=verbose   (plus manual assertion-vs-scenario analysis)
exit: 0
at: 2026-10-21T23:58:11Z

```
✓ src/__tests__/AC-004-processor-rewiring.test.ts > AC-004 processor rewiring > AC-004-42: the billing-enabled path is unchanged 4ms
✓ src/__tests__/AC-004-processor-rewiring.test.ts > AC-004 processor rewiring > AC-004-44: scan containment — one bad directory never kills the run 6ms
✓ src/__tests__/AC-004-processor-rewiring.test.ts > AC-004 processor rewiring > AC-004-44: a completed sweep exits 0 even with a failed directory 1ms

(file-level run at 2026-10-21T23:57:55Z, exit 0: Test Files 1 passed (1), Tests 17 passed (17))
```

Scenarios checked: **AC-004-42** (billing-unchanged golden) and **AC-004-44**
(scan containment) from `20-acceptance/AC-004-processor-rewiring.md`, against
`src/__tests__/AC-004-processor-rewiring.test.ts` lines 208–239, 270–343.

**AC-004-42 — every Then-clause genuinely enforced (no false green):**

| Scenario clause | Test assertion (line) | Verdict |
|---|---|---|
| POST to `<APP_BASE_URL>/api/bookings/recorded-billing` | `expect(post!.url).toBe('http://localhost:4099/api/bookings/recorded-billing')` (231) | enforced |
| Header `Authorization Bearer <RECORDED_BILLING_TOKEN>` | `expect(init.headers.authorization).toBe('Bearer tok_1')` (232) | enforced |
| Body `{ bookingId, email, actualMinutes: 90 }` | `toEqual({bookingId:'cs_test_1', email:'client@example.com', actualMinutes:90})` — exact-shape, no extra/missing keys (233–237) | enforced |
| `.rexi-billed` written after the 200 | `exists(dir,'.rexi-billed')===true` (238); the "only after 200" ordering is enforced by the companion test at 452–469 (POST→500 ⇒ no marker) | enforced |
| Minutes from ffprobe over the NEWEST mp4 (`findMp4` preserved) | Decoy design: a second, older mp4 whose probe answers 60s (=1 min); `newestFirstProbe` answers 5400s (=90 min) only for the newest-by-mtime file. Probing the wrong file would yield `actualMinutes: 1` and fail the exact `toEqual` | enforced |

Given-clause fidelity: `BILLING_ENV` carries STRIPE_SECRET_KEY + RECORDED_BILLING_TOKEN;
the reservation resolves via the fetch fake to `{bookingId:'cs_test_1', email:'client@example.com'}`;
the 200 reply carries `amountCents` (postReply, lines 85–96). Harness integrity
verified (`recording-harness.ts`): `makeFetch` records real url+init, `makeRunner`
throws on `fail:true` (line 25), `blProducesOut` really materializes the `--out`
file — the assertions bite.

**AC-004-44 — every Then-clause genuinely enforced (no false green):**

| Scenario clause | Test assertion (line) | Verdict |
|---|---|---|
| B and C fully processed in the same run | `result.processed === 2` (293); B reaches `.rexi-analyzed` (297); `failed` is exactly `[dirA]`, so C is not failed | enforced |
| A logged with its path + counted in failure summary | `lines` contains `dirA` (294); `result.failed` equals `[dirA]` (292); log matches `/Failures:\s*1/` (295) | enforced |
| A receives no markers | `exists(dirA,'.rexi-transcribed')===false` (296) — A's injected failure is a real ffmpeg reject (badFfmpeg, 283–284) | enforced |
| Scan process exits 0 | Dedicated second test (320–343): `runCli({argv:['--scan']})` over a root whose only dir fails ffprobe ⇒ `expect(exitCode).toBe(0)` (342, decision 13) | enforced |
| 2nd run: A attempted again | `second.calls` contains a fresh ffmpeg call for dirA (309); `again.failed` = `[dirA]` (310) | enforced |
| 2nd run: B/C completed stages skipped via markers | Zero `bl`/`gh` calls referencing B or C dirs on the second scan (312–316); `again.processed === 2` (311) | enforced |

Both spot checks: assertions match the Given/When/Then semantics, not just the
scenario ID. No false greens found.

## No unaccounted behavior (finding line, not a command)

**Finding: PASS — every changed/added unit of logic traces to a task, scenario, or
documented decision.** Diff skim evidence: `process-recording.mjs` (−285/+33) is now
the thin CLI entry delegating to `scripts/recording/cli.mjs` (Task 6); the seven
`.mjs` modules' exports map 1:1 to Tasks 2–6 (`collectSessionMp4s`/`buildAudioExtractCommand`/
`extractAudio`; `buildAsrCommand`/`transcribe`; `buildInsightMessages`/`renderBrief`/
`runInsightStage`; `ensureLabel`/`findExistingIssue`/`deliverInsightIssue`;
`processSessionDir`/`scanAll`) plus decision-traceable helpers (`sessionDateFromMp4`
= decision 7; `billingSkipReason`, `recordingsDirFrom`, `usageText`, `detectDominantLanguage`,
`extractTranscriptText`, `parseChatStdout`, `listMp4Files` — internal support for
specified behavior); `billing.mjs` is the extracted unchanged billing flow
(BILLING_PATH/BILLED_MARKER/MAX_MINUTES=480/findMp4 preserved — §Global constraint).
Two items examined and ruled legitimate: (1) `tsconfig.app.json` +allowJs — an
enabling change for the vitest `.mjs` imports, audited under (d), no production
effect; (2) `recording-processor/Dockerfile` +`COPY scripts/recording/` — a
mechanical consequence of the entry's new imports (without it the container crashes
at import); 10-tasks' "Dockerfile gains nothing for 004" refers to tool binaries
(ffmpeg/bl/gh), and none were added — the +5 lines are the COPY plus a
container-limitation comment consistent with AC-004-47. Injection discipline (Ask E)
verified: zero `process.env` reads inside `scripts/recording/*.mjs` (only a comment
restating the rule); the entry alone wires `env: process.env` into `runCli`.

---

# Audits (004-specific, mandatory)

## Audit (a) — Gate blind spot + independent CC re-measurement: PASS (blind spot CONFIRMED; max CC ≤6 CONFIRMED; recorded as OUT-OF-SCOPE finding, not a BLOCK)

**Blind spot confirmed by direct reading of the gate configs (no gate config edited):**

- `eslint.config.cjs`: the `complexity: ['error', 6]` rule (line 51) lives in the
  block scoped `files: ['**/*.{js,jsx,ts,tsx}']` (line 14) — `**/*.mjs` does not
  match. The dedicated `files: ['**/*.mjs']` block (line 104) sets globals +
  `no-console: off` only, no complexity rule. ⇒ `npm run lint` never measures CC
  of the new `.mjs` units.
- `.standards/scripts/check-code-principles.sh` line 373:
  `NODE_FILES=$(find … -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' …)`
  — `.mjs` is not collected; `.lua` appears nowhere in the script. ⇒ the
  design-principles gate is blind to both new-language surfaces of this spec.

**Independent re-measurement 1 — ESLint `complexity` (the repo's canonical rule), ad-hoc
flat config in /tmp (`--no-config-lookup`, threshold 0 to report every function's CC;
no repo file touched):**

command: npx eslint --no-config-lookup --config /tmp/opencode/verif-004/eslint-cc.config.mjs -f json scripts/recording/{media,transcribe,insight,deliver,billing,pipeline,cli}.mjs scripts/process-recording.mjs
exit: 1 (expected — threshold-0 measurement mode flags every function; not a repo-gate failure)
at: 2026-10-21T23:50:17Z

```
process-recording.mjs:54 Function 'loadEnv'CC=6. Maximum allowed is 0.
pipeline.mjs:181 Async function 'processSessionDir'CC=6. Maximum allowed is 0.
cli.mjs:56 Async function 'runCli'CC=6. Maximum allowed is 0.
billing.mjs:120 Async function 'findReservationByRoom'CC=6. Maximum allowed is 0.
pipeline.mjs:65 Function 'deriveRoom'CC=5. Maximum allowed is 0.
pipeline.mjs:54 Function 'roomFromMetadata'CC=5. Maximum allowed is 0.
pipeline.mjs:227 Async function 'scanAll'CC=5. Maximum allowed is 0.
media.mjs:19 Function 'collectSessionMp4s'CC=5. Maximum allowed is 0.
insight.mjs:55 Function 'collectFromObject'CC=5. Maximum allowed is 0.
insight.mjs:132 Function 'splitLlmSections'CC=5. Maximum allowed is 0.
… (all remaining functions CC ≤5)
```

**Max CC = 6** (loadEnv, processSessionDir, runCli, findReservationByRoom) — at the
limit, none over. Refactorer's "max CC 6" claim CONFIRMED.

**Independent re-measurement 2 — the repo's own heuristic (stricter: counts `&&`/`||`
too), applied to byte-identical copies renamed `.mjs`→`.js` in /tmp (no repo file touched):**

command: bash .standards/scripts/check-code-principles.sh /tmp/opencode/verif-004/cc-js --gates complexity --json
exit: 0
at: 2026-10-21T23:50:48Z

```
{ "tier": "mvp", "gates": ["complexity"], "fails": [],
  "warns": [ KISS_LINES>20 ×6: cli.js:56:runCli=30, deliver.js:22:ensureLabel=27,
             media.js:38:buildAudioExtractCommand=24, insight.js:71:buildInsightMessages=31,
             insight.js:177:runInsightStage=30, pipeline.js:181:processSessionDir=34 ] }
```

**0 FAIL** under the repo heuristic — CC≤6 holds under both measurements. New
observation from the re-measurement: 6 method bodies >20 lines (KISS WARN class)
would surface if the gate covered `.mjs`. Per the matrix, WARNs are recorded and
flagged to the Architect, not blocking.

**Ruling:** the blind spot is real but pre-existing gate-tooling scope, not a defect
of this change set (the code passes both measurements). Per the Stop-and-Ask matrix
("Out-of-scope finding → Record it; do not fix; propose a follow-up spec"): recorded
as an OUT-OF-SCOPE finding, **not a BLOCK**. Follow-up spec proposed: extend
`check-code-principles.sh` NODE_FILES to `*.mjs`/`*.cjs` (and decide `.lua` policy),
and add `**/*.mjs` to the ESLint complexity-scoped block — in the standards repo,
where gate config lives (gate config is off-limits to pipeline agents).

## Audit (b) — Lua module live evidence: PASS

command: docker exec docker-jitsi-meet-prosody-1 luac -p /prosody-plugins-custom/mod_rexi_auto_record.lua
exit: 0
at: 2026-10-21T23:51:16Z

```
(no output — syntax OK)
```

command: docker logs docker-jitsi-meet-prosody-1 2>&1 | grep rexi_auto_record | head
exit: 0
at: 2026-10-21T23:51:19Z

```
2026-10-22 00:56:46 muc.meet.jitsi:rexi_auto_record          info	rexi_auto_record: loaded, recording rooms starting with 'rexi-'
2026-10-22 00:56:46 auth.meet.jitsi:rexi_auto_record         info	rexi_auto_record: loaded, recording rooms starting with 'rexi-'
2026-10-22 00:56:46 meet.jitsi:rexi_auto_record              info	rexi_auto_record: loaded, recording rooms starting with 'rexi-'
2026-10-22 00:56:46 hidden.meet.jitsi:rexi_auto_record       info	rexi_auto_record: loaded, recording rooms starting with 'rexi-'
```

The exact claimed line is present, on all four vhosts (module loaded via
GLOBAL_MODULES merge), with the default prefix `rexi-` rendered from the env fallback.

command: diff deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua ~/.jitsi-meet-cfg/prosody/prosody-plugins-custom/mod_rexi_auto_record.lua && sha256sum both
exit: 0
at: 2026-10-21T23:51:29Z

```
IDENTICAL
72baaf0c9fd2cb2dafd179fef2a843ec4a0311b11514a6c4c9539d07f7a75beb  deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua
72baaf0c9fd2cb2dafd179fef2a843ec4a0311b11514a6c4c9539d07f7a75beb  /home/dbueno/.jitsi-meet-cfg/prosody/prosody-plugins-custom/mod_rexi_auto_record.lua
```

Host-mount copy is byte-for-byte the repo copy (same sha256).

**Deferral check:** first-occupant behavioral proof IS deferred to the post-PR e2e
stage, and that is exactly what the scenarios say — `AC-004-auto-record-module.md`
header: "Live behavioral proof of the module (first-occupant trigger, single session,
non-matching rooms untouched) runs in the e2e stage — see AC-004-e2e-chain.md
(AC-004-50, AC-004-51)"; AC-004-50 asserts the first-occupant trigger + one-session
idempotency live, AC-004-51 the consent boundary. The in-suite scope of AC-004-20…22
is provisioning/config/syntax-gate content assertions — matching what was verified
here and in `AC-004-auto-record-module.test.ts`. The live journey was NOT run by
the Verifier (correct per scope).

## Audit (c) — Dry-run purity on a real session dir: PASS

Session dir found: live `RECORDINGS_DIR=/home/dbueno/rexi-recordings` (repo `.env:51`)
is **empty**; the real session dir lives at the image-default
`~/.jitsi-meet-cfg/storage/jibri/recordings/14759f1c-d3cf-4711-bac8-3c418c952ef6/`
(the `rexitest` session, decision 10) — contents: `rexitest_2026-09-18-13-02-17.mp4`,
`metadata.json`, `.rexi-billed` (a billed-only dir, incidentally a live probe of
AC-004-39 semantics).

command: find <dir> -mindepth 1 -printf '%p|%s|%TY-%Tm-%Td %TH:%TM:%TS\n' | sort   (before)
exit: 0
at: 2026-10-21T23:52:23Z

```
…/.rexi-billed|33|2026-10-01 15:32:16.0433024730
…/metadata.json|91|2026-09-18 13:02:48.2858285830
…/rexitest_2026-09-18-13-02-17.mp4|4354042|2026-09-18 13:02:48.2064205440
```

command: node scripts/process-recording.mjs --jibri-dir /home/dbueno/.jitsi-meet-cfg/storage/jibri/recordings/14759f1c-d3cf-4711-bac8-3c418c952ef6 --dry-run
exit: 0
at: 2026-10-21T23:52:36Z

```
--- recording: /home/dbueno/.jitsi-meet-cfg/storage/jibri/recordings/14759f1c-d3cf-4711-bac8-3c418c952ef6/rexitest_2026-09-18-13-02-17.mp4
    duration: 1 min | audio stream: yes
    room: rexitest
    SKIP billing: .rexi-billed marker (already billed).
    DRY-RUN: would extract audio from 1 mp4(s) + run bl speech recognize.
    DRY-RUN: would run bl text chat, write customer-brief.md, open the insight issue.
```

command: find <dir> … | sort (after); diff before after
exit: 0
at: 2026-10-21T23:52:50Z

```
NO-MUTATION: listing+size+mtime identical before/after
```

Exit 0; output is plan-only (no POST, no bl/gh invocation — the DRY-RUN lines are
the planned-action log per decision 8); listing + size + **nanosecond mtimes**
identical before/after; no new file (transcript.json / customer-brief.md / markers)
appeared. Bonus observation: the log shows the billed-only dir planning
transcription+insight while skipping billing — AC-004-39's marker independence
visible on a live dir. Claim confirmed: mutation-free.

## Audit (d) — tsconfig +allowJs scrutiny: PASS

Diff vs main (`git diff main -- tsconfig.app.json`): exactly +4 lines — three
comment lines plus `"allowJs": true`. `checkJs` is never set ⇒ defaults to false.
Claim `allowJs:true, checkJs:false` confirmed.

What allowJs actually enables here: `tsconfig.app.json` has `"include": ["src"]` and
`"noEmit": true`. allowJs only lets the tsc *program* resolve and infer export types
from the plain-ESM `scripts/recording/*.mjs` files that `src/__tests__/AC-004-*.test.ts`
import — without it, `tsc -b` would error TS2307 on those imports. It cannot pull JS
into any build output (tsc emits nothing; Vite bundles from `index.html`→`src/main.tsx`),
and it does not relax any gate for `.ts` files (strict/noUnusedLocals/etc. unchanged).

Mechanical confirmations (at 2026-10-21T23:53:38Z):

```
$ grep -rn "scripts/" src --include=*.ts --include=*.tsx | grep -v __tests__   → no hits
  (no app-source file imports scripts/ — only tests do)
$ grep -l "collectSessionMp4s\|rexi-billed\|bl speech recognize\|processSessionDir" dist/assets/*.js dist/assets/*.css → no hits
  (zero script symbols in the production bundle)
$ git diff main --name-only -- src/ ':!src/__tests__'                          → empty
  (app source byte-identical to main ⇒ Vite entry graph unchanged by construction)
$ npx tsc -b → exit 0; npm run build → exit 0 (43 modules, same single index bundle)
  (existing type gates hold with allowJs on; the vitest .mjs imports type-resolve)
```

No untyped JS in build output; no weakened type gate; the only consumer of the
allowJs resolution is the test program. Ruling: PASS — the change is minimal,
commented, and side-effect-free for production.

## Audit (e) — Pre-existing test integrity: PASS

command: git diff main --stat -- src/__tests__/ tests/ ; git diff main --name-status -- src/__tests__/ tests/ ; git status --porcelain -- src/__tests__/ tests/ | grep '^??' ; git ls-files counts
exit: 0
at: 2026-10-21T23:54:00Z

```
== tracked modifications/deletions under src/__tests__ + tests/ vs main:
(empty — zero pre-existing test files modified or deleted)
== untracked additions:
?? src/__tests__/AC-004-auto-record-module.test.ts
?? src/__tests__/AC-004-customer-brief.test.ts
?? src/__tests__/AC-004-e2e-journeys.test.ts
?? src/__tests__/AC-004-issue-delivery.test.ts
?? src/__tests__/AC-004-processor-rewiring.test.ts
?? src/__tests__/AC-004-runbook.test.ts
?? src/__tests__/AC-004-session-audio.test.ts
?? src/__tests__/AC-004-transcription.test.ts
?? src/__tests__/recording-harness.ts
?? tests/            (contains exactly e2e/auto-record-consent-boundary.e2e.ts + e2e/auto-record-full-chain.e2e.ts)
== tracked test files on branch: 31   == same count on main: 31
```

Additions are exactly the declared 8 AC-004 test files + `recording-harness.ts` +
the 2 e2e journeys; nothing else; zero pre-existing tests touched (tracked count
31 == main's 31, empty name-status diff). The harness is correctly NOT a `*.test.*`
file (invisible to vitest collection and the traceability gate, as its header states).

## Audit (f) — Disclosed deviation (GLOBAL_MODULES + XMPP_MUC_MODULES): PASS

Files reflect the deviation:

- `deploy-jitsi.sh` (+49): defines `rex_upsert_env_list` (append-once comma-list
  upsert with a membership check — no duplicates on re-run), calls it for BOTH
  `GLOBAL_MODULES` and `XMPP_MUC_MODULES`, copies the module, then runs the luac
  gate inside the prosody container; on gate failure it removes the copied module,
  restores `.env` from a pre-made backup, and exits 1 (no half-wiring — the
  `jibri-finalize.sh` cautionary precedent honored). The comment records the
  live-verified rationale: occupant-joined fires on the MUC component, which loads
  its own `XMPP_MUC_MODULES` list.
- `jitsi.env.example` (+18): documents both hook lines (`GLOBAL_MODULES=rexi_auto_record`,
  `XMPP_MUC_MODULES=rexi_auto_record`) with the same rationale, plus
  `REXI_AUTO_RECORD_PREFIX` (default `rexi-`, commented knob, consent-boundary note).
- Lua module: `os.getenv("REXI_AUTO_RECORD_PREFIX") or "rexi-"` (knob + fallback);
  consent gate order = started-flag → healthcheck → prefix → backend/owner →
  first-human (`human_occupants(room) ~= 1`), i.e. non-matching rooms never reach
  the recording-start path; session idempotency via `room._data.rexi_auto_record_started`.

Scenario satisfaction re-checked against the deviation:

- **AC-004-20** Then-clauses: `.env` sets GLOBAL_MODULES including `rexi_auto_record` ✓
  (upsert call 1); second run keeps it exactly once ✓ (membership check — the test at
  lines 71–86 of `AC-004-auto-record-module.test.ts` actually executes the bash
  function against temp env files, including the pre-populated `GLOBAL_MODULES=foo,bar`
  case → `foo,bar,rexi_auto_record`); module file content unchanged on re-run ✓ (cp
  from repo every run). Managing the SECOND hook additionally violates nothing —
  no Then-clause restricts other keys.
- **AC-004-21**: knob documented with default `rexi-` ✓; module reads env with
  fallback ✓ (test asserts the exact lua line); gating before any recording-start
  logic ✓.
- **AC-004-22**: gate command `docker exec "$PROSODY_CID" luac -p /prosody-plugins-custom/…`
  present after the copy, aborts non-zero with un-provisioning ✓ (test asserts
  command shape + copy-before-gate ordering).

Ruling: the deviation is additive, evidence-backed, documented in both files, and
every scenario Then-clause remains satisfied. PASS.

## Audit (g) — Phase-2 prep note (recorded, not fixed): RECORDED + prettier confirmed

command: git ls-files (prettier-parseable, minus .standards + AGENTS.md symlink → 124 files) | xargs npx prettier --check
exit: 0
at: 2026-10-21T23:56:38Z

```
Checking formatting...
All matched files use Prettier code style!
```

command: npx prettier --check scripts/recording tests e2e.config.ts src/__tests__/AC-004-*.test.ts src/__tests__/recording-harness.ts docs/recording-pipeline.md docs/local-e2e-testing.md deploy/production/README.md
exit: 0
at: 2026-10-21T23:56:39Z

```
Checking formatting...
All matched files use Prettier code style!
```

Whole-repo prettier on TRACKED files: **exit 0** — confirmed. Every new/modified
prettier-parseable file of the 004 change set: **exit 0**. Context: the
filesystem-wide scan (`npx prettier --check .`, at 2026-10-21T23:55:49Z, exit 1)
flags **only** 12 untracked `specs/**` scratch markdown files (002/003 verification
docs + 004 spec artifacts) — out of scope, never committed in the final PR (stage 5b
archives `specs/004-*` away before push), so CI never sees them. `.sh`/`.env.example`
files are not prettier-parseable and are skipped by CI's directory scan (explicit-path
invocations error on them — not a finding).

**Phase-2 note for the PR Opener (recorded, not fixed):** after stage-5b runs
`archive-spec.sh`, the CI-visible markdown becomes `docs/changes/004-auto-record-transcribe-insights.md`.
Per the 003 precedent (archive §Warnings item 3 — spec-002 round 1 failed Lint &
Format on exactly this), the PR Opener must run `prettier --write
docs/changes/004-*.md` **AFTER** appending the PR-record line (the append breaks
prettier's markdown formatting), before pushing.

---

## Warnings / review hints for the Architect (non-blocking)

1. Unscoped design-principles: 1 FAIL (vendored `.standards/skills/hallmark/…/cobalt-01/script.js`
   CC=10) adjudicated OUT-OF-SCOPE per the ruling above; 22 WARNs all in vendored or
   untouched pre-existing files. Standards-repo follow-up (proposed in 002 telemetry) stands.
2. Audit (a) blind spot: repo gates do not measure `.mjs`/`.lua` (ESLint complexity
   block scope + check-code-principles NODE_FILES list). Independent re-measurement
   passes (max CC=6 ESLint-classic; 0 FAIL repo-heuristic), but the gate coverage gap
   itself deserves a follow-up spec in the standards repo. New observation from the
   re-measurement: 6 method bodies >20 lines in the new `.mjs` units
   (`runCli`=30, `ensureLabel`=27, `buildAudioExtractCommand`=24,
   `buildInsightMessages`=31, `runInsightStage`=30, `processSessionDir`=34) —
   KISS-class WARNs that the gate would surface if it scanned `.mjs`; review hint only.
3. Phase-2 risk (audit (g)): the PR-record append must be prettier-formatted before
   push or Lint & Format will fail exactly as in spec-002 round 1.
4. Note for stage 5a/e2e: AC-004-50…53's live proof (first-occupant trigger, consent
   boundary, real-dir one-off chain, issue idempotency) is deferred to the post-PR
   e2e stage per the scenarios themselves; the in-suite guard test
   (`AC-004-e2e-journeys.test.ts`, decision 3) keeps traceability green meanwhile.

## Telemetry (spec 012)

Record appended to `runs.jsonl` via `bash .standards/scripts/record-gate-run.sh -f runs.jsonl`
(env `SPEC_LOOP_COUNT=1 SPEC_PHASE1_RETRIES=0 SPEC_PHASE2_RETRIES=0` exported before
invocation) at 2026-10-22T00:01:47Z, script exit 0:

```
{"specSlug":"004-auto-record-transcribe-insights","gatesFailed":[],"warnings":[…4 entries: cobalt-01 OUT-OF-SCOPE ruling; 22-WARN baseline; audit(a) blind spot + KISS_LINES observations; audit(g) phase-2 prettier note…],"durationSec":1054,"outcome":"pass","runId":"e18480e1-9c04-45c2-a501-71337bb81d05","loopCount":1,"phase1Retries":0,"phase2Retries":0}
```

## Overall verdict

**PASS** (attempt 1, phase 1). All five contract checks ran and produced no findings
attributable to this spec; all seven mandatory 004 audits pass or are recorded per
the matrix. Verdict transcribed from the gates: traceability exit 0; test suite
exit 0; lint/tsc/build exit 0/0/0; design-principles scoped exit 0 (unscoped exit 1
adjudicated OUT-OF-SCOPE — vendored submodule file, identical to 002/003 precedent);
spot checks green with genuine Then-clause enforcement.

- Gates failed: none.
- BLOCKs relayed this phase: 0 of 3 (phase-1 budget untouched).
- Stage 5a (Mutation Runner) may proceed.
