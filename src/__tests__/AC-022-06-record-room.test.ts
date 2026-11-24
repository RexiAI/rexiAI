// AC-022-06-01 — characterization of scripts/recording/bot/capture.mjs recordRoom
// with every collaborator injected through `deps` (no Chrome, PulseAudio, ffmpeg).
import { readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

import { describe, expect, it, vi } from 'vitest'

import { recordRoom } from '../../scripts/recording/bot/capture.mjs'

function setup(runSessionResult: () => Promise<unknown>) {
  const order: string[] = []
  const closed = vi.fn(() => order.push('close'))
  const stop = vi.fn(() => order.push('pulse.stop'))
  const log = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const deps = {
    ensurePulseServer: vi.fn(async () => ({ server: 'unix:/p', stop })),
    loadSink: vi.fn(async () => ({ sinkName: 'rexi-bot-9', moduleId: '11' })),
    joinRoom: vi.fn(async () => ({ participants: async () => [], close: closed })),
    runSession: vi.fn(runSessionResult),
    unloadSink: vi.fn(async () => {
      order.push('unload')
    }),
  }
  return { deps, order, log, closed, stop }
}

const run = (s: ReturnType<typeof setup>, extra: object = {}) =>
  recordRoom({
    room: 'rexi-0123456789abcdef',
    baseUrl: 'https://meet.example',
    env: { X: '1' },
    log: s.log as never,
    deps: s.deps as never,
    ...extra,
  })

describe('AC-022-06-01: recordRoom branches are pinned', () => {
  it('AC-022-06-01: an artifact gives ok with its file, and tears down in order', async () => {
    const s = setup(async () => ({ reason: 'threshold', artifact: { file: '/out/a.mp4' } }))
    const result = await run(s)
    expect(result).toEqual({ ok: true, reason: 'threshold', file: '/out/a.mp4' })
    expect(s.order).toEqual(['close', 'unload', 'pulse.stop'])
    expect(s.log.log).toHaveBeenCalledWith(
      '[recording-bot] capture ended for rexi-0123456789abcdef (threshold); muxing'
    )
    expect(s.deps.unloadSink).toHaveBeenCalledWith(
      expect.objectContaining({ server: 'unix:/p', moduleId: '11' })
    )
  })

  it('AC-022-06-01: no artifact gives ok:false with the session reason', async () => {
    const s = setup(async () => ({ reason: 'idle-timeout', artifact: null }))
    expect(await run(s)).toEqual({ ok: false, reason: 'idle-timeout' })
    expect(s.log.log).toHaveBeenCalledWith(
      '[recording-bot] nothing recorded for rexi-0123456789abcdef (idle-timeout)'
    )
    expect(s.order).toEqual(['close', 'unload', 'pulse.stop'])
  })

  it('AC-022-06-01: a failing session still closes the room and runs the teardown', async () => {
    const s = setup(async () => {
      throw new Error('boom')
    })
    await expect(run(s)).rejects.toThrow('boom')
    expect(s.order).toEqual(['close', 'unload', 'pulse.stop'])
  })

  it('AC-022-06-01: a failing join runs the teardown without closing a room', async () => {
    const s = setup(async () => ({ reason: 'threshold', artifact: null }))
    s.deps.joinRoom.mockRejectedValueOnce(new Error('no join'))
    await expect(run(s)).rejects.toThrow('no join')
    expect(s.order).toEqual(['unload', 'pulse.stop'])
  })

  it('AC-022-06-01: session options are spread into runSession, with the room poll and capture', async () => {
    const s = setup(async () => ({ reason: 'threshold', artifact: { file: '/f' } }))
    await run(s, { sessionOptions: { graceMs: 123 } })
    const arg = (s.deps.runSession.mock.calls as unknown as Record<string, unknown>[][])[0][0]
    expect(arg.graceMs).toBe(123)
    expect(typeof arg.poll).toBe('function')
    expect(typeof (arg.capture as { start: unknown }).start).toBe('function')
  })

  it('AC-022-06-01: the temp work dir exists during the run and is removed after', async () => {
    const capturePrefix = 'rexi-bot-capture-'
    const dirs = () => readdirSync(tmpdir()).filter((n) => n.startsWith(capturePrefix))
    const before = new Set(dirs())
    const s = setup(async () => ({ reason: 'threshold', artifact: null }))
    let during: string[] = []
    s.deps.runSession.mockImplementationOnce(async () => {
      during = dirs().filter((n) => !before.has(n))
      return { reason: 'threshold', artifact: null }
    })
    await run(s)
    expect(during).toHaveLength(1)
    expect(dirs().filter((n) => !before.has(n))).toEqual([])
  })
})
