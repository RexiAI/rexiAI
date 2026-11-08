// AC-019 Task 12 — page assembly and section order
// (20-acceptance/AC-019-12-page-assembly.md).
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderLanding } from './landing-harness'

const TOP_LEVEL = ['A', 'NAV', 'MAIN', 'FOOTER']
const SECTIONS = ['hero', 'services', 'proof', 'about', 'booking', 'contact']

/** The top-level blocks of `.landing`, as tag names. */
function blocks(container: HTMLElement): string[] {
  const landing = container.querySelector('.landing') as HTMLElement
  return Array.from(landing.children).map((child) => child.tagName)
}

/** The landing sections, in order, inside <main>. */
function sections(container: HTMLElement): string[] {
  const main = container.querySelector('main#main') as HTMLElement
  return Array.from(main.children).map((child) => child.id)
}

describe('AC-019 page assembly', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-019-24: the blocks render in the specified order', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    expect(blocks(container)).toEqual(TOP_LEVEL)
    expect(sections(container)).toEqual(SECTIONS)

    for (const id of SECTIONS) {
      expect(container.querySelectorAll(`#${id}`)).toHaveLength(1)
    }

    const skip = container.querySelector('a.skip-link') as HTMLAnchorElement
    expect(skip.getAttribute('href')).toBe('#main')
  })

  it('AC-019-24: the nav keeps three anchors, the brand and the switcher', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    const nav = container.querySelector('nav.nav') as HTMLElement

    const anchors = Array.from(nav.querySelectorAll('a[href^="#"]')).map((a) =>
      a.getAttribute('href')
    )
    expect(anchors).toEqual(['#services', '#booking', '#contact'])
    expect(nav.querySelector('a[href="#proof"]')).toBeNull()
    expect(nav.querySelector('a[href="#about"]')).toBeNull()

    const brand = nav.querySelector('a.nav-brand') as HTMLAnchorElement
    expect(brand.getAttribute('href')).toBe('/')
    expect(brand.textContent).toContain('RexiAI')

    // A visible route to the policy from the main page, not only the footer.
    const privacy = nav.querySelector('a[href="/privacy"]') as HTMLAnchorElement
    expect(privacy).not.toBeNull()
    expect(privacy.textContent).toBe('Privacidad')

    const switcher = nav.querySelector('.lang-switcher') as HTMLElement
    expect(switcher).not.toBeNull()
    expect(switcher.getAttribute('role')).toBe('group')
    expect(Array.from(switcher.querySelectorAll('button')).map((b) => b.textContent)).toEqual([
      'ES',
      'EN',
    ])
  })

  it('AC-019-24: the footer keeps the brand, the year, the rights line and /privacy', async () => {
    const { container } = await renderLanding({ billingEnabled: true, locale: 'en' })
    const footer = container.querySelector('footer.footer') as HTMLElement

    expect(footer.textContent).toContain('RexiAI')
    expect(footer.textContent).toContain(String(new Date().getFullYear()))
    expect(footer.textContent).toContain('All rights reserved')
    expect(footer.querySelector('a[href="/privacy"]')).not.toBeNull()
  })

  it('AC-019-24: nothing renders above the hero except the skip link and nav', async () => {
    for (const billingEnabled of [false, true]) {
      cleanup()
      const { container } = await renderLanding({ billingEnabled })
      expect(blocks(container)).toEqual(TOP_LEVEL)
      expect(container.querySelectorAll('#hero')).toHaveLength(1)
    }
  })
})
