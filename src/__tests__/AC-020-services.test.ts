// AC-020 Task 2 — services: one offer + three before→after examples
// (20-acceptance/AC-020-02-services.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { fold, renderLanding, section } from './landing-harness'

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
const CLIENT_CASE_WORDS = ['testimonio', 'testimonial', 'caso de éxito', 'case study']

/** The `before`/`after` cells of every example row, in order. */
function examplePairs(container: ParentNode): { before: string; after: string }[] {
  return Array.from(container.querySelectorAll('.example-row')).map((row) => ({
    before: (row.querySelector('.example-row__cell--before')?.textContent ?? '').trim(),
    after: (row.querySelector('.example-row__cell--after')?.textContent ?? '').trim(),
  }))
}

function trades(container: ParentNode): string[] {
  return Array.from(container.querySelectorAll('.example-row__trade')).map((el) =>
    fold(el.textContent ?? '')
  )
}

describe('AC-020 services', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-020-07: exactly one offer card', async () => {
    for (const locale of ['en', 'es'] as const) {
      if (locale === 'es') localStorage.setItem('rexi-locale', 'es')
      const { container } = await renderLanding({ locale })
      const services = section(container, 'services')

      expect(services.querySelectorAll('.offer-card')).toHaveLength(1)
      expect(services.querySelectorAll('article')).toHaveLength(1)

      const offerText = fold(services.querySelector('.offer-card')?.textContent ?? '')
      expect(offerText).not.toContain('saas')
      expect(offerText).not.toContain('websites and apps')
      expect(offerText).not.toContain('webs y aplicaciones')
    }
  })

  it('AC-020-08: three illustrative Miami before→after examples, not client cases', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding()
    const services = section(container, 'services')
    const pairs = examplePairs(services)
    const rowTrades = trades(services)

    expect(pairs).toHaveLength(3)
    expect(rowTrades).toHaveLength(3)
    // plomero · tienda · salón/clínica, in the US-Spanish vocabulary.
    expect(rowTrades[0]).toContain('plomer')
    expect(rowTrades[1]).toContain('tienda')
    expect(rowTrades[2]).toMatch(/salon/)
    expect(rowTrades[2]).toMatch(/clinic/)

    const folded = pairs.map((pair) => fold(`${pair.before} ${pair.after}`))
    expect(folded[0]).toContain('presupuesto')
    expect(folded[0]).toMatch(/papel/)
    expect(folded[0]).toMatch(/movil/)
    expect(folded[1]).toContain('stock')
    expect(folded[1]).toMatch(/excel|hoja de calculo/)
    expect(folded[1]).toMatch(/aviso/)
    expect(folded[2]).toContain('cita')
    expect(folded[2]).toMatch(/whatsapp/)
    expect(folded[2]).toMatch(/recordatorio/)

    const sectionText = fold(services.textContent ?? '')
    for (const word of CLIENT_CASE_WORDS) expect(sectionText).not.toContain(fold(word))
    // No invented name, logo or metric: the section carries no digits at all.
    expect(sectionText).not.toMatch(/\d/)
    expect(services.querySelector('img')).toBeNull()
    expect(services.querySelector('svg')).toBeNull()
  })

  it('AC-020-09: no jargon, software, or the English-teaching brand in the section', async () => {
    for (const locale of ['en', 'es'] as const) {
      if (locale === 'es') localStorage.setItem('rexi-locale', 'es')
      const { container } = await renderLanding({ locale })
      const sectionText = fold(section(container, 'services').textContent ?? '')

      for (const banned of BANNED_JARGON) expect(sectionText).not.toContain(fold(banned))
      expect(sectionText).not.toContain('software')
      expect(sectionText).not.toContain(fold('Inglés Ejecutivo'))
      // The owner's `software` ban is about product copy: an app/herramienta.
      expect(fold(JSON.stringify({ es: es.services, en: en.services }))).toContain('app')
    }
  })
})
