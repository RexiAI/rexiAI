// e2e.config.ts — agentic-E2E config for RexiAI (spec 004 Task 8; the e2e
// standard: .standards/skills/e2e-testing/SKILL.md, reference implementation
// pinned to e2e v0.17.0). Run: npx e2e run tests/<file>.e2e.ts (post-PR
// e2e-runner stage). Governance rules encoded here:
//   1. Model ids arrive ONLY from the environment (E2E_AGENT_MODEL /
//      E2E_JUDGE_MODEL) — naming a provider/model in a tracked file is a
//      standards violation.
//   2. Telemetry must be opted out in the launching shell:
//      export E2E_TELEMETRY_DISABLED=1 (repo policy, not a suggestion).
//   3. Budgets bound every run; exhaustion exits 3 — shrink the journey, do
//      not raise the number.
//   4. Replay cache explicit; "read-only" in CI with --strict-cache.
//
// The journeys here target an ALREADY-RUNNING external stack (the local
// docker-jitsi-meet oracle at https://host.docker.internal:8443 — see
// docs/local-e2e-testing.md), so there is no app launch command: the framework
// points at target.url directly. The media-fake browser flags
// (--use-fake-device-for-media-capture --use-file-for-fake-audio-capture=...)
// and the self-signed-cert acceptance are per-journey launch requirements the
// e2e-runner passes through the framework's browser launch config (v0.17 API —
// confirm the field names when the journeys first run; journey docs say how).

const agentModel = process.env['E2E_AGENT_MODEL'] // actor model id (env-sourced)
const judgeModel = process.env['E2E_JUDGE_MODEL'] // judge model id (env-sourced)

export default {
  tests: 'tests/**/*.e2e.ts',

  models: {
    agent: agentModel,
    judge: judgeModel,
  },

  targets: [
    {
      id: 'jitsi-stack',
      // No `app.command`: the oracle stack is started manually per
      // docs/local-e2e-testing.md §2 (+ §2b auto-record install).
      url: process.env['REXI_E2E_STACK_URL'] || 'https://host.docker.internal:8443',
    },
  ],

  budget: {
    default: {
      modelCalls: 120,
      actions: 240,
      timeout: 600_000, // ms — one meeting + finalization + one-off processing
    },
    agent: {
      modelCalls: 90,
    },
  },

  cache: 'read-write',

  artifacts: {
    report: '.e2e/report.json',
    junit: 'junit.xml',
    failures: '.e2e/failures/',
  },
} as const
