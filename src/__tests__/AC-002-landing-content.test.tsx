import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import App from '../App'
import { es } from '../i18n/dictionary'

describe('AC-002', () => {
  it('AC-002-01: Hero displays localized catchphrase', () => {
    localStorage.clear()
    render(<App />)
    expect(screen.getByText(es.hero.catchphrase)).toBeInTheDocument()
  })
  it('AC-002-02: Services section lists exactly four services', () => {
    render(<App />)
    for (const item of es.services.items) {
      expect(screen.getByText(item.title)).toBeInTheDocument()
    }
    // count service titles: should be 4 distinct
    expect(es.services.items).toHaveLength(4)
  })
  it('AC-002-03: Contact CTA is a mailto link', () => {
    render(<App />)
    const links = screen.getAllByRole('link')
    const mailto = links.find((a) => (a as HTMLAnchorElement).href.includes('mailto:danielbueno76@gmail.com'))
    expect(mailto).toBeDefined()
    expect((mailto as HTMLAnchorElement).href).toBe('mailto:danielbueno76@gmail.com')
  })
  it('AC-002-04: Page structure has the four main sections', () => {
    const { container } = render(<App />)
    expect(container.querySelector('#hero')).toBeTruthy()
    expect(container.querySelector('#services')).toBeTruthy()
    expect(container.querySelector('#booking')).toBeTruthy()
    expect(container.querySelector('#contact')).toBeTruthy()
    // old sections gone
    expect(screen.queryByText('What We Build')).not.toBeInTheDocument()
    expect(screen.queryByText('Open Source')).not.toBeInTheDocument()
  })
})
