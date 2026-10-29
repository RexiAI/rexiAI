// AC-003 Task 4: billing-aware in-flight submit copy (Ask A)
// (20-acceptance/AC-003-inflight-copy.md). Rendered via createElement (no JSX)
// so the AC-003-28…31 citations live in a .ts file — the traceability gate does
// not scan .tsx (10-tasks §Test conventions). useSiteConfig caches at module
// level (one fetch per page load), so each test renders a fresh module graph
// (vi.resetModules + dynamic import) to simulate a new page load.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

const AVAILABILITY = { date: '2027-03-01', slots: ['10:00'] }
const PANEL_JOIN = 'https://meet.jit.si/rexi-003-flow'

async function renderFreshApp(): Promise<void> {
  vi.resetModules()
  const { default: App } = await import('../App')
  render(createElement(App))
}

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response
}

interface HeldFlow {
  configCallCount: () => number
  resolveBookings: () => void
  submitButton: HTMLElement
}

/** Stubs fetch: /api/config answers the flag (counted), availability answers
 *  the fixture slot, and the bookings POST stays in flight until released. */
async function startHeldSubmit(billingEnabled: boolean, idleLabel: string): Promise<HeldFlow> {
  let configCalls = 0
  let release: () => void = () => {}
  const bookingsPromise = new Promise<Response>((resolve) => {
    release = () =>
      resolve(jsonResponse({ checkoutUrl: null, joinUrl: PANEL_JOIN, billingDisabled: true }))
  })
  const fetchMock = vi.fn((url: unknown) => {
    const u = String(url)
    if (u.includes('/api/config')) {
      configCalls += 1
      return Promise.resolve(jsonResponse({ billingEnabled }))
    }
    if (u.includes('/api/availability')) return Promise.resolve(jsonResponse(AVAILABILITY))
    if (u.includes('/api/bookings')) return bookingsPromise
    return Promise.resolve(jsonResponse({}))
  })
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
  await renderFreshApp()

  fireEvent.change(document.getElementById('booking-date') as HTMLInputElement, {
    target: { value: '2027-03-01' },
  })
  await waitFor(() => screen.getByText('10:00'))
  fireEvent.click(screen.getByText('10:00'))
  fireEvent.change(document.getElementById('booking-email') as HTMLInputElement, {
    target: { value: 'test@example.com' },
  })
  fireEvent.change(document.getElementById('booking-name') as HTMLInputElement, {
    target: { value: 'Ana López' },
  })
  const submit = document.querySelector('.booking-submit') as HTMLElement
  expect(submit.textContent).toBe(idleLabel)
  fireEvent.click(submit)
  await waitFor(() => {
    expect((document.querySelector('.booking-submit') as HTMLButtonElement).disabled).toBe(true)
  })
  return {
    configCallCount: () => configCalls,
    resolveBookings: () => release(),
    get submitButton() {
      return document.querySelector('.booking-submit') as HTMLElement
    },
  }
}

describe('AC-003 billing-aware in-flight copy', () => {
  let originalLocation: Location

  beforeEach(() => {
    localStorage.clear()
    originalLocation = window.location
    delete (window as any).location
    ;(window as any).location = { href: '' }
  })

  afterEach(() => {
    ;(window as any).location = originalLocation
    vi.unstubAllGlobals()
    cleanup()
  })

  it('AC-003-28: billing disabled (es): in-flight label is the neutral dictionary copy', async () => {
    const flow = await startHeldSubmit(false, es.freeMode.submit)
    try {
      expect(flow.submitButton.textContent).toBe(es.booking.form.submittingDirect)
      expect(flow.submitButton.textContent).toBe('Enviando tu reserva...')
      expect(flow.submitButton.textContent).not.toMatch(/stripe/i)
      expect(flow.submitButton.textContent).not.toBe('Redirigiendo a Stripe...')
      for (const dict of [es, en]) {
        expect(typeof dict.booking.form.submittingDirect).toBe('string')
        expect(dict.booking.form.submittingDirect.length).toBeGreaterThan(0)
      }
      // AC-001-05 stays green: no em/en dashes anywhere in the dictionary JSON.
      const dictText = JSON.stringify({ es, en })
      expect(dictText).not.toContain('—')
      expect(dictText).not.toContain('–')
    } finally {
      flow.resolveBookings()
    }
  })

  it('AC-003-29: billing enabled: in-flight label stays the Stripe copy (es + en)', async () => {
    const flowEs = await startHeldSubmit(true, es.booking.form.submit)
    try {
      expect(flowEs.submitButton.textContent).toBe('Redirigiendo a Stripe...')
      expect(flowEs.submitButton.textContent).toBe(es.booking.form.submitting)
    } finally {
      flowEs.resolveBookings()
      cleanup()
      vi.unstubAllGlobals()
    }

    localStorage.setItem('rexi-locale', 'en')
    const flowEn = await startHeldSubmit(true, en.booking.form.submit)
    try {
      expect(flowEn.submitButton.textContent).toBe('Redirecting to Stripe...')
      expect(flowEn.submitButton.textContent).toBe(en.booking.form.submitting)
    } finally {
      flowEn.resolveBookings()
    }
  })

  it('AC-003-30: billing disabled (en): in-flight label is the en neutral copy', async () => {
    localStorage.setItem('rexi-locale', 'en')
    const flow = await startHeldSubmit(false, en.freeMode.submit)
    try {
      expect(flow.submitButton.textContent).toBe(en.booking.form.submittingDirect)
      expect(flow.submitButton.textContent).toBe('Sending your reservation...')
      expect(flow.submitButton.textContent).not.toMatch(/stripe/i)
    } finally {
      flow.resolveBookings()
    }
  })

  it('AC-003-31: the billing-aware copy adds no network request (single /api/config fetch)', async () => {
    const flow = await startHeldSubmit(false, es.freeMode.submit)
    flow.resolveBookings()
    await waitFor(() => screen.getByText(es.booking.confirmation.title))
    expect(flow.configCallCount()).toBe(1)
  })
})
