// AC-006 Task 5: the bot's output lands in RECORDINGS_DIR in the exact shape the
// UNCHANGED processor (scripts/recording/*) already understands: a per-session
// directory holding a muxed .mp4 with an audio stream, room derivable.
// Acceptance tests per
// specs/006-branded-meeting-link-and-recording-bot/20-acceptance/AC-006-recording-output.md
import { execFile, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { hasAudioStream } from '../../scripts/recording/billing.mjs'
import { finalizeRecording, sessionStamp } from '../../scripts/recording/bot/output.mjs'
import { processSessionDir } from '../../scripts/recording/pipeline.mjs'

import { captureLog, ffprobeBehavior, makeFetch, makeRunner, mkTmpDir, rmTmpDir } from './recording-harness'
import type { Call } from './recording-harness'

const execFileAsync = promisify(execFile)
const ROOM = 'rexi-0123456789abcdef'
const STAMP = new Date('2026-10-21T10:00:00Z')

const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    execFileSync('ffprobe', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

const realRunner = async (cmd: string, args: string[]) => {
  const { stdout } = await execFileAsync(cmd, args)
  return { stdout: String(stdout) }
}

/** Runner whose ffmpeg call writes the output file (the mux's only side effect we
 *  need), and whose ffprobe reports a real audio stream. */
function simulatedRunner(audio = true) {
  return makeRunner((call: Call) => {
    if (call.cmd === 'ffmpeg') {
      fs.writeFileSync(call.args[call.args.length - 1], 'muxed')
      return { stdout: '' }
    }
    return ffprobeBehavior({ duration: () => 60, audio: () => audio })(call)
  })
}

let base: string
beforeAll(() => {
  base = mkTmpDir('rexi-006-output-')
})
afterAll(() => {
  rmTmpDir(base)
})

describe('AC-006 recording output', () => {
  it('AC-006-18: the finalized recording is an .mp4 under RECORDINGS_DIR', async () => {
    const recordings = path.join(base, 'AC-006-18')
    const audioPath = path.join(base, 'capture-18.wav')
    fs.writeFileSync(audioPath, 'audio')
    const { runner, calls } = simulatedRunner()

    const result = await finalizeRecording({
      room: ROOM,
      audioPath,
      env: { RECORDINGS_DIR: recordings },
      runner,
      now: STAMP,
      log: captureLog().log,
    })

    expect(result.ok).toBe(true)
    expect(result.file.startsWith(recordings + path.sep)).toBe(true)
    expect(fs.existsSync(result.file)).toBe(true)
    expect(result.file.endsWith('.mp4')).toBe(true)
    expect(fs.statSync(result.file).isFile()).toBe(true)
    // One mux call, one verification probe: nothing else is spawned.
    expect(calls.filter((c) => c.cmd === 'ffmpeg')).toHaveLength(1)
    expect(calls.filter((c) => c.cmd === 'ffprobe')).toHaveLength(1)
    // The audio source is an input of the mux; the container is MP4.
    const ffmpegCall = calls.find((c) => c.cmd === 'ffmpeg') as Call
    expect(ffmpegCall.args).toContain(audioPath)
    expect(ffmpegCall.args).toContain('-c:a')
    expect(ffmpegCall.args[ffmpegCall.args.length - 1]).toBe(result.file)
    expect(sessionStamp(STAMP)).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/)
  })

  it('AC-006-19: the finalized recording reports an audio stream to ffprobe', async () => {
    const recordings = path.join(base, 'AC-006-19')
    const audioPath = path.join(base, 'capture-19.wav')
    fs.writeFileSync(audioPath, 'audio')
    const { runner } = simulatedRunner(true)

    const result = await finalizeRecording({
      room: ROOM,
      audioPath,
      env: { RECORDINGS_DIR: recordings },
      runner,
      now: STAMP,
      log: captureLog().log,
    })

    // Probed through the processor's own hasAudioStream (codec_type=audio present).
    expect(await hasAudioStream(runner, result.file)).toBe(true)

    // A silent mux is refused: it never becomes a "ready" recording.
    const silent = await finalizeRecording({
      room: ROOM,
      audioPath,
      env: { RECORDINGS_DIR: path.join(base, 'AC-006-19-silent') },
      runner: simulatedRunner(false).runner,
      now: STAMP,
      log: captureLog().log,
    })
    expect(silent.ok).toBe(false)
  })

  it.skipIf(!hasFfmpeg)(
    'AC-006-19: a real muxed .mp4 really carries an audio stream (real ffmpeg/ffprobe)',
    async () => {
      const recordings = path.join(base, 'AC-006-19-real')
      const audioPath = path.join(base, 'capture-real.wav')
      await realRunner('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=1',
        audioPath,
      ])

      const result = await finalizeRecording({
        room: ROOM,
        audioPath,
        env: { RECORDINGS_DIR: recordings },
        runner: realRunner,
        now: STAMP,
        log: captureLog().log,
      })

      expect(result.ok).toBe(true)
      const probe = await execFileAsync('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'a',
        '-show_entries',
        'stream=codec_type',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        result.file,
      ])
      expect(String(probe.stdout)).toContain('audio')
    },
    30_000
  )

  it('AC-006-20: the unchanged pipeline derives the same room from the recording', async () => {
    const recordings = path.join(base, 'AC-006-20')
    const audioPath = path.join(base, 'capture-20.wav')
    fs.writeFileSync(audioPath, 'audio')
    const { runner } = simulatedRunner(true)

    const result = await finalizeRecording({
      room: ROOM,
      audioPath,
      env: { RECORDINGS_DIR: recordings },
      runner,
      now: STAMP,
      log: captureLog().log,
    })

    // Jibri-shaped session dir: <room>_<stamp>/ holding the mp4 + metadata.json.
    expect(path.basename(result.dir)).toBe(`${ROOM}_${sessionStamp(STAMP)}`)
    const metadata = JSON.parse(fs.readFileSync(path.join(result.dir, 'metadata.json'), 'utf8'))
    expect(metadata.meeting_url).toBe(`https://meet.jit.si/${ROOM}`)

    // Run the REAL pipeline (unmodified) in dry-run: it must log the derived room.
    const { lines, log } = captureLog()
    const deps = {
      runner: simulatedRunner(true).runner,
      fetch: makeFetch(() => ({ status: 200, body: { data: [], has_more: false } })).fetch,
    }
    await processSessionDir({ dir: result.dir, dryRun: true, env: {}, deps, log })

    expect(lines.join('\n')).toContain(`room: ${ROOM}`)
    // The bot writes no pipeline markers: those belong to the processor alone.
    for (const marker of ['.rexi-billed', '.rexi-transcribed', '.rexi-analyzed']) {
      expect(fs.existsSync(path.join(result.dir, marker))).toBe(false)
    }
  })

  describe('unit: finalize failure and layout boundaries', () => {
    it('a failing mux reports ok:false and writes no metadata', async () => {
      const recordings = path.join(base, 'unit-mux-fail')
      const audioPath = path.join(base, 'capture-fail.wav')
      fs.writeFileSync(audioPath, 'audio')
      const { runner } = makeRunner((call: Call) =>
        call.cmd === 'ffmpeg' ? { fail: true } : { stdout: '' }
      )

      const result = await finalizeRecording({
        room: ROOM,
        audioPath,
        env: { RECORDINGS_DIR: recordings },
        runner,
        now: STAMP,
        log: captureLog().log,
      })

      expect(result.ok).toBe(false)
      expect(fs.existsSync(path.join(result.dir, 'metadata.json'))).toBe(false)
    })

    it('the output directory is created when RECORDINGS_DIR does not exist yet', async () => {
      const recordings = path.join(base, 'unit-missing-root')
      const audioPath = path.join(base, 'capture-missing.wav')
      fs.writeFileSync(audioPath, 'audio')

      const result = await finalizeRecording({
        room: ROOM,
        audioPath,
        env: { RECORDINGS_DIR: recordings },
        runner: simulatedRunner(true).runner,
        now: STAMP,
        log: captureLog().log,
      })

      expect(result.ok).toBe(true)
      expect(fs.existsSync(recordings)).toBe(true)
    })
  })
})
