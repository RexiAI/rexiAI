export interface OperatorEmailInput {
  clientEmail: string
  date: string
  startTime: string
  hours: number
  amountCents: number
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

export async function sendOperatorEmail(
  input: OperatorEmailInput,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const { apiKey, from, to } = getEmailConfig()
  const amountEuro = (input.amountCents / 100).toFixed(0)
  // Include all four data points: client email, date, Madrid time, duration, amount paid
  const subject = `Nueva reserva: ${input.clientEmail} - ${input.date} ${input.startTime}`
  const body = `Cliente: ${input.clientEmail}
Fecha: ${input.date}
Hora Madrid: ${input.startTime}
Duracion: ${input.hours} horas
Importe pagado: ${amountEuro} EUR (${input.amountCents} cents)`

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
