// AC-022-06-02 — characterization of scripts/recording-bot.mjs parseArgs.
// Pins CURRENT behaviour, one input per decision point, so the complexity
// refactor (spec 022 Task 6) can be proven behaviour-preserving.
import { describe, expect, it } from 'vitest'

import { parseArgs } from '../../scripts/recording-bot.mjs'

const ROOM = 'rexi-0123456789abcdef'
const USAGE = { mode: 'usage' }

describe('AC-022-06-02: parseArgs behaviour is pinned', () => {
  it('AC-022-06-02: no args and an unknown first flag give usage', () => {
    expect(parseArgs([])).toEqual(USAGE)
    expect(parseArgs(['--nonsense'])).toEqual(USAGE)
    expect(parseArgs(['--room', ROOM])).toEqual(USAGE)
  })

  it('AC-022-06-02: --run needs a room; base is optional', () => {
    expect(parseArgs(['--run'])).toEqual(USAGE)
    expect(parseArgs(['--run', '--base', 'https://x'])).toEqual(USAGE)
    expect(parseArgs(['--run', '--room', ROOM])).toEqual({ mode: 'run', room: ROOM })
    expect(parseArgs(['--run', '--room', ROOM, '--base', 'https://meet.example'])).toEqual({
      mode: 'run',
      room: ROOM,
      base: 'https://meet.example',
    })
  })

  it('AC-022-06-02: --watch takes optional schedule, room and base', () => {
    expect(parseArgs(['--watch'])).toEqual({ mode: 'watch' })
    expect(parseArgs(['--watch', '--schedule', '/s.json'])).toEqual({
      mode: 'watch',
      schedule: '/s.json',
    })
    expect(
      parseArgs(['--watch', '--schedule', '/s.json', '--room', ROOM, '--base', 'https://b'])
    ).toEqual({ mode: 'watch', schedule: '/s.json', room: ROOM, base: 'https://b' })
  })

  it('AC-022-06-02: --finalize takes a positional audio path and requires --room', () => {
    expect(parseArgs(['--finalize', '/a.wav', '--room', ROOM])).toEqual({
      mode: 'finalize',
      audio: '/a.wav',
      room: ROOM,
    })
    expect(parseArgs(['--finalize', '/a.wav'])).toEqual(USAGE)
    expect(parseArgs(['--finalize'])).toEqual(USAGE)
    expect(parseArgs(['--finalize', '--room', ROOM])).toEqual(USAGE)
  })

  it('AC-022-06-02: --decide and --missed take one positional file', () => {
    expect(parseArgs(['--decide', '/p.json'])).toEqual({ mode: 'decide', file: '/p.json' })
    expect(parseArgs(['--missed', '/s.json'])).toEqual({ mode: 'missed', file: '/s.json' })
    expect(parseArgs(['--decide'])).toEqual(USAGE)
    expect(parseArgs(['--missed', '--room', ROOM])).toEqual(USAGE)
  })

  it('AC-022-06-02: positional modes still accept trailing option pairs', () => {
    expect(parseArgs(['--decide', '/p.json', '--room', ROOM])).toEqual({
      mode: 'decide',
      file: '/p.json',
      room: ROOM,
    })
  })

  it('AC-022-06-02: an unknown flag or a flag missing its value gives usage', () => {
    expect(parseArgs(['--watch', '--bogus', 'x'])).toEqual(USAGE)
    expect(parseArgs(['--watch', '--schedule'])).toEqual(USAGE)
    expect(parseArgs(['--run', '--room'])).toEqual(USAGE)
    expect(parseArgs(['--run', '--room', ROOM, '--base'])).toEqual(USAGE)
    expect(parseArgs(['--decide', '/p.json', '--room'])).toEqual(USAGE)
    expect(parseArgs(['--watch', 'stray'])).toEqual(USAGE)
  })

  it('AC-022-06-02: a repeated option keeps the last value', () => {
    expect(parseArgs(['--watch', '--room', 'a', '--room', 'b'])).toEqual({
      mode: 'watch',
      room: 'b',
    })
  })
})
