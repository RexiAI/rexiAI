import { getMicrosoftAccessToken, getMicrosoftConfig } from './microsoftAuth.js'
import { getEmailProvider } from './providers.js'
import { getConfiguredTimezone } from './time.js'

export interface OperatorEmailInput {
  clientEmail: string
  date: string
  startTime: string
  hours: number
  amountCents: number
  joinUrl?: string | null
  /** Omitted means: infer from amountCents (0 => a no-charge reservation). */
  kind?: 'reservation' | 'charge'
  /**
   * Set when the calendar already held an overlapping event booked under a
   * DIFFERENT bookingId. The client has a reservation for a slot that is
   * already taken and needs a manual refund/reschedule — it must be visible in
   * the operator's mailbox, because nothing else surfaces it.
   */
  slotConflictWith?: string | null
}

/**
 * clientEmail is attacker-controlled and reaches the operator's mailbox as HTML.
 * & must be replaced first, otherwise the ampersands introduced by the later
 * replacements get double-escaped.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface BodyLine {
  label?: string
  value: string
}

function amountLine(input: OperatorEmailInput): BodyLine {
  const kind = input.kind ?? (input.amountCents === 0 ? 'reservation' : 'charge')
  if (kind === 'reservation') {
    return { value: 'Reserva sin cargo — se factura tras la reunión (pro-rata 0,50 EUR/min)' }
  }
  // Pro-rata is 50 cents/minute, so half-euro totals are routine: 2 decimals, never 0.
  const amountEuro = (input.amountCents / 100).toFixed(2)
  return { label: 'Importe cobrado', value: `${amountEuro} EUR (${input.amountCents} cents)` }
}

function buildLines(input: OperatorEmailInput): BodyLine[] {
  const timezone = getConfiguredTimezone()
  const lines: BodyLine[] = [
    { label: 'Cliente', value: input.clientEmail },
    { label: 'Fecha', value: input.date },
    { label: `Hora (${timezone})`, value: input.startTime },
    { label: 'Duración', value: `${input.hours} horas` },
    amountLine(input),
  ]
  if (input.joinUrl) lines.push({ label: 'Teams', value: input.joinUrl })
  if (input.slotConflictWith) {
    lines.push({
      value: `ATENCIÓN: conflicto de franja — ya existe una reserva (${input.slotConflictWith}) que solapa este horario. Revisar y reembolsar manualmente.`,
    })
  }
  return lines
}

function renderText(lines: BodyLine[]): string {
  return lines.map((l) => (l.label ? `${l.label}: ${l.value}` : l.value)).join('\n')
}

function renderHtml(lines: BodyLine[]): string {
  const inner = lines
    .map((l) => (l.label ? `${escapeHtml(l.label)}: ${escapeHtml(l.value)}` : escapeHtml(l.value)))
    .join('<br/>')
  return `<p>${inner}</p>`
}

function getEmailConfig() {
  const apiKey = process.env['RESEND_API_KEY']
  const from = process.env['EMAIL_FROM']
  const to = process.env['EMAIL_TO']
  if (!apiKey) throw new Error('RESEND_API_KEY not set')
  if (!from) throw new Error('EMAIL_FROM not set')
  if (!to) throw new Error('EMAIL_TO not set')
  return { apiKey, from, to }
}

/**
 * `text` is the plain part and stays unescaped; `html` is built from per-field
 * escaped values, never by string-replacing the plaintext. `subject` stays
 * plaintext because Resend and Graph both take it as a plain string — do not
 * build HTML from it without escaping.
 */
function buildBody(input: OperatorEmailInput): { subject: string; text: string; html: string } {
  const subject = `Nueva reserva: ${input.clientEmail} - ${input.date} ${input.startTime}`
  const lines = buildLines(input)
  return { subject, text: renderText(lines), html: renderHtml(lines) }
}

async function sendViaResend(input: OperatorEmailInput, fetchImpl: typeof fetch): Promise<void> {
  const { apiKey, from, to } = getEmailConfig()
  const { subject, text, html } = buildBody(input)
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Resend failed: ${res.status} ${errText}`)
  }
}

async function sendViaMicrosoft(input: OperatorEmailInput, fetchImpl: typeof fetch): Promise<void> {
  const cfg = getMicrosoftConfig()
  if (!cfg) throw new Error('Microsoft Graph not configured')
  const token = await getMicrosoftAccessToken(fetchImpl)
  const { subject, html } = buildBody(input)
  const to = process.env['EMAIL_TO'] || cfg.userId
  const from = process.env['EMAIL_FROM'] || cfg.userId
  const res = await fetchImpl(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.userId)}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
          from: { emailAddress: { address: from } },
        },
        saveToSentItems: true,
      }),
    }
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Graph sendMail failed: ${res.status} ${errText}`)
  }
}

