// AC-020 Task 3 — proof reworded for the owner, engineering-standards removed
// (20-acceptance/AC-020-03-proof.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fold, renderLanding, section } from './landing-harness'

const BANNED_JARGON = [
  'saas',
  'auth',
  'autenticación',
  'authentication',
  'deploy',
  'despliegue',
  'mutation',
  'mutación',
  'internal tools',
  'herramientas internas',
  'spec pipeline',
  'pipeline de especificaciones',
  'ci gates',
  'puertas de ci',
  'billing',
  'facturación',
]
const STANDARDS_REPO = 'github.com/RexiAI/my-engineering-standards'
const INVENTED_PROOF = [
  '100%',
  '500+',
  '10x',
  'testimonio',
  'testimonial',
  'caso de éxito',
  'case study',
]

describe('AC-020 proof', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-020-10: no jargon, engineering-standards repo removed', async () => {
    for (const locale of ['en', 'es'] as const) {
      if (locale === 'es') localStorage.setItem('rexi-locale', 'es')
      const { container } = await renderLanding({ locale })
      const proof = section(container, 'proof')
      const text = fold(proof.textContent ?? '')

      for (const banned of BANNED_JARGON) expect(text).not.toContain(fold(banned))
      expect(text).not.toContain(fold('Inglés Ejecutivo'))
      expect(proof.textContent).not.toContain('my-engineering-standards')
      const hrefs = Array.from(proof.querySelectorAll('a')).map((a) => a.getAttribute('href'))
      expect(hrefs).not.toContain(`https://${STANDARDS_REPO}`)
      expect(hrefs.some((href) => (href ?? '').includes('my-engineering-standards'))).toBe(false)
    }
  })

  it('AC-020-11: honesty line kept, no invented proof', async () => {
    for (const locale of ['en', 'es'] as const) {
      if (locale === 'es') localStorage.setItem('rexi-locale', 'es')
      const { container } = await renderLanding({ locale })
      const proof = section(container, 'proof')

      const intro = proof.querySelector('.proof__intro') as HTMLElement
      expect(intro.textContent?.trim().length).toBeGreaterThan(0)
      const text = fold(proof.textContent ?? '')
      for (const word of INVENTED_PROOF) expect(text).not.toContain(fold(word))
      // No invented metric: the section carries no digits.
      expect(text).not.toMatch(/\d/)
      expect(proof.querySelector('img')).toBeNull()
      expect(proof.querySelector('svg')).toBeNull()
    }
  })
})
