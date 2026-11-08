// AC-019 Task 2 — Hero rewrite (20-acceptance/AC-019-02-hero.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { renderLanding } from './landing-harness'

const EN_HEADLINE = 'Your business runs on a spreadsheet only one person understands.'
const EN_SUBTEXT =
  'I replace it with software that runs itself: internal tools, SaaS products and web apps. Scoped in one call, fixed price, shipped in weeks. You own the code.'
const EN_MICROCOPY = 'You leave with a one-page plan and a fixed price.'
const ES_MICROCOPY = 'Te llevas un plan de una página y un precio fijo.'
const OLD_EN = "Forget your Excel. Let's automate, with or without AI."
const OLD_ES = 'Olvídate de tu Excel. Automatiza, con o sin IA.'

function hero(container: HTMLElement): HTMLElement {
  const section = container.querySelector('#hero')
  if (!section) throw new Error('#hero did not render')
  return section as HTMLElement
}

describe('AC-019 hero', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-019-04: the hero states the new offer in both locales', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const section = hero(container)
    expect(section.querySelector('h1')?.textContent).toBe(EN_HEADLINE)
    expect(section.querySelector('.hero-subtext')?.textContent).toBe(EN_SUBTEXT)
    expect(container.textContent).not.toContain(OLD_EN)
    expect(container.textContent).not.toContain(OLD_ES)
    expect(JSON.stringify({ es, en })).not.toContain('Excel')
  })

  it('AC-019-05: both CTAs carry their labels and targets', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const section = hero(container)

    const primary = section.querySelector('a.hero-cta--primary') as HTMLAnchorElement
    expect(primary.getAttribute('href')).toBe('#booking')
    expect(primary.textContent).toMatch(/^Book a free hour\s*→$/)

    const secondary = section.querySelector('a.hero-cta--secondary') as HTMLAnchorElement
    expect(secondary.textContent).toBe('Email me')
    expect(secondary.getAttribute('href')).toBe('mailto:info@rexi-ai.com')

    expect(en.hero.ctaBooking).toBe('Book a free hour')
  })

  it('AC-019-05: the Spanish CTAs mirror the English ones', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding()
    const section = hero(container)

    const primary = section.querySelector('a.hero-cta--primary') as HTMLAnchorElement
    expect(primary.textContent).toMatch(/^Reserva una hora gratis\s*→$/)

    const secondary = section.querySelector('a.hero-cta--secondary') as HTMLAnchorElement
    expect(secondary.textContent).toBe('Escríbeme')
    expect(secondary.getAttribute('href')).toBe('mailto:info@rexi-ai.com')
    expect(es.hero.ctaBooking).toBe('Reserva una hora gratis')
  })

  it('AC-019-06: the microcopy follows the button row and closes the hero', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const section = hero(container)

    const microcopy = section.querySelector('.hero-cta-microcopy') as HTMLElement
    expect(microcopy.textContent).toBe(EN_MICROCOPY)
    expect(microcopy.parentElement).toBe(section)
    expect(section.lastElementChild).toBe(microcopy)

    const ctas = section.querySelector('.hero-ctas') as HTMLElement
    expect(ctas.compareDocumentPosition(microcopy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Inside the paragraph's own tree, never nested in a CTA anchor.
    expect(ctas.contains(microcopy)).toBe(false)
  })

  it('AC-019-06: the Spanish microcopy is the specified string', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding()
    expect(hero(container).querySelector('.hero-cta-microcopy')?.textContent).toBe(ES_MICROCOPY)
  })
})
