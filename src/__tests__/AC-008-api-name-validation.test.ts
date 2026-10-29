// AC-008 Task 2 — name validation at the API boundary.
// Acceptance tests per
// specs/008-customer-name-and-recording-folders/20-acceptance/AC-008-api-name-validation.md
//
// prepareBookingInput is the pinned unit: it is the single function both booking
// paths (Stripe checkout and billing-disabled direct) run before any side effect,
// so a name it rejects can never reach Stripe, the calendar or the operator.
import fs from 'fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { prepareBookingInput } from '../../api/bookings/validation'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const TOO_LONG = 'a'.repeat(201)
// 2027-03-01 is a Monday; 10:00 for 1 hour sits inside the 09:00-13:00 window.
const VALID = { email: 'ana@example.com', date: '2027-03-01', startTime: '10:00', hours: 1 }

function makeRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any
}

function prepare(body: Record<string, unknown>) {
  const res = makeRes()
  const input = prepareBookingInput({ method: 'POST', body } as any, res)
  return { input, res }
}

function lastJson(res: any): any {
  return res.json.mock.calls[res.json.mock.calls.length - 1][0]
}

describe('AC-008 API name validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('AC-008-04: a valid name is accepted and trimmed', () => {
    const { input, res } = prepare({ ...VALID, name: '  Ana López  ' })

    expect(input).not.toBeNull()
    expect(input!.name).toBe('Ana López')
    expect(res.status).not.toHaveBeenCalled()
  })

  it('AC-008-05: a missing name is rejected', () => {
    const { input, res } = prepare({ ...VALID })

    expect(input).toBeNull()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(lastJson(res)).toEqual({
      error: { code: 'INVALID_NAME', message: 'Name is required' },
    })
  })

  it('AC-008-06: a blank name is rejected', () => {
    for (const blank of ['', '   ']) {
      const { input, res } = prepare({ ...VALID, name: blank })

      expect(input).toBeNull()
      expect(res.status).toHaveBeenCalledWith(400)
      expect(lastJson(res)).toEqual({
        error: { code: 'INVALID_NAME', message: 'Name is required' },
      })
    }
  })

  it('AC-008-21: a name longer than 200 characters is rejected', () => {
    const { input, res } = prepare({ ...VALID, name: TOO_LONG })

    expect(input).toBeNull()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(lastJson(res)).toEqual({
      error: { code: 'INVALID_NAME', message: 'Name is too long' },
    })
  })
})
