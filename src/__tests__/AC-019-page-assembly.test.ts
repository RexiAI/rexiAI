// AC-019 Task 12 — page assembly and section order
// (20-acceptance/AC-019-12-page-assembly.md).
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderLanding } from './landing-harness'

const ORDER = ['NAV', 'hero', 'services', 'proof', 'about', 'booking', 'contact', 'FOOTER']

/** The eight top-level blocks of `.landing`, as tag names or section ids. */
function blocks(container: HTMLElement): string[] {
  const landing = container.querySelector('.landing') as HTMLElement
  return Array.from(landing.children).map((child) => child.id || child.tagName || child.className)
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
    expect(blocks(container)).toEqual(ORDER)

    for (const id of ['hero', 'services', 'proof', 'about', 'booking', 'contact']) {
      expect(container.querySelectorAll(`#${id}`)).toHaveLength(1)
    }
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

    const switcher = nav.querySelector('.lang-switcher') as HTMLElement
    expect(switcher).not.toBeNull()
    expect(switcher.getAttribute('role')).toBe('group')
    expect(Array.from(switcher.querySelectorAll('button')).map((b) => b.textContent)).toEqual([
      'ES',
      'EN',
    ])
  })

  it('AC-019-24: the footer keeps the brand, the year, the rights line and /privacy', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    const footer = container.querySelector('footer.footer') as HTMLElement

    expect(footer.textContent).toContain('RexiAI')
    expect(footer.textContent).toContain(String(new Date().getFullYear()))
    expect(footer.textContent).toContain('All rights reserved')
    expect(footer.querySelector('a[href="/privacy"]')).not.toBeNull()
  })

  it('AC-019-24: nothing renders above the hero except the nav, in either mode', async () => {
    for (const billingEnabled of [false, true]) {
      cleanup()
      const { container } = await renderLanding({ billingEnabled })
      expect(blocks(container)).toEqual(ORDER)
      expect(container.querySelectorAll('#hero')).toHaveLength(1)
    }
  })
})
