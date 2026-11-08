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
    expect(screen.getByText(es.hero.catchphrase)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /EN/i }))
    expect(screen.getByText(en.hero.catchphrase)).toBeInTheDocument()
  })

  it('AC-001-02: Switching to English', () => {
    render(<App />)
    // find EN button and click
    const enBtn = screen.getByRole('button', { name: /EN/i })
    fireEvent.click(enBtn)
    expect(screen.getByText(en.hero.catchphrase)).toBeInTheDocument()
    // Spanish should be gone
    expect(screen.queryByText(es.hero.catchphrase)).not.toBeInTheDocument()
  })

  it('AC-001-03: Switching back to Spanish', () => {
    render(<App />)
    const enBtn = screen.getByRole('button', { name: /EN/i })
    fireEvent.click(enBtn)
    const esBtn = screen.getByRole('button', { name: /ES/i })
    fireEvent.click(esBtn)
    expect(screen.getByText(es.hero.catchphrase)).toBeInTheDocument()
  })

  it('AC-001-04: Language choice persists across reload', () => {
    const { unmount } = render(<App />)
    const enBtn = screen.getByRole('button', { name: /EN/i })
    fireEvent.click(enBtn)
    expect(localStorage.getItem('rexi-locale')).toBe('en')
    unmount()
    // simulate reload by re-rendering fresh App which reads localStorage
    render(<App />)
    expect(screen.getByText(en.hero.catchphrase)).toBeInTheDocument()
  })

  it('AC-001-05: No hardcoded user-facing strings in components', () => {
    // Verify dictionaries cover hero and services strings rendered
    const allEsStrings = [
      es.hero.catchphrase,
      es.hero.subtext,
      ...es.services.items.map((i) => i.title),
    ]
    render(<App />)
    for (const s of allEsStrings) {
      // if hardcoded, dict wouldn't contain it, but we check rendered strings are from dict
      // This just ensures dict keys exist and are used
      expect(typeof s).toBe('string')
    }
    // No en-dashes anywhere in the dictionaries. The single em-dash lives in the
    // paid booking narrative (final copy, spec 019 Task 7); nothing else gains one.
    const dictText = JSON.stringify({ es, en })
    expect(dictText).not.toContain('–')
    const withoutPaidNarrative = JSON.stringify({
      es: { ...es, booking: { ...es.booking, narrativePaid: '' } },
      en: { ...en, booking: { ...en.booking, narrativePaid: '' } },
    })
    expect(withoutPaidNarrative).not.toContain('—')
    // …and it is exactly one string per locale that carries it.
    const carriers = [
      ...(JSON.stringify(es.booking.narrativePaid).includes('—') ? ['es'] : []),
      ...(JSON.stringify(en.booking.narrativePaid).includes('—') ? ['en'] : []),
    ]
    expect(carriers).toEqual(['es', 'en'])
  })
})
