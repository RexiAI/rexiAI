// Task 8 traceability guard (10-tasks.md decision 3): the live journeys run
// post-PR against the local stack (e2e-runner), but check-scenario-traceability.sh
// only scans *.test.ts/*.spec.ts patterns — `*.e2e.ts` is invisible to it.
// This in-suite test cites AC-004-50…53 and asserts every journey file exists
// and embeds its scenario IDs. Pure file assertions: no Docker, no stack, no
// gh/bl — npm test stays green in a bare checkout (spec-003 precedent: an
// e2e-only scenario cited from an in-suite test).
import fs from 'node:fs'
import path from 'node:path'

import { describe, it, expect } from 'vitest'

const REPO = process.cwd()

function readJourney(rel: string): string {
  const p = path.join(REPO, rel)
  expect(fs.existsSync(p), `journey file missing: ${rel}`).toBe(true)
  return fs.readFileSync(p, 'utf8')
}

describe('AC-004 e2e journey registration', () => {
  it('AC-004-50: the full-chain journey exists and cites AC-004-50 (auto-record fires unassisted, exactly once)', () => {
    const src = readJourney('tests/e2e/auto-record-full-chain.e2e.ts')
    expect(src).toContain('AC-004-50')
    // scripted per the scenario: unique rexi- room, fake-device + fake-audio flags,
    // zero recording-UI interaction, second-occupant single-session check.
    expect(src).toMatch(/rexi-/)
    expect(src).toContain('--use-fake-device-for-media-capture')
    expect(src).toContain('--use-file-for-fake-audio-capture=')
    expect(src).toMatch(/no recording control was touched/i)
    expect(src).toMatch(/NO additional Jibri session/i)
  })

  it('AC-004-51: the consent-boundary journey exists and cites AC-004-51 (non-rexi room never recorded)', () => {
    const src = readJourney('tests/e2e/auto-record-consent-boundary.e2e.ts')
    expect(src).toContain('AC-004-51')
    expect(src).toMatch(/e2eprobe-/)
    expect(src).toMatch(/no Jibri session directory/i)
  })

  it('AC-004-52: the full-chain journey cites AC-004-52 and drives the one-off processor on the REAL session dir', () => {
    const src = readJourney('tests/e2e/auto-record-full-chain.e2e.ts')
    expect(src).toContain('AC-004-52')
    expect(src).toContain('scripts/process-recording.mjs --room')
    expect(src).toMatch(/transcript\.json/)
    expect(src).toMatch(/customer-brief\.md/)
    expect(src).toMatch(/página de precios|pricing/)
  })

  it('AC-004-53: the full-chain journey cites AC-004-53 (one labeled issue, idempotent second run)', () => {
    const src = readJourney('tests/e2e/auto-record-full-chain.e2e.ts')
    expect(src).toContain('AC-004-53')
    expect(src).toMatch(/Customer insight: <room> <YYYY-MM-DD>/)
    expect(src).toContain('customer-insight label')
    expect(src).toMatch(/no duplicate created/i)
    expect(src).toMatch(/\.rexi-transcribed and \.rexi-analyzed markers/i)
  })

  it('unit: the e2e config follows the standard (tests glob, env-sourced models, budgets, cache)', () => {
    const cfgPath = path.join(REPO, 'e2e.config.ts')
    expect(fs.existsSync(cfgPath)).toBe(true)
    const cfg = fs.readFileSync(cfgPath, 'utf8')
    expect(cfg).toContain('tests/**/*.e2e.ts')
    expect(cfg).toContain('E2E_AGENT_MODEL')
    expect(cfg).toContain('E2E_JUDGE_MODEL')
    expect(cfg).toContain('budget')
    expect(cfg).toContain('cache')
    expect(cfg).not.toMatch(/model:\s*["'](gpt|claude|qwen)/i) // no literal model ids
  })
})
