// AC-020 Task 5 — pricing: public USD figures, no hourly text, no milestone line
// (20-acceptance/AC-020-05-pricing.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { renderLanding, section } from './landing-harness'

const MILESTONE_ES = 'Pagas por hitos: solo pagas cada parte cuando la ves funcionando.'
const HOURLY_LADDER = '1h · 2h'

describe('AC-020 pricing', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-020-14: public pricing shows desde $1,200 + desde $600/mes', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    const enPricing = section(enPage.container, 'pricing')
    expect(enPricing.textContent).toContain('from $1,200')
    expect(enPricing.textContent).toContain('from $600/month')

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    const esPricing = section(esPage.container, 'pricing')
    expect(esPricing.textContent).toContain('desde $1,200')
    expect(esPricing.textContent).toContain('desde $600/mes')

    for (const page of [enPricing, esPricing]) {
      expect(page.textContent).toContain('$1,200')
      expect(page.textContent).toContain('$600')
    }
  })

  it('AC-020-15: no hourly/EUR text, no milestone line; first call free stays', async () => {
    // Both dictionaries: no hourly figure, no EUR, no milestone line anywhere.
    const dictionaries = JSON.stringify({ es, en })
    expect(dictionaries).not.toContain('30 EUR')
    expect(dictionaries).not.toMatch(/\bEUR\b/)
    expect(dictionaries).not.toContain('€')
    expect(dictionaries).not.toContain('por hora')
    expect(dictionaries).not.toContain('per hour')
    expect(dictionaries).not.toContain(MILESTONE_ES)

    // The landing-rendered booking copy lost the hourly text and the ladder.
    for (const locale of ['en', 'es'] as const) {
      expect(es.booking.narrativePaid).not.toMatch(/EUR|€|por hora|per hour/i)
      expect(en.booking.narrativePaid).not.toMatch(/EUR|€|por hora|per hour/i)
      expect(es.booking.priceLine).not.toMatch(/EUR|€|por hora|per hour/i)
      expect(en.booking.priceLine).not.toMatch(/EUR|€|por hora|per hour/i)
      expect(es.booking.priceLine).not.toContain(HOURLY_LADDER)
      expect(en.booking.priceLine).not.toContain(HOURLY_LADDER)
      expect(`${es.booking.narrativePaid} ${es.booking.priceLine}`).not.toContain(MILESTONE_ES)

      if (locale === 'es') localStorage.setItem('rexi-locale', 'es')
      const { container } = await renderLanding({ locale })
      const landingText = container.textContent ?? ''
      const landing = landingText.toLowerCase()

      expect(landingText).not.toContain('30 EUR')
      expect(landing).not.toMatch(/\beur\b/)
      expect(landingText).not.toContain('€')
      expect(landing).not.toContain('por hora')
      expect(landing).not.toContain('per hour')
      expect(landingText).not.toContain(HOURLY_LADDER)
      expect(landingText).not.toContain(MILESTONE_ES)
      expect(landing).toMatch(/llamada gratis|call free/)
    }
  })
})
