// AC-019 Task 1 — English is the default locale (20-acceptance/AC-019-01-locale-default.md).
//
// Rendered through the real app rather than I18nProvider in isolation: the
// module-level `document.documentElement.lang` assignment runs at import time,
// so only a fresh module graph proves the pre-paint behaviour the spec asks for.
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderLanding } from './landing-harness'

const EN_HEADLINE = 'Your business runs on a spreadsheet only one person understands.'
const ES_HEADLINE = 'Tu negocio funciona con una hoja de cálculo que solo una persona entiende.'
const EN_SUBTEXT =
  'I replace it with software that runs itself: internal tools, SaaS products and web apps. Scoped in one call, fixed price, shipped in weeks. You own the code.'
const ES_SUBTEXT =
  'La sustituyo por software que funciona solo: herramientas internas, productos SaaS y aplicaciones web. Alcance en una llamada, precio fijo, entregado en semanas. El código es tuyo.'

function headline(): string {
  return screen.getByRole('heading', { level: 1 }).textContent ?? ''
}

describe('AC-019 default locale', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-019-01: a first-time visitor gets English', async () => {
    const { container } = await renderLanding()
    expect(headline()).toBe(EN_HEADLINE)
    expect(document.documentElement.lang).toBe('en')
    expect(container.textContent).not.toContain(ES_HEADLINE)
  })

  it('AC-019-01: an unrecognised stored value falls back to English', async () => {
    localStorage.setItem('rexi-locale', 'fr')
    await renderLanding()
    expect(headline()).toBe(EN_HEADLINE)
    expect(document.documentElement.lang).toBe('en')
  })

  it('AC-019-02: a stored Spanish preference is honoured', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding()
    expect(headline()).toBe(ES_HEADLINE)
    expect(document.documentElement.lang).toBe('es')
    expect(container.textContent).not.toContain(EN_HEADLINE)
  })

  it('AC-019-03: toggling updates lang and persists the choice', async () => {
    await renderLanding()
    expect(document.documentElement.lang).toBe('en')

    fireEvent.click(screen.getByRole('button', { name: 'Español' }))
    expect(localStorage.getItem('rexi-locale')).toBe('es')
    expect(document.documentElement.lang).toBe('es')
    expect(headline()).toBe(ES_HEADLINE)
    expect(screen.getByText(ES_SUBTEXT)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(localStorage.getItem('rexi-locale')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(headline()).toBe(EN_HEADLINE)
    expect(screen.getByText(EN_SUBTEXT)).toBeTruthy()
  })
})
