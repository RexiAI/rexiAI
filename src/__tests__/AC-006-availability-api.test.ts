import { describe, it, expect, vi } from 'vitest'
import { filterSlotsByBusy } from '../../api/availability.js'
import { madridToUtc } from '../domain/time'

// Test pure filter + handler integration via mocking

describe('AC-006', () => {
  it('AC-006-01: Open day returns YAML slots (filter with no busy)', () => {
    const slots = ['09:00', '10:00', '11:00', '12:00']
    const filtered = filterSlotsByBusy(slots, '2027-03-01', [])
    expect(filtered).toEqual(['09:00', '10:00', '11:00', '12:00'])
  })
  it('AC-006-02: Exact busy interval removes its slots', () => {
    const slots = ['09:00', '10:00', '11:00', '12:00']
    const busy = [
      { start: madridToUtc('2027-03-01', '10:00'), end: madridToUtc('2027-03-01', '12:00') },
    ]
    const filtered = filterSlotsByBusy(slots, '2027-03-01', busy)
    expect(filtered).toEqual(['09:00', '12:00'])
  })
  it('AC-006-03: Partial-hour busy overlap blocks both touched slots', () => {
    const slots = ['09:00', '10:00', '11:00', '12:00']
    const busy = [
      { start: madridToUtc('2027-03-01', '09:30'), end: madridToUtc('2027-03-01', '11:00') },
    ]
    const filtered = filterSlotsByBusy(slots, '2027-03-01', busy)
    expect(filtered).toEqual(['11:00', '12:00'])
  })
  it('AC-006-04: Blackout exception day returns empty', async () => {
    // Simulate handler with blackout: we test computeSlots separately
    const { parseAvailabilityYaml, computeSlotsForDate } = await import('../domain/availability')
    const yaml = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions:
  "2027-03-01": []
`
    const cfg = parseAvailabilityYaml(yaml)
    const slots = computeSlotsForDate(cfg, '2027-03-01')
    expect(slots).toEqual([])
    const filtered = filterSlotsByBusy(slots, '2027-03-01', [])
    expect(filtered).toEqual([])
  })
  it('AC-006-05: Past dates rejected', async () => {
    const handler = (await import('../../api/availability.js')).default
    const req = { method: 'GET', query: { date: '2000-01-01' } }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    const body = res.json.mock.calls[0][0]
    expect(body.error).toBeDefined()
    expect(body.error.code).toBeDefined()
  })
  it('AC-006-06: Malformed date rejected', async () => {
    const handler = (await import('../../api/availability.js')).default
    const req = { method: 'GET', query: { date: '31-12-2027' } }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
  it('AC-006-07: Missing date parameter rejected', async () => {
    const handler = (await import('../../api/availability.js')).default
    const req = { method: 'GET', query: {} }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
