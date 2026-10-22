// tests/e2e/auto-record-lib.mjs — zero-npm-dependency driver for the spec-004
// e2e journeys (live e2e remediation D4). The journeys used to assume an `e2e`
// framework package plus its `test()`/`agent()` globals; that package is not a
// repo dependency and no new dependency may be added. This lib needs only
// node builtins and the web globals Node already ships (fetch, WebSocket,
// setTimeout), driving a host chromium binary over the DevTools Protocol.
// The e2e-runner stage executes the journeys directly:
//   node tests/e2e/auto-record-full-chain.e2e.ts
//   node tests/e2e/auto-record-consent-boundary.e2e.ts
//
// Techniques below are lifted from the proven /tmp/e2e-audio harness (the live
// run that found defects D1–D4):
//   * WSL2/Chrome fake-capture flags (--use-fake-device-for-media-capture
//     --use-file-for-fake-audio-capture) produce ZERO capture devices on this
//     host — verified (enumerateDevices empty, GUM NotFoundError). Replacement:
//     a page-init getUserMedia override feeding Jitsi a looping WebAudio
//     MediaStreamAudioDestinationNode of the customer clip (real PCM content)
//     plus a canvas captureStream video track.
//   * this Jitsi build has no stable #enter_displayName and no #toolbar-hangup:
//     joining is display-name-agnostic (fill whatever name input appears,
//     click whatever join button appears, proceed without if neither does),
//     and LEAVING is closing the browser — Jitsi treats disconnection as a
//     departure and Jibri finalizes.
//   * self-signed cert: launched with --ignore-certificate-errors AND
//     Security.setIgnoreCertificateErrors.

import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Repo root, resolved from this file's location (tests/e2e/* lives two below). */
export function projectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function log(tag, ...rest) {
  console.log(new Date().toISOString(), `[e2e:${tag}]`, ...rest)
}

export function env(name, fallback) {
  const v = process.env[name]
  return v === undefined || v === '' ? fallback : v
}

/** rexi-<16hex> — the exact shape src/domain/meeting.ts mints booked rooms. */
export function uniqueRoom(prefix) {
  return `${prefix}${randomBytes(8).toString('hex')}`
}

/** RECORDINGS_DIR from env, else the repo .env (decision 10 — no hardcoded path). */
export function recordingsDir(repoRoot) {
  const fromEnv = env('RECORDINGS_DIR')
  if (fromEnv) return fromEnv
  const dot = path.join(repoRoot, '.env')
  if (existsSync(dot)) {
    const m = readFileSync(dot, 'utf8').match(/^RECORDINGS_DIR=(.+)$/m)
    if (m) return m[1].trim()
  }
  throw new Error(
    'RECORDINGS_DIR is not set and repo .env has none — see docs/local-e2e-testing.md'
  )
}

/**
 * Page-init source installing the fake capture devices. `source` runs before
 * any page script via Page.addScriptToEvaluateOnNewDocument; the clip arrives
 * as base64 so no file access is needed inside the page.
 */
export function fakeMediaSource(clipB64) {
  return `(function () {
    var CLIP_B64 = ${JSON.stringify(clipB64)}
    var md = navigator.mediaDevices
    if (!md) return
    md.getUserMedia = function (constraints) {
      constraints = constraints || {}
      var wantAudio = constraints.audio !== false
      var wantVideo = constraints.video !== false
      var ready = wantAudio ? ensureAudio() : Promise.resolve()
      return ready.then(function () {
        var tracks = []
        if (wantAudio) tracks = tracks.concat(globalThis.__rexiAudioStream.getAudioTracks())
        if (wantVideo) tracks = tracks.concat(fakeVideoTrack().getVideoTracks())
        for (var i = 0; i < tracks.length; i++) {
          if (tracks[i].kind === 'audio') tracks[i].label = 'Rexi E2E Fake Mic'
        }
        return new MediaStream(tracks)
      })
    }
    function ensureAudio() {
      if (globalThis.__rexiAudioStream) return Promise.resolve()
      var bin = atob(CLIP_B64)
      var bytes = new Uint8Array(bin.length)
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      var ac = new (window.AudioContext || window.webkitAudioContext)()
      return ac.decodeAudioData(bytes.buffer.slice(0)).then(function (buf) {
        var dest = ac.createMediaStreamDestination()
        var src = ac.createBufferSource()
        src.buffer = buf
        src.loop = true
        src.connect(dest)
        src.start()
        globalThis.__rexiAudioStream = dest.stream
      })
    }
    function fakeVideoTrack() {
      if (!globalThis.__rexiVideoStream) {
        var c = document.createElement('canvas')
        c.width = 1280
        c.height = 720
        var g = c.getContext('2d')
        g.fillStyle = '#1c2b4a'
        g.fillRect(0, 0, 1280, 720)
        g.fillStyle = '#ffffff'
        g.font = '44px sans-serif'
        g.fillText('E2E customer (fake camera)', 90, 370)
        globalThis.__rexiVideoStream = c.captureStream(5)
      }
      return globalThis.__rexiVideoStream
    }
    var origEnum = md.enumerateDevices ? md.enumerateDevices.bind(md) : null
    md.enumerateDevices = function () {
      return (origEnum ? origEnum().catch(function () { return [] }) : Promise.resolve([])).then(
        function (real) {
          return real.concat([
            { deviceId: 'rexi-fake-mic', groupId: 'rexi', kind: 'audioinput', label: 'Rexi E2E Fake Mic' },
            { deviceId: 'rexi-fake-cam', groupId: 'rexi', kind: 'videoinput', label: 'Rexi E2E Fake Cam' },
          ])
        }
      )
    }
  })()`
}

