import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { sendOperatorEmail, type OperatorEmailInput } from '../domain/email'
import { isValidEmail } from '../domain/validation'

import fs from 'fs'

const msMocks = vi.hoisted(() => ({
  mockToken: vi.fn(),
}))

vi.mock('../domain/microsoftAuth.js', () => ({
  getMicrosoftConfig: () => ({ userId: 'operator@example.com', tenantId: 't', clientId: 'c' }),
  getMicrosoftAccessToken: msMocks.mockToken,
}))

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const HOSTILE_EMAIL = '<img src=x onerror=alert(1)>@ev.il'

const baseInput: OperatorEmailInput = {
  clientEmail: 'client@example.com',
  date: '2027-03-01',
  startTime: '10:00',
  hours: 1,
  amountCents: 0,
}

/** Runs sendOperatorEmail against a stub fetch and returns the parsed JSON payload. */
async function capturePayload(input: OperatorEmailInput): Promise<any> {
  const calls: any[] = []
  const fetchImpl = vi.fn(async (_url: string, init: any) => {
    calls.push(JSON.parse(init.body))
    return { ok: true, status: 200, text: async () => '' } as any
  }) as unknown as typeof fetch
  await sendOperatorEmail(input, fetchImpl)
  return calls[calls.length - 1]
}

describe('AC-016', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'from@example.com'
    process.env['EMAIL_TO'] = 'operator@example.com'
    delete process.env['EMAIL_PROVIDER']
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
    msMocks.mockToken.mockResolvedValue('graph-token')
  })

  afterEach(() => {
    process.env = { ...savedEnv }
    vi.restoreAllMocks()
  })

  it('AC-016-01: HTML metacharacters in clientEmail are escaped in the html payload', async () => {
    const payload = await capturePayload({ ...baseInput, clientEmail: HOSTILE_EMAIL })
    expect(payload.html).not.toContain('<img')
    expect(payload.html).toContain('&lt;img')
    expect(payload.html).not.toContain('onerror=alert(1)>')
  })

  it('AC-016-01: microsoft365 sender also escapes HTML metacharacters', async () => {
    process.env['EMAIL_PROVIDER'] = 'microsoft365'
    const payload = await capturePayload({ ...baseInput, clientEmail: HOSTILE_EMAIL })
    const html = payload.message.body.content
    expect(payload.message.body.contentType).toBe('HTML')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('AC-016-02: text/plain payload is not double-escaped', async () => {
    const payload = await capturePayload({ ...baseInput, clientEmail: HOSTILE_EMAIL })
    expect(payload.text).toContain(HOSTILE_EMAIL)
    expect(payload.text).not.toContain('&lt;')
    expect(payload.text).not.toContain('&amp;')
    expect(payload.text).toContain('Duración:')
  })

  it('AC-016-03: 1550 cents renders as 15.50, not 16', async () => {
    const payload = await capturePayload({ ...baseInput, amountCents: 1550, kind: 'charge' })
    expect(payload.text).toContain('15.50 EUR')
    expect(payload.text).toContain('(1550 cents)')
    expect(payload.text).not.toContain('16 EUR')
  })

  it('AC-016-04: amountCents 0 produces reservation wording, not "Importe pagado: 0"', async () => {
    const payload = await capturePayload({ ...baseInput, amountCents: 0 })
    expect(payload.text).toContain('Reserva sin cargo')
    expect(payload.text).toContain('pro-rata 0,50 EUR/min')
    expect(payload.text).not.toContain('Importe pagado: 0')
    expect(payload.text).not.toContain('Importe pagado')
  })

  it('AC-016-05: AVAILABILITY_TIMEZONE=America/New_York is reflected in the body', async () => {
    process.env['AVAILABILITY_TIMEZONE'] = 'America/New_York'
    const payload = await capturePayload(baseInput)
    expect(payload.text).toContain('Hora (America/New_York):')
    expect(payload.text).not.toContain('Hora Madrid')
    expect(payload.text).not.toContain('Europe/Madrid')
  })

  it('AC-016-06: isValidEmail rejects HTML/quote/comma addresses and accepts plus-addressing', () => {
    expect(isValidEmail('<img src=x>@ev.il')).toBe(false)
    expect(isValidEmail('a"b@c.com')).toBe(false)
    expect(isValidEmail('a,b@c.com')).toBe(false)
    expect(isValidEmail('user+tag@sub.example.co.uk')).toBe(true)
  })
})
