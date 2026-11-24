// AC-022-06-02/03 — characterization of scripts/recording-bot.mjs runWatch.
// recordRoom is replaced by a fake; the schedule file is a real temp file.
// (`runWatch` gained an `export` for this — no behaviour change.)
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const recordRoom = vi.hoisted(() => vi.fn())
vi.mock('../../scripts/recording/bot/capture.mjs', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  recordRoom,
}))

import { runWatch } from '../../scripts/recording-bot.mjs'

const ROOM = 'rexi-0123456789abcdef'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Listener = (...args: never[]) => void
let dir = ''
let errors: ReturnType<typeof vi.spyOn>
let logs: ReturnType<typeof vi.spyOn>
let baseline: { term: Listener[]; int: Listener[] }

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'rexi-watch-'))
  recordRoom.mockReset()
  process.env['BOT_WATCH_INTERVAL_MS'] = '5'
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  logs = vi.spyOn(console, 'log').mockImplementation(() => {})
  baseline = {
    term: process.listeners('SIGTERM'),
    int: process.listeners('SIGINT'),
  }
})

afterEach(() => {
  delete process.env['BOT_WATCH_INTERVAL_MS']
  delete process.env['BOT_SCHEDULE_FILE']
  for (const l of process.listeners('SIGTERM')) {
    if (!baseline.term.includes(l)) process.removeListener('SIGTERM', l as never)
  }
  for (const l of process.listeners('SIGINT')) {
    if (!baseline.int.includes(l)) process.removeListener('SIGINT', l as never)
  }
  errors.mockRestore()
  logs.mockRestore()
  rmSync(dir, { recursive: true, force: true })
})

const stopAfter = async (ms: number) => {
  await sleep(ms)
  process.emit('SIGTERM')
}

function scheduleFile(entries: object[]) {
  const file = path.join(dir, 'schedule.json')
  writeFileSync(file, JSON.stringify(entries))
  return file
}

describe('AC-022-06-02: runWatch loop is pinned', () => {
  it('AC-022-06-03: no schedule file and no room — idles until SIGTERM, joins nothing, returns 0', async () => {
    const pending = runWatch({
      schedule: path.join(dir, 'missing.json'),
      room: undefined,
      base: 'b',
    })
    await stopAfter(40)
    expect(await pending).toBe(0)
    expect(recordRoom).not.toHaveBeenCalled()
    expect(logs).toHaveBeenCalledWith(expect.stringContaining('no schedule file at'))
  })

  it('AC-022-06-03: an explicit room is joined exactly once, however many ticks pass', async () => {
    recordRoom.mockResolvedValue({ ok: true, reason: 'threshold', file: '/o.mp4' })
    const pending = runWatch({ schedule: undefined, room: ROOM, base: 'https://b' })
    await stopAfter(60)
    expect(await pending).toBe(0)
    expect(recordRoom).toHaveBeenCalledTimes(1)
    expect(recordRoom).toHaveBeenCalledWith({
      room: ROOM,
      baseUrl: 'https://b',
      env: process.env,
      log: console,
    })
    expect(logs).toHaveBeenCalledWith(`[recording-bot] recorded ${ROOM} → /o.mp4`)
  })

  it('AC-022-06-03: a session that records nothing is reported and not retried', async () => {
    recordRoom.mockResolvedValue({ ok: false, reason: 'idle-timeout' })
    const pending = runWatch({ schedule: undefined, room: ROOM, base: 'b' })
    await stopAfter(60)
    await pending
    expect(recordRoom).toHaveBeenCalledTimes(1)
    expect(errors).toHaveBeenCalledWith(`[recording-bot] no recording for ${ROOM} (idle-timeout)`)
  })

  it('AC-022-06-03: a throwing session is logged and the room is not retried', async () => {
    recordRoom.mockRejectedValue(new Error('chrome gone'))
    const pending = runWatch({ schedule: undefined, room: ROOM, base: 'b' })
    await stopAfter(60)
    expect(await pending).toBe(0)
    expect(recordRoom).toHaveBeenCalledTimes(1)
    expect(errors).toHaveBeenCalledWith(`[recording-bot] session for ${ROOM} failed: chrome gone`)
  })

  it('AC-022-06-03: a non-Error rejection is stringified in the log line', async () => {
    recordRoom.mockRejectedValue('plain')
    const pending = runWatch({ schedule: undefined, room: ROOM, base: 'b' })
    await stopAfter(40)
    await pending
    expect(errors).toHaveBeenCalledWith(`[recording-bot] session for ${ROOM} failed: plain`)
  })

  it('AC-022-06-03: only the active scheduled windows are joined', async () => {
    const now = Date.now()
    const file = scheduleFile([
      { room: 'rexi-aaaaaaaaaaaaaaaa', startsAt: new Date(now - 60_000).toISOString(), hours: 1 },
      {
        room: 'rexi-bbbbbbbbbbbbbbbb',
        startsAt: new Date(now + 3_600_000).toISOString(),
        hours: 1,
      },
      {
        room: 'rexi-cccccccccccccccc',
        startsAt: new Date(now - 7_200_000).toISOString(),
        hours: 1,
      },
    ])
    recordRoom.mockResolvedValue({ ok: true, reason: 'threshold', file: '/o.mp4' })
    const pending = runWatch({ schedule: file, room: undefined, base: 'b' })
    await stopAfter(60)
    await pending
    expect(recordRoom.mock.calls.map((c) => c[0].room)).toEqual(['rexi-aaaaaaaaaaaaaaaa'])
  })

  it('AC-022-06-03: the schedule file defaults from BOT_SCHEDULE_FILE', async () => {
    process.env['BOT_SCHEDULE_FILE'] = scheduleFile([
      { room: ROOM, startsAt: new Date(Date.now() - 1000).toISOString(), hours: 1 },
    ])
    recordRoom.mockResolvedValue({ ok: true, reason: 'threshold', file: '/o.mp4' })
    const pending = runWatch({ schedule: undefined, room: undefined, base: 'b' })
    await stopAfter(40)
    await pending
    expect(recordRoom).toHaveBeenCalledTimes(1)
  })

  it('AC-022-06-03: on stop it waits for a running session before returning', async () => {
    let finish: () => void = () => {}
    recordRoom.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ ok: true, reason: 'threshold', file: '/o.mp4' })
        })
    )
    let settled = false
    const pending = runWatch({ schedule: undefined, room: ROOM, base: 'b' }).then(
      (code: number) => {
        settled = true
        return code
      }
    )
    await sleep(30)
    process.emit('SIGTERM')
    await sleep(30)
    expect(settled).toBe(false)
    finish()
    expect(await pending).toBe(0)
    expect(settled).toBe(true)
  })

  it('AC-022-06-03: SIGINT stops the loop just like SIGTERM', async () => {
    const pending = runWatch({
      schedule: path.join(dir, 'missing.json'),
      room: undefined,
      base: 'b',
    })
    await sleep(30)
    process.emit('SIGINT')
    expect(await pending).toBe(0)
  })
})
