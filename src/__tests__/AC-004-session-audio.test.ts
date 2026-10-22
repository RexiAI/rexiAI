// Task 2 (Ask B part 1): session media collection + audio extraction unit.
// Acceptance tests per specs/004-auto-record-transcribe-insights/20-acceptance/AC-004-session-audio.md
import fs from 'node:fs'

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import {
  collectSessionMp4s,
  buildAudioExtractCommand,
  extractAudio,
} from '../../scripts/recording/media.mjs'

import { makeRunner, mkTmpDir, rmTmpDir, writeFile } from './recording-harness.ts'

let base: string
beforeAll(() => {
  base = mkTmpDir()
})
afterAll(() => {
  rmTmpDir(base)
})

describe('AC-004 session media collection + audio extraction', () => {
  it('AC-004-23: collectSessionMp4s returns every mp4 in chronological order', () => {
    const dir = fs.mkdtempSync(`${base}/session-23-`)
    // Jibri layout: <room>_<YYYY-MM-DD-HH-MM-SS>.mp4 + metadata.json + markers.
    const older = writeFile(dir, 'rexi-abc_2026-10-21-10-00-00.mp4')
    const newer = writeFile(dir, 'rexi-abc_2026-10-21-10-30-00.mp4')
    writeFile(dir, 'metadata.json', '{"meeting_url":"https://x/rexi-abc"}')
    writeFile(dir, '.rexi-billed')
    writeFile(dir, 'notes.txt')

    const result = collectSessionMp4s(dir)
    expect(result).toEqual([older, newer]) // ascending filename = chronological
  })

  it('AC-004-23: single mp4 → one element; no mp4 → empty; .mp4 file path → itself', () => {
    const single = fs.mkdtempSync(`${base}/session-23b-`)
    const only = writeFile(single, 'rexi-abc_2026-10-21-10-00-00.mp4')
    expect(collectSessionMp4s(single)).toEqual([only])

    const empty = fs.mkdtempSync(`${base}/session-23c-`)
    writeFile(empty, 'metadata.json', '{}')
    expect(collectSessionMp4s(empty)).toEqual([])

    // One-off mode: the path handed in IS an .mp4 file (mirrors findMp4 file-mode).
    expect(collectSessionMp4s(only)).toEqual([only])

    const nonMp4File = writeFile(single, 'metadata.json', '{}')
    expect(collectSessionMp4s(nonMp4File)).toEqual([])
  })

  it('AC-004-24: buildAudioExtractCommand carries -vn, every input in order, one output', () => {
    const argv = buildAudioExtractCommand(['first.mp4', 'second.mp4'], 'out.wav')
    expect(argv[0]).toBe('ffmpeg')
    expect(argv).toContain('-vn')
    const iFirst = argv.indexOf('first.mp4')
    const iSecond = argv.indexOf('second.mp4')
    expect(iFirst).toBeGreaterThanOrEqual(0)
    expect(iSecond).toBeGreaterThan(iFirst) // concatenation consumes first then second
    // exactly one audio output path: out.wav appears once, as the final argument
    expect(argv.filter((a) => a === 'out.wav')).toHaveLength(1)
    expect(argv[argv.length - 1]).toBe('out.wav')
  })

  it('AC-004-24: buildAudioExtractCommand is pure — no runner, no I/O', () => {
    const tmp = fs.mkdtempSync(`${base}/pure-`)
    const outPath = `${tmp}/out.wav`
    const argv = buildAudioExtractCommand([`${tmp}/a.mp4`], outPath)
    expect(fs.existsSync(outPath)).toBe(false) // nothing written
    expect(fs.existsSync(`${tmp}/a.mp4`)).toBe(false)
    // single input → plain -i <mp4> (no concat machinery needed)
    expect(argv).toContain('-i')
    expect(argv.filter((a) => a === '-i')).toHaveLength(1)
  })

  it('AC-004-25: extraction failure propagates and nothing is marked', async () => {
    const tmp = fs.mkdtempSync(`${base}/fail-`)
    const mp4 = writeFile(tmp, 'rexi-abc_2026-10-21-10-00-00.mp4')
    const { runner, calls } = makeRunner(() => ({ fail: true }))

    await expect(extractAudio(runner, [mp4], `${tmp}/audio.wav`)).rejects.toThrow()

    expect(calls).toHaveLength(1) // only the ffmpeg call — no marker write logic runs
    const entries = fs.readdirSync(tmp)
    expect(entries).toEqual([mp4.split('/').pop()]) // dir holds only the mp4 we put there
  })

  it('unit: multi-mp4 command concatenates in collection order via filter_complex', () => {
    const argv = buildAudioExtractCommand(['a.mp4', 'b.mp4', 'c.mp4'], 'out.wav')
    const fc = argv[argv.indexOf('-filter_complex') + 1]
    expect(fc).toContain('concat=n=3:v=0:a=1')
    expect(fc.startsWith('[0:a][1:a][2:a]')).toBe(true)
    expect(argv.filter((a) => a === '-i')).toHaveLength(3)
    expect(argv).toContain('-map')
  })
})
