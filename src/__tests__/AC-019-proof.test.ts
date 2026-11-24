// AC-019 Task 5 — proof section (20-acceptance/AC-019-05-proof.md).
//
// Spec 020 (Task 3) reworded the proof for the owner and removed the
// engineering-standards repository from it: the section now carries the honesty
// line and two real source links. The scenario IDs are kept — they assert the
// honesty line and the real links, which is still what the section is.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderLanding } from './landing-harness'

const EN_INTRO =
  'No client logos yet: I would rather show you the code. Everything below I built and maintain myself, and each link goes to the repository.'
const ES_INTRO =
  'Todavía no hay logos de clientes: prefiero enseñarte el código. Lo de abajo lo construí y lo mantengo yo, y cada enlace lleva al repositorio.'
const EN_ROWS = [
  {
    name: 'tax-advisor',
    line: 'AI tax guidance for Spanish freelancers.',
    href: 'https://github.com/RexiAI/tax-advisor',
  },
]
const ES_LINES = ['Asesoría fiscal con IA para autónomos en España.']
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
    const { container } = await renderLanding({ billingEnabled: true, locale: 'en' })
    const section = proof(container)

    expect(section.querySelector('h2')?.textContent).toBe('Real work, real code')
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

    expect(section.querySelector('h2')?.textContent).toBe('Trabajo real, código real')
    expect(section.querySelector('h2')?.nextElementSibling?.textContent).toBe(ES_INTRO)
  })

  it('AC-019-12: the one real link renders in order, with their exact targets', async () => {
    const { container } = await renderLanding({ billingEnabled: true, locale: 'en' })
    const links = anchors(proof(container))

    expect(links).toHaveLength(1)
    links.forEach((link, index) => {
      const row = EN_ROWS[index]
      expect(link.getAttribute('href')).toBe(row.href)
      expect(link.textContent).toContain(row.name)
      expect(link.textContent).toContain(row.line)
      expect(link.textContent).toContain('View source')
      expect(link.getAttribute('target')).toBeNull()
    })
    // The engineering standards repository is out of the proof list (spec 020).
    expect(links.map((link) => link.getAttribute('href'))).not.toContain(
      'https://github.com/RexiAI/my-engineering-standards'
    )
  })

  it('AC-019-12: the Spanish rows keep the English hrefs', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding({ billingEnabled: true })
    const links = anchors(proof(container))

    expect(links).toHaveLength(1)
    links.forEach((link, index) => {
      expect(link.textContent).toContain(ES_LINES[index])
      expect(link.getAttribute('href')).toBe(EN_ROWS[index].href)
    })
  })
})
