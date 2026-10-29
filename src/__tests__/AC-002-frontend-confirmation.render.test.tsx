// AC-002 Task 2 — supplementary render test. The AC-002-17 gate citation lives
// in AC-002-frontend-confirmation.test.ts (the traceability script does not scan
// .tsx); this file proves the widget actually swaps form → panel per locale.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { en, es } from '../i18n/dictionary'

const JOIN_URL = 'https://meet.jit.si/rexi-test'

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response
}

function stubFetch() {
  const fetchMock = vi.fn((url: string) => {
    if (String(url).includes('/api/config'))
      return Promise.resolve(jsonResponse({ billingEnabled: false }))
    if (String(url).includes('/api/availability')) {
      return Promise.resolve(jsonResponse({ date: '2027-03-01', slots: ['10:00'] }))
    }
    if (String(url).includes('/api/bookings')) {
      return Promise.resolve(
        jsonResponse({ checkoutUrl: null, joinUrl: JOIN_URL, billingDisabled: true })
      )
    }
    return Promise.resolve(jsonResponse({}))
  })
  vi.stubGlobal('fetch', fetchMock as any)
  return fetchMock
}

async function bookSession(dict: typeof es | typeof en) {
  const dateInput = document.getElementById('booking-date') as HTMLInputElement
  fireEvent.change(dateInput, { target: { value: '2027-03-01' } })
  await waitFor(() => screen.getByText('10:00'))
  fireEvent.click(screen.getByText('10:00'))
  const emailInput = document.getElementById('booking-email') as HTMLInputElement
  fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
  fireEvent.change(document.getElementById('booking-name') as HTMLInputElement, {
    target: { value: 'Ana López' },
  })
  fireEvent.click(screen.getByRole('button', { name: dict.freeMode.submit }))
  await waitFor(() => screen.getByText(dict.booking.confirmation.title))
}

describe.each([
  ['es', es, undefined],
  ['en', en, 'en'],
] as const)('AC-002-17: confirmation panel replaces the form (%s)', (_locale, dict, stored) => {
  beforeEach(() => {
    localStorage.clear()
    if (stored) localStorage.setItem('rexi-locale', stored)
    vi.restoreAllMocks()
    // AC-011 window.location pattern: proves "no navigation" by leaving it ''.
    delete (window as any).location
    ;(window as any).location = { href: '' }
    stubFetch()
  })

  it('AC-002-17: panel renders inline instead of the form with dictionary copy', async () => {
    render(<App />)
    await bookSession(dict)

    const panel = document.querySelector('.booking-confirmation')
    expect(panel).toBeTruthy()
    expect(panel?.getAttribute('role')).toBe('status')

    // The swap is inline: the card chrome stays, the form is gone.
    const card = document.querySelector('.booking-card')
    expect(card).toBeTruthy()
    expect(card?.querySelector('form')).toBeNull()

    within(panel as HTMLElement).getByText(dict.booking.confirmation.title)
    within(panel as HTMLElement).getByText(dict.booking.confirmation.dateLabel)
    within(panel as HTMLElement).getByText(dict.booking.confirmation.timeLabel)
    within(panel as HTMLElement).getByText('2027-03-01')
    within(panel as HTMLElement).getByText('10:00')
    // Owner-authorized inversion (spec 003 Ask D / Decision 5): the join CTA
    // is gone — the customer joins only via the email link. Absence of the CTA
    // is now asserted in place of the old getByRole('link') + href expectation.
    expect(within(panel as HTMLElement).queryAllByRole('link')).toHaveLength(0)
    expect((panel as HTMLElement).innerHTML).not.toContain(JOIN_URL)
    within(panel as HTMLElement).getByText(dict.booking.confirmation.note)

    // No route change, no /booking/success navigation.
    expect(window.location.href).toBe('')
    expect(window.location.href).not.toContain('/booking/success')
  })

  it('AC-002-17: panel copy is dictionary-only — no internal-state words leak', async () => {
    render(<App />)
    await bookSession(dict)
    const panel = document.querySelector('.booking-confirmation') as HTMLElement
    expect(panel.textContent).not.toMatch(/billing|stripe|disabled|checkout/i)
  })
})