// ---------------------------------------------------------------------------
// Minimal DevTools-Protocol client (browser-level websocket + flat sessions).
// ---------------------------------------------------------------------------

class CdpConnection {
  constructor(ws) {
    this.ws = ws
    this.nextId = 1
    this.pending = new Map()
    this.eventHandlers = []
    ws.onmessage = (ev) => this.dispatch(JSON.parse(ev.data))
  }

  static connect(url) {
    const ws = new globalThis.WebSocket(url)
    return new Promise((resolve, reject) => {
      ws.onopen = () => resolve(new CdpConnection(ws))
      ws.onerror = (e) => reject(new Error(`cdp websocket error: ${e?.message || e}`))
    })
  }

  dispatch(msg) {
    if (msg.id !== undefined && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id)
      this.pending.delete(msg.id)
      if (msg.error) reject(new Error(`cdp ${msg.error.message}`))
      else resolve(msg.result)
      return
    }
    for (const h of this.eventHandlers) h(msg)
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    this.ws.send(JSON.stringify(payload))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  on(fn) {
    this.eventHandlers.push(fn)
  }

  close() {
    try {
      this.ws.close()
    } catch {
      /* already closed */
    }
  }
}

async function readDevToolsPort(profileDir) {
  const file = path.join(profileDir, 'DevToolsActivePort')
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (existsSync(file)) {
      const port = readFileSync(file, 'utf8').split('\n')[0].trim()
      if (/^\d+$/.test(port)) return port
    }
    await sleep(200)
  }
  throw new Error('chrome never wrote DevToolsActivePort — is CHROME_EXEC a chromium build?')
}

async function jsonFrom(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`)
  return res.json()
}

/**
 * Launch a headless chromium with a looping fake-media page attached.
 * Returns { evaluate, goto, close } — close() ends the browser process, which
 * for Jitsi IS the departure (this build has no #toolbar-hangup to click).
 */
export async function openFakeMediaPage({ clipPath, tag, stackUrl }) {
  const exec =
    env('CHROME_EXEC') || '/home/dbueno/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'
  if (!existsSync(exec)) throw new Error(`chromium binary not found: ${exec} (set CHROME_EXEC)`)
  const profileDir = mkdtempSync(path.join(tmpdir(), `rexi-e2e-${tag}-`))
  const proc = spawn(
    exec,
    [
      '--headless=new',
      `--user-data-dir=${profileDir}`,
      '--remote-debugging-port=0',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      '--autoplay-policy=no-user-gesture-required',
      '--lang=en-US',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  )
  const port = await readDevToolsPort(profileDir)
  const version = await jsonFrom(`http://127.0.0.1:${port}/json/version`)
  const cdp = await CdpConnection.connect(version.webSocketDebuggerUrl)
  const origin = new URL(stackUrl).origin
  await cdp.send('Browser.grantPermissions', {
    origin,
    permissions: ['audioCapture', 'videoCapture'],
  })
  await cdp.send('Security.setIgnoreCertificateErrors', { ignore: true })

  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  cdp.on((msg) => {
    if (msg.method === 'Page.javascriptDialogOpening' && msg.sessionId === sessionId) {
      cdp
        .send('Page.handleJavaScriptDialog', { accept: true, message: '' }, sessionId)
        .catch(() => {})
    }
  })
  await cdp.send('Page.enable', {}, sessionId)
  await cdp.send('Runtime.enable', {}, sessionId)
  const clipB64 = readFileSync(clipPath).toString('base64')
  await cdp.send(
    'Page.addScriptToEvaluateOnNewDocument',
    { source: fakeMediaSource(clipB64) },
    sessionId
  )

  return {
    tag,
    evaluate: (expression) => evaluate(cdp, sessionId, expression),
    goto: async (url) => {
      await cdp.send('Page.navigate', { url }, sessionId)
    },
    close: async () => {
      cdp.close()
      proc.kill('SIGTERM')
      await sleep(1000)
      if (proc.exitCode === null) proc.kill('SIGKILL')
      rmSync(profileDir, { recursive: true, force: true })
    },
  }
}

async function evaluate(cdp, sessionId, expression) {
  const res = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId
  )
  if (res.exceptionDetails) {
    throw new Error(
      `page evaluate threw: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`
    )
  }
  return res.result.value
}

