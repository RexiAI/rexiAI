import { describe, it, expect, vi } from 'vitest'

import { createGCalEvent } from '../domain/gcal'
import { madridToUtc } from '../domain/time'

describe('AC-009', () => {
  it('AC-009-01: Summer times convert through CEST correctly', () => {
    const start = madridToUtc('2027-07-15', '10:00')
    const end = new Date(start.getTime() + 3600000)
    expect(start.toISOString()).toBe('2027-07-15T08:00:00.000Z')
    expect(end.toISOString()).toBe('2027-07-15T09:00:00.000Z')
  })
  it('AC-009-02: Winter times convert through CET correctly', () => {
    const start = madridToUtc('2027-12-15', '10:00')
    const end = new Date(start.getTime() + 3600000)
    expect(start.toISOString()).toBe('2027-12-15T09:00:00.000Z')
    expect(end.toISOString()).toBe('2027-12-15T10:00:00.000Z')
  })
  it('AC-009-03: Event carries the booking id property', async () => {
    process.env['GOOGLE_CALENDAR_ID'] = 'test-cal'
    process.env['GOOGLE_SERVICE_ACCOUNT_JSON'] = JSON.stringify({ client_email: 'a@b.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----\n' })
    const insert = vi.fn().mockResolvedValue({})
    const list = vi.fn().mockResolvedValue({ data: { items: [] } })
    const mockCal: any = { events: { list, insert } }
    await createGCalEvent({ bookingId: 'cs_test_123', email: 'x@x.com', date: '2027-07-15', startTime: '10:00', hours: 1 }, mockCal)
    expect(insert).toHaveBeenCalled()
    const args = insert.mock.calls[0][0]
    expect(args.requestBody.extendedProperties.private.rexi_booking_id).toBe('cs_test_123')
    expect(args.requestBody.start.dateTime).toBe('2027-07-15T08:00:00.000Z')
  })
  it('AC-009-04: Duplicate suppression', async () => {
    process.env['GOOGLE_CALENDAR_ID'] = 'test-cal'
    process.env['GOOGLE_SERVICE_ACCOUNT_JSON'] = JSON.stringify({ client_email: 'a@b.iam.gserviceaccount.com', private_key: 'k' })
    const insert = vi.fn()
    const list = vi.fn().mockResolvedValue({ data: { items: [{ id: 'ev1' }] } })
    const mockCal: any = { events: { list, insert } }
    const res = await createGCalEvent({ bookingId: 'cs_test_123', email: 'x@x.com', date: '2027-07-15', startTime: '10:00', hours: 1 }, mockCal)
    expect(res.alreadyExists).toBe(true)
    expect(insert).not.toHaveBeenCalled()
  })
  it('AC-009-05: Calendar id and service-account credentials come from configuration', async () => {
    process.env['GOOGLE_CALENDAR_ID'] = 'my-cal-id'
    process.env['GOOGLE_SERVICE_ACCOUNT_JSON'] = JSON.stringify({ client_email: 'svc@proj.iam.gserviceaccount.com', private_key: 'priv' })
    const { _testGetCalendarConfig } = await import('../domain/gcal')
    const cfg = _testGetCalendarConfig()
    expect(cfg.calendarId).toBe('my-cal-id')
    expect(cfg.serviceJson).toContain('svc@proj')
  })
})
