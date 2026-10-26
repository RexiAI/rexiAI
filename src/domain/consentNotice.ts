// Recording-consent notice (spec 006 Task 2). Two frozen pairs, one selector —
// never a translation call, never an interpolated string. The wording is pinned
// by specs/006/15-design.md Task 2 and AC-006-27/28:
//   es — the default and the exact design copy
//   en — the two-line translation (decision 11: "recorded as audio")
//
// Placement (before the join link, in text and HTML, in both client variants) is
// the email builders' concern; this module only supplies the lines.
import type { BodyLine } from './emailHtml.js'
import { normalizeLocale, type Locale } from './locale.js'

export const NOTICE_ES: readonly [string, string] = [
  'Aviso de grabación: la reunión se graba en audio.',
  'Usamos la grabación para documentar la sesión. Si prefieres que no se grabe, responde a este correo antes de la reunión.',
]

export const NOTICE_EN: readonly [string, string] = [
  'Recording notice: this meeting is recorded as audio.',
  'We use the recording to document the session. If you prefer it not to be recorded, reply to this email before the meeting.',
]

/** The pair for a booking locale; Spanish for anything unrecognised. */
export function consentNotice(locale?: unknown): readonly [string, string] {
  return normalizeLocale(locale) === 'en' ? NOTICE_EN : NOTICE_ES
}

/** The pair as renderer lines, so text and HTML share one insertion point. */
export function consentNoticeLines(locale?: unknown): BodyLine[] {
  const [line1, line2] = consentNotice(locale)
  return [{ value: line1 }, { value: line2 }]
}

/** The `lang` attribute value for the notice block: only English carries one. */
export function noticeLangAttribute(locale?: unknown): string {
  const normalised: Locale = normalizeLocale(locale)
  return normalised === 'en' ? ' lang="en"' : ''
}
