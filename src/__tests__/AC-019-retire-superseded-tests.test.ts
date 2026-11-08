// AC-019 Task 11 — retire the assertions this spec supersedes
// (20-acceptance/AC-019-11-retire-superseded-tests.md).
//
// The scenario's "`npx vitest run` exits 0" and "`npx tsc --noEmit` exits 0"
// clauses are the stage gates themselves (the suite running this file and the
// TypeScript build), so this file asserts the statically checkable rest: the
// six edited files keep every scenario ID, the stale references are gone from
// the test tree, and each authorised rewrite landed.
import { describe, expect, it } from 'vitest'

import { srcFiles } from './landing-harness'

/** Scenario IDs that existed in each edited file before this spec, per Task 11. */
const PRESERVED_IDS: Record<string, string[]> = {
  'src/__tests__/AC-001-i18n.test.tsx': [
    'AC-001-01',
    'AC-001-02',
    'AC-001-03',
    'AC-001-04',
    'AC-001-05',
  ],
  'src/__tests__/AC-002-landing-content.test.tsx': [
    'AC-002-01',
    'AC-002-02',
    'AC-002-03',
    'AC-002-04',
  ],
  'src/__tests__/AC-003-inflight-copy.test.ts': [
    'AC-003-28',
    'AC-003-29',
    'AC-003-30',
    'AC-003-31',
  ],
  'src/__tests__/AC-003-confirmation-panel.test.ts': ['AC-003-32', 'AC-003-33', 'AC-003-34'],
  'src/__tests__/AC-002-frontend-confirmation.render.test.tsx': ['AC-002-17'],
}

const RETIRED_KEYS = [
  ['free', 'Mode'].join(''),
  ['carousel', 'Prev'].join(''),
  ['carousel', 'Next'].join(''),
  ['carousel', 'Position'].join(''),
  ['carousel', 'Role'].join(''),
  ['pricing', 'Example'].join(''),
  ['pricing', 'Rules'].join(''),
]

const RETIRED_COMPONENT = ['FreeMode', 'Banner'].join('')
const RETIRED_ADDRESS = ['danielbueno', '76'].join('')

/** Test-tree files, minus this one: it names the retired strings in order to assert their absence. */
const SELF = 'src/__tests__/AC-019-retire-superseded-tests.test.ts'

function testTree() {
  return srcFiles().filter((file) => file.rel.startsWith('src/__tests__/') && file.rel !== SELF)
}

describe('AC-019 retired assertions', () => {
  it('AC-019-23: every scenario ID in the six edited files survives', () => {
    const files = new Map(srcFiles().map((file) => [file.rel, file.text]))
    for (const [rel, ids] of Object.entries(PRESERVED_IDS)) {
      const text = files.get(rel)
      expect(text, `${rel} is missing`).toBeDefined()
      for (const id of ids) {
        expect(text, `${id} was dropped from ${rel}`).toContain(id)
      }
    }
  })

  it('AC-019-23: the test tree carries no retired dictionary key, component or address', () => {
    const offenders = testTree().filter((file) =>
      [...RETIRED_KEYS, RETIRED_COMPONENT, RETIRED_ADDRESS].some((needle) =>
        file.text.includes(needle)
      )
    )
    expect(offenders.map((file) => file.rel)).toEqual([])
  })

  it('AC-019-23: each authorised rewrite landed in its file', () => {
    const files = new Map(srcFiles().map((file) => [file.rel, file.text]))

    const i18n = files.get('src/__tests__/AC-001-i18n.test.tsx') ?? ''
    expect(i18n).toContain('en.hero.catchphrase')
    expect(i18n).toContain('booking.narrativePaid')

    const landing = files.get('src/__tests__/AC-002-landing-content.test.tsx') ?? ''
    expect(landing).toContain('en.hero.catchphrase')
    expect(landing).toContain('internal-tools')
    expect(landing).toContain('mailto:info@rexi-ai.com')
    expect(landing).toContain("'#proof'")
    expect(landing).toContain("'#about'")

    for (const rel of [
      'src/__tests__/AC-003-inflight-copy.test.ts',
      'src/__tests__/AC-003-confirmation-panel.test.ts',
      'src/__tests__/AC-002-frontend-confirmation.render.test.tsx',
    ]) {
      expect(files.get(rel), `${rel} still reads the retired submit key`).toContain('submitFree')
    }
  })

  it('AC-019-23: the retired banner test block is gone but its API tests remain', () => {
    const billing = srcFiles().find(
      (file) => file.rel === 'src/__tests__/billing-free-mode.test.tsx'
    )
    expect(billing).toBeDefined()
    expect(billing?.text).not.toContain(RETIRED_COMPONENT)
    // The kill-switch assertions the file exists for are untouched.
    expect(billing?.text).toContain('isBillingEnabled defaults to true')
    expect(billing?.text).toContain('recorded-billing returns free and never touches Stripe')
  })
})
