// @vitest-environment node
// Tests for the recording bot's CAPTURE adapter (spec 006 Tasks 3-5).
//
// The scenarios themselves are pinned by AC-006-10…20; this file covers the part
// the earlier revision was missing: the component that actually joins a Jitsi room,
// watches its participants, and produces the audio the pipeline consumes.
//
// Three layers here:
//   • unit — the pure pieces (participant mapping, lifecycle steps, argv builders,
//     CDP framing, schedule windows) with no browser, no sound card, no network;
//   • unit — PulseAudio server selection and the session loop, with injected ports;
//   • live — BOT_LIVE_TEST=1 only: two browser participants, a real tone, a real
//     recording, measured with volumedetect. Off by default so `npm test` stays
//     hermetic and fast.
import { execFile, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import {
  buildJoinUrl,
  DEFAULT_JITSI_BASE_URL,
  participantsFromStore,
  PARTICIPANTS_EXPR,
  recordRoom,
} from '../../scripts/recording/bot/capture.mjs'
import { createCdp, drainMessages } from '../../scripts/recording/bot/cdp.mjs'
import {
  CHROME_PATH_ENV,
  chromeArgs,
  chromeCandidates,
  resolveChromePath,
} from '../../scripts/recording/bot/chrome.mjs'
import { BOT_IDENTITY, countNonBotHumans } from '../../scripts/recording/bot/participants.mjs'
import {
  buildCaptureArgs,
  buildLoadSinkArgs,
  buildUnloadModuleArgs,
  ensurePulseServer,
  loadSink,
  pulseServerCandidates,
  sinkNameFor,
  sinkNameForModule,
} from '../../scripts/recording/bot/pulse.mjs'
import { activeWindows, readSchedule } from '../../scripts/recording/bot/schedule.mjs'
import { nextStep, runSession } from '../../scripts/recording/bot/session.mjs'

const execFileAsync = promisify(execFile)
const BOT = BOT_IDENTITY as { id: string; displayName: string }
const HUMAN_A = { id: 'aaa111', displayName: 'Ana' }
const HUMAN_B = { id: 'bbb222', displayName: 'Bruno' }
const HUMAN_C = { id: 'ccc333', displayName: 'Carla' }

const QUIET_LOG = { log: () => {}, warn: () => {}, error: () => {} } as unknown as Console

function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

describe('unit: participant snapshot → decision list (AC-006-12)', () => {
  it('identifies the bot by its own participant identity, never by display name', () => {
    // A human who renamed themselves to the bot's name keeps their own id.
    const snapshot = {
      local: { id: 'live-local-id', name: 'Rexi Recorder' },
      remote: [{ id: HUMAN_A.id, name: 'Rexi Recorder' }],
    }

    const participants = participantsFromStore(snapshot)

    // The bot's own entry carries the bot identity — that is what is excluded.
    expect(participants[0]).toEqual({ id: BOT.id, displayName: BOT.displayName })
    expect(countNonBotHumans(participants, BOT)).toBe(1)
  })

  it('maps every remote participant and keeps its own id', () => {
    const participants = participantsFromStore({
      local: { id: 'l', name: 'Rexi Recorder' },
      remote: [HUMAN_A, HUMAN_B, HUMAN_C],
    })
    expect(participants.map((p: { id: string }) => p.id)).toEqual([
      BOT.id,
      HUMAN_A.id,
      HUMAN_B.id,
      HUMAN_C.id,
    ])
    expect(countNonBotHumans(participants, BOT)).toBe(3)
  })

  it('yields only the remotes before the bot has its own participant, and tolerates junk', () => {
    expect(participantsFromStore(null)).toEqual([])
    expect(participantsFromStore({ local: null, remote: [] })).toEqual([])
    expect(
      participantsFromStore({
        local: null,
        remote: [{ id: 'ok', name: '' }, { id: '' }, {} as { id: string }],
      })
    ).toEqual([{ id: 'ok', displayName: '' }])
  })

  it('reads the store path verified on the live app, iterating the remote collection', () => {
    // The remote collection has size/get/forEach but no enumerable keys, so a
    // spread or Object.values would silently report an empty room. The Object.values
    // fallback exists only for a plain-object store; forEach must come first.
    expect(PARTICIPANTS_EXPR).toContain('features/base/participants')
    expect(PARTICIPANTS_EXPR).not.toContain('valueSeq')
    expect(PARTICIPANTS_EXPR.indexOf('map.forEach')).toBeLessThan(
      PARTICIPANTS_EXPR.indexOf('Object.values(map)')
    )
  })
})

describe('unit: the lifecycle acts on the two-human decision (AC-006-13 … AC-006-17)', () => {
  const step = (participants: { id: string }[], recording: boolean, belowSinceMs: number | null = null) =>
    nextStep({
      recording,
      belowSinceMs,
      participants,
      nowMs: 1000,
      graceMs: 5000,
      botIdentity: BOT,
    })

  it('AC-006-13: does not start with 0 or 1 non-bot humans', () => {
    expect(step([{ id: BOT.id }], false).command).toBe('idle')
    expect(step([{ id: BOT.id }, HUMAN_A], false).command).toBe('idle')
  })

  it('AC-006-14: starts at exactly two non-bot humans', () => {
    expect(step([{ id: BOT.id }, HUMAN_A, HUMAN_B], false).command).toBe('start')
  })

  it('AC-006-15: keeps recording above two', () => {
    expect(step([{ id: BOT.id }, HUMAN_A, HUMAN_B, HUMAN_C], true).command).toBe('continue')
  })

  it('AC-006-16: stops once the room stays below two for the grace period', () => {
    const dropping = step([{ id: BOT.id }, HUMAN_A], true, 900)
    expect(dropping.command).toBe('continue') // inside the grace window
    expect(dropping.belowSinceMs).toBe(900)

    const elapsed = nextStep({
      recording: true,
      belowSinceMs: 900,
      participants: [{ id: BOT.id }, HUMAN_A],
      nowMs: 1000 + 5000,
      graceMs: 5000,
      botIdentity: BOT,
    })
    expect(elapsed.command).toBe('stop')
    expect(elapsed.recording).toBe(false)
  })

  it('AC-006-17: the bot joining or leaving never moves the decision', () => {
    expect(step([HUMAN_A, HUMAN_B], false).command).toBe('start')
    expect(step([{ id: BOT.id }, HUMAN_A, HUMAN_B], false).command).toBe('start')
    expect(step([HUMAN_A, HUMAN_B], true).command).toBe('continue')
    expect(step([{ id: BOT.id }, HUMAN_A, HUMAN_B], true).command).toBe('continue')
  })
})

describe('unit: the session loop drives start and stop (AC-006-16)', () => {
  /** A capture device that records the commands it received. */
  function fakeCapture() {
    const calls: string[] = []
    return {
      calls,
      capture: {
        start: async () => {
          calls.push('start')
        },
        stop: async () => {
          calls.push('stop')
          return { file: '/tmp/final.mp4' }
        },
      },
    }
  }

  /** A poller over a scripted list of snapshots, advancing the injected clock. */
  function scriptedPoll(script: { id: string }[][], clock: { now: number }) {
    let index = 0
    return async () => {
      const value = script[Math.min(index, script.length - 1)]
      index += 1
      clock.now += 1000
      return value
    }
  }

  it('starts when the second human arrives and stops when the room empties', async () => {
    const { calls, capture } = fakeCapture()
    const clock = { now: 0 }
    const script = [
      [{ id: BOT.id }],
      [{ id: BOT.id }, HUMAN_A],
      [{ id: BOT.id }, HUMAN_A, HUMAN_B],
      [{ id: BOT.id }, HUMAN_A, HUMAN_B],
      [{ id: BOT.id }, HUMAN_A],
      [{ id: BOT.id }, HUMAN_A],
      [{ id: BOT.id }, HUMAN_A],
    ]
    const result = await runSession({
      poll: scriptedPoll(script, clock),
      capture,
      now: () => clock.now,
      sleep: async () => {},
      graceMs: 1500,
      intervalMs: 1000,
      idleTimeoutMs: 10 ** 9,
      maxDurationMs: 10 ** 9,
      botIdentity: BOT,
    })

    expect(calls).toEqual(['start', 'stop'])
    expect(result.reason).toBe('threshold')
    expect(result.artifact).toEqual({ file: '/tmp/final.mp4' })
  })

  it('gives up with no artifact when nobody ever joins', async () => {
    const { calls, capture } = fakeCapture()
    const clock = { now: 0 }
    const result = await runSession({
      poll: scriptedPoll([[{ id: BOT.id }]], clock),
      capture,
      now: () => clock.now,
      sleep: async () => {},
      idleTimeoutMs: 5000,
      maxDurationMs: 10 ** 9,
      botIdentity: BOT,
    })

    expect(calls).toEqual([])
    expect(result.reason).toBe('idle-timeout')
    expect(result.artifact).toBeNull()
  })

  it('finalizes what it already recorded when the duration cap fires', async () => {
    const { calls, capture } = fakeCapture()
    const clock = { now: 0 }
    const both = [{ id: BOT.id }, HUMAN_A, HUMAN_B]
    const result = await runSession({
      poll: scriptedPoll([both], clock),
      capture,
      now: () => clock.now,
      sleep: async () => {},
      idleTimeoutMs: 10 ** 9,
      maxDurationMs: 3000,
      botIdentity: BOT,
    })

    expect(calls).toEqual(['start', 'stop'])
    expect(result.reason).toBe('max-duration')
    expect(result.artifact).toEqual({ file: '/tmp/final.mp4' })
  })
})

describe('unit: the join URL (bot stays out of the lobby, publishes nothing)', () => {
  it('defaults to the fixed public Jitsi host with the room as the only path segment', () => {
    const url = buildJoinUrl({ room: 'rexi-0123456789abcdef' })
    expect(url.startsWith(`${DEFAULT_JITSI_BASE_URL}/rexi-0123456789abcdef#`)).toBe(true)
  })

  it('carries the hash config that skips the pre-join page and mutes the bot', () => {
    const hash = buildJoinUrl({ room: 'rexi-0123456789abcdef' }).split('#')[1]
    for (const flag of [
      'config.prejoinConfig.enabled=false',
      'config.prejoinPageEnabled=false',
      'config.startWithAudioMuted=true',
      'config.startWithVideoMuted=true',
      'config.disableInitialGUM=true',
    ]) {
      expect(hash).toContain(flag)
    }
  })

  it('strips trailing slashes from the base and encodes the display name', () => {
    const url = buildJoinUrl({
      baseUrl: 'https://meet.example.test///',
      room: 'rexi-0123456789abcdef',
      displayName: 'Rexi Recorder',
    })
    expect(url.startsWith('https://meet.example.test/rexi-0123456789abcdef#')).toBe(true)
    expect(url).toContain('userInfo.displayName=Rexi%20Recorder')
  })
})

describe('unit: browser launch contract (outbound only, audio renders)', () => {
  const args = chromeArgs({ profileDir: '/tmp/profile', url: 'https://example.test/r#x' }) as string[]

  it('speaks CDP over file descriptors, so no port is listened on', () => {
    expect(args).toContain('--remote-debugging-pipe')
    expect(args.some((a) => a.startsWith('--remote-debugging-port'))).toBe(false)
  })

  it('lets the meeting render into the sink and never mutes the browser', () => {
    expect(args).toContain('--autoplay-policy=no-user-gesture-required')
    expect(args).toContain('--use-fake-ui-for-media-stream')
    expect(args).not.toContain('--mute-audio')
    expect(args).toContain('--user-data-dir=/tmp/profile')
    expect(args[args.length - 1]).toBe('https://example.test/r#x')
  })

  it('honours the configured binary, and fails loudly listing the candidates', () => {
    expect(chromeCandidates({ [CHROME_PATH_ENV]: '/opt/chrome' })[0]).toBe('/opt/chrome')
    expect(resolveChromePath({ [CHROME_PATH_ENV]: '/opt/chrome' }, () => true)).toBe('/opt/chrome')

    let message = ''
    try {
      resolveChromePath({ [CHROME_PATH_ENV]: '/nope/chrome' }, () => false)
    } catch (err) {
      message = (err as Error).message
    }
    expect(message).toContain('no Chrome/Chromium binary found')
    expect(message).toContain(CHROME_PATH_ENV)
    expect(message).toContain('/nope/chrome')
  })
})

describe('unit: audio capture argv and PulseAudio server selection', () => {
  it('builds a per-session sink name and records its monitor to the temp file', () => {
    expect(sinkNameFor(4242)).toBe('rexi-bot-4242')

    const args = buildCaptureArgs({ sinkName: 'rexi-bot-4242', outPath: '/tmp/c.wav' }) as string[]
    expect(args).toContain('pulse')
    expect(args[args.indexOf('-i') + 1]).toBe('rexi-bot-4242.monitor')
    expect(args[args.length - 1]).toBe('/tmp/c.wav')
  })

  it('loads and unloads the null sink by module id', () => {
    expect(buildLoadSinkArgs({ server: 'unix:/p/native', sinkName: 'rexi-bot-1' })).toEqual([
      '--server',
      'unix:/p/native',
      'load-module',
      'module-null-sink',
      'sink_name=rexi-bot-1',
      'sink_properties=device.description=rexi-bot-1',
    ])
    expect(buildUnloadModuleArgs({ server: 'unix:/p/native', moduleId: '7' })).toEqual([
      '--server',
      'unix:/p/native',
      'unload-module',
      '7',
    ])
  })

  it('reads back the sink PulseAudio actually created when a name is taken', async () => {
    // module-null-sink silently creates `<name>.2` on a collision, so capturing
    // `<name>.monitor` would record a stale, wrong sink. The real name wins.
    const listing = [
      'Sink #0',
      '\tState: IDLE',
      '\tName: rexi-bot-1',
      '\tOwner Module: 12',
      'Sink #4',
      '\tState: IDLE',
      '\tName: rexi-bot-1.2',
      '\tOwner Module: 13',
    ].join('\n')
    expect(sinkNameForModule(listing, '12')).toBe('rexi-bot-1')
    expect(sinkNameForModule(listing, 13)).toBe('rexi-bot-1.2')
    expect(sinkNameForModule(listing, '99')).toBeNull()

    const runner = async (_cmd: string, args: string[]) =>
      args.includes('load-module')
        ? { stdout: '13\n' }
        : { stdout: listing }
    const loaded = await loadSink({ server: 'unix:/p', sinkName: 'rexi-bot-1', runner, log: QUIET_LOG })
    expect(loaded.sinkName).toBe('rexi-bot-1.2')
    expect(loaded.requested).toBe('rexi-bot-1')
    expect(loaded.moduleId).toBe('13')
  })

  it('orders the server candidates and drops empty ones', () => {
    const candidates = pulseServerCandidates({
      BOT_PULSE_SERVER: 'unix:/bot',
      PULSE_SERVER: 'unix:/ambient',
      XDG_RUNTIME_DIR: '/run/user/1000',
    }) as string[]
    expect(candidates[0]).toBe('unix:/bot')
    expect(candidates[1]).toBe('unix:/ambient')
    expect(candidates).toContain('unix:/run/user/1000/pulse/native')
    expect(pulseServerCandidates({ HOME: '/home/x' })).toEqual(['unix:/home/x/.pulse/native'])
  })

  it('skips a server that answers nothing, and takes the first live one', async () => {
    const probed: string[] = []
    const runner = async (_cmd: string, args: string[]) => {
      const server = args[1]
      probed.push(server)
      // A wedged server kills `pactl` — which exits 0 with no output at all.
      if (server === 'unix:/wedged') return { stdout: '' }
      if (server === 'unix:/good') return { stdout: 'Server String: unix:/good' }
      throw new Error('connection refused')
    }

    const result = await ensurePulseServer({
      env: { BOT_PULSE_SERVER: 'unix:/wedged', PULSE_SERVER: 'unix:/good' },
      runner,
      log: QUIET_LOG,
    })

    expect(result.server).toBe('unix:/good')
    expect(result.owned).toBe(false)
    expect(probed).toEqual(['unix:/wedged', 'unix:/good'])
  })

  it('starts a private daemon when nothing answers, with no ambient server or bus', async () => {
    const runtimePath = tmpDir('rexi-pulse-test-')
    const socket = path.join(runtimePath, 'native')
    const spawned: { cmd: string; env: Record<string, string> }[] = []
    const spawnFn = ((cmd: string, _args: string[], opts: { env: Record<string, string> }) => {
      spawned.push({ cmd, env: opts.env })
      fs.writeFileSync(socket, '')
      return { kill: () => {} }
    }) as unknown as typeof spawn
    const runner = async (_cmd: string, args: string[]) => {
      if (args[1] === `unix:${socket}` && fs.existsSync(socket)) {
        return { stdout: 'Server String: private' }
      }
      throw new Error('no server')
    }

    const result = await ensurePulseServer({
      env: { BOT_PULSE_RUNTIME_DIR: runtimePath, PULSE_SERVER: 'unix:/wedged' },
      runner,
      spawnFn,
      log: QUIET_LOG,
    })

    expect(result.server).toBe(`unix:${socket}`)
    expect(result.owned).toBe(true)
    expect(spawned[0].cmd).toBe('pulseaudio')
    // The private daemon must not inherit the broken server, and must not compete
    // for the session bus name the desktop daemon already owns.
    expect(spawned[0].env['PULSE_SERVER']).toBeUndefined()
    expect(spawned[0].env['DBUS_SESSION_BUS_ADDRESS']).toContain('nonexistent')
    fs.rmSync(runtimePath, { recursive: true, force: true })
  })
})

describe('unit: CDP framing and request/response', () => {
  it('reassembles a message split across reads and keeps the unterminated tail', () => {
    const seen: unknown[] = []
    const tail = drainMessages(Buffer.from('{"id":1}\0{"id":2'), (m: unknown) => seen.push(m))
    expect(seen).toEqual([{ id: 1 }])
    expect(tail.toString()).toBe('{"id":2')
  })

  it('drains several messages from one chunk', () => {
    const seen: unknown[] = []
    const rest = drainMessages(Buffer.from('{"a":1}\0{"b":2}\0'), (m: unknown) => seen.push(m))
    expect(seen).toEqual([{ a: 1 }, { b: 2 }])
    expect(rest.length).toBe(0)
  })

  it('resolves the reply carrying the request id and rejects CDP errors', async () => {
    const written: { id: number; method: string }[] = []
    const cdp = createCdp({
      write: (payload: unknown) => written.push(payload as { id: number; method: string }),
    })

    const pending = cdp.send('Target.getTargets', {}) as Promise<unknown>
    expect(written[0].method).toBe('Target.getTargets')
    cdp.settle({ id: written[0].id, result: { targetInfos: [] } })
    await expect(pending).resolves.toEqual({ targetInfos: [] })

    const failing = cdp.send('Runtime.evaluate', {}) as Promise<unknown>
    cdp.settle({ id: written[1].id, error: { message: 'boom' } })
    await expect(failing).rejects.toThrow('CDP Runtime.evaluate: boom')
  })
})

describe('unit: schedule windows (which rooms the bot sits in)', () => {
  const schedule = [
    { room: 'rexi-aaaaaaaaaaaaaaaa', startsAt: '2026-10-26T10:00:00Z', hours: 1 },
    { room: 'rexi-bbbbbbbbbbbbbbbb', startsAt: '2026-10-26T12:00:00Z', hours: 2 },
  ]

  it('selects only the window that contains the instant', () => {
    const active = activeWindows(schedule, new Date('2026-10-26T12:30:00Z'))
    expect(active.map((e: { room: string }) => e.room)).toEqual(['rexi-bbbbbbbbbbbbbbbb'])
  })

  it('excludes windows that have not started or have already elapsed', () => {
    expect(activeWindows(schedule, new Date('2026-10-26T09:59:00Z'))).toEqual([])
    expect(activeWindows(schedule, new Date('2026-10-26T11:30:00Z'))).toEqual([])
    expect(activeWindows(schedule, new Date('2026-10-26T14:00:00Z'))).toEqual([])
  })

  it('treats a missing schedule file as empty, with a log line instead of a crash', () => {
    const lines: string[] = []
    const log = { log: (m: string) => lines.push(m), error: (m: string) => lines.push(m) }
    const file = path.join(tmpDir('rexi-sched-'), 'absent.json')
    expect(readSchedule({ file, log: log as unknown as Console })).toEqual([])
    expect(lines.join('\n')).toContain('no schedule file')
  })
})

// ---------------------------------------------------------------------------
// Live proof: two real browser participants (one playing a 440 Hz tone) and the bot
// recording the room through PulseAudio. Gated so the default suite stays hermetic:
//
//   BOT_LIVE_TEST=1 npx vitest run src/__tests__/AC-006-bot-adapter.test.ts
//
// The room host is a public Jitsi deployment, not meet.jit.si: meet.jit.si now
// refuses to open a room without a signed-in moderator ("The conference has not yet
// started because no moderators have yet arrived"), so an anonymous live proof
// cannot start a conference there. The bot never starts a conference anyway — it
// joins one the booked humans already opened (see the capture.mjs header).
// ---------------------------------------------------------------------------
const LIVE = process.env['BOT_LIVE_TEST'] === '1'
const LIVE_BASE = process.env['BOT_LIVE_TEST_BASE'] || 'https://meet.ffmuc.net'
const PLAIN_HASH =
  '#config.prejoinConfig.enabled=false&config.prejoinPageEnabled=false&config.startWithVideoMuted=true'

type Page = { evaluate: (expression: string) => Promise<unknown>; close: () => void }

/** Attach to a headless Chrome's own page over its debug port (test-side only). */
async function connectHuman(port: number): Promise<Page> {
  for (let attempt = 0; attempt < 80; attempt++) {
    const page = await tryOpen(port)
    if (page) return page
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`no debuggable page on port ${port}`)
}

async function tryOpen(port: number): Promise<Page | null> {
  try {
    const list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
      type: string
      webSocketDebuggerUrl: string
    }[]
    const page = list.find((t) => t.type === 'page')
    return page ? await openSocket(page.webSocketDebuggerUrl) : null
  } catch {
    return null
  }
}

