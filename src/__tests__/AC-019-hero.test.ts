// AC-019 Task 2 — Hero rewrite (20-acceptance/AC-019-02-hero.md).
//
// Spec 020 (Task 1) re-cut the hero: exact eyebrow and headline, Miami trades,
// WhatsApp as the secondary CTA and no microcopy. The scenario IDs are kept
// because they assert the same three concerns — the hero's copy, its two CTAs,
// and what closes the hero — against the copy that now ships.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { renderLanding, section } from './landing-harness'

const EN_HEADLINE = 'You tell me. I build it.'
const EN_SUBTEXT =
  'I listen, then build exactly what you described: quotes for plumbers and contractors, appointments for clinics and salons, orders for shops. In person in Miami, or by video call wherever you are. First call free, and you own the code.'
const ES_SUBTEXT =
  'Lo escucho de ti y lo construyo a tu medida: presupuestos para plomeros y contratistas, citas para clínicas y salones, pedidos para tiendas. En persona en Miami o por videollamada desde donde estés. Tienes la primera llamada gratis y el código es tuyo.'
const WHATSAPP_HREF = 'https://wa.me/34644409229'

function hero(container: HTMLElement): HTMLElement {
  return section(container, 'hero')
}

/** The hero's three text elements, without optional-chaining noise in each test. */
function heroText(container: HTMLElement): { eyebrow: string; headline: string; subtext: string } {
  const heroSection = hero(container)
  return {
    eyebrow: (heroSection.querySelector('.hero-eyebrow') as HTMLElement).textContent ?? '',
    headline: (heroSection.querySelector('h1') as HTMLElement).textContent ?? '',
    subtext: (heroSection.querySelector('.hero-subtext') as HTMLElement).textContent ?? '',
  }
}

describe('AC-019 hero', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-019-04: the hero states the new offer in both locales', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    expect(heroText(enPage.container)).toEqual({
      eyebrow: 'Custom apps for your business',
      headline: EN_HEADLINE,
      subtext: EN_SUBTEXT,
    })

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    expect(heroText(esPage.container)).toEqual({
      eyebrow: 'Apps a medida para tu negocio',
      headline: 'Tú me lo cuentas. Yo lo construyo.',
      subtext: ES_SUBTEXT,
    })
  })

  it('AC-019-05: both CTAs carry their labels and targets', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const section = hero(container)

    const primary = section.querySelector('a.hero-cta--primary') as HTMLAnchorElement
    expect(primary.getAttribute('href')).toBe('#booking')
    expect(primary.textContent).toBe(en.hero.ctaBooking)
    expect(primary.textContent).toBe('Book your free call')

    const secondary = section.querySelector('a.hero-cta--secondary') as HTMLAnchorElement
    expect(secondary.textContent).toBe(en.hero.ctaWhatsApp)
    expect(secondary.textContent).toContain('WhatsApp')
    expect(secondary.getAttribute('href')).toBe(WHATSAPP_HREF)

    // Email lives in the contact section and footer only (spec 020 Task 1).
    expect(section.querySelector('a[href^="mailto:"]')).toBeNull()
  })

  it('AC-019-05: the Spanish CTAs mirror the English ones', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding()
    const section = hero(container)

    const primary = section.querySelector('a.hero-cta--primary') as HTMLAnchorElement
    expect(primary.getAttribute('href')).toBe('#booking')
    expect(primary.textContent).toBe('Reserva una llamada gratis')

    const secondary = section.querySelector('a.hero-cta--secondary') as HTMLAnchorElement
    expect(secondary.textContent).toBe('Escríbeme por WhatsApp')
    expect(secondary.getAttribute('href')).toBe(WHATSAPP_HREF)
    expect(es.hero.ctaBooking).toBe('Reserva una llamada gratis')
  })

  it('AC-019-06: the hero stack is eyebrow, headline, subtext and the CTA pair', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const section = hero(container)

    // No microcopy under the buttons: the promises live inside the subtext.
    expect(section.querySelector('.hero-cta-microcopy')).toBeNull()
    expect(section.lastElementChild?.className).toBe('hero-ctas')

    const textChildren = Array.from(section.children).map((child) => child.className)
    expect(textChildren).toEqual(['hero-eyebrow', 'hero-title', 'hero-subtext', 'hero-ctas'])
    expect(section.querySelectorAll('.hero-ctas a')).toHaveLength(2)
  })
})
