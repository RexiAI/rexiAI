// Billing-disabled email variants (spec 003 Tasks 2-3): the operator
// reservation email and the client confirmation email sent from the direct
// path (api/bookings/direct.ts). Zero billing language by construction — no
// price, charge, invoice or refund wording anywhere (10-tasks Decision 4/5);
// the free-ness is simply unstated. Layout, locked strings and CTA hierarchy
// come from specs/003-booking-comms-polish/15-design.md (single-column 600px
// card, hand-built HTML, inline styles, no new dependencies).
//
// These functions are ONLY reached when the caller explicitly opts in via the
// billing mode (email.ts dispatch). The billing-enabled builders in email.ts
// are byte-frozen (AC-003-19/25); nothing here may leak into them.
import { buildCalendarTemplateUrl } from './calendarLink.js'
import { consentNotice, consentNoticeLines, noticeLangAttribute } from './consentNotice.js'
import type { ClientEmailInput, OperatorEmailInput } from './email.js'
import { clientNameRows, escapeHtml, renderText, type BodyLine } from './emailHtml.js'
import { localeFreeJoinUrl } from './meetingUrl.js'
import { getConfiguredTimezone } from './time.js'

export interface EmailBody {
  subject: string
  text: string
  html: string
}

// Locked copy (15-design.md Tasks 1-3). Dash-free and banned-stem-clean by
// design; the AC-003-14/21 scenarios re-check that at the payload level.
const CALENDAR_TITLE = 'Sesión con RexiAI'
const CALENDAR_DETAILS_PREFIX = 'Enlace de acceso a la sesión: '
const CALENDAR_CTA_LABEL = 'Añadir a Google Calendar'
const JOIN_CTA_LABEL = 'Unirse a la reunión'
const WORDMARK = 'RexiAI'
const OPERATOR_HEADING = 'Nueva reserva recibida'
const OPERATOR_PREHEADER = 'Fecha, hora y enlace de acceso, listos para revisar.'
const CLIENT_HEADING = 'Tu reserva está confirmada'
const CLIENT_PREHEADER = 'Los detalles de tu sesión y cómo entrar, en este correo.'
const CLIENT_REASSURANCE = 'Para entrar a la sesión, usa el botón de abajo a la hora indicada.'
const CLIENT_HELP_HTML = '¿Dudas o necesitas cambiar la hora? Responde a este correo.'
const CLIENT_HELP_TEXT = '¿Dudas? Responde a este correo.'
const CLIENT_CONFIRMED_LINE = 'Tu reserva con RexiAI está confirmada.'
const CONFLICT_LEAD = 'ATENCIÓN:'

/**
 * The slot-conflict warning. It survives the restructure because the operator
 * email is the ONLY surface for the overlap backstop; refund wording is gone
 * (nothing was charged with billing disabled — Decision 5).
 */
function conflictSentence(bookingId: string): string {
  return (
    `Conflicto de franja. Ya existe una reserva (id: ${bookingId}) ` +
    'que solapa este horario. Revisa el calendario antes de la reunión.'
  )
}

/** Grammar-aware duration for the disabled variant only (the frozen enabled
 *  line `${hours} horas` is untouched). */
function directDuration(hours: number): string {
  return hours === 1 ? '1 hora' : `${hours} horas`
}

/** Empty joinUrl returns '' — the CTA branches treat it as "no calendar link",
 *  which also covers the defensive falsy-join path (AC-003-18/24). */
function directCalendarUrl(input: OperatorEmailInput | ClientEmailInput, joinUrl: string): string {
  if (!joinUrl) return ''
  return buildCalendarTemplateUrl({
    date: input.date,
    startTime: input.startTime,
    hours: input.hours,
    title: CALENDAR_TITLE,
    details: `${CALENDAR_DETAILS_PREFIX}${joinUrl}`,
  })
}

function factRows(
  input: { date: string; startTime: string; hours: number },
  timezone: string
): BodyLine[] {
  return [
    { label: 'Fecha', value: input.date },
    { label: `Hora (${timezone})`, value: input.startTime },
    { label: 'Duración', value: directDuration(input.hours) },
  ]
}

/** Text part: html reading order, CTA lines only when a join URL exists,
 *  design-specific trailing line last. Values stay raw (renderText). */
