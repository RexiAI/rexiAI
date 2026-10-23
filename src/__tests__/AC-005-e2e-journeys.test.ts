// Task 9 traceability guard (spec-004 decision-③ pattern, AC-004-e2e-journeys
// .test.ts): the live journeys run post-PR against THIS host (e2e/arrangements
// stage), but check-scenario-traceability.sh only scans *.test.ts/*.spec.ts —
// *.e2e.ts is invisible to it. This in-suite test cites AC-005-49…52 and
// asserts every journey file exists and embeds its scenario IDs. Pure file
// assertions: no Docker, no systemctl, no network, no vercel — npm test stays
// green in a bare checkout. Journeys are self-contained plain-node scripts
// with ZERO npm imports (004 D4 contract), picked up by e2e.config.ts's
// tests/**/*.e2e.ts glob.
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const REPO = process.cwd()

function readJourney(rel: string): string {
  const p = path.join(REPO, rel)
  expect(fs.existsSync(p), `journey file missing: ${rel}`).toBe(true)
  return fs.readFileSync(p, 'utf8')
}

const TIMER_JOURNEY = 'tests/e2e/home-timer-scan.e2e.ts'
const FUNNEL_JOURNEY = 'tests/e2e/funnel-consent-boundary.e2e.ts'
const SWITCH_JOURNEY = 'tests/e2e/switch-refusal.e2e.ts'

describe('AC-005 e2e journey registration', () => {
  it('AC-005-49: the timer-scan journey exists, cites AC-005-49, and proves the journal scan cycle (ASR containment tolerated)', () => {
    const src = readJourney(TIMER_JOURNEY)
    expect(src).toContain('AC-005-49')
    expect(src).toMatch(/systemctl list-timers/)
    expect(src).toMatch(/rexi-recording\.timer/)
    expect(src).toMatch(/journalctl -u rexi-recording\.service/)
    expect(src).toMatch(/\[recording-cron\]|Scanning/)
    // acceptance shape: scan-cycle evidence, never stage success
    expect(src).toMatch(/ASR|spec 006/)
    expect(src).toMatch(/scan.cycle|cycle ran|evidence/i)
    expect(src).toMatch(/never asserts stage success|tolerated/i)
    expect(src).toContain(`node ${TIMER_JOURNEY}`)
  })

  it('AC-005-50: the same journey proves env 0600, journal secrecy, and the idempotent re-run', () => {
    const src = readJourney(TIMER_JOURNEY)
    expect(src).toContain('AC-005-50')
    expect(src).toMatch(/\/etc\/rexi-recording\.env/)
    expect(src).toMatch(/stat -c %a/)
    expect(src).toMatch(/\b600\b/)
    expect(src).toMatch(
      /STRIPE_SECRET_KEY=\|RECORDED_BILLING_TOKEN=|DASHSCOPE_API_KEY=|GH_TOKEN=|secret-key dump/i
    )
    expect(src).toMatch(/install-recording-host\.sh/)
    expect(src).toMatch(/second execution|re-run|idempotent|second run/i)
    expect(src).toMatch(/timer .*enabled and active|enabled.*active/i)
  })

  it('AC-005-51: the funnel-consent journey exists, cites AC-005-51, reaches the consent boundary, re-checks :8443', () => {
    const src = readJourney(FUNNEL_JOURNEY)
    expect(src).toContain('AC-005-51')
    expect(src).toMatch(/deploy\/home\/expose-funnel\.sh/)
    expect(src).toMatch(/consent/i)
    expect(src).toMatch(/browser|manual/i)
    expect(src).toMatch(/host\.docker\.internal:8443/)
    expect(src).toMatch(/clear status|no cryptic/i)
    expect(src).toContain(`node ${FUNNEL_JOURNEY}`)
  })

  it('AC-005-52: the switch-refusal journey exists, cites AC-005-52, refuses the dead URL with a Vercel-env-unchanged proof', () => {
    const src = readJourney(SWITCH_JOURNEY)
    expect(src).toContain('AC-005-52')
    expect(src).toMatch(/https:\/\/meet\.rexi-ai\.com/)
    expect(src).toMatch(/deploy\/home\/switch-meeting-base-url\.sh/)
    expect(src).toMatch(/non-zero|exits? non-zero|code !== 0|refus/i)
    expect(src).toMatch(/gate/i)
    expect(src).toMatch(/vercel env ls production/)
    expect(src).toMatch(/identical|unchanged/i)
    expect(src).toMatch(/MEETING_BASE_URL/)
    expect(src).toContain(`node ${SWITCH_JOURNEY}`)
  })

  it('unit: every journey is a plain-node script importing ZERO npm packages (004 D4 contract)', () => {
    for (const rel of [TIMER_JOURNEY, FUNNEL_JOURNEY, SWITCH_JOURNEY]) {
      const src = readJourney(rel)
      const specs = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])
      expect(specs.length, rel).toBeGreaterThan(0)
      for (const spec of specs) {
        expect(spec.startsWith('node:'), `${rel}: ${spec}`).toBe(true)
      }
    }
    // the guard itself is pure file assertions — no child processes, no
    // docker, no systemctl, no vercel, no network. The forbidden spec is
    // assembled at runtime so this checking line cannot self-match.
    const self = fs.readFileSync(
      path.join(REPO, 'src/__tests__/AC-005-e2e-journeys.test.ts'),
      'utf8'
    )
    const childProcessSpec = ['node', 'child_process'].join(':')
    expect(self).not.toContain(childProcessSpec)
  })

  it('unit: the e2e.config.ts glob still picks up every journey file', () => {
    const cfg = fs.readFileSync(path.join(REPO, 'e2e.config.ts'), 'utf8')
    expect(cfg).toContain('tests/**/*.e2e.ts')
  })
})
