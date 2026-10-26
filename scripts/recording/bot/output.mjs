// scripts/recording/bot/output.mjs — where and how a finished recording lands.
//
// Spec 006 Task 5. The bot's job ends at "a recording exists in RECORDINGS_DIR in
// a format process-recording.mjs already handles": the existing sweep is NOT
// modified and none of its three idempotency markers are written here.
//
// The layout is Jibri's, because that is what the processor already understands:
//   <RECORDINGS_DIR>/<room>_<YYYY-MM-DD-HH-MM-SS>/
//       <room>_<YYYY-MM-DD-HH-MM-SS>.mp4     muxed MP4, audio stream present
//       metadata.json                        {"meeting_url": "https://meet.jit.si/<room>"}
// One directory per session is what scanAll() iterates; a bare .mp4 in the root
// would never be picked up (only directories are swept).
//
// The container is MP4 because `listMp4Files`/`findMp4` accept only `.mp4`, and
// the audio stream is what the transcription stage extracts.

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { hasAudioStream } from '../billing.mjs'

import { botRecordingsDir } from './config.mjs'

// Must match REAL_MEETING_HOST in src/domain/meeting.ts. Plain ESM here cannot
// import the TypeScript module, so the constant is duplicated deliberately: it is
// the fixed public Jitsi host, not configuration.
const MEET_JITSI_BASE = 'https://meet.jit.si'

const AUDIO_BITRATE = '128k'

/** Jibri-shaped stamp `YYYY-MM-DD-HH-MM-SS` (UTC), for the session directory/file. */
export function sessionStamp(date = new Date()) {
  const iso = date.toISOString()
  return `${iso.slice(0, 10)}-${iso.slice(11, 19).replace(/:/g, '-')}`
}

/** The per-session directory the processor sweeps: `<RECORDINGS_DIR>/<room>_<stamp>`. */
export function sessionDirFor({ room, stamp, env }) {
  return path.join(botRecordingsDir(env), `${room}_${stamp}`)
}

/**
 * ffmpeg argv that muxes the captured audio into an MP4 container. `-vn` keeps a
 * video stream out (this is an audio recording); the output path is last so the
 * caller can assert on the single artifact.
 */
export function buildMuxCommand(audioPath, outFile) {
  return [
    'ffmpeg',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    audioPath,
    '-vn',
    '-c:a',
    'aac',
    '-b:a',
    AUDIO_BITRATE,
    outFile,
  ]
}

function writeMetadata({ dir, room }) {
  const metadata = { meeting_url: `${MEET_JITSI_BASE}/${room}` }
  writeFileSync(path.join(dir, 'metadata.json'), `${JSON.stringify(metadata)}\n`)
}

/**
 * Mux the captured audio into the pipeline-ready layout. Returns `{ ok, dir, file }`;
 * `ok: false` means the mux failed or the output has no audio stream, in which case
 * no metadata.json is written and the directory is NOT a usable recording.
 *
 * @param {{ room: string, audioPath: string, env: Record<string, string|undefined>,
 *   runner: (cmd: string, args: string[]) => Promise<{ stdout?: string }>,
 *   now?: Date, log?: { log: Function, error: Function } }} input
 */
export async function finalizeRecording({
  room,
  audioPath,
  env,
  runner,
  now = new Date(),
  log = console,
}) {
  const dir = sessionDirFor({ room, stamp: sessionStamp(now), env })
  const file = path.join(dir, `${path.basename(dir)}.mp4`)

  try {
    mkdirSync(dir, { recursive: true })
    const argv = buildMuxCommand(audioPath, file)
    await runner(argv[0], argv.slice(1))
  } catch (err) {
    log.error(`[recording-bot] mux failed for ${room}: ${err instanceof Error ? err.message : err}`)
    return { ok: false, dir, file }
  }

  // A silent capture would be billed and skipped downstream; refuse it here so a
  // "finalized" recording always has the audio the pipeline expects.
  const audio = await hasAudioStream(runner, file)
  if (!audio) {
    log.error(`[recording-bot] muxed output has no audio stream: ${file}`)
    return { ok: false, dir, file }
  }

  writeMetadata({ dir, room })
  log.log(`[recording-bot] recording ready: ${file}`)
  return { ok: true, dir, file }
}
