// scripts/recording/bot/capture.mjs — the bot actually joins the call and records it.
//
// This is the adapter the earlier revision of this spec was missing: `--finalize`
// had a contract but nothing fed it. Here the bot
//
//   1. takes a dedicated PulseAudio null sink (pulse.mjs) and launches Chrome with
//      `PULSE_SINK` pointed at it (chrome.mjs / cdp.mjs),
//   2. navigates the real Jitsi app to `https://<jitsi-host>/<room>` and joins,
//   3. reads the participant list out of the app's OWN store over CDP — the bot's
//      own participant is the local one, and that is the identity excluded
//      (`participants.mjs` does the exclusion), never a display-name match,
//   4. hands the snapshots to `runSession`, which starts ffmpeg on the sink's
//      monitor once two non-bot humans are present and stops it when they leave,
//   5. finalizes into RECORDINGS_DIR through `output.mjs` (unchanged contract).
//
// Outbound only: Chrome's CDP rides file descriptors, and the only sockets opened
// are toward the Jitsi host.
//
// WHAT THE BOT DOES *NOT* DO: it never starts a conference. On meet.jit.si a room
// must be opened by a signed-in moderator; the bot joins a room that the booked
// humans have already opened, which is exactly its production role.

import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { launchBrowser, openPage } from './cdp.mjs'
import { finalizeRecording } from './output.mjs'
import { BOT_IDENTITY } from './participants.mjs'
import { ensurePulseServer, loadSink, sinkNameFor, startCapture, unloadSink } from './pulse.mjs'
import { runSession } from './session.mjs'

/** The fixed public Jitsi host (10-tasks.md decision 2); only the bot's own env may move it. */
export const DEFAULT_JITSI_BASE_URL = 'https://meet.jit.si'
export const JITSI_BASE_URL_ENV = 'BOT_JITSI_BASE_URL'
export const JOIN_TIMEOUT_MS = 90_000

/**
 * Hash parameters that keep the browser out of the pre-join lobby and stop it
 * publishing a fake camera/microphone into the meeting.
 *
 * Verified against the live app rather than assumed: meet.jit.si still shows the
 * pre-join page when only `config.prejoinPageEnabled=false` is passed, so both the
 * current (`prejoinConfig.enabled`) and legacy (`prejoinPageEnabled`) keys are sent,
 * and `joinRoom` clicks the page's own join button as a fallback.
 */
export const JOIN_HASH_CONFIG = [
  'config.prejoinConfig.enabled=false',
  'config.prejoinPageEnabled=false',
  'config.startWithAudioMuted=true',
  'config.startWithVideoMuted=true',
  'config.disableInitialGUM=true',
].join('&')

/**
 * The room URL the bot opens. The display name rides in `userInfo.displayName` so
 * the bot is recognisable in the roster without the participant logic depending on
 * it (identity exclusion uses the local participant, not the name).
 *
 * @param {{ baseUrl?: string, room: string, displayName?: string }} input
 * @returns {string}
 */
export function buildJoinUrl({ baseUrl = DEFAULT_JITSI_BASE_URL, room, displayName }) {
  const base = String(baseUrl).replace(/\/+$/, '')
  const name = displayName ? `&userInfo.displayName=${encodeURIComponent(displayName)}` : ''
  return `${base}/${room}#${JOIN_HASH_CONFIG}${name}`
}

/**
 * In-page expression that reads the participants from Jitsi's own redux store.
 *
 * Verified on the live app, not assumed: `features/base/participants.local` is this
 * browser's own participant, and `remote` is a Map-like collection with `size`,
 * `get` and `forEach` but **no** `valueSeq`/`toArray`/`toJS`, and no enumerable own
 * keys — so `Object.values()` and `JSON.stringify()` both report it as empty. Only
 * `forEach` can read it, which is why this is iterated rather than spread.
 */
export const PARTICIPANTS_EXPR = `(() => {
  try {
    const p = APP.store.getState()['features/base/participants']
    const local = p.local ? { id: p.local.id, name: p.local.name || '' } : null
    const map = p.remote || {}
    const remote = []
    const collect = (r) => {
      if (r && typeof r.id === 'string' && r.id.length > 0) {
        remote.push({ id: r.id, name: r.name || '' })
      }
    }
    if (typeof map.forEach === 'function') map.forEach((r) => collect(r))
    else Object.values(map).forEach((r) => collect(r))
    return { local, remote }
  } catch (err) {
    return null
  }
})()`

/** Does the page want a click before it will join? The pre-join page's own CTA. */
export const CLICK_JOIN_EXPR = `(() => {
  const labels = ['join meeting', 'unirse a la reunión', 'unirse a la reunion']
  const buttons = Array.from(document.querySelectorAll('div[role="button"], button'))
  const button = buttons.find((b) => labels.includes((b.innerText || '').trim().toLowerCase()))
  if (!button) return false
  button.click()
  return true
})()`

/**
 * Map the store snapshot to the participant list the decision units consume. The
 * bot's own entry is stamped with BOT_IDENTITY's id, which is what
 * `countNonBotHumans` excludes — a human who renamed themselves "Rexi Recorder"
 * keeps their own id and is still counted (AC-006-12).
 *
 * @param {{ local?: { id?: string, name?: string } | null,
 *   remote?: { id?: string, name?: string }[] } | null} snapshot
 * @returns {{ id: string, displayName: string }[]}
 */
