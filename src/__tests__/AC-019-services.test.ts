// AC-019 Task 4 — `What I build` (20-acceptance/AC-019-04-services.md).
//
// Spec 020 (Task 2) retired the three-offer grid: the section now carries one
// offer card and three illustrative before-to-after example rows. The scenario
// IDs are kept — they still assert what the section offers and that nothing is
// hidden or carouselled at any breakpoint — against the reshaped section.
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { renderLanding, srcFiles } from './landing-harness'

const EN_TRADES = ['Plumbers', 'Shops', 'Salons and clinics', 'Law firms and medical practices']
const ES_TRADES = ['Plomeros', 'Tiendas', 'Salones y clínicas', 'Despachos y consultas']
// Assembled at runtime: the design checklist greps src/ for this string.
const CAROUSEL_CLASS = ['carou', 'sel'].join('')

function services(container: HTMLElement): HTMLElement {
  const section = container.querySelector('#services')
  if (!section) throw new Error('#services did not render')
  return section as HTMLElement
}

function tradeNames(section: HTMLElement): string[] {
  return Array.from(section.querySelectorAll('.example-row__trade')).map(
    (el) => el.textContent ?? ''
  )
}

function setViewportWidth(px: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: px })
}

describe('AC-019 services', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setViewportWidth(1024)
  })

  it('AC-019-09: the section is retitled and carries one offer plus four examples', async () => {
    const { container } = await renderLanding({ billingEnabled: true, locale: 'en' })
    const section = services(container)

    expect(section.querySelector('h2')?.textContent).toBe('What I build')
    expect(section.querySelectorAll('.offer-card')).toHaveLength(1)
    expect(section.querySelector('.offer-card__title')?.textContent).toBe(en.services.offer.title)
    expect(tradeNames(section)).toEqual(EN_TRADES)
    expect(section.querySelectorAll('.example-row')).toHaveLength(4)
    // Three equal service cards are gone; the examples are rows, not cards.
    expect(section.querySelectorAll('article')).toHaveLength(1)
    expect(section.querySelectorAll('.service-card')).toHaveLength(0)
    expect(section.querySelector('article.service-card img')).toBeNull()
  })

  it('AC-019-09: the Spanish section carries the translated offer and examples', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding({ billingEnabled: true })
    const section = services(container)

    expect(section.querySelector('h2')?.textContent).toBe('Lo que construyo')
    expect(section.querySelector('.offer-card__title')?.textContent).toBe(es.services.offer.title)
    expect(tradeNames(section)).toEqual(ES_TRADES)
  })

  it('AC-019-10: the offer and all four examples render at 375, 768 and 1440', async () => {
    for (const width of [375, 768, 1440]) {
      cleanup()
      setViewportWidth(width)
      const { container } = await renderLanding({ billingEnabled: false, locale: 'en' })
      const section = services(container)

      expect(section.querySelectorAll('.offer-card')).toHaveLength(1)
      expect(section.querySelectorAll('.example-row')).toHaveLength(4)
      expect(tradeNames(section)).toEqual(EN_TRADES)

      const horizontal = Array.from(section.querySelectorAll<HTMLElement>('[style]')).filter(
        (el) => el.style.overflowX === 'auto' || el.style.overflowX === 'scroll'
      )
      expect(horizontal).toEqual([])
    }
  })

  it('AC-019-10: no carousel machinery survives in the section or the dictionary', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    const section = services(container)

    expect(section.querySelectorAll('button')).toHaveLength(0)
    expect(section.querySelector(`[class*="${CAROUSEL_CLASS}"]`)).toBeNull()
    expect(section.querySelector('[aria-roledescription]')).toBeNull()

    for (const locale of [es, en]) {
      const keys = Object.keys(locale.services)
      for (const suffix of ['Prev', 'Next', 'Position', 'Role']) {
        expect(keys).not.toContain(['carousel', suffix].join(''))
      }
    }
  })

  it('AC-019-10: the carousel component and stylesheet are deleted', () => {
    const files = srcFiles()
    const rels = files.map((f) => f.rel)
    // Assembled at runtime: this test has to name the banned string in order to
    // assert its absence, and must not match itself in the scan.
    const bannedClass = ['services', CAROUSEL_CLASS].join('-')
    const component = ['Services', 'Carousel']
    expect(rels).not.toContain(`src/components/${component.join('')}.tsx`)
    expect(rels).not.toContain(`src/components/${component.join('')}.css`)
    expect(files.filter((f) => f.text.includes(bannedClass))).toEqual([])
  })
})