type CdpReply = {
  id?: number
  result?: { result?: { value?: unknown }; exceptionDetails?: { text?: string } }
}

/** The value a CDP reply carries (null when the page threw). */
function replyValue(reply: CdpReply): unknown {
  if (reply.result && reply.result.exceptionDetails) return null
  const inner = reply.result ? reply.result.result : undefined
  return inner ? inner.value : undefined
}

/** Hand one decoded CDP reply to the promise waiting on its id. */
function routeReply(reply: CdpReply, pending: Map<number, (value: unknown) => void>): void {
  if (reply.id === undefined) return
  const settle = pending.get(reply.id)
  if (!settle) return
  pending.delete(reply.id)
  settle(replyValue(reply))
}

function openSocket(wsUrl: string): Promise<Page> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const pending = new Map<number, (value: unknown) => void>()
    let id = 0
    ws.addEventListener('error', () => reject(new Error(`websocket failed: ${wsUrl}`)))
    ws.addEventListener('message', (event: { data: unknown }) => {
      routeReply(JSON.parse(String(event.data)) as CdpReply, pending)
    })
    ws.addEventListener('open', () =>
      resolve({
        evaluate: (expression: string) =>
          new Promise((done) => {
            const myId = ++id
            pending.set(myId, done)
            ws.send(
              JSON.stringify({
                id: myId,
                method: 'Runtime.evaluate',
                params: { expression, returnByValue: true },
              })
            )
          }),
        close: () => ws.close(),
      })
    )
  })
}

