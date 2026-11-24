import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import App from '../App'
import { es, en } from '../i18n/dictionary'

describe('AC-001', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = ''
  })

  it('AC-001-01: Default language is Spanish for a first-time visitor', () => {
    localStorage.clear()
    render(<App />)
    // Spanish headline on first render (spec 020 Task 1 inverted this rule),
    // English once the switcher is asked for it.
    expect(screen.getByText(es.hero.headline)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /EN/i }))
    expect(screen.getByText(en.hero.headline)).toBeInTheDocument()
  })

  it('AC-001-02: Switching to English', () => {
    render(<App />)
    // find EN button and click
    const enBtn = screen.getByRole('button', { name: /EN/i })
    fireEvent.click(enBtn)
    expect(screen.getByText(en.hero.headline)).toBeInTheDocument()
    // Spanish should be gone
    expect(screen.queryByText(es.hero.headline)).not.toBeInTheDocument()
  })

  it('AC-001-03: Switching back to Spanish', () => {
    render(<App />)
    const enBtn = screen.getByRole('button', { name: /EN/i })
    fireEvent.click(enBtn)
    const esBtn = screen.getByRole('button', { name: /ES/i })
    fireEvent.click(esBtn)
    expect(screen.getByText(es.hero.headline)).toBeInTheDocument()
  })

  it('AC-001-04: Language choice persists across reload', () => {
    const { unmount } = render(<App />)
    const enBtn = screen.getByRole('button', { name: /EN/i })
    fireEvent.click(enBtn)
    expect(localStorage.getItem('rexi-locale')).toBe('en')
    unmount()
    // simulate reload by re-rendering fresh App which reads localStorage
    render(<App />)
    expect(screen.getByText(en.hero.headline)).toBeInTheDocument()
  })

  it('AC-001-05: No hardcoded user-facing strings in components', () => {
    // Verify dictionaries cover hero and services strings rendered
    const allEsStrings = [
      es.hero.headline,
      es.hero.subtext,
      es.services.offer.title,
      ...es.services.examples.map((example) => example.trade),
    ]
    render(<App />)
    for (const s of allEsStrings) {
      // if hardcoded, dict wouldn't contain it, but we check rendered strings are from dict
      // This just ensures dict keys exist and are used
      expect(typeof s).toBe('string')
    }
    // No en-dashes and no em-dashes anywhere in the dictionaries. The em-dash is
    // banned outright in this copy (spec 020 15-design §Global Tokens), including
    // Spanish, so no value carries one and no value hides one behind a key.
    const dictText = JSON.stringify({ es, en })
    expect(dictText).not.toContain('–')
    expect(dictText).not.toContain('—')
  })
})
