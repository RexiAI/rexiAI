import { describe, it, expect, vi } from 'vitest'
import { sendOperatorEmail } from '../domain/email'

describe('AC-010', () => {
  beforeAllInject()
  function beforeAllInject() {
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'from@example.com'
    process.env['EMAIL_TO'] = 'to@example.com'
  }
  it('AC-010-01: Operator receives a complete booking summary', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' } as any)
    await sendOperatorEmail(
      { clientEmail: 'client@example.com', date: '2027-03-01', startTime: '10:00', hours: 2, amountCents: 3000 },
      fetchMock as any,
    )
    expect(fetchMock).toHaveBeenCalled()
    const [, opts] = fetchMock.mock.calls[0]
    const body = JSON.parse(opts.body)
    expect(body.to).toBe('to@example.com')
    expect(body.from).toBe('from@example.com')
    const text: string = body.text
    expect(text).toContain('client@example.com')
    expect(text).toContain('2027-03-01')
    expect(text).toContain('10:00')
    expect(text).toContain('2')
    expect(text).toContain('30')
  })
  it('AC-010-02: Exactly one send per completed booking', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' } as any)
    await sendOperatorEmail(
      { clientEmail: 'a@a.com', date: '2027-03-01', startTime: '10:00', hours: 1, amountCents: 0 },
      fetchMock as any,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('AC-010-03: Provider failure propagates as retryable error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'fail' } as any)
    await expect(
      sendOperatorEmail(
        { clientEmail: 'a@a.com', date: '2027-03-01', startTime: '10:00', hours: 1, amountCents: 0 },
        fetchMock as any,
      ),
    ).rejects.toThrow(/Resend failed/)
  })
})
