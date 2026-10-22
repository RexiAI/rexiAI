// scripts/recording/transcribe.mjs — ASR transcription stage (spec 004 Task 3 / Ask B part 2).
//
// Stripe-free by construction: this module imports nothing Stripe-related and
// reads no STRIPE_* env — transcription works with zero Stripe configuration
// (10-tasks.md Task 3). Retries stay bl's own defaults: no script-level retry
// wrapper (Ask C). The .rexi-transcribed marker is written strictly AFTER the
// stage succeeds; any failure propagates and leaves the directory unmarked.

import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { extractAudio } from './media.mjs'

const ASR_DEFAULT_LANGUAGE = 'es' // Spanish-primary (10-tasks.md decision 9); override via REXI_ASR_LANGUAGE.
export const TRANSCRIBED_MARKER = '.rexi-transcribed'

/** Exact bl 2.4.0 invocation — flags verified against `bl speech recognize --help`. */
export function buildAsrCommand(audioPath, transcriptPath, language) {
  return [
    'bl',
    'speech',
    'recognize',
    '--url',
    audioPath,
    '--diarization',
    '--language',
    language,
    '--out',
    transcriptPath,
  ]
}

/**
 * audio.wav (Task 2) → bl speech recognize → transcript.json + marker.
 * deps: injected execFile-like runner; env: object consulted for
 * REXI_ASR_LANGUAGE only (never process.env directly, for testability).
 */
export async function transcribe({ sessionDir, mp4s, runner, env }) {
  const audioPath = path.join(sessionDir, 'audio.wav')
  const transcriptPath = path.join(sessionDir, 'transcript.json')
  const language = env['REXI_ASR_LANGUAGE'] || ASR_DEFAULT_LANGUAGE

  await extractAudio(runner, mp4s, audioPath)
  const argv = buildAsrCommand(audioPath, transcriptPath, language)
  await runner(argv[0], argv.slice(1))

  // Marker strictly after success (never mark done on failure).
  writeFileSync(transcriptMarkerPath(sessionDir), `${new Date().toISOString()} transcribed\n`)
}

function transcriptMarkerPath(sessionDir) {
  return path.join(sessionDir, TRANSCRIBED_MARKER)
}
