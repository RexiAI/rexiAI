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

// Local Whisper ASR (spec 006 fallback) — replaces `bl speech recognize`, which
// 401s on the credential-free systemd service env. Resolved against the repo
// root (recording-cron.sh cd's to the repo root before running the pipeline).
export const WHISPER_SCRIPT = path.join(
  process.cwd(),
  'scripts',
  'recording',
  'whisper_transcribe.py'
)

/** Local Whisper ASR invocation (spec 006 fallback). Offline, credential-free.
 * Output shape ({language, segments:[{start,end,text}]}) is flattened to plain
 * text by insight.mjs's extractTranscriptText. */
export function buildAsrCommand(audioPath, transcriptPath, language) {
  return ['python3', WHISPER_SCRIPT, audioPath, transcriptPath, language]
}

/**
 * audio.wav (Task 2) → local Whisper (faster-whisper) → transcript.json + marker.
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