export async function sendOperatorEmail(
  input: OperatorEmailInput,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const provider = getEmailProvider()
  if (provider === 'microsoft365') {
    const cfg = getMicrosoftConfig()
    if (!cfg) {
      // fallback to gmail when Microsoft not configured (backward compat)
      return sendViaResend(input, fetchImpl)
    }
    return sendViaMicrosoft(input, fetchImpl)
  }
  return sendViaResend(input, fetchImpl)
}

export interface ClientEmailInput {
  clientEmail: string
  date: string
  startTime: string
  hours: number
  joinUrl?: string | null
}

function billingModelLines(): BodyLine[] {
  return [
    { value: 'Reserva sin cargo: no se cobra nada al reservar.' },
    {
      value:
        'Se factura después de la reunión a 0,50 EUR/min (30 EUR/hora), ' +
        'con los primeros 60 minutos gratis la primera vez.',
    },
  ]
}

function buildClientLines(input: ClientEmailInput): BodyLine[] {
  const timezone = getConfiguredTimezone()
  const lines: BodyLine[] = [
    { value: 'Tu reunión con RexiAI está confirmada.' },
    { label: 'Fecha', value: input.date },
    { label: `Hora (${timezone})`, value: input.startTime },
    { label: 'Duración', value: `${input.hours} horas` },
  ]
  if (input.joinUrl) lines.push({ label: 'Enlace de Teams', value: input.joinUrl })
  return [...lines, ...billingModelLines()]
}

function buildClientBody(input: ClientEmailInput): {
  subject: string
  text: string
  html: string
} {
  const subject = `Reserva confirmada: ${input.date} ${input.startTime}`
  const lines = buildClientLines(input)
  return { subject, text: renderText(lines), html: renderHtml(lines) }
}

/**
 * DELIVERABILITY CONSTRAINT — with EMAIL_FROM=onboarding@resend.dev (the Resend
 * sandbox sender) Resend only delivers to the account owner's own address.
 * Every send to an arbitrary client address WILL be rejected until a verified
 * sending domain is configured in Resend and EMAIL_FROM points at it. That
 * failure is surfaced distinctly (not swallowed) so it is diagnosable from the
 * logs rather than looking like a generic mail outage.
 */
function assertClientSenderUsable(from: string): void {
  if (from.endsWith('@resend.dev')) {
    throw new Error(
      `Client email cannot be delivered: EMAIL_FROM="${from}" is the Resend sandbox sender, ` +
        'which only delivers to the Resend account owner. Configure a verified sending domain.'
    )
  }
}

async function sendClientViaResend(
  input: ClientEmailInput,
  fetchImpl: typeof fetch
): Promise<void> {
  const { apiKey, from } = getEmailConfig()
  assertClientSenderUsable(from)
  const { subject, text, html } = buildClientBody(input)
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: input.clientEmail, subject, text, html }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Resend client email failed: ${res.status} ${errText}`)
  }
}

async function sendClientViaMicrosoft(
  input: ClientEmailInput,
  fetchImpl: typeof fetch
): Promise<void> {
  const cfg = getMicrosoftConfig()
  if (!cfg) throw new Error('Microsoft Graph not configured')
  const token = await getMicrosoftAccessToken(fetchImpl)
  const { subject, html } = buildClientBody(input)
  const from = process.env['EMAIL_FROM'] || cfg.userId
  const res = await fetchImpl(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.userId)}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: input.clientEmail } }],
          from: { emailAddress: { address: from } },
        },
        saveToSentItems: true,
      }),
    }
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Graph client sendMail failed: ${res.status} ${errText}`)
  }
}

/**
 * Confirmation to the CLIENT address (input.clientEmail), never EMAIL_TO.
 * Throws on failure; the webhook caller logs and continues so a mail problem
 * cannot make Stripe retry and duplicate the operator-side effects.
 */
export async function sendClientEmail(
  input: ClientEmailInput,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  if (getEmailProvider() === 'microsoft365' && getMicrosoftConfig()) {
    return sendClientViaMicrosoft(input, fetchImpl)
  }
  return sendClientViaResend(input, fetchImpl)
}
