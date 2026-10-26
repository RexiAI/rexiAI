// AC-006 Task 8, billing-enabled path: the confirmation email is sent from the
// Stripe webhook, so the locale captured at booking time must survive the round
// trip through the checkout session's metadata — the webhook never guesses.
// Acceptance test per
// specs/006-branded-meeting-link-and-recording-bot/20-acceptance/AC-006-notice-locale.md
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const wh = vi.hoisted(() => ({
  mockConstruct: vi.fn(),
  mockCustomerList: vi.fn(),
  mockCustomerCreate: vi.fn(),
  mockCustomerUpdate: vi.fn(),
  mockCreateEvent: vi.fn(),
  mockFindEvent: vi.fn(),
  mockOverlap: vi.fn(),
  mockMarkFree: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: vi.fn(function (this: unknown) {
    return {
      webhooks: { constructEvent: wh.mockConstruct },
      customers: {
        list: wh.mockCustomerList,
        create: wh.mockCustomerCreate,
        update: wh.mockCustomerUpdate,
      },
      checkout: { sessions: { create: vi.fn() } },
    }
  }),
}))

vi.mock('../domain/freeHour', () => ({
  markFreeHourUsed: wh.mockMarkFree,
  isFreeHourAvailable: vi.fn(async () => true),
}))

vi.mock('../domain/microsoftGraph', () => ({
  microsoftGraph: {
    createEvent: wh.mockCreateEvent,
    findEventByBookingId: wh.mockFindEvent,
    findOverlappingBookingId: wh.mockOverlap,
    getBusyIntervals: vi.fn(async () => []),
  },
}))

// The email module stays REAL: the assertion is about the notice the client
// actually receives, not about the arguments the webhook passes on.
import webhook, { _resetEmailSent } from '../../api/stripe-webhook'
import { NOTICE_EN, NOTICE_ES } from '../domain/consentNotice'

const CLIENT = 'client@example.com'
const OPERATOR = 'operator@example.com'
const ROOM = 'rexi-0123456789abcdef'
const BRAND = 'https://meet.rexi-ai.com'

function checkoutEvent(id: string, locale: string | undefined) {
  const metadata: Record<string, string> = {
    email: CLIENT,
    date: '2027-03-01',
    start_time: '10:00',
    hours: '1',
    join_url: `${BRAND}/${ROOM}?lang=${locale === 'en' ? 'en' : 'es'}`,
  }
  if (locale !== undefined) metadata['locale'] = locale
  return {
    id,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_${id}`,
        customer_email: CLIENT,
        metadata,
        amount_total: 0,
      },
    },
  }
}

function makeReq() {
  return {
    method: 'POST',
    headers: { 'stripe-signature': 'sig' },
    bodyRaw: '{}',
    body: {},
  } as any
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }) as any

describe('AC-006 enabled-path notice locale (webhook)', () => {
  const savedEnv = { ...process.env }
  let resendPayloads: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    _resetEmailSent()
    resendPayloads = []
    process.env['STRIPE_SECRET_KEY'] = 'sk_test'
    process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test'
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'info@rexi-ai.com'
    process.env['EMAIL_TO'] = OPERATOR
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']

    wh.mockCustomerList.mockResolvedValue({ data: [] })
    wh.mockCustomerCreate.mockResolvedValue({ id: 'cus_1', metadata: {} })
    wh.mockCustomerUpdate.mockResolvedValue({ id: 'cus_1', metadata: {} })
    wh.mockFindEvent.mockResolvedValue(false)
    wh.mockOverlap.mockResolvedValue(null)
    wh.mockCreateEvent.mockResolvedValue({ alreadyExists: false })
    wh.mockMarkFree.mockResolvedValue({ burned: true })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: any) => {
        resendPayloads.push(JSON.parse(init.body))
        return { ok: true, status: 200, text: async () => '' } as Response
      }) as unknown as typeof fetch
    )
  })

  afterEach(() => {
    process.env = { ...savedEnv }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function clientPayload(): any {
    const matches = resendPayloads.filter((p) => p.to === CLIENT)
    expect(matches).toHaveLength(1)
    return matches[0]
  }

  it('AC-006-32: an English booking confirmed by the webhook carries the English notice', async () => {
    wh.mockConstruct.mockReturnValue(checkoutEvent('evt_locale_en', 'en'))
    const res = makeRes()
    await webhook(makeReq(), res)

    expect(res.status).toHaveBeenCalledWith(200)
    const payload = clientPayload()
    expect(payload.text).toContain(NOTICE_EN[0])
    expect(payload.text).toContain(NOTICE_EN[1])
    expect(payload.html).toContain(NOTICE_EN[0])
    expect(payload.text).not.toContain(NOTICE_ES[0])
  })

  it('AC-006-32: a Spanish booking carries the Spanish notice', async () => {
    wh.mockConstruct.mockReturnValue(checkoutEvent('evt_locale_es', 'es'))
    await webhook(makeReq(), makeRes())

    const payload = clientPayload()
    expect(payload.text).toContain(NOTICE_ES[0])
    expect(payload.text).not.toContain(NOTICE_EN[0])
  })

  it('AC-006-32: the locale comes from the booking metadata, not a webhook-time default', async () => {
    // Identical sessions except for the captured locale: the notice must follow it.
    wh.mockConstruct.mockReturnValue(checkoutEvent('evt_locale_missing', undefined))
    await webhook(makeReq(), makeRes())
    expect(clientPayload().text).toContain(NOTICE_ES[0])

    resendPayloads = []
    _resetEmailSent()
    wh.mockConstruct.mockReturnValue(checkoutEvent('evt_locale_en2', 'en'))
    await webhook(makeReq(), makeRes())
    expect(clientPayload().text).toContain(NOTICE_EN[0])
  })
})