function directTextLines(
  rows: BodyLine[],
  joinUrl: string,
  calendarUrl: string,
  tail: BodyLine[]
): BodyLine[] {
  const ctaLines: BodyLine[] = joinUrl
    ? [
        { label: 'Enlace de la reunión', value: joinUrl },
        { label: CALENDAR_CTA_LABEL, value: calendarUrl },
      ]
    : []
  return [...rows, ...ctaLines, ...tail]
}

function tableHtml(rows: BodyLine[]): string {
  const cells = rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 0;color:#52525b;font-size:14px;">${escapeHtml(r.label ?? '')}</td>` +
        `<td style="padding:6px 0 6px 16px;color:#18181b;font-size:16px;font-weight:600;">${escapeHtml(r.value)}</td></tr>`
    )
    .join('')
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
    'style="width:100%;border-top:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;">' +
    `<tbody>${cells}</tbody></table>`
  )
}

function alertHtml(bookingId: string): string {
  return (
    '<div style="background:#fafafa;border-left:4px solid #b91c1c;padding:12px 16px;margin:0 0 16px;">' +
    `<p style="margin:0;"><strong style="color:#b91c1c;">${CONFLICT_LEAD}</strong> ` +
    `<span style="color:#18181b;">${escapeHtml(conflictSentence(bookingId))}</span></p></div>`
  )
}

/** Bulletproof padding-based button (Litmus pattern, 15-design): one primary
 *  CTA per email; the join URL is attribute-escaped like every dynamic sink. */
function joinButtonHtml(joinUrl: string): string {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;"><tr>' +
    '<td style="background:#18181b;border-radius:12px;padding:14px 24px;text-align:center;">' +
    `<a href="${escapeHtml(joinUrl)}" rel="noopener" ` +
    'style="display:inline-block;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;">' +
    `${JOIN_CTA_LABEL}</a></td></tr></table>`
  )
}

/** Secondary CTA: deliberately a plain text link, visually subordinate to the
 *  button (15-design; Sender/Stripo/Mailsoftly one-primary-CTA rule). */
function calendarLinkHtml(calendarUrl: string): string {
  return (
    '<p style="margin:16px 0 0;">' +
    `<a href="${escapeHtml(calendarUrl)}" rel="noopener" style="color:#52525b;font-size:14px;text-decoration:underline;">` +
    `${CALENDAR_CTA_LABEL}</a></p>`
  )
}

interface DirectEmailModel {
  preheader: string
  heading: string
  intro: string
  alertId: string
  rows: BodyLine[]
  /** Rendered consent-notice paragraphs ('' for the operator variants). */
  notice: string
  joinUrl: string
  calendarUrl: string
  help: string
}

// Shared chrome (15-design §Components): one card, one heading scale, one
// muted paragraph style. The inline-style strings live as named constants so
// the layout function stays a single reading-order map under 20 lines.
const HEADING_STYLE =
  'margin:0 0 16px;font-size:24px;font-weight:bold;line-height:1.2;color:#18181b;'
const INTRO_STYLE = 'margin:0 0 16px;font-size:16px;color:#52525b;'
const HELP_STYLE =
  'margin:24px 0 0;padding-top:16px;border-top:1px solid #e4e4e7;font-size:14px;color:#52525b;'
const WORDMARK_TOP_HTML = `<p style="margin:0 0 12px;font-size:14px;font-weight:bold;color:#18181b;">${WORDMARK}</p>`
const WORDMARK_FOOT_HTML = `<p style="margin:24px 0 0;font-size:13px;color:#71717a;">${WORDMARK}</p>`
const CARD_OPEN =
  '<div style="background:#fafafa;padding:24px 0;">' +
  '<div style="max-width:600px;width:100%;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;' +
  'border-radius:16px;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;' +
  'line-height:1.5;color:#18181b;">'
const CARD_CLOSE = '</div></div>'

/** Reading-order map: preheader → wordmark → H1 → (conflict) → facts → notice →
 *  CTAs → footer. Key facts always precede the CTAs in document order
 *  (AC-003-15/22), and the consent notice sits between them (AC-006-07). */