// ---------------------------------------------------------------------------
// Display-name-agnostic join flow (this build exposes no #enter_displayName).
// ---------------------------------------------------------------------------

const IN_MEETING_CHECK = `!!(document.querySelector('#videoconference_page') &&
  getComputedStyle(document.querySelector('#videoconference_page')).display !== 'none')`

const NAME_INPUT_FILL = (name) => `(() => {
  var sel = 'input[type="text"], input:not([type])'
  var input = document.querySelector(sel)
  if (!input) return false
  var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, ${JSON.stringify(name)})
  input.dispatchEvent(new Event('input', { bubbles: true }))
  return true
})()`

const JOIN_CLICK = `(() => {
  var re = /join meeting|add (my|your|a) name|join now|start meeting|enter|proceed/i
  var btns = Array.from(document.querySelectorAll('button, [role="button"]'))
  var b = btns.find(function (x) { return re.test((x.textContent || '').trim()) })
  if (b) { b.click(); return (b.textContent || '').trim() }
  var input = document.querySelector('input')
  if (input && typeof input.form?.requestSubmit === 'function') { input.form.requestSubmit(); return 'form-submit' }
  return null
})()`

/**
 * Join whatever way this build offers. Zero-dialog builds go straight to the
 * conference page; name-dialog builds get name + join. Confirmation is always
 * the real page state (#videoconference_page), never a selector guess.
 */
export async function joinMeeting(page, displayName, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs
  let attemptedJoin = false
  while (Date.now() < deadline) {
    if (await page.evaluate(IN_MEETING_CHECK)) {
      log(page.tag, 'IN_MEETING confirmed')
      return
    }
    if (await page.evaluate(NAME_INPUT_FILL(displayName))) {
      const clicked = await page.evaluate(JOIN_CLICK)
      if (clicked && !attemptedJoin) {
        log(page.tag, `display name filled; join clicked via "${clicked}"`)
        attemptedJoin = true
      }
    }
    await sleep(1000)
  }
  throw new Error(
    `could not reach #videoconference_page within ${timeoutMs}ms (display-name-agnostic flow exhausted)`
  )
}

// ---------------------------------------------------------------------------
// Jibri session-dir observation + processor / gh helpers (all host-side fs +
// injected-free spawn of host binaries — bl/ffmpeg/gh/node, no npm packages).
// ---------------------------------------------------------------------------

function mp4sIn(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.mp4'))
      .map((f) => path.join(dir, f))
      .filter((f) => statSync(f).isFile())
  } catch {
    return []
  }
}

/** Session dirs under recordingsRoot whose mp4 belongs to room. */
export function sessionDirsForRoom(recordingsRoot, room) {
  if (!existsSync(recordingsRoot)) return []
  return readdirSync(recordingsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(recordingsRoot, d.name))
    .filter((dir) => mp4sIn(dir).some((f) => path.basename(f).startsWith(`${room}_`)))
}

export async function waitForJibriSession(recordingsRoot, room, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const dirs = sessionDirsForRoom(recordingsRoot, room)
    if (dirs.length > 0) return dirs[0]
    await sleep(2000)
  }
  return null
}

/** Finalized when mp4(s) exist, metadata.json is present, and every size is unchanged across 5 s. */
export async function waitForFinalized(sessionDir, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs
  const metaPath = path.join(sessionDir, 'metadata.json')
  let previous = ''
  while (Date.now() < deadline) {
    const sizes = mp4sIn(sessionDir)
      .map((f) => statSync(f).size)
      .join(',')
    if (sizes && sizes === previous && existsSync(metaPath)) return mp4sIn(sessionDir)
    previous = sizes
    await sleep(5000)
  }
  throw new Error(`session dir ${sessionDir} did not finalize within ${timeoutMs}ms`)
}

/** `<room>_YYYY-MM-DD-HH-MM-SS.mp4` -> YYYY-MM-DD (decision 7 title date). */
export function sessionDateFromMp4(mp4Paths) {
  for (const p of mp4Paths) {
    const m = path.basename(p).match(/_(\d{4}-\d{2}-\d{2})-/)
    if (m) return m[1]
  }
  throw new Error('no Jibri-timestamped mp4 found for session-date parse')
}

export function runProcessor({ repoRoot, room, sessionDir }) {
  const script = path.join(repoRoot, 'scripts/process-recording.mjs')
  const res = spawnSync('node', [script, '--room', room, '--recording', sessionDir], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: process.env, // DASHSCOPE_API_KEY / GH_TOKEN / RECORDINGS_DIR passthrough
  })
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' }
}

export function listInsightIssues(title) {
  const out = spawnSync(
    'gh',
    [
      'issue',
      'list',
      '--repo',
      'RexiAI/rexiAI',
      '--state',
      'all',
      '--json',
      'number,title,labels',
      '--limit',
      '200',
    ],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  ).stdout
  const issues = JSON.parse(out || '[]')
  return issues.filter((i) => i.title === title)
}

export function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION_FAILED: ${message}`)
}
