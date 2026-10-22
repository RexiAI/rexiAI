// Task 3 (Ask B part 2): ASR transcription stage.
// Acceptance tests per specs/004-auto-record-transcribe-insights/20-acceptance/AC-004-transcription.md
import fs from 'node:fs'

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import { buildAudioExtractCommand } from '../../scripts/recording/media.mjs'
import { buildAsrCommand, transcribe } from '../../scripts/recording/transcribe.mjs'

import {
  makeRunner,
  blProducesOut,
  argvList,
  mkTmpDir,
  rmTmpDir,
  writeFile,
  exists,
} from './recording-harness.ts'

let base: string
beforeAll(() => {
  base = mkTmpDir()
})
afterAll(() => {
  rmTmpDir(base)
})

function sessionWithMp4(): string {
  const dir = fs.mkdtempSync(`${base}/tr-`)
  writeFile(dir, 'rexi-abc_2026-10-21-10-00-00.mp4')
  return dir
}

/** Runner fake where bl plays its own side effect: produce the --out target. */
function blProducesOutRunner() {
  return makeRunner((call) => blProducesOut(call) ?? { stdout: '{}' })
}

describe('AC-004 ASR transcription stage', () => {
  it('AC-004-26: ASR command targets bl with the Spanish-primary hint', () => {
    const argv = buildAsrCommand('/s/audio.wav', '/s/transcript.json', 'es')
    expect(argv).toEqual([
      'bl',
      'speech',
      'recognize',
      '--url',
      '/s/audio.wav',
      '--language',
      'es',
      '--out',
      '/s/transcript.json',
    ])
  })

  it('AC-004-26: env REXI_ASR_LANGUAGE overrides the language hint', async () => {
    const dir = sessionWithMp4()
    const mp4 = `${dir}/rexi-abc_2026-10-21-10-00-00.mp4`
    const { runner, calls } = blProducesOutRunner()
    await transcribe({
      sessionDir: dir,
      mp4s: [mp4],
      runner,
      env: { REXI_ASR_LANGUAGE: 'en' },
    })
    const blCall = calls.find((c) => c.cmd === 'bl')
    expect(blCall?.args[blCall.args.indexOf('--language') + 1]).toBe('en')
  })

  it('AC-004-27: successful transcription writes transcript.json and .rexi-transcribed', async () => {
    const dir = sessionWithMp4()
    const mp4 = `${dir}/rexi-abc_2026-10-21-10-00-00.mp4`
    const { runner, calls } = blProducesOutRunner()

    await transcribe({ sessionDir: dir, mp4s: [mp4], runner, env: {} })

    expect(exists(dir, 'transcript.json')).toBe(true)
    expect(exists(dir, '.rexi-transcribed')).toBe(true)

    // Exactly the commands built by the two builders, in order — no other calls.
    expect(argvList(calls)).toEqual([
      buildAudioExtractCommand([mp4], `${dir}/audio.wav`),
      buildAsrCommand(`${dir}/audio.wav`, `${dir}/transcript.json`, 'es'),
    ])
    expect(calls).toHaveLength(2)
  })

  it('AC-004-28: ASR failure leaves the directory unmarked and surfaces the error', async () => {
    const dir = sessionWithMp4()
    const mp4 = `${dir}/rexi-abc_2026-10-21-10-00-00.mp4`
    const { runner, calls } = makeRunner((call) =>
      call.cmd === 'bl' ? { fail: true } : { stdout: 'ok' }
    )

    await expect(transcribe({ sessionDir: dir, mp4s: [mp4], runner, env: {} })).rejects.toThrow()

    expect(exists(dir, '.rexi-transcribed')).toBe(false)
    // No script-level retry: the bl command appears exactly once even though it failed.
    expect(calls.filter((c) => c.cmd === 'bl')).toHaveLength(1)
  })

  it('unit: default language is es when REXI_ASR_LANGUAGE is unset', async () => {
    const dir = sessionWithMp4()
    const mp4 = `${dir}/rexi-abc_2026-10-21-10-00-00.mp4`
    const { runner, calls } = blProducesOutRunner()
    await transcribe({ sessionDir: dir, mp4s: [mp4], runner, env: {} })
    const bl = calls.find((c) => c.cmd === 'bl')
    expect(bl?.args[bl.args.indexOf('--language') + 1]).toBe('es')
  })

  it('unit: extraction (ffmpeg) failure also propagates and leaves no marker', async () => {
    const dir = sessionWithMp4()
    const mp4 = `${dir}/rexi-abc_2026-10-21-10-00-00.mp4`
    const { runner } = makeRunner((call) =>
      call.cmd === 'ffmpeg' ? { fail: true } : { stdout: '{}' }
    )
    await expect(transcribe({ sessionDir: dir, mp4s: [mp4], runner, env: {} })).rejects.toThrow()
    expect(exists(dir, '.rexi-transcribed')).toBe(false)
  })
})
