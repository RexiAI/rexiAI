// URL shapes for a meeting room (spec 006 Task 1): the real Jitsi room, the room
// name inside a join URL, and the locale-free variant for operator mail.
//
// Leaf module on purpose. `meeting.ts` is mocked wholesale by older booking tests
// (`vi.mock('../domain/meeting', () => ({ createMeetingLink }))`), so anything the
// EMAIL path needs must not live there — a mock that only supplies
// `createMeetingLink` would make these helpers undefined at render time.

/** Where the call actually happens. Fixed per the spec: the bot joins meet.jit.si. */
export const REAL_MEETING_HOST = 'https://meet.jit.si'

const ROOM_PATTERN = /^rexi-[0-9a-f]{16}$/

/** The real meet.jit.si room for a room name: no query, no fragment, never the brand. */
export function realRoomUrl(room: string): string {
  return `${REAL_MEETING_HOST}/${room}`
}

/**
 * Room name from the last path segment of a join URL (query and trailing slashes
 * stripped), or null when that segment is not a `rexi-<16 hex>` room.
 */
export function roomFromJoinUrl(joinUrl: string): string | null {
  try {
    const { pathname } = new URL(joinUrl)
    const segment = pathname.replace(/\/+$/, '').split('/').pop() ?? ''
    return ROOM_PATTERN.test(segment) ? segment : null
  } catch {
    return null
  }
}

/** True when a string is a well-formed room name (lowercase hex only). */
export function isRoomName(value: string): boolean {
  return ROOM_PATTERN.test(value)
}

/**
 * The same join URL without its `lang` parameter. Operator emails carry this so
 * they stay byte-identical for any booking locale (AC-006-31): the locale is a
 * client-presentation concern and the operator link can fall back to the Spanish
 * default like any other unparameterised URL.
 */
export function localeFreeJoinUrl(joinUrl: string): string {
  try {
    const url = new URL(joinUrl)
    url.searchParams.delete('lang')
    return url.toString().replace(/\?$/, '')
  } catch {
    return joinUrl
  }
}
