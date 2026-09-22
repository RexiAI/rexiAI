// Meeting link generation. Meetings are Jitsi rooms: free, personal-account
// compatible, no API, no permissions (Microsoft Graph onlineMeetings is
// work/school-only, so Teams is off the table for the personal hotmail owner).
//
// The room name is random (public Jitsi rooms are reachable by URL), the join
// URL lands in the Stripe session metadata (join_url), the calendar event body
// and both emails — so the recording pipeline can map room → booking via the
// metadata later.

import { randomBytes } from 'crypto'

export interface MeetingInput {
  date: string
  startTime: string
  hours: number
  subject: string
}

export type MeetingResult = { status: 'ok'; joinUrl: string } | { status: 'error'; message: string }

export async function createMeetingLink(_input: MeetingInput): Promise<MeetingResult> {
  const base = (process.env['MEETING_BASE_URL'] || 'https://meet.jit.si').replace(/\/+$/, '')
  const room = `rexi-${randomBytes(8).toString('hex')}`
  return { status: 'ok', joinUrl: `${base}/${room}` }
}