export function participantsFromStore(snapshot) {
  if (!snapshot) return []
  const remotes = (snapshot.remote || [])
    .filter((r) => r && typeof r.id === 'string' && r.id.length > 0)
    .map((r) => ({ id: r.id, displayName: r.name || '' }))
  const own = snapshot.local ? [{ id: BOT_IDENTITY.id, displayName: ownName(snapshot.local) }] : []
  return [...own, ...remotes]
}

function ownName(local) {
  return local.name || BOT_IDENTITY.displayName
}

/**
 * Join the room and return a poller for its participants plus a teardown.
 *
 * @param {{ room: string, baseUrl?: string, env: Record<string, string|undefined>,
 *   audioServer: string, sinkName: string, log?: Console,
 *   spawnFn?: Function, launchBrowserFn?: Function }} input
 */
export async function joinRoom({
  room,
  baseUrl = DEFAULT_JITSI_BASE_URL,
  env,
  audioServer,
  sinkName,
  log = console,
  launchBrowserFn = launchBrowser,
}) {
  const browserEnv = { ...env, PULSE_SERVER: audioServer, PULSE_SINK: sinkName }
  const joinUrl = buildJoinUrl({ baseUrl, room, displayName: BOT_IDENTITY.displayName })
  const browser = launchBrowserFn({
    env: browserEnv,
    log,
    url: joinUrl,
    extraArgs: ['--allow-insecure-localhost'],
  })
  try {
    await browser.ready
    const page = await openPage({ cdp: browser.cdp })
    // The URL is also passed on the command line (so Chrome opens the foreground
    // tab on it); navigating explicitly makes the target URL certain either way.
    await page.navigate(joinUrl)
    await waitForJoin({ page, log })
    return {
      participants: async () => participantsFromStore(await page.evaluate(PARTICIPANTS_EXPR)),
      close: () => browser.close(),
    }
  } catch (err) {
    browser.close()
    throw err
  }
}

/** Poll the page until Jitsi's store exists, clicking the pre-join CTA if it shows. */
async function waitForJoin({ page, log, timeoutMs = JOIN_TIMEOUT_MS }) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const snapshot = await page.evaluate(PARTICIPANTS_EXPR)
    if (snapshot) {
      log.log('[recording-bot] joined the room')
      return snapshot
    }
    await page.evaluate(CLICK_JOIN_EXPR)
    await delay(1000)
  }
  throw new Error(`the Jitsi app never exposed its participant store within ${timeoutMs} ms`)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Record one room end to end: join, wait for two non-bot humans, capture, stop,
 * finalize into RECORDINGS_DIR.
 *
 * The capture file lives in a temporary directory; nothing is written under
 * RECORDINGS_DIR until the capture has stopped and `finalizeRecording` muxes it.
 *
 * @param {{ room: string, baseUrl?: string, env: Record<string, string|undefined>,
 *   log?: Console, sessionOptions?: object, deps?: object }} input
 * @returns {Promise<{ ok: boolean, reason: string, file?: string }>}
 */
export async function recordRoom({
  room,
  baseUrl,
  env,
  log = console,
  sessionOptions = {},
  deps = {},
}) {
  const sinkName = sinkNameFor(process.pid)
  const workDir = mkdtempSync(path.join(os.tmpdir(), 'rexi-bot-capture-'))
  const pulse = await (deps.ensurePulseServer || ensurePulseServer)({ env, log })
  const sink = await (deps.loadSink || loadSink)({ server: pulse.server, sinkName, log })
  try {
    return await captureWithRoom({
      room,
      baseUrl,
      env,
      log,
      pulse,
      sink,
      workDir,
      sessionOptions,
      deps,
    })
  } finally {
    await (deps.unloadSink || unloadSink)({ server: pulse.server, moduleId: sink.moduleId, log })
    pulse.stop()
    rmSync(workDir, { recursive: true, force: true })
  }
}

/** The join→record→finalize half, split out so every exit still runs the teardown above. */
async function captureWithRoom({
  room,
  baseUrl,
  env,
  log,
  pulse,
  sink,
  workDir,
  sessionOptions,
  deps,
}) {
  const room$ = await (deps.joinRoom || joinRoom)({
    room,
    baseUrl,
    env,
    audioServer: pulse.server,
    sinkName: sink.sinkName,
    log,
  })
  const capture = makeCapture({ room, env, log, pulse, sink, workDir, deps })
  try {
    const { reason, artifact } = await (deps.runSession || runSession)({
      poll: room$.participants,
      capture,
      ...sessionOptions,
    })
    if (!artifact) {
      log.log(`[recording-bot] nothing recorded for ${room} (${reason})`)
      return { ok: false, reason }
    }
    log.log(`[recording-bot] capture ended for ${room} (${reason}); muxing`)
    return { ok: true, reason, file: artifact.file }
  } finally {
    room$.close()
  }
}

/** The capture device `runSession` drives: ffmpeg on the sink, then the muxer. */
function makeCapture({ room, env, log, pulse, sink, workDir, deps }) {
  const execFileAsync = promisify(deps.execFile || execFile)
  const runner = async (cmd, args) => {
    const { stdout } = await execFileAsync(cmd, args, { maxBuffer: 64 * 1024 * 1024 })
    return { stdout: String(stdout) }
  }
  let current = null
  return {
    async start() {
      const outPath = path.join(workDir, `capture-${Date.now()}.wav`)
      const start = deps.startCapture || startCapture
      current = {
        outPath,
        handle: start({ server: pulse.server, sinkName: sink.sinkName, outPath, env, log }),
      }
    },
    async stop() {
      if (!current) return null
      const { outPath, handle } = current
      current = null
      await handle.stop()
      const result = await finalizeRecording({ room, audioPath: outPath, env, runner, log })
      return result.ok ? result : null
    },
  }
}
