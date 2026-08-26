import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

describe('AC-011', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('AC-011-01: Selecting a date loads available slots', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/availability')) {
        return Promise.resolve({ ok: true, json: async () => ({ date: '2027-03-01', slots: ['09:00', '10:00'] }) } as any)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as any)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    const dateInput = document.getElementById('booking-date') as HTMLInputElement
    expect(dateInput).toBeTruthy()
    fireEvent.change(dateInput, { target: { value: '2027-03-01' } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/availability?date=2027-03-01')))
    await waitFor(() => expect(screen.getByText('09:00')).toBeInTheDocument())
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('AC-011-02: Duration control offers whole hours 1 to 4 only', () => {
    render(<App />)
    // duration buttons 1h..4h should exist, 5h should not
    for (const h of [1, 2, 3, 4]) {
      expect(screen.getByRole('button', { name: `${h}h` })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '5h' })).not.toBeInTheDocument()
  })

  it('AC-011-03: Localized pricing rules are displayed', () => {
    render(<App />)
    // spanish pricing rules appears at least once (widget + narrative may duplicate)
    expect(screen.getAllByText(/Primera hora gratis/i).length).toBeGreaterThan(0)
  })

  it('AC-011-04: Valid submit posts to the API and redirects to Stripe', async () => {
    const availMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ slots: ['10:00'] }) } as any)
    const bookingsMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ checkoutUrl: 'https://checkout.stripe.com/pay/cs_123' }) } as any)
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (typeof url === 'string' && url.includes('/api/availability')) return availMock()
      if (typeof url === 'string' && url.includes('/api/bookings')) return bookingsMock(url, opts)
      return Promise.resolve({ ok: true, json: async () => ({}) } as any)
    })
    vi.stubGlobal('fetch', fetchMock)
    // mock window.location href setter
    const loc = window.location
    // @ts-ignore
    delete (window as any).location
    // @ts-ignore
    ;(window as any).location = { href: '' } as any

    render(<App />)
    const dateInput = document.getElementById('booking-date') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2027-03-01' } })
    await waitFor(() => screen.getByText('10:00'))
    fireEvent.click(screen.getByText('10:00'))
    // duration default 1, change maybe keep
    const emailInput = document.getElementById('booking-email') as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    const submit = screen.getByRole('button', { name: /Reservar y pagar/i })
    fireEvent.click(submit)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/bookings'), expect.any(Object)))
    // verify body
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/api/bookings'))
    expect(call).toBeDefined()
    const body = JSON.parse(call![1].body)
    expect(body).toEqual(expect.objectContaining({ email: 'test@example.com', date: '2027-03-01', startTime: '10:00', hours: expect.any(Number) }))
    expect(window.location.href).toBe('https://checkout.stripe.com/pay/cs_123')
    // restore
    ;(window as any).location = loc
  })

  it('AC-011-05: Invalid email blocks submission without a request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ checkoutUrl: 'https://x' }) } as any)
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    const dateInput = document.getElementById('booking-date') as HTMLInputElement
    // need date and slot to not trigger missing fields first, but invalid email should still block
    // set date, mock availability quickly
    const availMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ slots: ['10:00'] }) } as any)
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/availability')) return availMock()
      return fetchMock(url)
    }))
    fireEvent.change(dateInput, { target: { value: '2027-03-01' } })
    await waitFor(() => screen.getByText('10:00'))
    fireEvent.click(screen.getByText('10:00'))
    const emailInput = document.getElementById('booking-email') as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } })
    const submit = screen.getByRole('button', { name: /Reservar y pagar/i })
    // reset fetch mock before submit click
    const bookingsSpy = vi.fn()
    vi.stubGlobal('fetch', bookingsSpy)
    fireEvent.click(submit)
    await new Promise((r) => setTimeout(r, 50))
    expect(bookingsSpy).not.toHaveBeenCalledWith(expect.stringContaining('/api/bookings'), expect.anything())
    expect(screen.getByText(/Introduce un email válido/i)).toBeInTheDocument()
  })

  it('AC-011-06: Missing required fields block submission', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    const submit = screen.getByRole('button', { name: /Reservar y pagar/i })
    fireEvent.click(submit)
    await new Promise((r) => setTimeout(r, 50))
    // should show required errors and not call bookings
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/bookings'), expect.anything())
    // at least one required message
    expect(screen.getAllByText(/obligatorio/i).length).toBeGreaterThan(0)
  })
})
