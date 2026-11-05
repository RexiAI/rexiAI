// The privacy policy page served at /privacy (and /privacidad).
//
// These assertions cover the parts that make the page legally meaningful rather
// than the whole prose: that the route renders instead of the landing page, that
// both locales are complete, that the mandatory RGPD/LOPDGDD sections and the
// AEPD complaint route are present, and that the landing page links to it.
import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from '../App'
import { LEGAL_ENTITY, privacy } from '../content/privacy'
import { es, en } from '../i18n/dictionary'

function atPath(path: string) {
  Object.defineProperty(window, 'location', {
    value: new URL(`https://www.rexi-ai.com${path}`),
    writable: true,
  })
}

const LANDING = () => atPath('/')

describe('privacy page', () => {
  beforeEach(() => {
    localStorage.clear()
    document.title = 'RexiAI'
  })

  afterEach(() => {
    LANDING()
  })

  it('renders at /privacy instead of the landing page', () => {
    atPath('/privacy')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: privacy.es.title })).toBeInTheDocument()
    expect(screen.queryByText(es.hero.catchphrase)).not.toBeInTheDocument()
  })

  it('accepts the Spanish /privacidad path too', () => {
    atPath('/privacidad')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByText(es.hero.catchphrase)).not.toBeInTheDocument()
  })

  it('serves Spanish by default and switches to English', () => {
    atPath('/privacy')
    render(<App />)
    expect(screen.getByText(privacy.es.title)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /EN/i }))
    expect(screen.getByText(privacy.en.title)).toBeInTheDocument()
    expect(screen.queryByText(privacy.es.title)).not.toBeInTheDocument()
  })

  it('covers every mandatory section in both locales', () => {
    const required = [
      'responsable',
      'datos',
      'finalidades',
      'destinatarios',
      'transferencias',
      'conservacion',
      'derechos',
      'cookies',
      'seguridad',
    ]
    for (const doc of [privacy.es, privacy.en]) {
      const ids = doc.sections.map((s) => s.id)
      for (const id of required) {
        expect(ids).toContain(id)
      }
    }
    // Same section ids in both languages, so a translation cannot silently drop one.
    expect(privacy.en.sections.map((s) => s.id)).toEqual(privacy.es.sections.map((s) => s.id))
  })

  it('names the AEPD as the supervisory authority and the rights contact', () => {
    atPath('/privacy')
    render(<App />)
    expect(screen.getAllByText(/www\.aepd\.es/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(new RegExp(LEGAL_ENTITY.email)).length).toBeGreaterThan(0)
  })

  it('states the recording consent and its withdrawal', () => {
    const recording = privacy.es.sections.find((s) => s.id === 'grabacion')
    expect(recording).toBeDefined()
    const prose = [recording?.heading, ...(recording?.paragraphs ?? [])].join(' ')
    expect(prose).toMatch(/consentimiento/i)
    expect(prose).toMatch(/retirar/i)
    expect(prose).toMatch(/sin grabación/i)
  })

  it('does not claim cookies it does not set', () => {
    const cookies = privacy.es.sections.find((s) => s.id === 'cookies')
    const prose = [cookies?.heading, ...(cookies?.paragraphs ?? [])].join(' ')
    expect(prose).toMatch(/no utiliza cookies/i)
    expect(prose).toMatch(/rexi-locale/)
  })

  it('links to the policy from the landing footer', () => {
    LANDING()
    render(<App />)
    const link = screen.getByRole('link', { name: es.footer.privacy })
    expect(link.getAttribute('href')).toBe('/privacy')
    fireEvent.click(screen.getByRole('button', { name: /EN/i }))
    expect(screen.getByRole('link', { name: en.footer.privacy })).toBeInTheDocument()
  })

  it('sets the document title while the policy is open', () => {
    atPath('/privacy')
    render(<App />)
    expect(document.title).toContain(privacy.es.title)
  })
})
