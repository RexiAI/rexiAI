// AC-019 Task 8 — contact email replacement
// (20-acceptance/AC-019-08-contact-email.md).
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { About } from '../components/About'
import { en, es, type Dictionary } from '../i18n/dictionary'

import { renderLanding, repoFile, srcFiles } from './landing-harness'

const NEW_ADDRESS = 'info@rexi-ai.com'
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.]+/g

/** Every string leaf of a dictionary, for the "no other address" rule. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

describe('AC-019 contact email', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('AC-019-17: the old mailbox is gone from src/, tests included', () => {
    // Assembled at runtime: this test must name the retired address to assert
    // its absence, and must not match itself.
    const retired = ['danielbueno', '76'].join('')
    const offenders = srcFiles()
      .filter((file) => file.text.includes(retired))
      .map((file) => file.rel)
    expect(offenders).toEqual([])

    expect(es.contact.email).toBe(NEW_ADDRESS)
    expect(en.contact.email).toBe(NEW_ADDRESS)
    expect(repoFile('src/content/legalEntity.ts')).toContain(
      `const DEFAULT_EMAIL = '${NEW_ADDRESS}'`
    )

    const addresses = [...new Set(strings({ es, en }).flatMap((s) => s.match(EMAIL_PATTERN) ?? []))]
    expect(addresses).toEqual([NEW_ADDRESS])
  })

  it('AC-019-18: LEGAL_ENTITY falls back to the new address and trims an override', async () => {
    vi.stubEnv('VITE_LEGAL_EMAIL', '')
    vi.resetModules()
    const unset = await import('../content/legalEntity')
    expect(unset.LEGAL_ENTITY.email).toBe(NEW_ADDRESS)

    vi.stubEnv('VITE_LEGAL_EMAIL', '  legal@example.com  ')
    vi.resetModules()
    const overridden = await import('../content/legalEntity')
    expect(overridden.LEGAL_ENTITY.email).toBe('legal@example.com')
  })

  it('AC-019-18: every rendered mailto points at the new address', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    const heroMail = container.querySelector('#hero a.hero-cta--secondary') as HTMLAnchorElement
    const contactMail = container.querySelector('#contact a.contact__cta') as HTMLAnchorElement
    expect(heroMail.getAttribute('href')).toBe(`mailto:${NEW_ADDRESS}`)
    expect(contactMail.getAttribute('href')).toBe(`mailto:${NEW_ADDRESS}`)
    expect(container.querySelector('#about a[href^="mailto:"]')?.getAttribute('href')).toBe(
      `mailto:${NEW_ADDRESS}`
    )
  })

  it('AC-019-18: the Spanish page carries the same two targets', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding({ billingEnabled: true })
    const heroMail = container.querySelector('#hero a.hero-cta--secondary') as HTMLAnchorElement
    const contactMail = container.querySelector('#contact a.contact__cta') as HTMLAnchorElement
    expect(heroMail.getAttribute('href')).toBe(`mailto:${NEW_ADDRESS}`)
    expect(contactMail.getAttribute('href')).toBe(`mailto:${NEW_ADDRESS}`)
  })

  it('AC-019-18: the address comes from the dictionary, never a JSX literal', () => {
    const landing = repoFile('src/pages/Landing.tsx')
    expect(landing).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
    expect(landing).toContain('dict.contact.email')

    // Same mechanism on the component that takes the dictionary as a prop.
    const other: Dictionary = { ...en, about: { ...en.about, email: 'other@example.com' } }
    const section = render(createElement(About, { dict: other })).container.querySelector('#about')
    expect(section?.querySelector('a[href^="mailto:"]')?.getAttribute('href')).toBe(
      'mailto:other@example.com'
    )
  })
})
