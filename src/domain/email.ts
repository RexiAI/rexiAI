// Email is Resend-only: the mailbox is Godaddy-hosted (info@rexi-ai.com), and
// Graph mail (Mail.Send) is not used. The provider-agnostic calendar layer is
// separate — see calendar.ts.
import { consentNoticeLines } from './consentNotice.js'
import {
  RESCHEDULE_LINK_LABEL,
  buildDirectClientBody,
  buildDirectOperatorBody,
} from './emailDirect.js'
import { renderHtml, renderText, type BodyLine } from './emailHtml.js'
import type { Locale } from './locale.js'
import { localeFreeJoinUrl } from './meetingUrl.js'
import {
  buildLimitBlockedOperatorBody,
  buildRescheduleClientBody,
  buildRescheduleOperatorBody,
  type LimitBlockedOperatorInput,
  type RescheduleClientInput,
  type RescheduleOperatorInput,
} from './rescheduleEmail.js'
import { rescheduleLink } from './rescheduleUrl.js'
import { getConfiguredTimezone } from './time.js'

// escapeHtml lives in emailHtml.ts (shared with the billing-disabled builders);
// re-exported here so the email module's documented surface is unchanged.
export { escapeHtml } from './emailHtml.js'

/**
 * Per-send options. `billingDisabled` is the billing-mode signal (spec 003
 * Decision 3): only the direct path sets it, and every other shape (omitted, {},
 * false) keeps the byte-identical billing-enabled output. AC-002-06 pins the
 * client call's FIRST argument, so options ride in an additional argument
 * position, never inside the input.
 *
 * `rescheduleToken` follows the same rule (spec 007 Task 7): the confirmation
 * mail gains its reschedule link from the token that was persisted on the
 * calendar event, and a booking with no token keeps its pre-007 body.
 */
export interface EmailOptions {
  billingDisabled?: boolean
  rescheduleToken?: string | null
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
  if (input.joinUrl) lines.push({ label: 'Reunión', value: localeFreeJoinUrl(input.joinUrl) })
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

/** The address pair a send posts with, once the config has been read. */
interface SendTarget {
  apiKey: string
  from: string
  to: string
}

/**
 * Shared Resend transport: one URL, one auth-header shape, one payload order, one
 * error mapping. `errorLabel` preserves each send's distinct thrown prefix, and
 * the payload keys keep the pre-consolidation from/to/subject/text/html order so
 * the serialized request body stays byte-identical to what each send built alone.
 * The six sends differ only in the address pair, the built body and that prefix.
 */
async function postResendEmail(
  fetchImpl: typeof fetch,
  target: SendTarget,
  body: { subject: string; text: string; html: string },
  errorLabel: string
): Promise<void> {
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${target.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: target.from,
      to: target.to,
      subject: body.subject,
      text: body.text,
      html: body.html,
    }),
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
  options?: EmailOptions
): Promise<void> {
  const { apiKey, from, to } = getEmailConfig()
  const body = options?.billingDisabled ? buildDirectOperatorBody(input) : buildBody(input)
  await postResendEmail(fetchImpl, { apiKey, from, to }, body, 'Resend failed')
}

export interface ClientEmailInput {
  clientEmail: string
  date: string
  startTime: string
  hours: number
  joinUrl?: string | null
  /** The booking's locale: selects the consent notice's language (spec 006 Task 8). */
  locale?: Locale | string | null
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

function buildClientLines(input: ClientEmailInput, token?: string | null): BodyLine[] {
  const timezone = getConfiguredTimezone()
  const lines: BodyLine[] = [
    { value: 'Tu reunión con RexiAI está confirmada.' },
    { label: 'Fecha', value: input.date },
    { label: `Hora (${timezone})`, value: input.startTime },
    { label: 'Duración', value: `${input.hours} horas` },
  ]
  // Consent before the join link (AC-006-07): renderText/renderHtml join these in
  // order, so one insertion gives the right order in both parts.
  lines.push(...consentNoticeLines(input.locale))
  if (input.joinUrl) lines.push({ label: 'Enlace de la reunión', value: input.joinUrl })
  // Below the join link, above the billing lines (spec 007 Task 7). Omitted when
  // the booking has no token, which keeps the pre-007 body byte-identical. This
  // variant renders a flat escaped-line body that AC-003-25 pins byte for byte,
  // so the link rides as one labelled line rather than the disabled variant's
  // anchor paragraph.
  const link = rescheduleLink(token, input.locale)
  if (link) lines.push({ label: RESCHEDULE_LINK_LABEL, value: link })
  return [...lines, ...billingModelLines()]
}

function buildClientBody(
  input: ClientEmailInput,
  token?: string | null
): {
  subject: string
  text: string
  html: string
} {
  const subject = `Reserva confirmada: ${input.date} ${input.startTime}`
  const lines = buildClientLines(input, token)
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
  options?: EmailOptions
): Promise<void> {
  const { apiKey, from } = getEmailConfig()
  // The sandbox-sender guard applies to every client-facing send, disabled
  // variant included (AC-003-26): it runs before the body build and before any
  // Resend request.
  assertClientSenderUsable(from)
  const token = options?.rescheduleToken
  const body = options?.billingDisabled
    ? buildDirectClientBody(input, token)
    : buildClientBody(input, token)
  await postResendEmail(
    fetchImpl,
    { apiKey, from, to: input.clientEmail },
    body,
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
  await postResendEmail(
    fetchImpl,
    { apiKey, from, to: input.clientEmail },
    buildPaymentLinkBody(input),
    'Resend payment-link email failed'
  )
}

/**
 * The operator's reschedule notice (spec 007 Task 6). On the critical path: the
 * reschedule endpoint surfaces its failure as a 5xx, because a moved meeting
 * nobody was told about is the one outcome that must be visible (decision D5).
 */
export async function sendRescheduleOperatorEmail(
  input: RescheduleOperatorInput,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const { apiKey, from, to } = getEmailConfig()
  await postResendEmail(
    fetchImpl,
    { apiKey, from, to },
    buildRescheduleOperatorBody(input),
    'Resend reschedule operator email failed'
  )
}

/**
 * The operator's "a client was refused by the limit" notice. Best effort: the
 * client already gets a refusal, so a mail failure must not turn a 4xx into a
 * 5xx the page reads as "unconfirmed".
 */
export async function sendLimitBlockedOperatorEmail(
  input: LimitBlockedOperatorInput,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const { apiKey, from, to } = getEmailConfig()
  await postResendEmail(
    fetchImpl,
    { apiKey, from, to },
    buildLimitBlockedOperatorBody(input),
    'Resend limit-blocked operator email failed'
  )
}

/**
 * The client's reschedule confirmation. Best effort by design (decision D5): the
 * move has already happened, so a delivery failure is logged and swallowed
 * rather than rolled back.
 */
export async function sendRescheduleClientEmail(
  input: RescheduleClientInput,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const { apiKey, from } = getEmailConfig()
  assertClientSenderUsable(from)
  await postResendEmail(
    fetchImpl,
    { apiKey, from, to: input.clientEmail },
    buildRescheduleClientBody(input),
    'Resend reschedule client email failed'
  )
}