/** Wait until the Jitsi app is up in a page (its store is the readiness signal). */
async function waitForApp(page: Page, timeoutMs = 90_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await page.evaluate('Boolean(window.APP && APP.store && APP.store.getState())')) return
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('the Jitsi app never came up in the fake participant')
}

/**
 * Click the app's own microphone control until the participant really publishes an
 * unmuted audio track. A participant that only *looks* unmuted has no track at all
 * and contributes silence, so the track list — not the mute flag — is the signal.
 */
async function forcePublishAudio(page: Page): Promise<void> {
  const STATE = `(() => {
    const local = (APP.store.getState()['features/base/tracks'] || [])
      .filter((t) => t.mediaType === 'audio' && t.local)
    return { tracks: local.length, unmuted: local.filter((t) => !t.muted).length }
  })()`
  const CLICK = `(() => {
    const el = Array.from(document.querySelectorAll('[aria-label]'))
      .find((e) => /^(un)?mute microphone$/i.test((e.getAttribute('aria-label') || '').trim()))
    if (!el) return false
    el.click()
    return true
  })()`

  for (let attempt = 0; attempt < 15; attempt++) {
    const state = (await page.evaluate(STATE)) as { tracks: number; unmuted: number } | null
    if (state && state.tracks > 0 && state.unmuted > 0) return
    await page.evaluate(CLICK)
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error('the fake participant never published an audio track')
}

/** ffmpeg's volumedetect report for a file (ffmpeg exits non-zero on some inputs). */
async function volumedetectReport(file: string): Promise<string> {
  try {
    const result = await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-i',
      file,
      '-af',
      'volumedetect',
      '-f',
      'null',
      '/dev/null',
    ])
    return String(result.stderr)
  } catch (err) {
    return String((err as { stderr?: string }).stderr ?? '')
  }
}

