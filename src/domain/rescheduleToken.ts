// Reschedule tokens (spec 007 Task 1). A token is a client CAPABILITY: it travels
// in an email, so it must reveal nothing about the booking it unlocks and must be
// cheap to reject before any Graph call.
//
// Shape, pinned by 10-tasks.md decision 1: 32 random bytes, lowercase hex, 64
// characters, no TTL and no embedded data. Anything else (a hash of booking
// fields, a JWT, a signed id) would either leak booking data or invite a
// "decode the link" habit the opaque form exists to prevent.
import { randomBytes } from 'crypto'

/** The one accepted shape. Anchored: a prefix or a suffix match is not a token. */
export const RESCHEDULE_TOKEN_PATTERN = /^[0-9a-f]{64}$/

/**
 * A fresh token. Takes NO booking field on purpose (AC-007-02): nothing about
 * the client, the room, or the slot can be recovered from the value.
 */
export function generateRescheduleToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Shape check only — it says nothing about whether the token is still live.
 * Callers use it to refuse a malformed candidate before touching the calendar
 * (AC-007-03); liveness is the calendar lookup's job.
 */
export function isValidRescheduleToken(value: unknown): value is string {
  return typeof value === 'string' && RESCHEDULE_TOKEN_PATTERN.test(value)
}
