// AC-020 Task 6 — about: filled bio from the fixed fact set, no photo
// (20-acceptance/AC-020-06-about.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { fold, renderLanding, section } from './landing-harness'

// Locations the owner's fixed fact set does not authorise on the About block.
const OTHER_LOCATIONS = [
  'madrid',
  'barcelona',
  'valencia',
  'sevilla',
  'bilbao',
  'london',
  'londres',
  'new york',
  'nueva york',
  'berlin',
  'berlín',
  'paris',
  'parís',
]
const INVENTED_CREDIBILITY = [
  'testimonio',
  'testimonial',
  'logo',
  'logotipo',
  'caso de éxito',
  'case study',
]

function about(container: HTMLElement): HTMLElement {
  return section(container, 'about')
}

/** The location line and the bio paragraph, folded for accent-tolerant matching. */
function aboutText(container: HTMLElement): { location: string; bio: string; rawBio: string } {
  const block = about(container)
  const bio = (block.querySelector('.about__bio') as HTMLElement).textContent ?? ''
  return {
    location: fold((block.querySelector('.about__location') as HTMLElement).textContent ?? ''),
    bio: fold(bio),
    rawBio: bio,
  }
}

/** Salamanca and Miami only: no other location claim in the About block. */
function expectSalamancaAndMiami(location: string): void {
  expect(location).toContain('salamanca')
  expect(location).toContain('miami')
  for (const city of OTHER_LOCATIONS) expect(location).not.toContain(city)
}

/** The bio names the allowed facts and nothing that would overstate them. */
function expectAllowedFacts(bio: string, rawBio: string, facts: string[]): void {
  expect(rawBio).toContain('Valladolid')
  expect(bio.length).toBeGreaterThan(0)
  for (const fact of facts) expect(bio).toContain(fact)
  for (const word of INVENTED_CREDIBILITY) expect(bio).not.toContain(fold(word))
  expect(bio).not.toContain(fold('Inglés Ejecutivo'))
}

describe('AC-020 about', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-020-16: About states Salamanca + Miami, and no other location', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    expectSalamancaAndMiami(aboutText(enPage.container).location)
    expectSalamancaAndMiami(fold(en.about.location))

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    expectSalamancaAndMiami(aboutText(esPage.container).location)
    expectSalamancaAndMiami(fold(es.about.location))
  })

  it('AC-020-17: the bio is filled from the allowed facts only', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    const enAbout = aboutText(enPage.container)
    expectAllowedFacts(enAbout.bio, enAbout.rawBio, [
      'rexi',
      'crm',
      'verisure',
      'santander',
      'bme',
      'salamanca',
      'padel',
      'english',
    ])

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    const esAbout = aboutText(esPage.container)
    expectAllowedFacts(esAbout.bio, esAbout.rawBio, [
      'rexi',
      'crm',
      'verisure',
      'santander',
      'bme',
      'salamanca',
      'padel',
      'ingles',
    ])
  })

  it('AC-020-18: no founder photo', async () => {
    for (const locale of ['en', 'es'] as const) {
      if (locale === 'es') localStorage.setItem('rexi-locale', 'es')
      const { container } = await renderLanding({ locale })
      const block = about(container)
      expect(block.querySelector('img')).toBeNull()
      expect(block.querySelector('picture')).toBeNull()
      expect(block.querySelector('[class*="photo"]')).toBeNull()
      expect(block.querySelector('[class*="avatar"]')).toBeNull()
    }
  })
})
