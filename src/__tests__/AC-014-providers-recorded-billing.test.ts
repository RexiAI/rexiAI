import { describe, it, expect, afterEach } from 'vitest'

import { recordedBillingCents } from '../domain/pricing'
import { getCalendarProvider, getEmailProvider } from '../domain/providers'

describe('AC-014', () => {
  const origCal = process.env['CALENDAR_PROVIDER']
  const origEmail = process.env['EMAIL_PROVIDER']
  afterEach(() => {
    if (origCal === undefined) delete process.env['CALENDAR_PROVIDER']
    else process.env['CALENDAR_PROVIDER'] = origCal
    if (origEmail === undefined) delete process.env['EMAIL_PROVIDER']
    else process.env['EMAIL_PROVIDER'] = origEmail
  })

  it('AC-014-01: provider defaults to gmail/google when env unset (backward compat)', () => {
    delete process.env['CALENDAR_PROVIDER']
    delete process.env['EMAIL_PROVIDER']
    expect(getCalendarProvider()).toBe('google')
    expect(getEmailProvider()).toBe('gmail')
    process.env['CALENDAR_PROVIDER'] = 'microsoft'
    expect(getCalendarProvider()).toBe('microsoft')
    process.env['EMAIL_PROVIDER'] = 'microsoft365'
    expect(getEmailProvider()).toBe('microsoft365')
    // fallback aliases
    process.env['CALENDAR_PROVIDER'] = 'google'
    expect(getCalendarProvider()).toBe('google')
  })

  it('AC-014-02: pro-rata per minute at 50 cents/min with 60 min free once', () => {
    // first-timer 90min → 30 min billable → 1500 cents = €15
    expect(recordedBillingCents(90, true)).toBe(1500)
    // first-timer 150min → 90 min billable → 4500 cents = €45
    expect(recordedBillingCents(150, true)).toBe(4500)
    // first-timer 60min → 0 billable → 0
    expect(recordedBillingCents(60, true)).toBe(0)
    // returning 90min → 90 billable → 4500
    expect(recordedBillingCents(90, false)).toBe(4500)
    // returning 30min → 1500
    expect(recordedBillingCents(30, false)).toBe(1500)
  })
})
