// scripts/recording/bot/config.mjs — the bot's ONE recordings-location knob.
//
// Spec 006 Task 6: one setting drives where the bot writes and where the
// processor scans, so there is no second copy to drift. The value is resolved by
// the processor's own `recordingsDirFrom` (RECORDINGS_DIR, else the shared
// default), never re-implemented here: this module deliberately reads no
// environment key of its own and knows no other path variable. Reconfiguring the
// single knob therefore moves both sides at once (AC-006-21/22/23).

import { recordingsDirFrom } from '../pipeline.mjs'

/**
 * Where the bot writes finished recordings — the exact directory the processor
 * sweeps.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
export function botRecordingsDir(env) {
  return recordingsDirFrom(env || {})
}
