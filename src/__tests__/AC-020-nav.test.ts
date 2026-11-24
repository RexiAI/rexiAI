// AC-020 Task 8 — nav: `Reservas` → `Hablemos`, target unchanged
// (20-acceptance/AC-020-08-nav.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { renderLanding } from './landing-harness'

function bookingLink(container: HTMLElement): HTMLAnchorElement {
  const link = container.querySelector('nav a[href="#booking"]')
  if (!link) throw new Error('no nav anchor to #booking')
  return link as HTMLAnchorElement
}

describe('AC-020 nav', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-020-20: the nav label changes, the target stays', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    const enLink = bookingLink(enPage.container)
    expect(enLink.textContent).toBe("Let's talk")
    expect(enLink.getAttribute('href')).toBe('#booking')
    expect(en.nav.booking).toBe("Let's talk")

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    const esLink = bookingLink(esPage.container)
    expect(esLink.textContent).toBe('Hablemos')
    expect(esLink.getAttribute('href')).toBe('#booking')
    expect(es.nav.booking).toBe('Hablemos')

    // No second booking control was added beside it.
    expect(esPage.container.querySelectorAll('nav a[href="#booking"]')).toHaveLength(1)
  })
})
