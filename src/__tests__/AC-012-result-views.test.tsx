import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import App from '../App'

describe('AC-012', () => {
  it('AC-012-01: Success view shows localized confirmation', () => {
    localStorage.clear()
    // set pathname before render
    Object.defineProperty(window, 'location', { value: new URL('https://example.com/booking/success'), writable: true })
    render(<App />)
    expect(screen.getByText(/Reserva recibida|Booking received/i)).toBeInTheDocument()
    // reset
    Object.defineProperty(window, 'location', { value: new URL('https://example.com/'), writable: true })
  })
  it('AC-012-02: Cancel view shows localized cancellation with a way back', () => {
    Object.defineProperty(window, 'location', { value: new URL('https://example.com/booking/cancel'), writable: true })
    render(<App />)
    expect(screen.getByText(/Reserva cancelada|Booking cancelled/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Volver a reservas|Back to booking/i })
    expect(link.getAttribute('href')).toContain('#booking')
    Object.defineProperty(window, 'location', { value: new URL('https://example.com/'), writable: true })
  })
})
