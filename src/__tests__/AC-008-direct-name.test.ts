// AC-008 Task 5 — the billing-disabled path forwards the name to the operator.
// Acceptance tests per
// specs/008-customer-name-and-recording-folders/20-acceptance/AC-008-direct-name.md
import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  mockOverlap: vi.fn(),
  mockCreateCalendarEvent: vi.fn(),
  mockSendOperatorEmail: vi.fn(),
  mockSendClientEmail: vi.fn(),
}))

vi.mock('../domain/calendar', () => ({
  createCalendarEvent: m.mockCreateCalendarEvent,
  findOverlappingBookingId: m.mockOverlap,
  findEventByBookingId: vi.fn(),
  getBusyIntervals: vi.fn(),
}))
vi.mock('../domain/email', () => ({
  sendOperatorEmail: m.mockSendOperatorEmail,
  sendClientEmail: m.mockSendClientEmail,
}))

import { finishDirectBooking } from '../../api/bookings/direct'

const JOIN = 'https://meet.example/rexi-direct'

function makeRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any
}

describe('AC-008 direct booking name', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.mockOverlap.mockResolvedValue(null)
    m.mockCreateCalendarEvent.mockResolvedValue(undefined)
    m.mockSendOperatorEmail.mockResolvedValue(undefined)
    m.mockSendClientEmail.mockResolvedValue(undefined)
  })

  it('AC-008-12: the direct booking forwards the name to the operator email', async () => {
    const res = makeRes()
    await finishDirectBooking(
      {
        name: 'Ana López',
        email: 'ana@example.com',
        date: '2027-03-01',
        startTime: '10:00',
        hours: 2,
      },
      JOIN,
      res
    )

    expect(m.mockSendOperatorEmail).toHaveBeenCalledTimes(1)
    expect(m.mockSendOperatorEmail.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        clientName: 'Ana López',
        clientEmail: 'ana@example.com',
        date: '2027-03-01',
        startTime: '10:00',
        hours: 2,
      })
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
