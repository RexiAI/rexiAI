// scripts/recording/media.mjs — session media collection + audio extraction
// (spec 004 Task 2 / Ask B part 1). Pure, injectable, zero npm deps, no import
// side effects (docs/SPEC_PIPELINE.md information contract + 10-tasks.md
// §Global constraints): everything external goes through the injected runner.

import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const AUDIO_SAMPLE_RATE = '16000' // 16 kHz mono PCM — the ASR-friendly shape for bl speech recognize.

/**
 * Every *.mp4 inside a Jibri session directory, filename-ascending.
 * Jibri's `<room>_<YYYY-MM-DD-HH-MM-SS>.mp4` naming makes lexicographic order
 * equal chronological order, so a resumed meeting concatenates in true order.
 * Boundaries (AC-004-23): single file → one element; none → []; a path that is
 * itself an .mp4 (one-off mode) → that file — mirroring the entry script's
 * file-mode findMp4, which otherwise stays untouched for billing.
 */
export function collectSessionMp4s(target) {
  if (!target || !existsSync(target)) return []
  if (statSync(target).isFile()) return target.endsWith('.mp4') ? [target] : []
  return listMp4Files(target).sort()
}

/** *.mp4 file paths inside a directory, in readdir order (caller sorts).
 *  The single definition of "what counts as a session mp4" — billing's
 *  newest-first probe and transcription's chronological collection both
 *  derive from this and only differ in the sort they apply. */
export function listMp4Files(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.mp4'))
    .map((f) => path.join(dir, f))
    .filter((f) => statSync(f).isFile())
}

// ffmpeg argv for the whole extraction: -vn (never a video stream in the
// output), every input covered in collection order, exactly one output path.
// -y (overwrite without asking) sits before the output, ffmpeg-global
// position: the output path (audio.wav) persists across stage failures, and
// execFile gives ffmpeg no stdin — a re-sweep retry would otherwise block
// forever on ffmpeg's interactive "File exists. Overwrite?" prompt
// (live e2e defect D2: a post-ASR-failure re-run hung the whole scan).
export function buildAudioExtractCommand(mp4s, outPath) {
  const inputs = mp4s.flatMap((mp4) => ['-i', mp4])
  const audioOut = ['-vn', '-ac', '1', '-ar', AUDIO_SAMPLE_RATE]
  const globals = ['-hide_banner', '-loglevel', 'error', '-y']
  if (mp4s.length <= 1) {
    return ['ffmpeg', ...globals, ...inputs, ...audioOut, outPath]
  }
  // Multiple segments (resumed meeting): concat filter keeps collection order.
  const refs = mp4s.map((_, i) => `[${i}:a]`).join('')
  const filter = `${refs}concat=n=${mp4s.length}:v=0:a=1[a]`
  return [
    'ffmpeg',
    ...globals,
    ...inputs,
    '-filter_complex',
    filter,
    '-map',
    '[a]',
    ...audioOut,
    outPath,
  ]
}

/** Run the extraction through the injected execFile-like runner. */
export async function extractAudio(runner, mp4s, outPath) {
  const argv = buildAudioExtractCommand(mp4s, outPath)
  return runner(argv[0], argv.slice(1))
}
