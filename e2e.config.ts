// e2e.config.ts — agentic-E2E config for RexiAI (spec 004 Task 8; the e2e
// standard: .standards/skills/e2e-testing/SKILL.md). Rewritten by the
// e2e-driven remediation (D4): the `e2e` framework package is NOT a repo
// dependency and no new npm dependency may be added, so the journeys are
// plain executable scripts with zero npm imports (DevTools Protocol over
// Node's native WebSocket — tests/e2e/auto-record-lib.mjs). Execution:
//   node tests/e2e/auto-record-full-chain.e2e.ts
//   node tests/e2e/auto-record-consent-boundary.e2e.ts
// The e2e-runner stage runs them directly, or acts the Playwright-MCP
// playbook each journey's header documents (same contract); when the agent
// layer resolves (models below), its budgets still bound any agentic run.
// Governance rules encoded here:
//   1. Model ids arrive ONLY from the environment (E2E_AGENT_MODEL /
//      E2E_JUDGE_MODEL) — naming a provider/model in a tracked file is a
//      standards violation.
//   2. Telemetry must be opted out in the launching shell:
//      export E2E_TELEMETRY_DISABLED=1 (repo policy, not a suggestion).
//   3. Budgets bound every run; exhaustion exits 3 — shrink the journey, do
//      not raise the number.
//   4. Replay cache explicit; "read-only" in CI with --strict-cache.
//   5. Journeys carry their own env contract (see headers): REXI_E2E_STACK_URL,
//      REXI_E2E_CLIP, RECORDINGS_DIR, CHROME_EXEC, REXI_E2E_STOP_AFTER, and
//      DASHSCOPE_API_KEY / GH_TOKEN passthrough for the processor step.
//
// The journeys here target an ALREADY-RUNNING external stack (the local
// docker-jitsi-meet oracle at https://host.docker.internal:8443 — see
// docs/local-e2e-testing.md, §2b for the auto-record module install).

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
