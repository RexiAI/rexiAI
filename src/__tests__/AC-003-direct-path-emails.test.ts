// AC-003 Tasks 2-3 wiring proof (Decision 8): handler-level e2e scenarios that
// run the REAL email module behind the direct path. AC-002's module mocks
// intercept before any content is built, so they cannot prove direct.ts passes
// the billing-disabled mode signal — these two do. Side-effect order and
// failure policy stay pinned by unmodified AC-002-06…12, not re-asserted here.
import fs from 'fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  mockGetStripe: vi.fn(),
  mockSessionCreate: vi.fn(),
  mockCustomerList: vi.fn(),
  mockFreeHourAvailable: vi.fn(),
  mockMarkFreeHour: vi.fn(),
  mockHasConflict: vi.fn(),
  mockCreateMeetingLink: vi.fn(),
  mockOverlap: vi.fn(),
  mockCreateCalendarEvent: vi.fn(),
  mockFindEventByBookingId: vi.fn(),
}))

vi.mock('../domain/stripeClient', () => ({
  getStripe: m.mockGetStripe,
}))

vi.mock('../domain/freeHour', () => ({
  isFreeHourAvailable: m.mockFreeHourAvailable,
  markFreeHourUsed: m.mockMarkFreeHour,
}))

vi.mock('../domain/meeting', () => ({
  createMeetingLink: m.mockCreateMeetingLink,
}))

vi.mock('../domain/calendar', () => ({
  createCalendarEvent: m.mockCreateCalendarEvent,
  findEventByBookingId: m.mockFindEventByBookingId,
  findOverlappingBookingId: m.mockOverlap,
}))

// src/domain/email is deliberately NOT mocked — the whole point of these two
// scenarios is the content Resend actually receives.

vi.mock('../../api/bookings/calendar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/bookings/calendar')>()
  return { ...actual, hasConflict: m.mockHasConflict }
})

import bookingsHandler from '../../api/bookings'
import { _resetRateLimit } from '../domain/rateLimit'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const JOIN_URL = 'https://meet.jit.si/rexi-direct-003'
const CLIENT = 'client@example.com'
const OPERATOR = 'operator@example.com'
const VALID_BODY = {
  name: 'Ana López',
  email: CLIENT,
  date: '2027-03-01',
  startTime: '10:00',
  hours: 1,
}

// Banned billing set (same list and same 'EUR' token rule as the module-level
// AC-003 email tests — see AC-003-operator-email.test.ts for the rationale).
const BANNED_SUBSTRINGS = [
  '€',
  'pro-rata',
  'prorrateo',
  'factur',
  'cargo',
  'cobr',
  'pago',
  'pagar',
  'precio',
  'tarifa',
  'importe',
  'stripe',
  'reembols',
  'gratis',
  'gratuit',
  'billing',
  'charge',
]

function expectNoBillingLanguage(...fields: string[]): void {
  for (const field of fields) {
    for (const stem of BANNED_SUBSTRINGS) {
      expect(field.toLowerCase()).not.toContain(stem)
    }
    expect(field).not.toMatch(/\bEUR\b/i)
  }
}

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  } as any
}

function makeBookingReq() {
  return {
    method: 'POST',
    body: VALID_BODY,
    headers: {
      host: 'example.com',
      'x-forwarded-proto': 'https',
      'x-forwarded-for': '203.0.113.2',
    },
  } as any
}

function jsonBody(res: any): any {
  return res.json.mock.calls[res.json.mock.calls.length - 1][0]
}

