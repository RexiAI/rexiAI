// Task 8 traceability guard (10-tasks.md decision 3): the live journeys run
// post-PR against the local stack (e2e-runner), but check-scenario-traceability.sh
// only scans *.test.ts/*.spec.ts patterns — `*.e2e.ts` is invisible to it.
// This in-suite test cites AC-004-50…53 and asserts every journey file exists
// and embeds its scenario IDs. Pure file assertions: no Docker, no stack, no
// gh/bl — npm test stays green in a bare checkout (spec-003 precedent: an
// e2e-only scenario cited from an in-suite test).
//
// Rewritten by the e2e-driven remediation (D4): the journeys are no longer
// written against an `e2e` framework package (absent from deps, no new dep
// allowed) — they are self-contained scripts the e2e-runner executes with
// plain node over the shared zero-npm-dependency driver, each carrying its
// Playwright-MCP playbook. This guard pins THAT contract.
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
    // scripted per the scenario: unique rexi- room, zero recording-UI
    // interaction, second-occupant single-session check.
    expect(src).toMatch(/rexi-/)
    expect(src).toMatch(/no recording control was touched/i)
    expect(src).toMatch(/NO additional Jibri session/i)
    // D4 runnability: executable by plain node, no framework package.
    expect(src).toContain('node tests/e2e/auto-record-full-chain.e2e.ts')
    // D4 media contract: the fake-capture flags are documented but replaced
    // on this host by the proven page-level getUserMedia override (WebAudio
    // looping destination + canvas captureStream), with ignoreHTTPSErrors and
    // display-name-agnostic join / close-browser-as-leave.
    expect(src).toContain('--use-fake-device-for-media-capture')
    expect(src).toContain('--use-file-for-fake-audio-capture=')
    expect(src).toContain('getUserMedia')
    expect(src).toMatch(/MediaStreamAudioDestinationNode/)
    expect(src).toContain('captureStream')
    expect(src).toContain('ignoreHTTPSErrors')
    expect(src).toMatch(/#enter_displayName/) // named as the absent selector, not used as one
    expect(src).toMatch(/no #toolbar-hangup/)
  })

  it('AC-004-51: the consent-boundary journey exists and cites AC-004-51 (non-rexi room never recorded)', () => {
    const src = readJourney('tests/e2e/auto-record-consent-boundary.e2e.ts')
    expect(src).toContain('AC-004-51')
    expect(src).toMatch(/e2eprobe-/)
    expect(src).toMatch(/no Jibri session directory/i)
    expect(src).toContain('node tests/e2e/auto-record-consent-boundary.e2e.ts')
  })

  it('AC-004-52: the full-chain journey cites AC-004-52 and drives the one-off processor on the REAL session dir', () => {
    const src = readJourney('tests/e2e/auto-record-full-chain.e2e.ts')
    expect(src).toContain('AC-004-52')
    expect(src).toContain('scripts/process-recording.mjs --room')
    expect(src).toMatch(/transcript\.json/)
    expect(src).toMatch(/customer-brief\.md/)
    expect(src).toMatch(/página de precios|pricing/)
    // env passthrough for the processor step (recordings dir + bl/gh creds)
    expect(src).toContain('RECORDINGS_DIR')
    expect(src).toContain('DASHSCOPE_API_KEY')
    expect(src).toContain('GH_TOKEN')
  })

  it('AC-004-53: the full-chain journey cites AC-004-53 (one labeled issue, idempotent second run)', () => {
    const src = readJourney('tests/e2e/auto-record-full-chain.e2e.ts')
    expect(src).toContain('AC-004-53')
    expect(src).toMatch(/Customer insight: <room> <YYYY-MM-DD>/)
    expect(src).toContain('customer-insight label')
    expect(src).toMatch(/no duplicate created/i)
    expect(src).toMatch(/\.rexi-transcribed and \.rexi-analyzed markers/i)
  })

  it('unit: the shared driver and journeys import ZERO npm packages (D4 constraint)', () => {
    const files = [
      'tests/e2e/auto-record-lib.mjs',
      'tests/e2e/auto-record-full-chain.e2e.ts',
      'tests/e2e/auto-record-consent-boundary.e2e.ts',
    ]
    for (const rel of files) {
      const src = readJourney(rel)
      const specs = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])
      expect(specs.length, rel).toBeGreaterThan(0)
      for (const spec of specs) {
        const local = spec === './auto-record-lib.mjs'
        expect(spec.startsWith('node:') || local, `${rel}: ${spec}`).toBe(true)
      }
    }
    // the D4 mechanism itself: DevTools Protocol over Node's native WebSocket
    const lib = readJourney('tests/e2e/auto-record-lib.mjs')
    expect(lib).toContain('globalThis.WebSocket')
    expect(lib).toMatch(/Page\.addScriptToEvaluateOnNewDocument/)
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
