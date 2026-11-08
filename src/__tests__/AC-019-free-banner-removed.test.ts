// AC-019 Task 3 — the free banner is gone and nothing is struck through
// (20-acceptance/AC-019-03-free-banner-removed.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { elementTexts, renderLanding, srcFiles } from './landing-harness'

// Assembled at runtime: the design checklist greps src/ for these strings, and
// this file must not match itself.
const BANNER_CLASS = ['free', 'banner'].join('-')

/** Classes ending in `__was` — the retired struck-price modifier. */
function wasClasses(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[class]'))
    .map((el) => el.className)
    .filter((name) => name.endsWith('__was'))
}

describe('AC-019 free banner removal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-019-07: free mode renders no banner and nothing saying FREE', async () => {
    const { container } = await renderLanding({ billingEnabled: false })
    expect(container.querySelectorAll(`[class*="${BANNER_CLASS}"]`)).toHaveLength(0)
    expect(elementTexts(container)).not.toContain('FREE')
    expect(elementTexts(container)).not.toContain('GRATIS')
    expect(container.querySelector('.landing')?.firstElementChild?.tagName).toBe('NAV')
  })

  it('AC-019-07: paid mode renders no banner and nothing saying FREE either', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    expect(container.querySelectorAll(`[class*="${BANNER_CLASS}"]`)).toHaveLength(0)
    expect(elementTexts(container)).not.toContain('FREE')
    expect(elementTexts(container)).not.toContain('GRATIS')
    expect(container.querySelector('.landing')?.firstElementChild?.tagName).toBe('NAV')
  })

  it('AC-019-07: the component file, its importers and its dictionary section are gone', () => {
    const files = srcFiles()
    // Assembled at runtime: this test has to name the banned symbol in order to
    // assert its absence, and must not match itself in the scan.
    const component = ['FreeMode', 'Banner'].join('')
    expect(files.map((f) => f.rel)).not.toContain(`src/components/${component}.tsx`)
    expect(files.filter((f) => f.text.includes(component))).toEqual([])
    // Assembled at runtime for the same reason as `component` above.
    const retiredSection = ['free', 'Mode'].join('')
    expect(Object.keys(es)).not.toContain(retiredSection)
    expect(Object.keys(en)).not.toContain(retiredSection)
    const dictionary = JSON.stringify({ es, en })
    for (const retired of ['badge', 'bannerTitle', 'bannerBody', 'bannerFineprint', 'priceWas']) {
      expect(dictionary).not.toContain(retired)
    }
  })

  it('AC-019-08: nothing on the free-mode page is struck through', async () => {
    const { container } = await renderLanding({ billingEnabled: false })
    expect(container.querySelector('s, del, strike')).toBeNull()
    expect(wasClasses(container)).toEqual([])
    expect(elementTexts(container)).not.toContain('30 EUR/h')
  })

  it('AC-019-08: nothing on the paid-mode page is struck through', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    expect(container.querySelector('s, del, strike')).toBeNull()
    expect(wasClasses(container)).toEqual([])
  })
})
