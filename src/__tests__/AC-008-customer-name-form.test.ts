// AC-008 Task 1 — required customer name, hook/dictionary level.
// Acceptance tests per
// specs/008-customer-name-and-recording-folders/20-acceptance/AC-008-capture-name.md
//
// The rendered-form coverage lives in AC-008-customer-name-form.test.tsx. These
// citations live in a .ts file because scripts/check-scenario-traceability.sh does
// not scan .tsx (same convention as AC-002-frontend-confirmation.test.ts), and
// because the submit contract — validation gate, dictionary message, POST body —
// is provable without a DOM.
import { act, renderHook } from '@testing-library/react'
import type { FormEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { validateBookingForm } from '../components/booking/form/validateBookingForm'
import { useBookingFields } from '../components/booking/hooks/useBookingFields'
import { useBookingSubmit } from '../components/booking/hooks/useBookingSubmit'
import { en, es } from '../i18n/dictionary'

const TOO_LONG = 'a'.repeat(201)

function submitEvent(): FormEvent {
  return { preventDefault: vi.fn() } as unknown as FormEvent
}

function renderSubmitHook() {
  return renderHook(() => {
    const fields = useBookingFields()
    const submit = useBookingSubmit(fields, es)
    return { fields, submit }
  })
}

type Fields = ReturnType<typeof useBookingFields>

async function fill(result: { current: { fields: Fields } }, overrides: { name: string }) {
  await act(async () => {
    result.current.fields.setDate('2027-03-01')
    result.current.fields.setSelectedSlot('10:00')
    result.current.fields.setEmail('ana@example.com')
    result.current.fields.setName(overrides.name)
  })
}

describe('AC-008 capture the customer name (hook level)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('AC-008-01: an empty name blocks submit', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderSubmitHook()
    await fill(result, { name: '' })

    await act(async () => {
      await result.current.submit(submitEvent())
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.fields.errors['name']).toBe(es.booking.form.required)
  })

  it('AC-008-02: a whitespace-only name blocks submit', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderSubmitHook()
    await fill(result, { name: '   ' })

    await act(async () => {
      await result.current.submit(submitEvent())
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.fields.errors['name']).toBe(es.booking.form.required)
  })

  it('AC-008-03: a filled name is included in the POST body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ checkoutUrl: 'https://pay/stripe' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const originalLocation = window.location
    delete (window as any).location
    ;(window as any).location = { href: '' }
    const { result } = renderSubmitHook()
    await fill(result, { name: 'Ana López' })

    await act(async () => {
      await result.current.submit(submitEvent())
    })
    ;(window as any).location = originalLocation

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.name).toBe('Ana López')
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
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderSubmitHook()
    await fill(result, { name: TOO_LONG })

    await act(async () => {
      await result.current.submit(submitEvent())
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.fields.errors['name']).toBe(es.booking.form.nameTooLong)
  })

  describe('unit: name bounds and copy', () => {
    const valid = { date: '2027-03-01', selectedSlot: '10:00', email: 'ana@example.com', hours: 1 }

    it('accepts exactly 200 characters and rejects 201', () => {
      expect(validateBookingForm(es, { ...valid, name: 'a'.repeat(200) })).toEqual({})
      expect(validateBookingForm(es, { ...valid, name: 'a'.repeat(201) })['name']).toBe(
        es.booking.form.nameTooLong
      )
    })

    it('does not restrict the name to a character allow-list', () => {
      // Filesystem-unsafe characters are sanitised at folder-creation time, never
      // at the form (spec 008 Task 1).
      expect(validateBookingForm(es, { ...valid, name: 'Ana/López <script>' })).toEqual({})
    })

    it('defines name copy in BOTH dictionaries (en is not type-checked)', () => {
      for (const dict of [es, en]) {
        for (const key of ['nameLabel', 'nameHelper', 'nameTooLong'] as const) {
          expect(typeof dict.booking.form[key]).toBe('string')
          expect(dict.booking.form[key].length).toBeGreaterThan(0)
        }
      }
      expect(es.booking.form.nameLabel).toBe('Tu nombre')
      expect(en.booking.form.nameLabel).toBe('Your name')
    })
  })
})
