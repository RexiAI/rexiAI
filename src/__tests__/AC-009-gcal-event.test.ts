import { describe, it, expect } from 'vitest'

import { DEDUP_PROPERTY_ID, createGraphEvent } from '../domain/microsoftGraph'
import { getMicrosoftConfig } from '../domain/microsoftAuth'
import { madridToUtc } from '../domain/time'

function setMsEnv() {
  process.env['MICROSOFT_CLIENT_ID'] = 'client'
  process.env['MICROSOFT_CLIENT_SECRET'] = 'secret'
  process.env['MICROSOFT_REFRESH_TOKEN'] = 'refresh'
}

/** Fake fetch: serves the consumers token endpoint and /me/events GET/POST. */
function makeGraphFetch(overrides: { getValue?: unknown[] } = {}) {
  const posts: Array<{ url: string; body: any }> = []
  const fetchImpl: any = async (url: string, init?: any) => {
    if (String(url).includes('login.microsoftonline.com')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'tok' }) }
    }
    if (init?.method === 'POST') {
      posts.push({ url: String(url), body: JSON.parse(init.body) })
      return { ok: true, status: 201, text: async () => '' }
    }
    return { ok: true, status: 200, json: async () => ({ value: overrides.getValue ?? [] }) }
  }
  return { fetchImpl, posts }
}

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
    setMsEnv()
    const { fetchImpl, posts } = makeGraphFetch()
    await createGraphEvent(
      {
        bookingId: 'cs_test_123',
        email: 'x@x.com',
        date: '2027-07-15',
        startTime: '10:00',
        hours: 1,
        timezone: 'Europe/Madrid',
      },
      { fetchImpl }
    )
    const create = posts.find((p) => p.url.endsWith('/me/events'))
    expect(create).toBeDefined()
    const body = create!.body
    expect(body.singleValueExtendedProperties[0].id).toBe(DEDUP_PROPERTY_ID)
    expect(body.singleValueExtendedProperties[0].value).toBe('cs_test_123')
    expect(body.start.dateTime).toBe('2027-07-15T10:00:00')
    expect(body.start.timeZone).toBe('Europe/Madrid')
    // Meetings are Jitsi links carried in the body; no Graph online meeting
    // request is made (Teams is work/school-only, not usable on the personal
    // hotmail account).
    expect(body.isOnlineMeeting).toBeUndefined()
  })
  it('AC-009-04: Duplicate suppression', async () => {
    setMsEnv()
    const { fetchImpl, posts } = makeGraphFetch({
      getValue: [
        {
          id: 'ev1',
          singleValueExtendedProperties: [{ id: DEDUP_PROPERTY_ID, value: 'cs_test_123' }],
        },
      ],
    })
    const res = await createGraphEvent(
      {
        bookingId: 'cs_test_123',
        email: 'x@x.com',
        date: '2027-07-15',
        startTime: '10:00',
        hours: 1,
      },
      { fetchImpl }
    )
    expect(res.alreadyExists).toBe(true)
    expect(posts.filter((p) => p.url.endsWith('/me/events')).length).toBe(0)
  })
  it('AC-009-05: Microsoft credentials come from configuration', async () => {
    setMsEnv()
    const cfg = getMicrosoftConfig()
    expect(cfg?.clientId).toBe('client')
    expect(cfg?.clientSecret).toBe('secret')
    expect(cfg?.refreshToken).toBe('refresh')
    process.env['MICROSOFT_REFRESH_TOKEN'] = 'REPLACE_ME'
    expect(getMicrosoftConfig()).toBeNull()
    delete process.env['MICROSOFT_CLIENT_ID']
    expect(getMicrosoftConfig()).toBeNull()
  })
})
