// AC-019 Task 4 — `What I build`: three cards, carousel removed
// (20-acceptance/AC-019-04-services.md).
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { renderLanding, srcFiles } from './landing-harness'

const EN_TITLES = ['Internal tools', 'SaaS products', 'Websites and apps']
const EN_LINES = [
  "The process living in three spreadsheets and one person's head, rebuilt as one tool your team actually opens.",
  'If the thing you need does not exist, I build v1: auth, billing, deploys, the boring parts done properly.',
  'Fast, clear, and it converts. No page builder, no template.',
]
const ES_TITLES = ['Herramientas internas', 'Productos SaaS', 'Webs y aplicaciones']
const ES_LINES = [
  'El proceso que vive en tres hojas de cálculo y en la cabeza de una persona, reconstruido como una sola herramienta que tu equipo abre de verdad.',
  'Si lo que necesitas no existe, construyo la v1: autenticación, facturación, despliegues, las partes aburridas bien hechas.',
  'Rápidas, claras y convierten. Sin constructores de páginas, sin plantillas.',
]
const OLD_TAGS = ['SaaS · Product', 'Web · Frontend', 'App · Mobile', 'Consulting · Strategy']
// Assembled at runtime: the design checklist greps src/ for this string.
const CAROUSEL_CLASS = ['carou', 'sel'].join('')

function services(container: HTMLElement): HTMLElement {
  const section = container.querySelector('#services')
  if (!section) throw new Error('#services did not render')
  return section as HTMLElement
}

function cardTitles(section: HTMLElement): string[] {
  return Array.from(section.querySelectorAll('article.service-card')).map(
    (card) => card.querySelector('h3')?.textContent ?? ''
  )
}

function cardLines(section: HTMLElement): string[] {
  return Array.from(section.querySelectorAll('article.service-card')).map(
    (card) => card.querySelector('p')?.textContent ?? ''
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

  it('AC-019-09: the section is retitled and carries the three English cards', async () => {
    const { container } = await renderLanding({ billingEnabled: true, locale: 'en' })
    const section = services(container)

    expect(section.querySelector('h2')?.textContent).toBe('What I build')
    expect(cardTitles(section)).toEqual(EN_TITLES)
    expect(cardLines(section)).toEqual(EN_LINES)
    for (const tag of OLD_TAGS) {
      expect(section.textContent).not.toContain(tag)
    }
    expect(section.querySelector('article.service-card img')).toBeNull()
    expect(section.querySelector('article.service-card svg')).toBeNull()
    expect(en.services.items.map((item) => item.id)).toEqual([
      'internal-tools',
      'saas-products',
      'websites-and-apps',
    ])
  })

  it('AC-019-09: the Spanish section carries the translated three cards', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding({ billingEnabled: true })
    const section = services(container)

    expect(section.querySelector('h2')?.textContent).toBe('Lo que construyo')
    expect(cardTitles(section)).toEqual(ES_TITLES)
    expect(cardLines(section)).toEqual(ES_LINES)
  })

  it('AC-019-10: all three cards render at 375, 768 and 1440', async () => {
    for (const width of [375, 768, 1440]) {
      cleanup()
      setViewportWidth(width)
      const { container } = await renderLanding({ billingEnabled: false, locale: 'en' })
      const section = services(container)

      expect(section.querySelectorAll('article.service-card')).toHaveLength(3)
      expect(cardTitles(section)).toEqual(EN_TITLES)

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
    expect(section.querySelector('.service-card__meta')).toBeNull()

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
