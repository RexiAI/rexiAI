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
