// Email is Resend-only: the mailbox is Godaddy-hosted (info@rexi-ai.com), and
// Graph mail (Mail.Send) is not used. The provider-agnostic calendar layer is
// separate — see calendar.ts.
import { buildDirectClientBody, buildDirectOperatorBody } from './emailDirect.js'
import { renderHtml, renderText, type BodyLine } from './emailHtml.js'
import { getConfiguredTimezone } from './time.js'

// escapeHtml lives in emailHtml.ts (shared with the billing-disabled builders);
// re-exported here so the email module's documented surface is unchanged.
export { escapeHtml } from './emailHtml.js'

/**
 * Billing-mode signal (spec 003 Decision 3). Only the direct path sets it:
 * `{ billingDisabled: true }` selects the billing-disabled email variants, and
 * every other shape (omitted, {}, false) keeps the byte-identical
 * billing-enabled output. AC-002-06 pins the client call's FIRST argument, so
 * the mode rides as an additional argument position, never inside the input.
 */
export interface EmailBillingMode {
  billingDisabled?: boolean
}

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
  if (input.joinUrl) lines.push({ label: 'Reunión', value: input.joinUrl })
  if (input.slotConflictWith) {
    lines.push({
      value: `ATENCIÓN: conflicto de franja — ya existe una reserva (${input.slotConflictWith}) que solapa este horario. Revisar y reembolsar manualmente.`,
    })
  }
  return lines
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
 * Shared Resend transport: one URL, one auth-header shape, one error mapping.
 * `errorLabel` preserves each send's distinct thrown prefix, and the payload
 * keys keep the pre-consolidation from/to/subject/text/html order so the
 * serialized request body stays byte-identical to what each send built alone.
 */
async function postResendEmail(
  fetchImpl: typeof fetch,
  apiKey: string,
  payload: { from: string; to: string; subject: string; text: string; html: string },
  errorLabel: string
): Promise<void> {
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`${errorLabel}: ${res.status} ${errText}`)
  }
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

export async function sendOperatorEmail(
  input: OperatorEmailInput,
  fetchImpl: typeof fetch = fetch,
  mode?: EmailBillingMode
): Promise<void> {
  const { apiKey, from, to } = getEmailConfig()
  const { subject, text, html } = mode?.billingDisabled
    ? buildDirectOperatorBody(input)
    : buildBody(input)
  await postResendEmail(fetchImpl, apiKey, { from, to, subject, text, html }, 'Resend failed')
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
  if (input.joinUrl) lines.push({ label: 'Enlace de la reunión', value: input.joinUrl })
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

export async function sendClientEmail(
  input: ClientEmailInput,
  fetchImpl: typeof fetch = fetch,
  mode?: EmailBillingMode
): Promise<void> {
  const { apiKey, from } = getEmailConfig()
  // The sandbox-sender guard applies to every client-facing send, disabled
  // variant included (AC-003-26): it runs before the body build and before any
  // Resend request.
  assertClientSenderUsable(from)
  const { subject, text, html } = mode?.billingDisabled
    ? buildDirectClientBody(input)
    : buildClientBody(input)
  await postResendEmail(
    fetchImpl,
    apiKey,
    { from, to: input.clientEmail, subject, text, html },
    'Resend client email failed'
  )
}

export interface PaymentLinkEmailInput {
  clientEmail: string
  amountCents: number
  checkoutUrl: string
  billableMinutes: number
}

function buildPaymentLinkBody(input: PaymentLinkEmailInput): {
  subject: string
  text: string
  html: string
} {
  // Pro-rata makes half-euro totals routine, so always 2 decimals — never round.
  const amountEuro = (input.amountCents / 100).toFixed(2)
  const subject = `RexiAI — pago de tu sesión (${amountEuro} EUR)`
  const lines: BodyLine[] = [
    { value: 'Tu reunión con RexiAI ha finalizado. Puedes pagar en el siguiente enlace:' },
    { label: 'Importe', value: `${amountEuro} EUR (${input.billableMinutes} min facturados)` },
    // The checkout URL is escaped by renderHtml like every other value, so its
    // & / % / # characters cannot break out into markup.
    { label: 'Enlace de pago', value: input.checkoutUrl },
    { value: 'Si tienes cualquier problema con el pago, responde a este correo.' },
  ]
  return { subject, text: renderText(lines), html: renderHtml(lines) }
}

/**
 * Emails the customer their post-meeting payment link (the recorded-billing
 * Checkout URL). The caller treats this as best effort: a delivery failure must
 * not undo the charge — the Checkout session already exists and the recording
 * processor also surfaces the URL. Requires a verified Resend sending domain
 * (see assertClientSenderUsable).
 */
export async function sendPaymentLinkEmail(
  input: PaymentLinkEmailInput,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const { apiKey, from } = getEmailConfig()
  // Client-facing: the Resend sandbox sender cannot deliver to arbitrary
  // customers — same constraint as sendClientEmail.
  assertClientSenderUsable(from)
  const { subject, text, html } = buildPaymentLinkBody(input)
  await postResendEmail(
    fetchImpl,
    apiKey,
    { from, to: input.clientEmail, subject, text, html },
    'Resend payment-link email failed'
  )
}