function renderDirectHtml(m: DirectEmailModel): string {
  const blocks = [
    `<span style="display:none">${escapeHtml(m.preheader)}</span>`,
    WORDMARK_TOP_HTML,
    `<h1 style="${HEADING_STYLE}">${escapeHtml(m.heading)}</h1>`,
    m.intro ? `<p style="${INTRO_STYLE}">${escapeHtml(m.intro)}</p>` : '',
    m.alertId ? alertHtml(m.alertId) : '',
    tableHtml(m.rows),
    m.notice,
    m.joinUrl ? joinButtonHtml(m.joinUrl) + calendarLinkHtml(m.calendarUrl) : '',
    m.help ? `<p style="${HELP_STYLE}">${escapeHtml(m.help)}</p>` : '',
    WORDMARK_FOOT_HTML,
  ].join('')
  return `${CARD_OPEN}${blocks}${CARD_CLOSE}`
}

/**
 * The consent notice as body paragraphs (15-design Task 2): plain 16px copy, not
 * a callout, escaped like every other sink. The English pair carries `lang="en"`
 * so a screen reader switches voice for those two lines inside the Spanish mail;
 * the Spanish path emits no attribute at all.
 */
function noticeHtml(locale: unknown): string {
  const attribute = noticeLangAttribute(locale)
  return consentNotice(locale)
    .map((line) => `<p style="${INTRO_STYLE}"${attribute}>${escapeHtml(line)}</p>`)
    .join('')
}

/** Static chrome per variant; rows/CTAs are filled by the body builders. */
function operatorModel(
  input: OperatorEmailInput,
  rows: BodyLine[],
  joinUrl: string,
  calendarUrl: string
): DirectEmailModel {
  return {
    preheader: OPERATOR_PREHEADER,
    heading: OPERATOR_HEADING,
    intro: '',
    alertId: input.slotConflictWith ?? '',
    rows,
    // Client-facing obligation only: the operator mail never carries the notice.
    notice: '',
    joinUrl,
    calendarUrl,
    help: '',
  }
}

function clientModel(
  rows: BodyLine[],
  joinUrl: string,
  calendarUrl: string,
  locale: unknown
): DirectEmailModel {
  return {
    preheader: CLIENT_PREHEADER,
    heading: CLIENT_HEADING,
    intro: CLIENT_REASSURANCE,
    alertId: '',
    rows,
    notice: noticeHtml(locale),
    joinUrl,
    calendarUrl,
    help: CLIENT_HELP_HTML,
  }
}

export function buildDirectOperatorBody(input: OperatorEmailInput): EmailBody {
  const timezone = getConfiguredTimezone()
  // Locale-free link: the operator mail stays byte-identical for any booking
  // locale (AC-006-31); the client mail is the one that carries `?lang=`.
  const joinUrl = localeFreeJoinUrl(input.joinUrl ?? '')
  const calendarUrl = directCalendarUrl(input, joinUrl)
  const rows: BodyLine[] = [
    ...clientNameRows(input.clientName),
    { label: 'Cliente', value: input.clientEmail },
    ...factRows(input, timezone),
  ]
  const alert: BodyLine[] = input.slotConflictWith
    ? [{ value: `${CONFLICT_LEAD} ${conflictSentence(input.slotConflictWith)}` }]
    : []
  return {
    subject: `Nueva reserva: ${input.date} ${input.startTime} (${timezone})`,
    text: renderText(directTextLines(rows, joinUrl, calendarUrl, alert)),
    html: renderDirectHtml(operatorModel(input, rows, joinUrl, calendarUrl)),
  }
}

export function buildDirectClientBody(input: ClientEmailInput): EmailBody {
  const timezone = getConfiguredTimezone()
  const joinUrl = input.joinUrl ?? ''
  const calendarUrl = directCalendarUrl(input, joinUrl)
  const facts = factRows(input, timezone)
  // Notice after the facts and before the CTAs: the client is told before they
  // can join (AC-006-07/09). It renders whether or not a join URL exists.
  const textRows: BodyLine[] = [
    { value: CLIENT_CONFIRMED_LINE },
    ...facts,
    ...consentNoticeLines(input.locale),
  ]
  const help: BodyLine[] = [{ value: CLIENT_HELP_TEXT }]
  return {
    subject: `Tu reserva está confirmada: ${input.date} ${input.startTime}`,
    text: renderText(directTextLines(textRows, joinUrl, calendarUrl, help)),
    html: renderDirectHtml(clientModel(facts, joinUrl, calendarUrl, input.locale)),
  }
}
