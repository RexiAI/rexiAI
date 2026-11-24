// AC-019 Task 6 — about block (20-acceptance/AC-019-06-about.md).
//
// Spec 020 (Task 6) filled the bio from the owner's fixed fact set and made the
// location line name Salamanca and Miami. The scenario IDs are kept: they still
// assert the identity fields and that a supplied bio is the only thing that
// renders a bio.
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { About } from '../components/About'
import { en, es, type Dictionary } from '../i18n/dictionary'

import { renderLanding } from './landing-harness'

const BIO = 'Shipped three products before this one.'

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
      'I live in Salamanca, Spain; my clients are in Miami and I work with them remotely.'
    )
    expect(section.querySelector('.about__bio')?.textContent).toBe(en.about.bio)

    const mail = section.querySelector('a[href^="mailto:"]') as HTMLAnchorElement
    expect(mail.getAttribute('href')).toBe('mailto:info@rexi-ai.com')
    expect(mail.textContent).toBe('info@rexi-ai.com')

    const github = section.querySelector('a[href^="https://github.com"]') as HTMLAnchorElement
    expect(github.getAttribute('href')).toBe('https://github.com/RexiAI')
    expect(github.textContent).toBe('github.com/RexiAI')

    expect(section.querySelector('img')).toBeNull()
  })

  it('AC-019-13: the Spanish identity block keeps the same targets', () => {
    const section = renderAbout(es)

    expect(section.querySelector('h2')?.textContent).toBe('Quién lo construye')
    expect(section.textContent).toContain('Fundador, RexiAI')
    expect(section.textContent).toContain(
      'Vivo en Salamanca (España); mis clientes están en Miami y trabajo con ellos en remoto.'
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
    const { container } = await renderLanding({ billingEnabled: true, locale: 'en' })
    const section = container.querySelector('#about') as HTMLElement
    expect(section.querySelector('h2')?.textContent).toBe('Who builds it')
    // Spec 020 fills the committed bio, so it renders on the landing.
    expect(section.querySelector('.about__bio')?.textContent).toBe(en.about.bio)
  })
})
