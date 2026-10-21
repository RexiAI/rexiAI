// AC-003 Task 5: confirmation panel without the join link (Ask D)
// (20-acceptance/AC-003-confirmation-panel.md). Rendered via createElement so
// the AC-003-32…34 citations live in a .ts file (traceability gate scans .ts
// only); fresh module graph per test simulates a page load, and the
// window.location stub follows the AC-011 pattern to prove non-navigation.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

const PANEL_JOIN = 'https://meet.jit.si/rexi-panel'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response
}

function stubNetwork(billingEnabled: boolean): void {
  const fetchMock = vi.fn((url: unknown) => {
    const u = String(url)
    if (u.includes('/api/config')) {
      return Promise.resolve(jsonResponse({ billingEnabled }))
    }
    if (u.includes('/api/availability')) {
      return Promise.resolve(jsonResponse({ date: '2027-03-01', slots: ['10:00'] }))
    }
    if (u.includes('/api/bookings')) {
      return Promise.resolve(
        jsonResponse({ checkoutUrl: null, joinUrl: PANEL_JOIN, billingDisabled: true })
      )
    }
    return Promise.resolve(jsonResponse({}))
  })
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
}

async function bookThrough(dict: typeof es | typeof en): Promise<HTMLElement> {
  vi.resetModules()
  const { default: App } = await import('../App')
  render(createElement(App))
  fireEvent.change(document.getElementById('booking-date') as HTMLInputElement, {
    target: { value: '2027-03-01' },
  })
  await waitFor(() => screen.getByText('10:00'))
  fireEvent.click(screen.getByText('10:00'))
  fireEvent.change(document.getElementById('booking-email') as HTMLInputElement, {
    target: { value: 'test@example.com' },
  })
  fireEvent.click(screen.getByRole('button', { name: dict.freeMode.submit }))
  await waitFor(() => screen.getByText(dict.booking.confirmation.title))
  const panel = document.querySelector('.booking-confirmation') as HTMLElement
  expect(panel).toBeTruthy()
  return panel
}

describe('AC-003 confirmation panel (no join link)', () => {
  let originalLocation: Location

  beforeEach(() => {
    localStorage.clear()
    originalLocation = window.location
    delete (window as any).location
    ;(window as any).location = { href: '' }
    stubNetwork(false)
  })

  afterEach(() => {
    ;(window as any).location = originalLocation
    vi.unstubAllGlobals()
  })

  it('AC-003-32: panel shows facts and note, never the join link (es)', async () => {
    const panel = await bookThrough(es)
    expect(panel.getAttribute('role')).toBe('status')
    within(panel).getByText(es.booking.confirmation.title)
    within(panel).getByText(es.booking.confirmation.dateLabel)
    within(panel).getByText(es.booking.confirmation.timeLabel)
    within(panel).getByText('2027-03-01')
    within(panel).getByText('10:00')
    within(panel).getByText(es.booking.confirmation.note)
    expect(panel.querySelectorAll('a')).toHaveLength(0)
    expect(panel.innerHTML).not.toContain(PANEL_JOIN)
    expect(panel.textContent).not.toContain('Unirse a la sesión')
    expect(panel.textContent).not.toContain('Join the session')
    expect((window as any).location.href).toBe('')
  })

  it('AC-003-33: panel is dictionary-only and join-link-free in en', async () => {
    localStorage.setItem('rexi-locale', 'en')
    const panel = await bookThrough(en)
    within(panel).getByText(en.booking.confirmation.title)
    within(panel).getByText(en.booking.confirmation.dateLabel)
    within(panel).getByText(en.booking.confirmation.timeLabel)
    within(panel).getByText('2027-03-01')
    within(panel).getByText('10:00')
    within(panel).getByText(en.booking.confirmation.note)
    // No Spanish leftovers: the es copy must be absent.
    expect(panel.textContent).not.toContain(es.booking.confirmation.title)
    expect(panel.textContent).not.toContain(es.booking.confirmation.note)
    expect(panel.querySelectorAll('a')).toHaveLength(0)
    expect(panel.innerHTML).not.toContain(PANEL_JOIN)
    expect(panel.textContent).not.toMatch(/billing|stripe|disabled|checkout/i)
    expect((window as any).location.href).toBe('')
  })

  it('AC-003-34: joinLink key removed; remaining confirmation keys intact', () => {
    for (const dict of [es, en]) {
      const confirmation = dict.booking.confirmation as Record<string, string>
      expect('joinLink' in confirmation).toBe(false)
      for (const key of ['title', 'dateLabel', 'timeLabel', 'note']) {
        expect(typeof confirmation[key]).toBe('string')
        expect(confirmation[key].length).toBeGreaterThan(0)
      }
    }
    // Identical key shape across locales (the dictionary _check compile guard
    // additionally enforces the whole-tree shape at build time).
    expect(Object.keys(es.booking.confirmation).sort()).toEqual(
      Object.keys(en.booking.confirmation).sort()
    )
  })
})
