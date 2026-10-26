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

export interface MeetingInput {
  date: string
  startTime: string
  hours: number
  subject: string
  /** Booking locale; only `'en'` selects English, everything else is `'es'`. */
  locale?: string | null
}

export type MeetingResult = { status: 'ok'; joinUrl: string } | { status: 'error'; message: string }

/** The configured brand, or null when it is missing/unusable (fail loud, never guess). */
export function meetingBaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = (env['MEETING_BASE_URL'] ?? '').replace(/\/+$/, '')
  if (!raw) return null
  try {
    const url = new URL(raw)
    // The join URL is pinned to https: a plain-http brand would make the client
    // page look like the phishing signal this spec exists to remove.
    if (url.protocol !== 'https:') return null
    return raw
  } catch {
    return null
  }
}

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
