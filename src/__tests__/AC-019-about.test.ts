// AC-019 Task 6 — about block: `Who builds it`
// (20-acceptance/AC-019-06-about.md).
//
// The component takes the dictionary as its only prop (Task 6), so these
// scenarios render it directly: that is the only way to supply a non-empty
// `about.bio` without inventing page content.
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { About } from '../components/About'
import { en, es, type Dictionary } from '../i18n/dictionary'

import { renderLanding } from './landing-harness'

const BIO = 'Shipped three SaaS products before this one.'

function withBio(bio: string): Dictionary {
  return { ...en, about: { ...en.about, bio } }
}

function renderAbout(dict: Dictionary): HTMLElement {
  const section = render(createElement(About, { dict })).container.querySelector('#about')
  if (!section) throw new Error('#about did not render')
  return section as HTMLElement
}

describe('AC-019 about', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-019-13: the identity block renders the specified fields', () => {
    const section = renderAbout(en)

    expect(section.querySelector('h2')?.textContent).toBe('Who builds it')
    expect(section.textContent).toContain('Daniel Bueno')
    expect(section.textContent).toContain('Founder, RexiAI')
    expect(section.textContent).toContain(
      'Based in Spain (Europe/Madrid). Working in English and Spanish.'
    )

    const mail = section.querySelector('a[href^="mailto:"]') as HTMLAnchorElement
    expect(mail.getAttribute('href')).toBe('mailto:info@rexi-ai.com')
    expect(mail.textContent).toBe('info@rexi-ai.com')

    const github = section.querySelector('a[href^="https://github.com"]') as HTMLAnchorElement
    expect(github.getAttribute('href')).toBe('https://github.com/RexiAI')
    expect(github.textContent).toBe('github.com/RexiAI')

    expect(section.querySelector('img')).toBeNull()
    // No employer, credential, experience or client-count claim: the section
    // carries no digits at all and names no employer beyond the owner's role.
    expect(section.textContent).not.toMatch(/\d/)
    expect(section.textContent?.toLowerCase()).not.toMatch(
      /employer|previous company|years of experience|clients served|client count/
    )
  })

  it('AC-019-13: the Spanish identity block keeps the same targets', () => {
    const section = renderAbout(es)

    expect(section.querySelector('h2')?.textContent).toBe('Quién lo construye')
    expect(section.textContent).toContain('Fundador, RexiAI')
    expect(section.textContent).toContain(
      'Con base en España (Europe/Madrid). Trabajo en inglés y en español.'
    )
    expect(section.querySelector('a[href="mailto:info@rexi-ai.com"]')?.textContent).toBe(
      'info@rexi-ai.com'
    )
    expect(section.querySelector('a[href="https://github.com/RexiAI"]')?.textContent).toBe(
      'github.com/RexiAI'
    )
  })

  it('AC-019-14: an empty bio renders no bio element and no empty paragraph', () => {
    const section = renderAbout(withBio(''))
    expect(section.querySelector('.about__bio')).toBeNull()
    const emptyParagraphs = Array.from(section.querySelectorAll('p')).filter(
      (p) => (p.textContent ?? '').trim() === ''
    )
    expect(emptyParagraphs).toEqual([])
  })

  it('AC-019-14: a whitespace-only bio renders no bio element', () => {
    const section = renderAbout(withBio('   '))
    expect(section.querySelector('.about__bio')).toBeNull()
  })

  it('AC-019-14: a supplied bio renders once, verbatim, after the identity lines', () => {
    const section = renderAbout(withBio(BIO))
    const bios = section.querySelectorAll('.about__bio')
    expect(bios).toHaveLength(1)
    expect(bios[0].textContent).toBe(BIO)

    const name = Array.from(section.querySelectorAll('*')).find(
      (el) => el.textContent === 'Daniel Bueno'
    )
    expect(name).toBeDefined()
    const position = name ? name.compareDocumentPosition(bios[0]) : 0
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('AC-019-13: the landing page mounts the about block with its own dictionary', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    const section = container.querySelector('#about') as HTMLElement
    expect(section.querySelector('h2')?.textContent).toBe('Who builds it')
    expect(section.querySelector('.about__bio')).toBeNull()
  })
})
