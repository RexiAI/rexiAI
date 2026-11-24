// AC-022-06-03 — characterization of scripts/recording/bot/session.mjs
// nextStep and runSession (injected clock, poll, sleep, capture).
import { describe, expect, it } from 'vitest'

import { nextStep, runSession } from '../../scripts/recording/bot/session.mjs'

const BOT = { id: 'rexi-recorder' }
const TWO = [{ id: 'a' }, { id: 'b' }]
const ONE = [{ id: 'a' }, BOT]

type StepInput = {
  recording: boolean
  belowSinceMs?: number | null
  participants: { id: string }[]
  nowMs?: number
}
const step = ({ recording, belowSinceMs = null, participants, nowMs = 10_000 }: StepInput) =>
  nextStep({ recording, belowSinceMs, participants, nowMs, graceMs: 5000, botIdentity: BOT })

describe('AC-022-06-03: nextStep transitions are pinned', () => {
  it('AC-022-06-03: two humans start, or continue when already recording', () => {
    expect(step({ recording: false, participants: TWO })).toEqual({
      command: 'start',
      recording: true,
      belowSinceMs: null,
    })
    expect(step({ recording: true, belowSinceMs: 9000, participants: TWO })).toEqual({
      command: 'continue',
      recording: true,
      belowSinceMs: null,
    })
  })

  it('AC-022-06-03: below threshold and not recording is idle', () => {
    expect(step({ recording: false, participants: ONE, belowSinceMs: 5 })).toEqual({
      command: 'idle',
      recording: false,
      belowSinceMs: null,
    })
  })

  it('AC-022-06-03: a first dip starts the grace clock at now (null or undefined since)', () => {
    const expected = { command: 'continue', recording: true, belowSinceMs: 10_000 }
    expect(step({ recording: true, participants: ONE, belowSinceMs: null })).toEqual(expected)
    expect(
      nextStep({
        recording: true,
        belowSinceMs: undefined as unknown as null,
        participants: ONE,
        nowMs: 10_000,
        graceMs: 5000,
        botIdentity: BOT,
      })
    ).toEqual(expected)
  })

  it('AC-022-06-03: a dip inside the grace keeps the original since; at the grace it stops', () => {
    expect(step({ recording: true, participants: ONE, belowSinceMs: 6000 })).toEqual({
      command: 'continue',
      recording: true,
      belowSinceMs: 6000,
    })
    expect(step({ recording: true, participants: ONE, belowSinceMs: 5000 })).toEqual({
      command: 'stop',
      recording: false,
      belowSinceMs: null,
    })
    expect(step({ recording: true, participants: [], belowSinceMs: 1000 }).command).toBe('stop')
  })

  it('AC-022-06-03: the default bot identity is applied when none is passed', () => {
    const withoutBot = {
      recording: false,
      belowSinceMs: null,
      participants: [{ id: 'rexi-recorder' }, { id: 'a' }],
      nowMs: 1,
      graceMs: 1,
    } as Parameters<typeof nextStep>[0]
    const result = nextStep(withoutBot)
    expect(result.command).toBe('idle')
  })
})

describe('AC-022-06-03: runSession return values and side effects are pinned', () => {
  function harness(script: { id: string }[][], tickMs = 1000) {
    const clock = { now: 0 }
    const events: string[] = []
    let polls = 0
    return {
      clock,
      events,
      polls: () => polls,
      options: {
        poll: async () => {
          const snapshot = script[Math.min(polls, script.length - 1)]
          polls += 1
          clock.now += tickMs
          return snapshot
        },
        capture: {
          start: async () => {
            events.push('start')
          },
          stop: async () => {
            events.push('stop')
            return { file: '/f.mp4' }
          },
        },
        now: () => clock.now,
        sleep: async (ms: number) => {
          events.push(`sleep:${ms}`)
        },
        botIdentity: BOT,
      },
    }
  }

  it('AC-022-06-03: threshold — starts on two humans, stops after the grace, returns the artifact', async () => {
    const h = harness([ONE, TWO, TWO, [{ id: 'a' }], [{ id: 'a' }]])
    const result = await runSession({ ...h.options, graceMs: 1500, intervalMs: 7 })
    expect(result).toEqual({ reason: 'threshold', artifact: { file: '/f.mp4' } })
    expect(h.events).toEqual([
      'sleep:7',
      'start',
      'sleep:7',
      'sleep:7',
      'sleep:7',
      'sleep:7',
      'stop',
    ])
    expect(h.polls()).toBe(6)
  })

  it('AC-022-06-03: idle-timeout — nobody ever joins, nothing recorded, no stop call', async () => {
    const h = harness([[]], 1000)
    const result = await runSession({ ...h.options, idleTimeoutMs: 2500, intervalMs: 3 })
    expect(result).toEqual({ reason: 'idle-timeout', artifact: null })
    expect(h.events).toEqual(['sleep:3', 'sleep:3'])
  })

  it('AC-022-06-03: max-duration while recording finalizes the capture', async () => {
    const h = harness([TWO], 1000)
    const result = await runSession({
      ...h.options,
      maxDurationMs: 3000,
      idleTimeoutMs: 1_000_000,
      intervalMs: 1,
    })
    expect(result).toEqual({ reason: 'max-duration', artifact: { file: '/f.mp4' } })
    expect(h.events).toEqual(['start', 'sleep:1', 'sleep:1', 'stop'])
  })

  it('AC-022-06-03: max-duration while not recording returns a null artifact', async () => {
    const h = harness([[]], 1000)
    const result = await runSession({
      ...h.options,
      maxDurationMs: 2000,
      idleTimeoutMs: 1_000_000,
      intervalMs: 1,
    })
    expect(result).toEqual({ reason: 'max-duration', artifact: null })
    expect(h.events).toEqual(['sleep:1'])
  })

  it('AC-022-06-03: max-duration wins over idle-timeout when both elapsed', async () => {
    const h = harness([[]], 5000)
    const result = await runSession({
      ...h.options,
      maxDurationMs: 5000,
      idleTimeoutMs: 5000,
    })
    expect(result.reason).toBe('max-duration')
  })

  it('AC-022-06-03: a human present refreshes the idle window', async () => {
    // one human (never two) keeps lastHumanSeen fresh, so idle-timeout (2500) never fires
    // before max-duration (6000).
    const h = harness([[{ id: 'a' }]], 1000)
    const result = await runSession({
      ...h.options,
      idleTimeoutMs: 2500,
      maxDurationMs: 6000,
      intervalMs: 1,
    })
    expect(result).toEqual({ reason: 'max-duration', artifact: null })
  })

  it('AC-022-06-03: only the bot present does not refresh the idle window', async () => {
    const h = harness([[BOT]], 1000)
    const result = await runSession({
      ...h.options,
      idleTimeoutMs: 2500,
      maxDurationMs: 600_000,
      intervalMs: 1,
    })
    expect(result.reason).toBe('idle-timeout')
  })
})
