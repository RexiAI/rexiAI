// scripts/recording/bot/session.mjs — the recording lifecycle, minus the I/O.
//
// Spec 006 Task 4 says "the decision is a pure function of the participant list".
// This module is that decision PLACED IN TIME: it turns a stream of participant
// snapshots into start / continue / stop commands for a capture device, and it is
// what makes AC-006-16 (stop when the count drops below two) a real transition
// rather than a single-shot answer.
//
// Why a grace period: a participant list flickers. A dropped websocket, a
// renegotiation, or one client's brief disconnect must not chop a meeting into
// fragments, so the recording keeps running for `graceMs` after the count dips and
// only stops once the dip lasts.
//
// Everything here is injectable (clock, poll, capture, sleep) so the lifecycle is
// unit-testable without a browser, a sound card or a network.

import { BOT_IDENTITY, countNonBotHumans, shouldRecord } from './participants.mjs'

export const DEFAULT_GRACE_MS = 5_000
export const DEFAULT_POLL_INTERVAL_MS = 2_000
export const DEFAULT_IDLE_TIMEOUT_MS = 20 * 60 * 1000
export const DEFAULT_MAX_DURATION_MS = 4 * 60 * 60 * 1000

/**
 * One tick of the lifecycle: what to do now, and what the next tick's state is.
 *
 * @param {{ recording: boolean, belowSinceMs: number | null,
 *   participants: { id: string }[], nowMs: number, graceMs: number,
 *   botIdentity: { id: string } }} input
 * @returns {{ command: 'start' | 'continue' | 'stop' | 'idle', recording: boolean,
 *   belowSinceMs: number | null }}
 */
export function nextStep({
  recording,
  belowSinceMs,
  participants,
  nowMs,
  graceMs,
  botIdentity = BOT_IDENTITY,
}) {
  if (shouldRecord(participants, botIdentity)) {
    return { command: recording ? 'continue' : 'start', recording: true, belowSinceMs: null }
  }
  if (!recording) return { command: 'idle', recording: false, belowSinceMs: null }
  const since = belowSinceMs === null || belowSinceMs === undefined ? nowMs : belowSinceMs
  if (nowMs - since < graceMs) {
    return { command: 'continue', recording: true, belowSinceMs: since }
  }
  return { command: 'stop', recording: false, belowSinceMs: null }
}

/**
 * Why the session should end, if it should: the hard duration cap, or a window
 * that elapsed with nobody in the room.
 *
 * @param {{ nowMs: number, startedAtMs: number, lastHumanSeenMs: number,
 *   idleTimeoutMs: number, maxDurationMs: number }} input
 * @returns {'max-duration' | 'idle-timeout' | null}
 */
export function endReason({ nowMs, startedAtMs, lastHumanSeenMs, idleTimeoutMs, maxDurationMs }) {
  if (nowMs - startedAtMs >= maxDurationMs) return 'max-duration'
  if (nowMs - lastHumanSeenMs >= idleTimeoutMs) return 'idle-timeout'
  return null
}

/**
 * Apply a step's command to the capture device.
 *
 * @param {{ command: string, capture: { start: Function, stop: Function } }} input
 * @returns {Promise<object | null>} the finalized artifact when the capture stopped
 */
export async function applyStep({ command, capture }) {
  if (command === 'start') await capture.start()
  if (command === 'stop') return capture.stop()
  return null
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Drive a session to completion.
 *
 * Returns `{ reason, artifact }`: `reason` is `'threshold'` when the count dropped
 * below two, `'idle-timeout'` when nobody ever joined, `'max-duration'` when the
 * cap fired; `artifact` is whatever `capture.stop()` produced (null when nothing
 * was recorded).
 *
 * @param {{ poll: () => Promise<{ id: string }[]>,
 *   capture: { start: Function, stop: Function },
 *   now?: () => number, sleep?: (ms: number) => Promise<void>, graceMs?: number,
 *   intervalMs?: number, idleTimeoutMs?: number, maxDurationMs?: number,
 *   botIdentity?: { id: string } }} input
 */
export async function runSession({
  poll,
  capture,
  now = () => Date.now(),
  sleep = defaultSleep,
  graceMs = DEFAULT_GRACE_MS,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
  botIdentity = BOT_IDENTITY,
}) {
  const startedAtMs = now()
  let lastHumanSeenMs = startedAtMs
  let state = { recording: false, belowSinceMs: null }

  for (;;) {
    const participants = await poll()
    const nowMs = now()
    if (countNonBotHumans(participants, botIdentity) > 0) lastHumanSeenMs = nowMs
    const step = nextStep({ ...state, participants, nowMs, graceMs, botIdentity })
    state = { recording: step.recording, belowSinceMs: step.belowSinceMs }
    const artifact = await applyStep({ command: step.command, capture })
    if (artifact) return { reason: 'threshold', artifact }
    const reason = endReason({ nowMs, startedAtMs, lastHumanSeenMs, idleTimeoutMs, maxDurationMs })
    if (reason) return await finish({ reason, capture, recording: state.recording })
    await sleep(intervalMs)
  }
}

/** End a session that ran out of time, finalizing anything already being recorded. */
async function finish({ reason, capture, recording }) {
  if (recording) {
    const artifact = await capture.stop()
    return { reason, artifact }
  }
  return { reason, artifact: null }
}
