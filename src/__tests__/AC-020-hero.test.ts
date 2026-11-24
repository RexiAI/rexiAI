// AC-020 Task 1 — hero: eyebrow, exact headline, Miami trades, CTAs
// (20-acceptance/AC-020-01-hero.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { fold, renderLanding, section } from './landing-harness'

const ES_EYEBROW = 'Apps a medida para tu negocio'
const EN_EYEBROW = 'Custom apps for your business'
const ES_HEADLINE = 'Tú me lo cuentas. Yo lo construyo.'
const EN_HEADLINE = 'You tell me. I build it.'
const WHATSAPP_HREF = 'https://wa.me/34644409229'

// The banned lists live in 10-tasks.md; they are assembled here so this file
// does not itself contain the strings it forbids where that would be confusing.
const BANNED_LABELS = ['negocios de barrio', 'pymes de barrio']
const BANNED_JARGON = [
  'saas',
  'auth',
  'autenticación',
  'authentication',
  'deploy',
  'despliegue',
  'mutation',
  'mutación',
  'internal tools',
  'herramientas internas',
  'spec pipeline',
  'pipeline de especificaciones',
  'ci gates',
  'puertas de ci',
  'billing',
  'facturación',
]
const ES_TRADES = [
  'plomer',
  'clinic',
  'despacho',
  'abogad',
  'contratist',
  'electricist',
  'tienda',
  'salon',
]
const EN_TRADES = [
  'plumber',
  'clinic',
  'office',
  'lawyer',
  'contractor',
  'electrician',
  'shop',
  'store',
  'salon',
]
const ES_LISTENING = ['escuchar', 'escucho', 'a medida', 'adapta', 'adaptado', 'exactamente lo que']
const EN_LISTENING = ['listen', 'tailored', 'adapted', 'exactly what you']

function countMatches(text: string, terms: string[]): number {
  return terms.filter((term) => text.includes(term)).length
}

describe('AC-020 hero', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-020-01: the eyebrow is exact in both locales', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    const enHero = section(enPage.container, 'hero')
    const eyebrow = enHero.querySelector('.hero-eyebrow') as HTMLElement
    expect(eyebrow.tagName).not.toBe('H1')
    expect(eyebrow.tagName).not.toBe('H2')
    expect(eyebrow.textContent).toBe(EN_EYEBROW)
    expect(en.hero.eyebrow).toBe(EN_EYEBROW)

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    expect(section(esPage.container, 'hero').querySelector('.hero-eyebrow')?.textContent).toBe(
      ES_EYEBROW
    )
    expect(es.hero.eyebrow).toBe(ES_EYEBROW)
  })

  it('AC-020-02: the headline is exact in both locales', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    expect(section(enPage.container, 'hero').querySelector('h1')?.textContent).toBe(EN_HEADLINE)

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    expect(section(esPage.container, 'hero').querySelector('h1')?.textContent).toBe(ES_HEADLINE)
  })

  it('AC-020-03: the subtext names Miami trades and the listening differentiator', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    const enSubtext = fold(
      section(enPage.container, 'hero').querySelector('.hero-subtext')?.textContent ?? ''
    )
    expect(countMatches(enSubtext, EN_TRADES)).toBeGreaterThanOrEqual(2)
    expect(countMatches(enSubtext, EN_LISTENING)).toBeGreaterThanOrEqual(1)

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    const esSubtext = fold(
      section(esPage.container, 'hero').querySelector('.hero-subtext')?.textContent ?? ''
    )
    expect(countMatches(esSubtext, ES_TRADES)).toBeGreaterThanOrEqual(2)
    expect(countMatches(esSubtext, ES_LISTENING)).toBeGreaterThanOrEqual(1)
  })

  it('AC-020-04: the hero names Miami only, and the offer is Miami or video call', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    const enHero = section(enPage.container, 'hero')
    expect(enHero.textContent).toContain('Miami')
    expect(enHero.textContent).not.toContain('Salamanca')
    expect(fold(enHero.textContent ?? '')).toMatch(/video call/)

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    const esHero = section(esPage.container, 'hero')
    expect(esHero.textContent).toContain('Miami')
    expect(esHero.textContent).not.toContain('Salamanca')
    expect(fold(esHero.textContent ?? '')).toMatch(/videollamada|video llamada|video call/)
  })

  it('AC-020-05: kept promises and the two CTAs', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    const enHero = section(enPage.container, 'hero')
    const enHeroText = fold(enHero.textContent ?? '')
    expect(enHeroText).toContain('first call free')
    expect(enHeroText).toContain('you own the code')

    const enPrimary = enHero.querySelector('a.hero-cta--primary') as HTMLAnchorElement
    expect(enPrimary.getAttribute('href')).toBe('#booking')
    expect(fold(enPrimary.textContent ?? '')).toMatch(/book|call/)

    const enSecondary = enHero.querySelector('a.hero-cta--secondary') as HTMLAnchorElement
    expect(enSecondary.getAttribute('href')).toBe(WHATSAPP_HREF)
    expect(enSecondary.textContent).toContain('WhatsApp')
    expect(enHero.querySelector('a[href^="mailto:"]')).toBeNull()

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    const esHero = section(esPage.container, 'hero')
    const esHeroText = fold(esHero.textContent ?? '')
    expect(esHeroText).toContain('primera llamada gratis')
    expect(esHeroText).toContain('el codigo es tuyo')

    const esPrimary = esHero.querySelector('a.hero-cta--primary') as HTMLAnchorElement
    expect(esPrimary.getAttribute('href')).toBe('#booking')
    expect(fold(esPrimary.textContent ?? '')).toMatch(/llamada|reserva|agenda/)

    const esSecondary = esHero.querySelector('a.hero-cta--secondary') as HTMLAnchorElement
    expect(esSecondary.getAttribute('href')).toBe(WHATSAPP_HREF)
    expect(esSecondary.textContent).toContain('WhatsApp')
    expect(esHero.querySelector('a[href^="mailto:"]')).toBeNull()
  })

  it('AC-020-06: the hero is free of banned copy', async () => {
    for (const locale of ['en', 'es'] as const) {
      if (locale === 'es') localStorage.setItem('rexi-locale', 'es')
      const { container } = await renderLanding({ locale })
      const hero = fold(section(container, 'hero').textContent ?? '')
      for (const banned of BANNED_LABELS) expect(hero).not.toContain(fold(banned))
      for (const banned of BANNED_JARGON) expect(hero).not.toContain(fold(banned))
      expect(hero).not.toContain('software')
      expect(hero).not.toContain(fold('Inglés Ejecutivo'))
      expect(hero).not.toContain('30 eur')
      expect(hero).not.toMatch(/\beur\b/)
      expect(hero).not.toContain('€')
    }
  })
})
