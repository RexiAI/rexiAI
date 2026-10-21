// AC-003 Task 2: operator reservation email, billing-disabled variant
// (20-acceptance/AC-003-operator-email.md). The disabled variant carries zero
// billing language; the billing-ENABLED default shape stays byte-identical
// (AC-003-19), which is what keeps AC-016-email-safety.test.ts green untouched.
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

const JOIN = 'https://meet.jit.si/rexi-op'
const CLIENT = 'client@example.com'
const HOSTILE_EMAIL = '<img src=x onerror=alert(1)>@ev.il'
const DIRECT_MODE = { billingDisabled: true }

const DISABLED_INPUT: OperatorEmailInput = {
  clientEmail: CLIENT,
  date: '2027-03-01',
  startTime: '10:00',
  hours: 2,
  amountCents: 0,
  joinUrl: JOIN,
}

// Banned billing set (10-tasks Task 2, Decision 4/5). 'EUR' is checked as a
// standalone token: the timezone label 'Europe/Madrid' is pinned BY AC-003-15
// and is a place name, not a currency mention — a naive substring match would
// make AC-003-14 and AC-003-15 mutually unsatisfiable.
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

async function capture(input: OperatorEmailInput, mode: unknown = DIRECT_MODE): Promise<any> {
  const calls: any[] = []
  const fetchImpl = vi.fn(async (_url: string, init: any) => {
    calls.push(JSON.parse(init.body))
    return { ok: true, status: 200, text: async () => '' } as any
  }) as unknown as typeof fetch
  await sendOperatorEmail(input, fetchImpl, mode as any)
  expect(calls).toHaveLength(1)
  return calls[0]
}

