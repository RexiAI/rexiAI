// AC-003 Task 3: client confirmation email, billing-disabled variant
// (20-acceptance/AC-003-client-email.md). Same treatment as the operator email:
// zero billing language, service framing for the client, and a byte-identical
// billing-ENABLED default (AC-003-25) — the contract AC-018-billing-guards
// pins through AC-018-05 untouched.
import fs from 'fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendClientEmail, type ClientEmailInput } from '../domain/email'

const yamlContent = `
timezone: Europe/Madrid
weekly:
  monday:
    - {start: "09:00", end: "13:00"}
exceptions: {}
`

const JOIN = 'https://meet.jit.si/rexi-cli'
const CLIENT = 'client@example.com'
const HOSTILE_EMAIL = '<img src=x onerror=alert(1)>@ev.il'
const DIRECT_MODE = { billingDisabled: true }

const DISABLED_INPUT: ClientEmailInput = {
  clientEmail: CLIENT,
  date: '2027-03-01',
  startTime: '10:00',
  hours: 2,
  joinUrl: JOIN,
}

// Same banned set and the same 'EUR' token rule as the operator email
// (see AC-003-operator-email.test.ts for why the timezone label is exempt).
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

async function capture(input: ClientEmailInput, mode: unknown = DIRECT_MODE): Promise<any> {
  const calls: any[] = []
  const fetchImpl = vi.fn(async (_url: string, init: any) => {
    calls.push(JSON.parse(init.body))
    return { ok: true, status: 200, text: async () => '' } as any
  }) as unknown as typeof fetch
  await sendClientEmail(input, fetchImpl, mode as any)
  expect(calls).toHaveLength(1)
  return calls[0]
}

