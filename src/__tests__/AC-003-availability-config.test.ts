import { describe, it, expect } from 'vitest'

import { parseAvailabilityYaml, computeSlotsForDate } from '../domain/availability'

describe('AC-003', () => {
  it('AC-003-01: Slots from weekly schedule', () => {
    const yaml = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`
    const cfg = parseAvailabilityYaml(yaml)
    // 2027-03-01 is Monday
    const slots = computeSlotsForDate(cfg, '2027-03-01')
    expect(slots).toEqual(['09:00', '10:00', '11:00', '12:00'])
  })

  it('AC-003-02: Weekday without an entry yields no slots', () => {
    const yaml = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`
    const cfg = parseAvailabilityYaml(yaml)
    // 2027-03-07 is Sunday
    const slots = computeSlotsForDate(cfg, '2027-03-07')
    expect(slots).toEqual([])
  })

  it('AC-003-03: Blackout exception empties the day', () => {
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
  })

  it('AC-003-04: Override exception replaces weekly slots', () => {
    const yaml = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions:
  "2027-03-08":
    - {start: "16:00", end: "19:00"}
`
    const cfg = parseAvailabilityYaml(yaml)
    const slots = computeSlotsForDate(cfg, '2027-03-08')
    expect(slots).toEqual(['16:00', '17:00', '18:00'])
  })

  it('AC-003-05: Window shorter than one hour yields no slots', () => {
    const yaml = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "09:30"}
exceptions: {}
`
    const cfg = parseAvailabilityYaml(yaml)
    const slots = computeSlotsForDate(cfg, '2027-03-01')
    expect(slots).toEqual([])
  })

  it('AC-003-06: Malformed YAML fails the load', () => {
    const bad = `::: not yaml ::: [`
    expect(() => parseAvailabilityYaml(bad)).toThrow(/availability\.yaml/i)
  })

  it('AC-003-07: Window with end not after start fails the load', () => {
    const yaml = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "14:00", end: "14:00"}
exceptions: {}
`
    expect(() => parseAvailabilityYaml(yaml)).toThrow(/end must be after start/i)
  })

  it('AC-003-08: Missing or mismatched timezone fails the load', () => {
    const yaml1 = `
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`
    expect(() => parseAvailabilityYaml(yaml1)).toThrow(/timezone/i)
    const yaml2 = `
timezone: Invalid/Timezone
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`
    expect(() => parseAvailabilityYaml(yaml2)).toThrow(/Europe\/Madrid/)
  })

  it('AC-003-09: Malformed time value fails the load', () => {
    const yaml = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "9am", end: "13:00"}
exceptions: {}
`
    expect(() => parseAvailabilityYaml(yaml)).toThrow(/invalid time value/i)
    const yaml2 = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "25:00"}
exceptions: {}
`
    expect(() => parseAvailabilityYaml(yaml2)).toThrow(/invalid time value/i)
  })
})
