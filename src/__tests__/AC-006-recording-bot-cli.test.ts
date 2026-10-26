// Unit tests for the recording bot's host-side entry script (spec 006 Tasks 3-7).
// The behaviour itself is pinned by the AC-006-10…26 scenarios; this file covers
// the CLI wiring around those units: argv parsing and the usage contract.
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import { parseArgs } from '../../scripts/recording-bot.mjs'

const execFileAsync = promisify(execFile)

/** Runs the CLI entry and normalises the thrown-exit-code shape execFile gives us. */
async function runCli(args: string[]): Promise<{ code: number; text: string }> {
  try {
    const r = await execFileAsync('node', args, { cwd: process.cwd() })
    return { code: 0, text: `${r.stdout}${r.stderr}` }
  } catch (err) {
    const e = err as Error & { code?: number; stdout?: string; stderr?: string }
    return { code: e.code ?? 0, text: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

describe('unit: recording-bot CLI', () => {
  it('parses the three documented modes', () => {
    expect(parseArgs(['--finalize', '/x/audio.wav', '--room', 'rexi-0123456789abcdef'])).toEqual({
      mode: 'finalize',
      audio: '/x/audio.wav',
      room: 'rexi-0123456789abcdef',
    })
    expect(parseArgs(['--decide', '/x/participants.json'])).toEqual({
      mode: 'decide',
      file: '/x/participants.json',
    })
    expect(parseArgs(['--missed', '/x/schedule.json'])).toEqual({
      mode: 'missed',
      file: '/x/schedule.json',
    })
  })

  it('rejects empty, unknown or incomplete argument lists', () => {
    expect(parseArgs([])).toEqual({ mode: 'usage' })
    expect(parseArgs(['--nonsense'])).toEqual({ mode: 'usage' })
    expect(parseArgs(['--finalize', '/x/audio.wav'])).toEqual({ mode: 'usage' }) // no room
    expect(parseArgs(['--room', 'rexi-0123456789abcdef'])).toEqual({ mode: 'usage' }) // no mode
  })

  it('the real entry with no arguments prints usage and exits 2', async () => {
    const { code, text } = await runCli(['scripts/recording-bot.mjs'])
    expect(code).toBe(2)
    expect(text).toMatch(/Usage/)
    for (const mode of ['--finalize', '--decide', '--missed']) expect(text).toContain(mode)
  })

  it('parses the live modes: --run needs a room, --watch takes an optional schedule', () => {
    expect(parseArgs(['--run', '--room', 'rexi-0123456789abcdef'])).toEqual({
      mode: 'run',
      room: 'rexi-0123456789abcdef',
    })
    expect(
      parseArgs(['--run', '--room', 'rexi-0123456789abcdef', '--base', 'https://meet.example.test'])
    ).toEqual({ mode: 'run', room: 'rexi-0123456789abcdef', base: 'https://meet.example.test' })
    expect(parseArgs(['--run'])).toEqual({ mode: 'usage' })
    expect(parseArgs(['--watch'])).toEqual({ mode: 'watch' })
    expect(parseArgs(['--watch', '--schedule', '/x/schedule.json'])).toEqual({
      mode: 'watch',
      schedule: '/x/schedule.json',
    })
    expect(parseArgs(['--watch', '--room', 'rexi-0123456789abcdef'])).toEqual({
      mode: 'watch',
      room: 'rexi-0123456789abcdef',
    })
  })

  it('documents every mode in the usage text', async () => {
    const { text } = await runCli(['scripts/recording-bot.mjs'])
    for (const mode of ['--run', '--watch', '--finalize', '--decide', '--missed']) {
      expect(text).toContain(mode)
    }
  })
})
