import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import App from '../App'
import { en, es } from '../i18n/dictionary'

import { renderLanding } from './landing-harness'

describe('AC-002', () => {
  it('AC-002-01: Hero displays localized catchphrase', async () => {
    localStorage.clear()
    // The landing opens in Spanish (spec 020); this scenario asserts the English
    // copy end of the switcher, so it pins English instead of leaning on the default.
    await renderLanding({ locale: 'en' })
    expect(screen.getByText(en.hero.catchphrase)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /ES/i }))
    expect(screen.getByText(es.hero.catchphrase)).toBeInTheDocument()
  })
  it('AC-002-02: Services section lists exactly three services', async () => {
    localStorage.clear()
    const { container } = await renderLanding({ locale: 'en' })
    expect(en.services.items).toHaveLength(3)
    expect(en.services.items.map((item) => item.id)).toEqual([
      'internal-tools',
      'saas-products',
      'websites-and-apps',
    ])
    expect(container.querySelectorAll('article.service-card')).toHaveLength(3)
    for (const item of en.services.items) {
      expect(screen.getByText(item.title)).toBeInTheDocument()
    }
  })
  it('AC-002-03: Contact CTA is a mailto link', () => {
    render(<App />)
    const links = screen.getAllByRole('link')
    const mailto = links.find((a) =>
      (a as HTMLAnchorElement).href.includes('mailto:info@rexi-ai.com')
    )
    expect(mailto).toBeDefined()
    expect((mailto as HTMLAnchorElement).href).toBe('mailto:info@rexi-ai.com')
  })
  it('AC-002-04: Page structure has the four main sections', () => {
    const { container } = render(<App />)
    expect(container.querySelector('#hero')).toBeTruthy()
    expect(container.querySelector('#services')).toBeTruthy()
    expect(container.querySelector('#booking')).toBeTruthy()
    expect(container.querySelector('#contact')).toBeTruthy()
    // The proof and about sections landed between services and booking.
    expect(container.querySelector('#proof')).toBeTruthy()
    expect(container.querySelector('#about')).toBeTruthy()
    // old sections gone
    expect(screen.queryByText('What We Build')).not.toBeInTheDocument()
    expect(screen.queryByText('Open Source')).not.toBeInTheDocument()
  })
})
