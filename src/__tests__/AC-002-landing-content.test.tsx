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
    expect(screen.getByText(en.hero.headline)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /ES/i }))
    expect(screen.getByText(es.hero.headline)).toBeInTheDocument()
  })
  it('AC-002-02: Services section lists the single offer and its three examples', async () => {
    localStorage.clear()
    const { container } = await renderLanding({ locale: 'en' })
    // Spec 020 retired the three-offer list (Task 9): one offer card, and the
    // three rows are illustrative examples, not services on sale.
    expect(container.querySelectorAll('.offer-card')).toHaveLength(1)
    expect(container.querySelectorAll('.example-row')).toHaveLength(3)
    expect(en.services.examples.map((example) => example.id)).toEqual(['plumber', 'shop', 'salon'])
    expect(screen.getByText(en.services.offer.title)).toBeInTheDocument()
    for (const example of en.services.examples) {
      expect(screen.getByText(example.trade)).toBeInTheDocument()
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
  it('AC-002-04: Page structure has the main sections', () => {
    const { container } = render(<App />)
    expect(container.querySelector('#hero')).toBeTruthy()
    expect(container.querySelector('#services')).toBeTruthy()
    expect(container.querySelector('#pricing')).toBeTruthy()
    expect(container.querySelector('#booking')).toBeTruthy()
    expect(container.querySelector('#contact')).toBeTruthy()
    // proof, about and faq landed between services and contact (spec 020).
    expect(container.querySelector('#proof')).toBeTruthy()
    expect(container.querySelector('#about')).toBeTruthy()
    expect(container.querySelector('#faq')).toBeTruthy()
    // old sections gone
    expect(screen.queryByText('What We Build')).not.toBeInTheDocument()
    expect(screen.queryByText('Open Source')).not.toBeInTheDocument()
  })
})
