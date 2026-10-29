// AC-008 Task 4 — the customer name in the operator email (both billing modes).
// Acceptance tests per
// specs/008-customer-name-and-recording-folders/20-acceptance/AC-008-operator-email-name.md
//
// Both builders are exercised through the public send API so the assertions are
// on the payload Resend actually receives, not on internal line arrays.
import fs from 'fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendOperatorEmail, type OperatorEmailInput } from '../domain/email'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const DISABLED_MODE = { billingDisabled: true } as const
const INPUT: OperatorEmailInput = {
  clientEmail: 'ana@example.com',
  date: '2027-03-01',
  startTime: '10:00',
  hours: 2,
  amountCents: 3000,
}

type Captured = { subject: string; text: string; html: string }

async function capture(input: OperatorEmailInput, mode?: unknown): Promise<Captured> {
  const calls: Captured[] = []
  const fetchImpl = vi.fn(async (_url: string, init: any) => {
    calls.push(JSON.parse(init.body))
    return { ok: true, status: 200, text: async () => '' } as any
  }) as unknown as typeof fetch
  await sendOperatorEmail(input, fetchImpl, mode as any)
  expect(calls).toHaveLength(1)
  return calls[0]
}

describe('AC-008 operator email name', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'from@example.com'
    process.env['EMAIL_TO'] = 'operator@example.com'
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('AC-008-08: the billing-enabled email shows the name above the client line', async () => {
    const { text, html } = await capture({ ...INPUT, clientName: 'Ana López' })

    expect(text).toContain('Nombre: Ana López')
    // Immediately above: no other line sits between the two.
    expect(text).toContain('Nombre: Ana López\nCliente: ana@example.com')
    expect(text.indexOf('Nombre')).toBeLessThan(text.indexOf('Cliente'))
    expect(html).toContain('Nombre: Ana López')
    expect(html.indexOf('Nombre')).toBeLessThan(html.indexOf('Cliente'))
  })

  it('AC-008-09: the billing-disabled email shows the name above the client row', async () => {
    const { text, html } = await capture({ ...INPUT, clientName: 'Ana López' }, DISABLED_MODE)

    expect(text).toContain('Nombre: Ana López\nCliente: ana@example.com')
    // Table variant: the label cell and the value cell are each rendered once.
    expect(html).toContain('>Nombre<')
    expect(html).toContain('>Ana López<')
    expect(html.indexOf('>Nombre<')).toBeLessThan(html.indexOf('>Cliente<'))
  })

  it('AC-008-10: the name is HTML-escaped in the email body', async () => {
    const hostile = '<script>alert(1)</script>'
    for (const mode of [undefined, DISABLED_MODE]) {
      const { html, text } = await capture({ ...INPUT, clientName: hostile }, mode)

      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
      // The plain part stays raw text — it is never parsed as HTML.
      expect(text).toContain(hostile)
    }
  })

  it('AC-008-11: an absent name leaves the email unchanged', async () => {
    const absent = await capture(INPUT)
    const empty = await capture({ ...INPUT, clientName: '' })
    const explicitUndefined = await capture({ ...INPUT, clientName: undefined })

    for (const part of ['subject', 'text', 'html'] as const) {
      expect(absent[part]).not.toContain('Nombre')
      // Byte-identical to the pre-name output for the same input.
      expect(empty[part]).toBe(absent[part])
      expect(explicitUndefined[part]).toBe(absent[part])
    }
    expect(absent.text).toBe(
      [
        'Cliente: ana@example.com',
        'Fecha: 2027-03-01',
        'Hora (Europe/Madrid): 10:00',
        'Duración: 2 horas',
        'Importe cobrado: 30.00 EUR (3000 cents)',
      ].join('\n')
    )
    // The subject line never carries the name (pinned out of scope).
    expect(absent.subject).toBe('Nueva reserva: ana@example.com - 2027-03-01 10:00')

    const disabledAbsent = await capture(INPUT, DISABLED_MODE)
    const disabledEmpty = await capture({ ...INPUT, clientName: '' }, DISABLED_MODE)
    for (const part of ['subject', 'text', 'html'] as const) {
      expect(disabledAbsent[part]).not.toContain('Nombre')
      expect(disabledEmpty[part]).toBe(disabledAbsent[part])
    }
  })
})
