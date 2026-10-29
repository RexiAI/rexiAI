// Meeting link generation (spec 006 Task 1). Meetings are Jitsi rooms: free,
// personal-account compatible, no API, no permissions.
//
// TWO urls, ONE room (10-tasks.md decision 1): the CLIENT-FACING join URL lives on
// the brand (MEETING_BASE_URL, e.g. https://meet.rexi-ai.com) and carries the
// booking's locale as `?lang=`; the REAL room stays on meet.jit.si (see
// meetingUrl.ts). The room segment is identical in both, so the recording
// pipeline's room → booking mapping (pipeline.mjs deriveRoom / billing.mjs
// findReservationByRoom) is untouched.
//
// The old silent `|| 'https://meet.jit.si'` fallback is gone: with no brand
// configured this returns an error result instead of pointing every booking at a
// public room nobody records (decision 2 / AC-006-04).

import { randomBytes } from 'crypto'

import { normalizeLocale } from './locale.js'
import { meetingBaseUrl } from './meetingUrl.js'

// The brand's URL-shape helper now lives in the meetingUrl leaf module so the
// email path can use it without touching this file (see meetingUrl.ts); the
// re-export keeps meeting.ts's documented surface unchanged.
export { meetingBaseUrl }

export interface MeetingInput {
  date: string
  startTime: string
  hours: number
  subject: string
  /** Booking locale; only `'en'` selects English, everything else is `'es'`. */
  locale?: string | null
}

export type MeetingResult = { status: 'ok'; joinUrl: string } | { status: 'error'; message: string }

export async function createMeetingLink(input: MeetingInput): Promise<MeetingResult> {
  const base = meetingBaseUrl()
  if (!base) {
    return {
      status: 'error',
      message: 'MEETING_BASE_URL is not configured; refusing to fall back to a public Jitsi room',
    }
  }
  const room = `rexi-${randomBytes(8).toString('hex')}`
  return { status: 'ok', joinUrl: `${base}/${room}?lang=${normalizeLocale(input.locale)}` }
}