describe('AC-003 direct-path e2e emails', () => {
  const savedEnv: Record<string, string | undefined> = {}
  const ENV_KEYS = [
    'BILLING_ENABLED',
    'STRIPE_SECRET_KEY',
    'AVAILABILITY_TIMEZONE',
    'TIMEZONE',
    'BOOKING_RATE_LIMIT',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'EMAIL_TO',
    'EMAIL_PROVIDER',
  ] as const

  let resendPayloads: any[] = []
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k]
    vi.clearAllMocks()
    _resetRateLimit()
    resendPayloads = []

    process.env['BILLING_ENABLED'] = 'false'
    process.env['BOOKING_RATE_LIMIT'] = '1000'
    process.env['RESEND_API_KEY'] = 're_test'
    // Not a @resend.dev sandbox sender: the client send must actually run.
    process.env['EMAIL_FROM'] = 'hola@rexi-ai.com'
    process.env['EMAIL_TO'] = OPERATOR
    delete process.env['STRIPE_SECRET_KEY']
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    delete process.env['EMAIL_PROVIDER']

    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const fetchStub = vi.fn(async (_url: string, init: any) => {
      resendPayloads.push(JSON.parse(init.body))
      return { ok: true, status: 200, text: async () => '' } as Response
    })
    vi.stubGlobal('fetch', fetchStub as unknown as typeof fetch)

    m.mockGetStripe.mockReturnValue({})
    m.mockHasConflict.mockResolvedValue(false)
    m.mockCreateMeetingLink.mockResolvedValue({ status: 'ok', joinUrl: JOIN_URL })
    m.mockOverlap.mockResolvedValue(null)
    m.mockCreateCalendarEvent.mockResolvedValue({ alreadyExists: false })
    m.mockFindEventByBookingId.mockResolvedValue(false)
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k] as string
    }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function payloadFor(recipient: string): any {
    const matches = resendPayloads.filter((p) => p.to === recipient)
    expect(matches).toHaveLength(1)
    return matches[0]
  }

  it('AC-003-20: direct-path e2e — the operator email Resend receives is the disabled variant', async () => {
    const res = makeRes()
    await bookingsHandler(makeBookingReq(), res)
    expect(consoleError).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    const body = jsonBody(res)
    expect(body).toEqual({ checkoutUrl: null, joinUrl: JOIN_URL, billingDisabled: true })
    expect(typeof body.joinUrl).toBe('string')
    expect(body.joinUrl.length).toBeGreaterThan(0)

    const { subject, text, html } = payloadFor(OPERATOR)
    expectNoBillingLanguage(subject, text, html)
    expect(html).toContain(`href="${JOIN_URL}"`)
    expect(html).toContain('>Añadir a Google Calendar</a>')
    expect(html).toContain('dates=20270301T090000Z/20270301T100000Z')
  })

  it('AC-003-27: direct-path e2e — the client email Resend receives is the disabled variant, to the client', async () => {
    const res = makeRes()
    await bookingsHandler(makeBookingReq(), res)
    expect(consoleError).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    const body = jsonBody(res)
    expect(body).toEqual({ checkoutUrl: null, joinUrl: JOIN_URL, billingDisabled: true })

    // Two Resend sends total (operator + client); the client copy goes to the
    // client address, never to EMAIL_TO.
    expect(resendPayloads).toHaveLength(2)
    const { subject, text, html } = payloadFor(CLIENT)
    expectNoBillingLanguage(subject, text, html)
    expect(html).toContain(`href="${JOIN_URL}"`)
    expect(html).toContain('>Añadir a Google Calendar</a>')
    expect(html).toContain('dates=20270301T090000Z/20270301T100000Z')
  })

  describe('unit: the mode signal is what selects the variant', () => {
    it('without the mode the direct path would render the enabled wording — guard against regressions leaking it in', async () => {
      // Same handler call as AC-003-20; the enabled reservation line must NOT
      // appear in either disabled-variant payload (the direct path always
      // opts in; nothing here may quietly fall back to the default).
      await bookingsHandler(makeBookingReq(), makeRes())
      for (const payload of resendPayloads) {
        expect(payload.text).not.toContain('Reserva sin cargo')
        expect(payload.html).not.toContain('pro-rata')
      }
      expect(resendPayloads).toHaveLength(2)
    })
  })
})
