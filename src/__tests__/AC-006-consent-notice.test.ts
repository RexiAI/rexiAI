// AC-006 Task 2: the client confirmation email tells the client the meeting is
// recorded, before the join link, in both parts of both client variants.
// Acceptance tests per
// specs/006-branded-meeting-link-and-recording-bot/20-acceptance/AC-006-consent-notice.md
import fs from 'fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NOTICE_EN, NOTICE_ES } from '../domain/consentNotice'
import { sendClientEmail, sendOperatorEmail, type ClientEmailInput } from '../domain/email'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const JOIN = 'https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es'
const CLIENT = 'client@example.com'
const DIRECT_MODE = { billingDisabled: true }

const CLIENT_INPUT: ClientEmailInput = {
  clientEmail: CLIENT,
  date: '2027-03-01',
  startTime: '10:00',
  hours: 2,
  joinUrl: JOIN,
}

const OPERATOR_INPUT = {
  clientEmail: CLIENT,
  date: '2027-03-01',
  startTime: '10:00',
  hours: 2,
  amountCents: 0,
  joinUrl: JOIN,
}

async function capture(
  send: (fetchImpl: typeof fetch) => Promise<void>
): Promise<{ subject: string; text: string; html: string; to: string }> {
  const calls: any[] = []
  const fetchImpl = vi.fn(async (_url: string, init: any) => {
    calls.push(JSON.parse(init.body))
    return { ok: true, status: 200, text: async () => '' } as any
  }) as unknown as typeof fetch
  await send(fetchImpl)
  expect(calls).toHaveLength(1)
  return calls[0]
}

function captureClient(input: ClientEmailInput, mode?: unknown) {
  return capture((fetchImpl) => sendClientEmail(input, fetchImpl, mode as any))
}

function captureOperator(mode?: unknown) {
  return capture((fetchImpl) => sendOperatorEmail(OPERATOR_INPUT, fetchImpl, mode as any))
}

/** Asserts the two notice lines appear, in order, in a rendered part. */
function expectNotice(part: string, notice: readonly [string, string]): void {
  const firstAt = part.indexOf(notice[0])
  const secondAt = part.indexOf(notice[1])
  expect(firstAt).toBeGreaterThan(-1)
  expect(secondAt).toBeGreaterThan(firstAt)
}

describe('AC-006 recording-consent notice', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'info@rexi-ai.com'
    process.env['EMAIL_TO'] = 'operator@example.com'
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
  })

  afterEach(() => {
    process.env = { ...savedEnv }
    vi.restoreAllMocks()
  })

  it('AC-006-05: the billing-enabled client email carries the notice in text and HTML', async () => {
    for (const [locale, notice] of [
      ['es', NOTICE_ES],
      ['en', NOTICE_EN],
    ] as const) {
      const payload = await captureClient({ ...CLIENT_INPUT, locale })
      expectNotice(payload.text, notice)
      expectNotice(payload.html, notice)
    }
  })

  it('AC-006-06: the direct (billing-disabled) client email carries the notice in text and HTML', async () => {
    for (const [locale, notice] of [
      ['es', NOTICE_ES],
      ['en', NOTICE_EN],
    ] as const) {
      const payload = await captureClient({ ...CLIENT_INPUT, locale }, DIRECT_MODE)
      expectNotice(payload.text, notice)
      expectNotice(payload.html, notice)
    }
  })

  it('AC-006-07: the notice precedes the join link/CTA in both parts, both variants', async () => {
    const variants: unknown[] = [undefined, DIRECT_MODE]
    for (const mode of variants) {
      for (const [locale, notice] of [
        ['es', NOTICE_ES],
        ['en', NOTICE_EN],
      ] as const) {
        const payload = await captureClient({ ...CLIENT_INPUT, locale }, mode)
        // Text part: the notice lines precede the join URL line.
        expect(payload.text.indexOf(notice[0])).toBeLessThan(payload.text.indexOf(JOIN))
        expect(payload.text.indexOf(notice[1])).toBeLessThan(payload.text.indexOf(JOIN))
        // HTML part: both before the CTA that carries the join URL.
        expect(payload.html.indexOf(notice[0])).toBeLessThan(payload.html.indexOf(JOIN))
        expect(payload.html.indexOf(notice[1])).toBeLessThan(payload.html.indexOf(JOIN))
      }
    }
  })

  it('AC-006-08: the operator email carries no consent notice in either billing mode', async () => {
    for (const mode of [undefined, DIRECT_MODE]) {
      const payload = await captureOperator(mode)
      for (const line of [...NOTICE_ES, ...NOTICE_EN]) {
        expect(payload.subject).not.toContain(line)
        expect(payload.text).not.toContain(line)
        expect(payload.html).not.toContain(line)
      }
      expect(payload.text).not.toMatch(/Aviso de grabación|Recording notice/i)
    }
  })

  it('AC-006-09: the direct client email keeps every locked line and only adds the notice', async () => {
    const payload = await captureClient({ ...CLIENT_INPUT, locale: 'es' }, DIRECT_MODE)

    const calendarLine = payload.text
      .split('\n')
      .find((line) => line.startsWith('Añadir a Google Calendar: ')) as string
    expect(calendarLine).toContain('https://calendar.google.com/')

    // The exact pre-006 body: heading, fact rows, join + calendar CTAs, help.
    const beforeNotice: string[] = [
      'Tu reserva con RexiAI está confirmada.',
      'Fecha: 2027-03-01',
      'Hora (Europe/Madrid): 10:00',
      'Duración: 2 horas',
      'Enlace de la reunión: ' + JOIN,
      calendarLine,
      '¿Dudas? Responde a este correo.',
    ]
    const withoutNotice = payload.text
      .split('\n')
      .filter((line) => !(NOTICE_ES as readonly string[]).includes(line))
    expect(withoutNotice).toEqual(beforeNotice)

    // Locked chrome/CTAs are untouched in the HTML part too.
    expect(payload.html).toContain('Tu reserva está confirmada')
    expect(payload.html).toContain('Los detalles de tu sesión y cómo entrar, en este correo.')
    expect(payload.html).toContain(`href="${JOIN}"`)
    expect(payload.html).toContain('>Añadir a Google Calendar</a>')
    expect(payload.html).toContain('¿Dudas o necesitas cambiar la hora? Responde a este correo.')
    expect(payload.html).toContain('Duración')
  })
})
