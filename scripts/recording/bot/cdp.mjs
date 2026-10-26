// scripts/recording/bot/cdp.mjs — the DevTools-protocol link to the bot's browser.
//
// Chrome launched with `--remote-debugging-pipe` speaks CDP as NUL-terminated JSON
// over file descriptors 3 (to Chrome) and 4 (from Chrome). No WebSocket client, no
// HTTP endpoint, no listening socket — which is why the pipe transport is used
// instead of `--remote-debugging-port` (10-tasks.md §Scope boundaries: no inbound
// ports; the host sits behind carrier NAT).
//
// Only what the adapter needs: create a page target, attach to it (flat session),
// navigate, and evaluate an expression in the page.

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { CHROME_LAUNCH_TIMEOUT_MS, chromeArgs, resolveChromePath } from './chrome.mjs'

const DEFAULT_TIMEOUT_MS = 20_000
/** FDs Chrome expects for the pipe transport: 3 = read by Chrome, 4 = written by Chrome. */
const PIPE_STDIO = ['ignore', 'pipe', 'pipe', 'pipe', 'pipe']

/**
 * Split a growing byte buffer into complete NUL-terminated CDP messages. Returned
 * buffer holds the unterminated tail, so a message split across reads is reassembled
 * rather than mis-parsed.
 *
 * @param {Buffer} buffer
 * @param {(message: unknown) => void} onMessage
 * @returns {Buffer} the unconsumed tail
 */
export function drainMessages(buffer, onMessage) {
  let rest = buffer
  let end = rest.indexOf(0)
  while (end !== -1) {
    const raw = rest.subarray(0, end).toString('utf8')
    rest = rest.subarray(end + 1)
    if (raw.trim()) onMessage(JSON.parse(raw))
    end = rest.indexOf(0)
  }
  return rest
}

/**
 * A request/response CDP client over a write function. `settle` is fed every
 * inbound message; a reply carries the id of the request that caused it.
 *
 * @param {{ write: (payload: unknown) => void, timeoutMs?: number,
 *   timers?: { setTimeout: Function, clearTimeout: Function } }} input
 */
export function createCdp({ write, timeoutMs = DEFAULT_TIMEOUT_MS, timers = { setTimeout, clearTimeout } }) {
  let nextId = 0
  const pending = new Map()

  function settle(message) {
    const id = message && message.id
    const entry = id ? pending.get(id) : null
    if (!entry) return
    pending.delete(id)
    timers.clearTimeout(entry.timer)
    if (message.error) entry.reject(new Error(`CDP ${entry.method}: ${message.error.message}`))
    else entry.resolve(message.result ?? {})
  }

  function send(method, params = {}, sessionId) {
    const id = ++nextId
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params }
    return new Promise((resolve, reject) => {
      const timer = timers.setTimeout(
        () => {
          pending.delete(id)
          reject(new Error(`CDP ${method} timed out after ${timeoutMs} ms`))
        },
        timeoutMs
      )
      pending.set(id, { resolve, reject, timer, method })
      write(payload)
    })
  }

  return { send, settle }
}

/** Attach the message reader for `createCdp`'s `settle` to Chrome's stdout pipe. */
export function readFromStream(stream, onMessage) {
  let buffer = Buffer.alloc(0)
  stream.on('data', (chunk) => {
    buffer = drainMessages(Buffer.concat([buffer, chunk]), onMessage)
  })
}

/**
 * Attach to the browser's own page and drive it.
 *
 * Why ATTACH rather than create a new tab: a page created over CDP in the headless
 * shell is not the foreground tab, and its audio pipeline stayed silent in live
 * testing — the bot recorded 60 s of digital silence while a plain participant in
 * the same room heard the speaker. Driving the tab Chrome itself opened (the URL is
 * passed on the command line) is what a real participant does.
 *
 * Returns `{ evaluate, navigate, sessionId }`; `evaluate` resolves the expression's
 * value (by value), or `null` when the page threw — a page that is not up yet must
 * not crash the poll loop.
 *
 * @param {{ cdp: { send: Function } }} input
 */
export async function openPage({ cdp }) {
  const { targetInfos = [] } = await cdp.send('Target.getTargets')
  const existing = targetInfos.find((t) => t.type === 'page')
  const targetId = existing
    ? existing.targetId
    : (await cdp.send('Target.createTarget', { url: 'about:blank' })).targetId
  const attached = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  const sessionId = attached.sessionId

  async function evaluate(expression) {
    const reply = await cdp.send(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true },
      sessionId
    )
    if (reply.exceptionDetails) return null
    return reply.result ? reply.result.value : null
  }

  function navigate(url) {
    return cdp.send('Page.navigate', { url }, sessionId)
  }

  return { evaluate, navigate, sessionId }
}

/**
 * Launch Chrome under the pipe transport and return the driver plus a teardown that
 * always runs (a leaked browser would keep rendering into the audio sink).
 *
 * @param {{ env: Record<string, string | undefined>, log?: Console,
 *   extraArgs?: string[], url?: string,
 *   spawnFn?: typeof spawn }} input
 */
export function launchBrowser({ env, log = console, extraArgs = [], url, spawnFn = spawn }) {
  const chromePath = resolveChromePath(env)
  const profileDir = mkdtempSync(path.join(os.tmpdir(), 'rexi-bot-profile-'))
  const args = chromeArgs({ profileDir, url, extra: extraArgs })
  const proc = spawnFn(chromePath, args, { stdio: PIPE_STDIO, env })
  const cdp = createCdp({ write: (payload) => proc.stdio[3].write(`${JSON.stringify(payload)}\0`) })
  readFromStream(proc.stdio[4], cdp.settle)

  let answered = false
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Chrome did not answer CDP within ${CHROME_LAUNCH_TIMEOUT_MS} ms`)),
      CHROME_LAUNCH_TIMEOUT_MS
    )
    proc.once('exit', (code) => {
      if (answered) return
      clearTimeout(timer)
      reject(new Error(`Chrome exited with code ${code} before answering CDP`))
    })
    // A first round-trip proves the pipe is live; the timer above covers a hang.
    cdp.send('Browser.getVersion').then(
      () => {
        answered = true
        clearTimeout(timer)
        resolve()
      },
      () => {}
    )
  })
  // Teardown kills Chrome, which fires the exit handler: never leave the
  // rejection unobserved when the caller has already moved on.
  ready.catch(() => {})

  function close() {
    try {
      proc.kill('SIGKILL')
    } catch (err) {
      log.error(`[recording-bot] could not kill Chrome: ${err.message}`)
    }
    // Chrome's own helper processes can still be flushing the profile when the
    // browser is killed; retry instead of failing the session on ENOTEMPTY.
    try {
      rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    } catch (err) {
      log.error(`[recording-bot] could not remove ${profileDir}: ${err.message}`)
    }
  }

  return { proc, cdp, close, ready }
}
