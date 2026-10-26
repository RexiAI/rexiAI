// scripts/recording/bot/participants.mjs — who counts, and when to record.
//
// Spec 006 Tasks 3-4. Both units are PURE (no I/O, no clock): the caller feeds the
// room's participant list and gets an answer, which is what makes the recording
// threshold unit-testable.
//
// The bot is one participant in the room it records. It is excluded by IDENTITY
// (10-tasks.md decision 4): a human who happens to be called "Rexi Recorder" is a
// different participant and is still counted. Never widen this to a display-name
// match — that silently drops real clients from the count.

/** The bot's own identity. Stable, distinct, and the only value ever excluded. */
export const BOT_IDENTITY = Object.freeze({ id: 'rexi-recorder', displayName: 'Rexi Recorder' })

/** Two humans make a meeting; one human plus the bot is not one. */
export const RECORD_THRESHOLD = 2

/**
 * @param {{ id: string, displayName?: string }[]} participants
 * @param {{ id: string, displayName?: string }} botIdentity
 * @returns {boolean}
 */
export function isBot(participant, botIdentity) {
  return Boolean(participant) && participant.id === botIdentity.id
}

/**
 * Non-bot humans in the room: everyone whose identity is not the bot's own.
 * Counting is by identity, so display names never participate in the decision.
 *
 * @param {{ id: string, displayName?: string }[]} participants
 * @param {{ id: string, displayName?: string }} botIdentity
 * @returns {number}
 */
export function countNonBotHumans(participants, botIdentity) {
  const list = participants || []
  return list.filter((p) => !isBot(p, botIdentity)).length
}

/** Record iff at least two non-bot humans are present. */
export function shouldRecord(participants, botIdentity) {
  return countNonBotHumans(participants, botIdentity) >= RECORD_THRESHOLD
}

/**
 * The transition the recorder must take, given whether it is already recording:
 * 'start' | 'continue' | 'stop' | 'idle'.
 *
 * The bot's own join/leave cannot move this decision: its own participant is
 * excluded from the count on both sides of the transition.
 *
 * @param {{ recording?: boolean, participants: { id: string }[], botIdentity: { id: string } }} input
 * @returns {'start' | 'continue' | 'stop' | 'idle'}
 */
export function recordingAction({ recording = false, participants, botIdentity }) {
  const wanted = shouldRecord(participants, botIdentity)
  if (wanted) return recording ? 'continue' : 'start'
  return recording ? 'stop' : 'idle'
}
