// Reschedule notification bodies (spec 007 Task 6). Built on the same card and
// the same locked strings as the booking mails — one visual language, no second
// renderer — and with spec 006's locale rule: the client body stays Spanish and
// only the recording-consent notice localises.
//
// The operator mail is internal and terse: no wordmark CTA, no consent notice,
// no reschedule link or token (AC-007-30/38). The client mail never shows the
// OLD slot (the client knows what they asked to move) and never shows a count.
import { consentNoticeLines } from './consentNotice.js'
import {
  CLIENT_HELP_TEXT,
  JOIN_CTA_LABEL,
  RESCHEDULE_LINK_LABEL,
  RESCHEDULE_LEAD,
  directDuration,
  factRows,
  noticeHtml,
  renderDirectHtml,
  rescheduleHtml,
  type EmailBody,
} from './emailDirect.js'
import { renderText, type BodyLine } from './emailHtml.js'
import { localeFreeJoinUrl, withLocale } from './meetingUrl.js'
import { rescheduleLink } from './rescheduleUrl.js'
import { getConfiguredTimezone } from './time.js'

export interface RescheduleOperatorInput {
  clientEmail: string
  /** The slot the meeting was at before this move. */
  oldDate: string
  oldStartTime: string
  /** The slot it is at now. */
  date: string
  startTime: string
  hours: number
  bookingId: string
  joinUrl?: string | null
  /** The reschedule count AFTER this move. */
  count: number
}

export interface RescheduleClientInput {
  clientEmail: string
  date: string
  startTime: string
  hours: number
  joinUrl?: string | null
  locale?: string | null
  /** The ROTATED token: the link in this mail is the client's only live one. */
  rescheduleToken?: string | null
}

export interface LimitBlockedOperatorInput {
  clientEmail: string
  bookingId: string
  /** Where the meeting currently is. */
  date: string
  startTime: string
  count: number
  /** What the client asked for and did not get. */
  requestedDate: string
  requestedStartTime: string
}

const OPERATOR_HEADING = 'Reunión movida'
const OPERATOR_PREHEADER = 'Cambio de hora hecho por el cliente.'
const LIMIT_HEADING = 'Intento de cambio bloqueado'
const LIMIT_PREHEADER = 'El cliente intentó mover la reunión y se rechazó por límite.'
const LIMIT_SENTENCE = 'El cliente ha intentado mover la reunión y se ha rechazado por límite.'
const CLIENT_HEADING = 'Tu reunión se ha movido'
const CLIENT_PREHEADER = 'La nueva hora de tu reunión, en este correo.'
const CLIENT_INTRO = 'Tu reunión con RexiAI tiene una nueva hora.'

/** `date` + `startTime` in one cell, so "before" and "after" read as slots. */
function slot(date: string, startTime: string): string {
  return `${date} ${startTime}`
}

function operatorRows(input: RescheduleOperatorInput): BodyLine[] {
  const rows: BodyLine[] = [
    { label: 'Cliente', value: input.clientEmail },
    { label: 'Antes', value: slot(input.oldDate, input.oldStartTime) },
    { label: 'Ahora', value: slot(input.date, input.startTime) },
    { label: 'Duración', value: directDuration(input.hours) },
    { label: 'Reserva', value: input.bookingId },
  ]
  if (input.joinUrl) {
    // Locale-free: the operator mail never varies with the booking locale.
    rows.push({ label: 'Enlace', value: localeFreeJoinUrl(input.joinUrl) })
  }
  rows.push({ label: 'Cambios', value: String(input.count) })
  return rows
}

/**
 * The operator card: preheader, heading, an optional intro and the fact rows —
 * and no notice, no join button, no calendar CTA, no help line. Operator mail is
 * internal and terse (AC-007-30/38), so those empties are stated once here rather
 * than at every call site that builds an operator body.
 */
function operatorCard(spec: {
  preheader: string
  heading: string
  intro: string
  rows: BodyLine[]
}): string {
  return renderDirectHtml({
    preheader: spec.preheader,
    heading: spec.heading,
    intro: spec.intro,
    alertId: '',
    rows: spec.rows,
    notice: '',
    joinUrl: '',
    calendarUrl: '',
    help: '',
  })
}

export function buildRescheduleOperatorBody(input: RescheduleOperatorInput): EmailBody {
  const rows = operatorRows(input)
  return {
    subject: `Reunión movida: ${input.clientEmail} - de ${slot(input.oldDate, input.oldStartTime)} a ${slot(input.date, input.startTime)}`,
    text: renderText(rows),
    html: operatorCard({
      preheader: OPERATOR_PREHEADER,
      heading: OPERATOR_HEADING,
      intro: '',
      rows,
    }),
  }
}

export function buildLimitBlockedOperatorBody(input: LimitBlockedOperatorInput): EmailBody {
  const rows: BodyLine[] = [
    { label: 'Cliente', value: input.clientEmail },
    { label: 'Reserva', value: input.bookingId },
    { label: 'Reunión', value: slot(input.date, input.startTime) },
    { label: 'Cambios', value: String(input.count) },
    { label: 'Pedido', value: slot(input.requestedDate, input.requestedStartTime) },
  ]
  return {
    subject: `Reschedule bloqueado: ${input.clientEmail} - límite alcanzado`,
    text: renderText([...rows, { value: LIMIT_SENTENCE }]),
    html: operatorCard({
      preheader: LIMIT_PREHEADER,
      heading: LIMIT_HEADING,
      intro: LIMIT_SENTENCE,
      rows,
    }),
  }
}

/**
 * Spanish body + localised notice (decision D7): the subject, heading, facts,
 * help and CTA labels never translate; only the consent notice does, and only
 * the join URL carries the locale.
 */
export function buildRescheduleClientBody(input: RescheduleClientInput): EmailBody {
  const timezone = getConfiguredTimezone()
  const facts = factRows(input, timezone)
  const joinUrl = input.joinUrl ? withLocale(input.joinUrl, input.locale) : ''
  const link = rescheduleLink(input.rescheduleToken, input.locale)

  const body: BodyLine[] = [{ value: CLIENT_INTRO }, ...facts, ...consentNoticeLines(input.locale)]
  const ctas: BodyLine[] = joinUrl ? [{ label: JOIN_CTA_LABEL, value: joinUrl }] : []
  const reschedule = link ? [{ value: `${RESCHEDULE_LEAD}${RESCHEDULE_LINK_LABEL}: ${link}` }] : []

  return {
    subject: `Tu reunión se ha movido: ${slot(input.date, input.startTime)}`,
    text: renderText([...body, ...ctas, ...reschedule, { value: CLIENT_HELP_TEXT }]),
    html: renderDirectHtml({
      preheader: CLIENT_PREHEADER,
      heading: CLIENT_HEADING,
      intro: CLIENT_INTRO,
      alertId: '',
      rows: facts,
      notice: noticeHtml(input.locale),
      joinUrl,
      calendarUrl: '',
      reschedule: link ? rescheduleHtml(link) : '',
      help: CLIENT_HELP_TEXT,
    }),
  }
}
