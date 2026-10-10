import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from '../App'

describe('nav brand home link', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('renders the RexiAI brand as a link to the home page', () => {
    localStorage.clear()
    render(<App />)
    const brand = screen.getByRole('link', { name: /RexiAI/ })
    expect(brand).toHaveAttribute('href', '/')
  })

  it('scrolls to the top on click instead of reloading the page', () => {
    localStorage.clear()
    render(<App />)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('link', { name: /RexiAI/ }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
