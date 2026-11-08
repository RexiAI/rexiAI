// AC-019 Task 5 — proof section: `Shipped, not slideshow`
// (20-acceptance/AC-019-05-proof.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderLanding } from './landing-harness'

const EN_INTRO = 'No client logos yet. Everything below is live, built and run by me.'
const ES_INTRO =
  'Todavía no hay logos de clientes. Todo lo de abajo está en producción, construido y mantenido por mí.'
const EN_ROWS = [
  {
    name: 'tax-advisor',
    line: 'AI tax guidance for Spanish freelancers.',
    href: 'https://github.com/RexiAI/tax-advisor',
  },
  {
    name: 'pensions-system',
    line: 'Pension calculation, end to end.',
    href: 'https://github.com/RexiAI/pensions-system',
  },
  {
    name: 'my-engineering-standards',
    line: 'The engineering standard everything above is built against: spec pipeline, CI gates, mutation-tested.',
    href: 'https://github.com/RexiAI/my-engineering-standards',
  },
]
const ES_LINES = [
  'Asesoría fiscal con IA para autónomos en España.',
  'Cálculo de pensiones, de principio a fin.',
  'El estándar de ingeniería contra el que se construye todo lo anterior: pipeline de especificaciones, puertas de CI, con mutation testing.',
]
const BANNED_WORDS = ['trusted', 'clients love', 'testimonial', '100%', '500+']

function proof(container: HTMLElement): HTMLElement {
  const section = container.querySelector('#proof')
  if (!section) throw new Error('#proof did not render')
  return section as HTMLElement
}

function anchors(section: HTMLElement): HTMLAnchorElement[] {
  return Array.from(section.querySelectorAll('a'))
}

describe('AC-019 proof', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-019-11: the honesty line is stated, in English', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    const section = proof(container)

    expect(section.querySelector('h2')?.textContent).toBe('Shipped, not slideshow')
    expect(section.querySelector('h2')?.nextElementSibling?.textContent).toBe(EN_INTRO)
    expect(section.querySelector('img')).toBeNull()
    expect(section.querySelector('svg')).toBeNull()
    for (const word of BANNED_WORDS) {
      expect(section.textContent?.toLowerCase()).not.toContain(word)
    }
  })

  it('AC-019-11: the honesty line is stated, in Spanish', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding({ billingEnabled: true })
    const section = proof(container)

    expect(section.querySelector('h2')?.textContent).toBe('Publicado, no presentación')
    expect(section.querySelector('h2')?.nextElementSibling?.textContent).toBe(ES_INTRO)
  })

  it('AC-019-12: three real links in order, with their exact targets', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    const links = anchors(proof(container))

    expect(links).toHaveLength(3)
    links.forEach((link, index) => {
      const row = EN_ROWS[index]
      expect(link.getAttribute('href')).toBe(row.href)
      expect(link.textContent).toContain(row.name)
      expect(link.textContent).toContain(row.line)
      expect(link.getAttribute('target')).toBeNull()
    })
  })

  it('AC-019-12: the Spanish rows keep the English hrefs', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding({ billingEnabled: true })
    const links = anchors(proof(container))

    expect(links).toHaveLength(3)
    links.forEach((link, index) => {
      expect(link.textContent).toContain(ES_LINES[index])
      expect(link.getAttribute('href')).toBe(EN_ROWS[index].href)
    })
  })
})
