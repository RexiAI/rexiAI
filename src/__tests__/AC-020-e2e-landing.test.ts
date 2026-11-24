// AC-020 Task 10 traceability guard — the landing E2E journey
// (20-acceptance/AC-020-10-e2e-landing.md).
//
// The journey runs post-PR against the deployed site (stage 5c), but
// check-scenario-traceability.sh only scans *.test.ts/*.spec.ts — `*.e2e.ts`
// is invisible to it. This in-suite test cites AC-020-23…27, asserts the
// journey file exists, and pins its contract: plain node, zero npm imports,
// target URL from REXI_E2E_SITE_URL, and one assertion per scenario clause.
// Pure file assertions: no browser, no network — npm test stays green in a
// bare checkout (the spec-004/005 pattern).
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { repoFile } from './landing-harness'

const JOURNEY = 'tests/e2e/landing.e2e.ts'

function journey(): string {
  const file = path.join(process.cwd(), JOURNEY)
  expect(fs.existsSync(file), `${JOURNEY} is missing`).toBe(true)
  return repoFile(JOURNEY)
}

describe('AC-020 e2e landing registration', () => {
  it('AC-020-23: zero-import script, target URL from REXI_E2E_SITE_URL', () => {
    const src = journey()
    // Plain node, zero npm imports: every import is a node: builtin.
    const specs = [...src.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1])
    expect(specs.length).toBeGreaterThan(0)
    for (const spec of specs) expect(spec.startsWith('node:'), spec).toBe(true)
    expect(src).not.toMatch(/require\(|from\s+'[^n]/)
    expect(src).toContain('REXI_E2E_SITE_URL')
    expect(src).toMatch(/process\.env\.REXI_E2E_SITE_URL/)
    expect(src).toContain(`node ${JOURNEY}`)
  })

  it('AC-020-24: exact headline/eyebrow, Miami present, Salamanca absent from hero/title', () => {
    const src = journey()
    expect(src).toContain('AC-020-24')
    expect(src).toContain('Apps a medida para tu negocio')
    expect(src).toContain('Tú me lo cuentas. Yo lo construyo.')
    expect(src).toContain("includes('Miami')")
    expect(src).toMatch(/Salamanca is absent from the hero/)
    expect(src).toMatch(/Salamanca is absent from the title/)
  })

  it('AC-020-25: $1,200 + $600 present, no 30 EUR, no SaaS', () => {
    const src = journey()
    expect(src).toContain('AC-020-25')
    expect(src).toContain('$1,200')
    expect(src).toContain('$600')
    expect(src).toContain('30 EUR')
    expect(src).toMatch(/no "SaaS" text on the landing/)
  })

  it('AC-020-26: bio (Valladolid), WhatsApp href, FAQ, nav Hablemos', () => {
    const src = journey()
    expect(src).toContain('AC-020-26')
    expect(src).toContain('Valladolid')
    expect(src).toContain('https://wa.me/34644409229')
    expect(src).toMatch(/FAQ renders 4 pairs/)
    expect(src).toContain('Hablemos')
  })

  it('AC-020-27: one offer, primary CTA scrolls to #booking, ES/EN switch', () => {
    const src = journey()
    expect(src).toContain('AC-020-27')
    expect(src).toMatch(/exactly one service offer/)
    expect(src).toContain('#booking')
    expect(src).toContain('You tell me. I build it.')
    expect(src).toMatch(/aria-label="English"/)
    expect(src).toMatch(/aria-label="Español"/)
    expect(src).toMatch(/document title changes with the locale/)
  })
})
