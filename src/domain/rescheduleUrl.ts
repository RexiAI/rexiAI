// The reschedule link (spec 007 Task 7):
//
//   ${MEETING_BASE_URL}/reschedule/<64 lowercase hex>[?lang=es|en]
//
// Everything the URL may reveal is pinned by AC-007-37: the opaque token and the
// presentation locale, nothing else. No email, no bookingId, no room, no date,
// no time — a forwarded screenshot of the link must not identify the booking.
//
// Leaf module, for the same reason meetingUrl.ts is one: the EMAIL builders need
// it and `meeting.ts` is mocked wholesale by older booking tests.
import { normalizeLocale } from './locale.js'
import { meetingBaseUrl } from './meetingUrl.js'
import { isValidRescheduleToken } from './rescheduleToken.js'

/**
 * The link for a token, or null when there is nothing honest to build it from:
 * a malformed token, or no configured brand. A null means the caller omits the
 * link entirely — never a guessed host.
 */
export function rescheduleUrl(
  token: string,
  locale?: unknown,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  if (!isValidRescheduleToken(token)) return null
  const base = meetingBaseUrl(env)
  if (!base) return null
  return `${base}/reschedule/${token}?lang=${normalizeLocale(locale)}`
}

/**
 * The same link for whatever token a caller happens to hold, or null when it
 * holds none. An absent token means the caller OMITS the line — never an empty
 * href — which is how a booking made before this feature keeps its old body.
 */
export function rescheduleLink(token: string | null | undefined, locale?: unknown): string | null {
  return token ? rescheduleUrl(token, locale) : null
}
