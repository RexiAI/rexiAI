// Regression: the booking card must stay neutral while /api/config is in
// flight. The fail-safe default is billing ON, so rendering that default before
// the answer would flash a paid offer on a free-mode page.
import { render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

describe('booking config loading', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows no money story or duration selector until /api/config settles', async () => {
    let resolveConfig!: (response: Response) => void
    const config = new Promise<Response>((resolve) => {
      resolveConfig = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn((url: unknown) => {
        if (String(url).includes('/api/config')) return config
        return Promise.resolve(jsonResponse({}))
      })
    )

    const { default: App } = await import('../App')
    render(createElement(App))

    expect(document.querySelector('.booking-pricing')?.textContent).toBe('Cargando la reserva…')
    expect(document.querySelector('.duration-group')).toBeNull()
    expect((document.querySelector('.booking-submit') as HTMLButtonElement).disabled).toBe(true)

    resolveConfig(jsonResponse({ billingEnabled: false }))
    await waitFor(() =>
      expect(document.querySelector('.booking-pricing')?.textContent).toBe(
        'Sesión gratuita: no se cobra nada ahora.'
      )
    )
    expect(document.querySelector('.duration-group')).toBeNull()
    expect(document.querySelector('.booking-submit')?.textContent).toBe('Reserva la hora gratis')
  })
})