describe('AC-003 client email (billing disabled)', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'hola@rexi-ai.com'
    process.env['EMAIL_TO'] = 'operator@example.com'
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
  })

  afterEach(() => {
    process.env = { ...savedEnv }
    vi.restoreAllMocks()
  })

  it('AC-003-21: disabled-mode client email carries zero billing language', async () => {
    const { subject, text, html } = await capture(DISABLED_INPUT)
    expectNoBillingLanguage(subject, text, html)
    for (const part of [subject, text, html]) {
      expect(part).not.toContain('Reserva sin cargo')
      expect(part).not.toContain('0,50 EUR/min')
      expect(part).not.toContain('60 minutos gratis')
    }
    // Entirely Spanish, final copy per 15-design.md.
    expect(subject).toBe('Tu reserva está confirmada: 2027-03-01 10:00')
    expect(html).toContain('Tu reserva está confirmada')
  })

  it('AC-003-22: structure: facts first, service framing, both CTAs', async () => {
    const { html } = await capture(DISABLED_INPUT)
    const joinCtaAt = html.indexOf(`href="${JOIN}"`)
    expect(joinCtaAt).toBeGreaterThan(-1)
    for (const fact of ['2027-03-01', '10:00', 'Europe/Madrid', '2 horas']) {
      expect(html).toContain(fact)
      expect(html.lastIndexOf(fact)).toBeLessThan(joinCtaAt)
    }
    expect(html).toContain('>Añadir a Google Calendar</a>')
    expect(html.indexOf('https://calendar.google.com')).toBeGreaterThan(joinCtaAt)
    const href = html.match(/href="(https:\/\/calendar\.google\.com[^"]*)"/)![1]
    expect(href.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE')).toBe(
      true
    )
    expect(href).toContain('&amp;')
    expect(href).toContain('dates=20270301T090000Z/20270301T110000Z')
    expect(decodeURIComponent(href.split('&amp;details=')[1])).toContain(JOIN)
    // Service framing under the headline, help line under the CTAs (15-design).
    expect(html).toContain('Para entrar a la sesión, usa el botón de abajo a la hora indicada.')
    expect(html.indexOf('Para entrar a la sesión')).toBeLessThan(joinCtaAt)
    expect(html).toContain('¿Dudas o necesitas cambiar la hora? Responde a este correo.')
    expect(html.indexOf('¿Dudas o necesitas cambiar la hora?')).toBeGreaterThan(joinCtaAt)
    expect(html).toContain('max-width:600px')
    expect(html).toContain('display:none')
    expect(html).toContain('Los detalles de tu sesión y cómo entrar, en este correo.')
  })

  it('AC-003-23: escaping at every sink; recipient is the address itself', async () => {
    const payload = await capture({ ...DISABLED_INPUT, clientEmail: HOSTILE_EMAIL })
    expect(payload.html).not.toContain('<img')
    expect(payload.html).not.toContain('&lt;')
    expect(payload.text).not.toContain('&lt;')
    expect(payload.text).not.toContain('&amp;')
    expect(payload.to).toBe(HOSTILE_EMAIL)
  })

  it('AC-003-24: falsy join URL: client email still sends, CTAs omitted', async () => {
    for (const joinUrl of [null, undefined, '']) {
      const payload = await capture({ ...DISABLED_INPUT, joinUrl })
      expect(payload.subject).toContain('2027-03-01')
      expect(payload.subject).toContain('10:00')
      for (const part of [payload.text, payload.html]) {
        expect(part).toContain('2027-03-01')
        expect(part).toContain('10:00')
        expect(part).toContain('Europe/Madrid')
        expect(part).toContain('2 horas')
        expect(part).not.toContain('calendar.google.com')
      }
      expect(payload.text).toContain('Hora (Europe/Madrid): 10:00')
      expect(payload.html).not.toContain('<a ')
      expect(payload.html).not.toContain(JOIN)
      expectNoBillingLanguage(payload.subject, payload.text, payload.html)
    }
  })

  it('AC-003-25: default client call is byte-identical to today (enabled-path guarantee)', async () => {
    const payload = await capture(
      {
        clientEmail: CLIENT,
        date: '2027-03-01',
        startTime: '10:00',
        hours: 1,
        joinUrl: 'https://teams.microsoft.com/l/meetup-join/xyz',
      },
      {}
    )
    expect(payload.subject).toBe('Reserva confirmada: 2027-03-01 10:00')
    // AUTHORISED CHANGE (spec 006 10-tasks.md decision 6, human-approved): the
    // recording-consent notice is inserted before the join line and nothing else
    // in this body moves. `toBe` stays exact — the stronger assertion is kept.
    const lines = [
      'Tu reunión con RexiAI está confirmada.',
      'Fecha: 2027-03-01',
      'Hora (Europe/Madrid): 10:00',
      'Duración: 1 horas',
      'Aviso de grabación: la reunión se graba en audio.',
      'Usamos la grabación para documentar la sesión. Si prefieres que no se grabe, responde a este correo antes de la reunión.',
      'Enlace de la reunión: https://teams.microsoft.com/l/meetup-join/xyz',
      'Reserva sin cargo: no se cobra nada al reservar.',
      'Se factura después de la reunión a 0,50 EUR/min (30 EUR/hora), ' +
        'con los primeros 60 minutos gratis la primera vez.',
    ]
    expect(payload.text).toBe(lines.join('\n'))
    expect(payload.html).toBe(`<p>${lines.join('<br/>')}</p>`)
    expect(payload.to).toBe(CLIENT)
  })

  it('AC-003-26: sandbox-sender guard still blocks disabled-mode client sends', async () => {
    process.env['EMAIL_FROM'] = 'onboarding@resend.dev'
    const fetchImpl = vi.fn()
    await expect(
      sendClientEmail(DISABLED_INPUT, fetchImpl as unknown as typeof fetch, DIRECT_MODE)
    ).rejects.toThrow(/sandbox sender/)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  describe('unit: disabled-mode client internals', () => {
    it('duration grammar: "1 hora" singular, "3 horas" plural (disabled only)', async () => {
      const one = await capture({ ...DISABLED_INPUT, hours: 1 })
      expect(one.text).toContain('Duración: 1 hora')
      expect(one.text).not.toContain('Duración: 1 horas')
      const three = await capture({ ...DISABLED_INPUT, hours: 3 })
      expect(three.text).toContain('Duración: 3 horas')
    })

    it('text part opens with the confirmation line and closes with the help line', async () => {
      const { text } = await capture(DISABLED_INPUT)
      const lines = text.split('\n')
      expect(lines[0]).toBe('Tu reserva con RexiAI está confirmada.')
      expect(lines[lines.length - 1]).toBe('¿Dudas? Responde a este correo.')
    })

    it('recipient never falls back to EMAIL_TO', async () => {
      const payload = await capture(DISABLED_INPUT)
      expect(payload.to).toBe(CLIENT)
      expect(payload.to).not.toBe(process.env['EMAIL_TO'])
    })
  })
})
