// Unit tests for spec 019 behaviour the acceptance scenarios do not reach:
// the unreadable-localStorage fallback (Task 1), the resolved duration-selector
// question (Open question 6), the unchanged `hours` request field behind it
// (Task 7 / "the API contract stays"), and the contact copy fixed in Open
// question 9.
//
// No AC-019-NN IDs on purpose: these are not scenarios, they are the boundary
// cases behind them.
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderLanding } from './landing-harness'

const EN_HEADLINE = 'Your business runs on a spreadsheet only one person understands.'
const CONTACT_SELECTORS = ['#contact h2', '#contact .contact__body', '#contact .contact__cta']

/** The three rendered pieces of the contact section, in DOM order. */
function contactParts(container: HTMLElement): string[] {
  return CONTACT_SELECTORS.map((selector) => container.querySelector(selector)?.textContent ?? '')
}

function bookingBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const call = fetchMock.mock.calls.find((entry) => String(entry[0]).includes('/api/bookings'))
  if (!call) throw new Error('no POST /api/bookings was made')
  return JSON.parse((call[1] as { body: string }).body)
}

async function fillAndSubmit(): Promise<void> {
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
  fireEvent.click(document.querySelector('.booking-submit') as HTMLElement)
}

describe('landing units', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('falls back to English when localStorage cannot be read at all', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    await renderLanding()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(EN_HEADLINE)
    expect(document.documentElement.lang).toBe('en')
  })

  it('free mode renders no duration selector and still posts hours: 1', async () => {
    await renderLanding({ billingEnabled: false, availability: true })
    // No duration fieldset, no ghost control in the accessibility tree.
    expect(screen.queryByRole('group', { name: 'Duration' })).toBeNull()
    expect(screen.queryByRole('button', { name: '2h' })).toBeNull()
    expect(document.querySelector('.duration-group')).toBeNull()
  })

  it('free mode booking request keeps the hours field', async () => {
    const { fetchMock } = await renderLanding({ billingEnabled: false, availability: true })
    await fillAndSubmit()
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/bookings'),
        expect.anything()
      )
    )
    // The API contract is unchanged: free mode books exactly the free hour.
    expect(bookingBody(fetchMock)['hours']).toBe(1)
  })

  it('paid mode keeps the whole-hour selector', async () => {
    await renderLanding({ billingEnabled: true })
    expect(document.querySelector('.duration-group')).not.toBeNull()
    for (const hours of [1, 2, 3, 4]) {
      expect(screen.getByRole('button', { name: `${hours}h` })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '5h' })).toBeNull()
  })

  it('keeps one h1, five h2 and three h3 with no skipped level', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelectorAll('h2')).toHaveLength(5)
    expect(container.querySelectorAll('h3')).toHaveLength(3)
  })

  it('the contact section carries the first-person rewrite in both locales', async () => {
    const enPage = await renderLanding({ billingEnabled: true })
    expect(contactParts(enPage.container)).toEqual([
      'Tell me what is broken.',
      'One email, three lines: the process, how often it hurts, what it costs you.',
      'Email me',
    ])

    // Two apps mounted at once would duplicate every section id (jsdom then
    // resolves `#id` against the stale one), so unmount before re-rendering.
    cleanup()
    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding({ billingEnabled: true })
    expect(contactParts(esPage.container)).toEqual([
      'Cuéntame qué está roto.',
      'Un email, tres líneas: el proceso, cada cuánto duele y qué te cuesta.',
      'Escríbeme',
    ])
  })
})