/** Mean level of a recording in dB (ffmpeg volumedetect); silence reads about -91. */
async function meanVolumeDb(file: string): Promise<number> {
  const stderr = await volumedetectReport(file)
  const match = /mean_volume:\s*(-?\d+(?:\.\d+)?) dB/.exec(stderr)
  if (!match) throw new Error(`no mean_volume in volumedetect output:\n${stderr}`)
  return Number.parseFloat(match[1])
}

/** A headless Chrome participant with its own debug port and PulseAudio sink. */
function spawnHuman(input: {
  chromePath: string
  room: string
  name: string
  port: number
  pulseServer: string
  sink: string
  toneFile: string | null
}): { kill: (signal: string) => void } {
  const extra = input.toneFile ? [`--use-file-for-fake-audio-capture=${input.toneFile}`] : []
  const proc = spawn(
    input.chromePath,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      ...extra,
      `--user-data-dir=${tmpDir('rexi-live-profile-')}`,
      `--remote-debugging-port=${input.port}`,
      `${LIVE_BASE}/${input.room}${PLAIN_HASH}&userInfo.displayName=${encodeURIComponent(input.name)}`,
    ],
    {
      stdio: 'ignore',
      env: { ...process.env, PULSE_SERVER: input.pulseServer, PULSE_SINK: input.sink },
    }
  )
  return { kill: (signal: string) => proc.kill(signal as NodeJS.Signals) }
}