describe('AC-003 operator email (billing disabled)', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env['RESEND_API_KEY'] = 're_test'
    process.env['EMAIL_FROM'] = 'from@example.com'
    process.env['EMAIL_TO'] = 'operator@example.com'
    delete process.env['AVAILABILITY_TIMEZONE']
    delete process.env['TIMEZONE']
    vi.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent as any)
  })

  afterEach(() => {
    process.env = { ...savedEnv }
    vi.restoreAllMocks()
  })

  it('AC-003-14: disabled-mode operator email carries zero billing language', async () => {
    const { subject, text, html } = await capture(DISABLED_INPUT)
    expectNoBillingLanguage(subject, text, html)
    expect(text).not.toContain('Reserva sin cargo')
    expect(html).not.toContain('Reserva sin cargo')
    expect(subject).not.toContain('Reserva sin cargo')
    for (const part of [subject, text, html]) {
      expect(part).not.toContain('0,50 EUR/min')
      expect(part).not.toContain('Importe cobrado')
      expect(part).not.toContain('€')
    }
    // Entirely Spanish, final copy per 15-design.md.
    expect(subject).toBe('Nueva reserva: 2027-03-01 10:00 (Europe/Madrid)')
    expect(html).toContain('Nueva reserva recibida')
  })

  it('AC-003-15: structure: facts first, join CTA, calendar CTA', async () => {
    const { html } = await capture(DISABLED_INPUT)
    const joinCtaAt = html.indexOf(`href="${JOIN}"`)
    expect(joinCtaAt).toBeGreaterThan(-1)
    for (const fact of ['2027-03-01', '10:00', 'Europe/Madrid', '2 horas', CLIENT]) {
      expect(html).toContain(fact)
      expect(html.lastIndexOf(fact)).toBeLessThan(joinCtaAt)
    }
    expect(html.indexOf('<h1')).toBeLessThan(joinCtaAt)
    expect(html).toContain('>Añadir a Google Calendar</a>')
    const calendarAt = html.indexOf('https://calendar.google.com')
    expect(calendarAt).toBeGreaterThan(joinCtaAt)
    const href = html.match(/href="(https:\/\/calendar\.google\.com[^"]*)"/)![1]
    expect(href.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE')).toBe(
      true
    )
    expect(href).toContain('&amp;')
    expect(href).toContain('dates=20270301T090000Z/20270301T110000Z')
    const details = decodeURIComponent(href.split('&amp;details=')[1])
    expect(details).toContain(JOIN)
    // Single-column 600px card per 15-design.md; hidden preheader at the top.
    expect(html).toContain('max-width:600px')
    expect(html).toContain('display:none')
    expect(html).toContain('Fecha, hora y enlace de acceso, listos para revisar.')
  })

  it('AC-003-16: escaping: hostile clientEmail inert in html, raw in text', async () => {
    const payload = await capture({ ...DISABLED_INPUT, clientEmail: HOSTILE_EMAIL })
    expect(payload.html).not.toContain('<img')
    expect(payload.html).toContain('&lt;img')
    expect(payload.html).not.toContain('onerror=alert(1)>')
    expect(payload.text).toContain(HOSTILE_EMAIL)
    expect(payload.text).not.toContain('&lt;')
    expect(payload.text).not.toContain('&amp;')
  })

  it('AC-003-17: slot-conflict warning survives, named and billing-free', async () => {
    const payload = await capture({ ...DISABLED_INPUT, slotConflictWith: 'other-booking-id' })
    const sentence =
      'Conflicto de franja. Ya existe una reserva (id: other-booking-id) ' +
      'que solapa este horario. Revisa el calendario antes de la reunión.'
    expect(payload.text).toContain('other-booking-id')
    expect(payload.text).toContain(sentence)
    expect(payload.html).toContain('other-booking-id')
    expect(payload.html).toContain('ATENCIÓN:')
    // Prominence per 15-design.md: directly under the H1, above the facts.
    const html: string = payload.html
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('ATENCIÓN:'))
    expect(html.indexOf('ATENCIÓN:')).toBeLessThan(html.indexOf('Cliente'))
    expectNoBillingLanguage(payload.subject, payload.text, payload.html)
  })

  it('AC-003-18: falsy join URL: operator email still sends, CTAs omitted', async () => {
    for (const joinUrl of [null, undefined, '']) {
      const payload = await capture({ ...DISABLED_INPUT, joinUrl })
      expect(payload.subject).toContain('2027-03-01')
      expect(payload.subject).toContain('10:00')
      for (const part of [payload.text, payload.html]) {
        expect(part).toContain('2027-03-01')
        expect(part).toContain('10:00')
        expect(part).toContain('Europe/Madrid')
        expect(part).toContain('2 horas')
        expect(part).toContain(CLIENT)
        expect(part).not.toContain('calendar.google.com')
      }
      expect(payload.text).toContain('Hora (Europe/Madrid): 10:00')
      // Both CTAs omitted: the html has no anchor at all in this branch.
      expect(payload.html).not.toContain('<a ')
      expect(payload.html).not.toContain(JOIN)
      expectNoBillingLanguage(payload.subject, payload.text, payload.html)
    }
  })

  it('AC-003-19: default operator call is byte-identical to today (enabled-path guarantee)', async () => {
    const payload = await capture(
      {
        clientEmail: CLIENT,
        date: '2027-03-01',
        startTime: '10:00',
        hours: 1,
        amountCents: 0,
      },
      {}
    )
    expect(payload.subject).toBe(`Nueva reserva: ${CLIENT} - 2027-03-01 10:00`)
    const lines = [
      `Cliente: ${CLIENT}`,
      'Fecha: 2027-03-01',
      'Hora (Europe/Madrid): 10:00',
      'Duración: 1 horas',
      'Reserva sin cargo — se factura tras la reunión (pro-rata 0,50 EUR/min)',
    ]
    expect(payload.text).toBe(lines.join('\n'))
    expect(payload.html).toBe(`<p>${lines.join('<br/>')}</p>`)
  })

  describe('unit: disabled-mode operator internals', () => {
    it('duration grammar: "1 hora" singular, "3 horas" plural (disabled only)', async () => {
      const one = await capture({ ...DISABLED_INPUT, hours: 1 })
      expect(one.text).toContain('Duración: 1 hora')
      expect(one.text).not.toContain('Duración: 1 horas')
      const three = await capture({ ...DISABLED_INPUT, hours: 3 })
      expect(three.text).toContain('Duración: 3 horas')
    })

    it('calendar details carry the design prefix and the join URL', async () => {
      const { html } = await capture(DISABLED_INPUT)
      const href = html.match(/href="(https:\/\/calendar\.google\.com[^"]*)"/)![1]
      const details = decodeURIComponent(href.split('&amp;details=')[1])
      expect(details).toBe(`Enlace de acceso a la sesión: ${JOIN}`)
    })

    it('joinUrl with query separators is attribute-escaped at its sink, raw in text', async () => {
      const hostile = 'https://meet.jit.si/x?a=1&b=2'
      const payload = await capture({ ...DISABLED_INPUT, joinUrl: hostile })
      expect(payload.html).toContain('href="https://meet.jit.si/x?a=1&amp;b=2"')
      expect(payload.text).toContain('Enlace de la reunión: https://meet.jit.si/x?a=1&b=2')
    })

    it('no slotConflictWith ⇒ no ATENCIÓN block anywhere', async () => {
      const payload = await capture(DISABLED_INPUT)
      expect(payload.html).not.toContain('ATENCIÓN')
      expect(payload.text).not.toContain('ATENCIÓN')
    })
  })
})
