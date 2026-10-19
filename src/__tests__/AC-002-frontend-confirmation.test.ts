// AC-002 Task 2 (frontend): billingDisabled response → confirmation state.
// Hook-level acceptance + dictionary assertions. The AC-002-16/17 citations live
// in THIS .ts file because scripts/check-scenario-traceability.sh does not scan
// .tsx (15-design.md watch item 4). window.location assertion follows the
// existing AC-011 pattern (watch item 7).
import { act, renderHook } from '@testing-library/react'
import type { FormEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBookingFields } from '../components/booking/hooks/useBookingFields'
import { useBookingSubmit } from '../components/booking/hooks/useBookingSubmit'
import { useResetOnDate } from '../components/booking/hooks/useResetOnDate'
import { en, es } from '../i18n/dictionary'

const BOOKINGS_RESPONSE = {
  ok: true,
  status: 200,
  json: async () => ({
    checkoutUrl: null,
    joinUrl: 'https://meet.jit.si/rexi-test',
    billingDisabled: true,
  }),
}

function makeFetchMock(response: { ok: boolean; status?: number; body: unknown }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.body,
  } as Response)
}

function renderSubmitHook() {
  return renderHook(() => {
    const fields = useBookingFields()
    const submit = useBookingSubmit(fields, es)
    return { fields, submit }
  })
}

function submitEvent(): FormEvent {
  return { preventDefault: vi.fn() } as unknown as FormEvent
}

async function fillValid(result: { current: { fields: ReturnType<typeof useBookingFields> } }) {
  await act(async () => {
    result.current.fields.setDate('2027-03-01')
    result.current.fields.setSelectedSlot('10:00')
    result.current.fields.setEmail('test@example.com')
  })
}

describe('AC-002 frontend confirmation state', () => {
  let originalLocation: Location

  beforeEach(() => {
    // Existing AC-011 pattern: a plain object stands in for window.location so
    // "href never assigned" is provable (it stays '').
    originalLocation = window.location
    delete (window as any).location
    ;(window as any).location = { href: '' }
  })

  afterEach(() => {
    ;(window as any).location = originalLocation
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('AC-002-16: A billingDisabled response sets a confirmation state without navigation', async () => {
    const fetchMock = makeFetchMock({ ok: true, body: BOOKINGS_RESPONSE.json() })
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderSubmitHook()
    await fillValid(result)

    await act(async () => {
      await result.current.submit(submitEvent())
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/bookings',
      expect.objectContaining({ method: 'POST' })
    )
    expect(window.location.href).toBe('')
    expect(result.current.fields.conflictError).toBe('')
    expect(result.current.fields.errors).toEqual({})
    expect(result.current.fields.confirmation).toEqual({
      date: '2027-03-01',
      startTime: '10:00',
      joinUrl: 'https://meet.jit.si/rexi-test',
    })
  })

  it('AC-002-17: Both dictionaries define booking.confirmation title and joinLink', () => {
    for (const dict of [es, en]) {
      const confirmation = dict.booking.confirmation
      for (const key of ['title', 'joinLink', 'dateLabel', 'timeLabel', 'note'] as const) {
        expect(typeof confirmation[key]).toBe('string')
        expect(confirmation[key].length).toBeGreaterThan(0)
      }
    }
  })

  describe('unit: unchanged error/redirect handling and state-holder edge cases', () => {
    it('enabled response still redirects and does not set confirmation', async () => {
      const fetchMock = makeFetchMock({ ok: true, body: { checkoutUrl: 'https://pay/stripe' } })
      vi.stubGlobal('fetch', fetchMock)
      const { result } = renderSubmitHook()
      await fillValid(result)

      await act(async () => {
        await result.current.submit(submitEvent())
      })

      expect(window.location.href).toBe('https://pay/stripe')
      expect(result.current.fields.confirmation).toBeNull()
    })

    it('409 still sets the dictionary conflict message', async () => {
      const fetchMock = makeFetchMock({
        ok: false,
        status: 409,
        body: { error: { message: 'whatever' } },
      })
      vi.stubGlobal('fetch', fetchMock)
      const { result } = renderSubmitHook()
      await fillValid(result)

      await act(async () => {
        await result.current.submit(submitEvent())
      })

      expect(result.current.fields.conflictError).toBe(es.booking.form.conflict)
      expect(result.current.fields.confirmation).toBeNull()
      expect(window.location.href).toBe('')
    })

    it('non-ok response still surfaces the server error message', async () => {
      const fetchMock = makeFetchMock({
        ok: false,
        status: 500,
        body: { error: { message: 'boom' } },
      })
      vi.stubGlobal('fetch', fetchMock)
      const { result } = renderSubmitHook()
      await fillValid(result)

      await act(async () => {
        await result.current.submit(submitEvent())
      })

      expect(result.current.fields.conflictError).toBe('boom')
      expect(result.current.fields.confirmation).toBeNull()
    })

    it('a network throw still sets the generic error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
      const { result } = renderSubmitHook()
      await fillValid(result)

      await act(async () => {
        await result.current.submit(submitEvent())
      })

      expect(result.current.fields.conflictError).toBe('Error')
      expect(result.current.fields.confirmation).toBeNull()
      expect(result.current.fields.submitting).toBe(false)
    })

    it('billingDisabled without a joinUrl still confirms and never navigates', async () => {
      const fetchMock = makeFetchMock({
        ok: true,
        body: { checkoutUrl: null, billingDisabled: true },
      })
      vi.stubGlobal('fetch', fetchMock)
      const { result } = renderSubmitHook()
      await fillValid(result)

      await act(async () => {
        await result.current.submit(submitEvent())
      })

      expect(window.location.href).toBe('')
      expect(result.current.fields.confirmation).toEqual({
        date: '2027-03-01',
        startTime: '10:00',
        joinUrl: undefined,
      })
    })

    it('useResetOnDate does not clear the confirmation (15-design watch item 1)', async () => {
      const { result } = renderHook(() => {
        const fields = useBookingFields()
        useResetOnDate(fields)
        return fields
      })

      await act(async () => {
        result.current.setConfirmation({ date: '2027-03-01', startTime: '10:00' })
        result.current.setSelectedSlot('10:00')
      })
      const confirmation = result.current.confirmation
      expect(confirmation).not.toBeNull()

      await act(async () => {
        result.current.setDate('2027-04-05')
      })

      // The date effect really ran (slot reset) — yet confirmation survived.
      expect(result.current.selectedSlot).toBe('')
      expect(result.current.confirmation).toBe(confirmation)
    })
  })
})