describe.skipIf(!LIVE)('live: the bot joins a room and records a real participant', () => {
  const cleanups: (() => void | Promise<void>)[] = []

  it(
    'records a two-human meeting, audible, in RECORDINGS_DIR (AC-006-14, AC-006-19)',
    async () => {
      const chromePath = resolveChromePath(process.env as Record<string, string | undefined>)
      const room = `rexi-${randomBytes(8).toString('hex')}`
      const work = tmpDir('rexi-live-work-')
      const recordings = tmpDir('rexi-live-recordings-')
      const tone = path.join(work, 'tone.wav')
      await execFileAsync('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:sample_rate=48000:duration=300',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        tone,
      ])

      const pulse = await ensurePulseServer({ env: process.env as Record<string, string | undefined> })
      cleanups.push(() => pulse.stop())
      const sink = await loadSink({ server: pulse.server, sinkName: sinkNameFor('livehumans') })
      cleanups.push(async () => {
        await execFileAsync('pactl', [
          '--server',
          pulse.server,
          'unload-module',
          sink.moduleId,
        ]).catch(() => {})
      })

      // Two fake humans, both publishing audio; one plays the 440 Hz tone.
      const humans = [
        { name: 'Ana Live', port: 9611, toneFile: tone },
        { name: 'Bruno Live', port: 9612, toneFile: null },
      ].map(({ name, port, toneFile }) => {
        const proc = spawnHuman({
          chromePath,
          room,
          name,
          port,
          pulseServer: pulse.server,
          sink: sink.sinkName,
          toneFile,
        })
        cleanups.push(() => proc.kill('SIGKILL'))
        return { name, port }
      })

      // They must be IN the room before the bot arrives — production order: the
      // booked humans open the room and the bot joins them.
      for (const human of humans) {
        const page = await connectHuman(human.port)
        cleanups.push(() => page.close())
        await waitForApp(page)
        await forcePublishAudio(page)
      }

      const result = await recordRoom({
        room,
        baseUrl: LIVE_BASE,
        env: { ...(process.env as Record<string, string>), RECORDINGS_DIR: recordings },
        log: console,
        sessionOptions: {
          graceMs: 2000,
          intervalMs: 2000,
          idleTimeoutMs: 180_000,
          maxDurationMs: 30_000,
        },
      })

      expect(result.ok).toBe(true)
      const file = String(result.file)
      expect(file.startsWith(recordings + path.sep)).toBe(true)
      expect(fs.existsSync(file)).toBe(true)
      expect(file.endsWith('.mp4')).toBe(true)

      // A finished session directory the unchanged pipeline sweeps.
      const sessionDir = path.dirname(file)
      const metadata = JSON.parse(fs.readFileSync(path.join(sessionDir, 'metadata.json'), 'utf8'))
      expect(metadata.meeting_url).toBe(`https://meet.jit.si/${room}`)

      const meanDb = await meanVolumeDb(file)
      // Recorded (not just asserted) so an audit can see HOW audible it was: a
      // silent capture reads about -91 dB, a real participant roughly -20 dB.
      process.stdout.write(`[live-proof] mean_volume=${meanDb} dB file=${file}\n`)
      expect(meanDb).toBeGreaterThan(-50)

      for (const cleanup of cleanups.reverse()) await cleanup()
      fs.rmSync(work, { recursive: true, force: true })
      fs.rmSync(recordings, { recursive: true, force: true })
    },
    300_000
  )
})
