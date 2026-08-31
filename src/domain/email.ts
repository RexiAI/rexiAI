import { getMicrosoftAccessToken, getMicrosoftConfig } from './microsoftAuth.js'
import { getEmailProvider } from './providers.js'

export interface OperatorEmailInput {
  clientEmail: string
  date: string
  startTime: string
  hours: number
  amountCents: number
  joinUrl?: string | null
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

function buildBody(input: OperatorEmailInput): { subject: string; body: string } {
  const amountEuro = (input.amountCents / 100).toFixed(0)
  const subject = `Nueva reserva: ${input.clientEmail} - ${input.date} ${input.startTime}`
  let body = `Cliente: ${input.clientEmail}
Fecha: ${input.date}
Hora Madrid: ${input.startTime}
Duracion: ${input.hours} horas
Importe pagado: ${amountEuro} EUR (${input.amountCents} cents)`
  if (input.joinUrl) body += `\nTeams: ${input.joinUrl}`
  return { subject, body }
}

async function sendViaResend(input: OperatorEmailInput, fetchImpl: typeof fetch): Promise<void> {
  const { apiKey, from, to } = getEmailConfig()
  const { subject, body } = buildBody(input)
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
      text: body,
      html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend failed: ${res.status} ${text}`)
  }
}

async function sendViaMicrosoft(input: OperatorEmailInput, fetchImpl: typeof fetch): Promise<void> {
  const cfg = getMicrosoftConfig()
  if (!cfg) throw new Error('Microsoft Graph not configured')
  const token = await getMicrosoftAccessToken(fetchImpl)
  const { subject, body } = buildBody(input)
  const to = process.env['EMAIL_TO'] || cfg.userId
  const from = process.env['EMAIL_FROM'] || cfg.userId
  const htmlBody = body.replace(/\n/g, '<br/>')
  const res = await fetchImpl(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.userId)}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: `<p>${htmlBody}</p>` },
          toRecipients: [{ emailAddress: { address: to } }],
          from: { emailAddress: { address: from } },
        },
        saveToSentItems: true,
      }),
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Graph sendMail failed: ${res.status} ${text}`)
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
