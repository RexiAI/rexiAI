// AC-008 Task 1 — required customer name in the booking form.
// Acceptance tests per
// specs/008-customer-name-and-recording-folders/20-acceptance/AC-008-capture-name.md
//
// Every scenario drives the real widget (render <App />), because the contract is
// "submit, then tell me what is wrong": the field, the validation and the POST
// body are one behaviour and only the composed form proves it.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App'
import { es } from '../i18n/dictionary'

const TOO_LONG = 'a'.repeat(201)

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response
}

function stubFetch(bookings?: () => Promise<Response>) {
  const fetchMock = vi.fn((url: string) => {
    if (String(url).includes('/api/availability'))
      return Promise.resolve(jsonResponse({ date: '2027-03-01', slots: ['10:00'] }))
    if (String(url).includes('/api/bookings') && bookings) return bookings()
    return Promise.resolve(jsonResponse({}))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function bookingCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter((c) => String(c[0]).includes('/api/bookings'))
}

async function fillForm(name?: string) {
  const dateInput = document.getElementById('booking-date') as HTMLInputElement
  fireEvent.change(dateInput, { target: { value: '2027-03-01' } })
  await waitFor(() => screen.getByText('10:00'))
  fireEvent.click(screen.getByText('10:00'))
  fireEvent.change(document.getElementById('booking-email') as HTMLInputElement, {
    target: { value: 'ana@example.com' },
  })
  if (name !== undefined) {
    fireEvent.change(document.getElementById('booking-name') as HTMLInputElement, {
      target: { value: name },
    })
  }
}

async function submit() {
  fireEvent.click(screen.getByRole('button', { name: /Reservar y pagar/i }))
  // One macrotask: validation is synchronous, the POST is not.
  await new Promise((r) => setTimeout(r, 50))
}

function nameError(): string {
  const el = document.getElementById('err-name')
  return el?.textContent ?? ''
}

describe('AC-008 capture the customer name', () => {
  let originalLocation: Location

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    originalLocation = window.location
    // AC-011 pattern: a stub location proves "no navigation" and keeps jsdom
    // from attempting a real checkout redirect on a successful POST.
    delete (window as any).location
    ;(window as any).location = { href: '' }
  })

  afterEach(() => {
    ;(window as any).location = originalLocation
    vi.unstubAllGlobals()
  })

  it('AC-008-01: empty name blocks submit', async () => {
    const fetchMock = stubFetch()
    render(<App />)
    await fillForm('')

    await submit()

    expect(bookingCalls(fetchMock)).toHaveLength(0)
    expect(nameError()).toBe(es.booking.form.required)
  })

  it('AC-008-02: whitespace-only name blocks submit', async () => {
    const fetchMock = stubFetch()
    render(<App />)
    await fillForm('   ')

    await submit()

    expect(bookingCalls(fetchMock)).toHaveLength(0)
    expect(nameError()).toBe(es.booking.form.required)
  })

  it('AC-008-03: a filled name is included in the POST body', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse({ checkoutUrl: 'https://checkout.stripe.com/pay/cs_1' }))
    )
    render(<App />)
    await fillForm('Ana López')

    await submit()

    const calls = bookingCalls(fetchMock)
    expect(calls).toHaveLength(1)
    const body = JSON.parse(calls[0][1].body)
    expect(body.name).toBe('Ana López')
    // The pre-existing fields are still sent untouched.
    expect(body).toEqual(
      expect.objectContaining({
        email: 'ana@example.com',
        date: '2027-03-01',
        startTime: '10:00',
        hours: expect.any(Number),
        locale: expect.any(String),
      })
    )
  })

  it('AC-008-20: a name longer than 200 characters is rejected client-side', async () => {
    const fetchMock = stubFetch()
    render(<App />)
    await fillForm(TOO_LONG)

    await submit()

    expect(bookingCalls(fetchMock)).toHaveLength(0)
    expect(nameError()).toBe(es.booking.form.nameTooLong)
  })
})
