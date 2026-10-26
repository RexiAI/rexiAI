// scripts/recording/bot/pulse.mjs — where the bot's ears are.
//
// A browser sends the meeting's audio to whatever sound card the OS gives it. On
// this host that is PulseAudio (WSLg provides a server). The bot therefore:
//
//   1. gets a PulseAudio server (the ambient one when it answers, otherwise a
//      private daemon of its own — the WSLg one is not always healthy),
//   2. loads a DEDICATED null sink per session, so only the bot's browser renders
//      into it and no other sound on the host leaks into the recording,
//   3. points Chrome at that sink (`PULSE_SINK`),
//   4. records the sink's `.monitor` source with ffmpeg.
//
// Everything is unloaded on every exit path, including a crash: a leaked sink or a
// leaked daemon would poison the next session.
//
// The capture lands in a TEMPORARY directory, never in RECORDINGS_DIR — a session
// becomes visible to the pipeline only when it is finalized (output.mjs).

import { execFile, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const PULSE_SERVER_ENV = 'BOT_PULSE_SERVER'
export const PRIVATE_RUNTIME_DIR_ENV = 'BOT_PULSE_RUNTIME_DIR'
export const SINK_PREFIX = 'rexi-bot'
/** Speech recognition only needs the speech band; mono 16 kHz keeps the temp file small. */
const CAPTURE_RATE = '16000'
const PACTL_TIMEOUT_MS = 2000
/** Loading/unloading a module is fast on a live server; a hang here must not block teardown. */
const PACTL_MODULE_TIMEOUT_MS = 10_000
const DAEMON_BOOT_TIMEOUT_MS = 5000

/** The per-session sink name. Distinct per process, so two bots cannot collide. */
export function sinkNameFor(pid) {
  return `${SINK_PREFIX}-${pid}`
}

/**
 * ffmpeg argv that records a null sink's monitor source.
 *
 * @param {{ sinkName: string, outPath: string }} input
 * @returns {string[]}
 */
export function buildCaptureArgs({ sinkName, outPath }) {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'pulse',
    '-i',
    `${sinkName}.monitor`,
    '-ac',
    '1',
    '-ar',
    CAPTURE_RATE,
    '-c:a',
    'pcm_s16le',
    outPath,
  ]
}

/** `pactl` argv for loading the session's null sink, plus the module id it returns. */
export function buildLoadSinkArgs({ server, sinkName }) {
  return [
    '--server',
    server,
    'load-module',
    'module-null-sink',
    `sink_name=${sinkName}`,
    `sink_properties=device.description=${sinkName}`,
  ]
}

/**
 * The sink a module actually created, read out of `pactl list sinks`.
 *
 * WHY THIS EXISTS: `module-null-sink` does not fail when the requested `sink_name`
 * is already taken — PulseAudio silently creates `name.2`, `name.3`, … and the
 * module id it returns tells you nothing about the final name. Capturing
 * `<requested>.monitor` in that case records the WRONG (possibly stale) sink, which
 * is exactly the kind of silent-wrong-answer a recorder must never produce. So the
 * real name is read back from the module that was just loaded.
 *
 * @param {string} listOutput raw `pactl list sinks`
 * @param {string | number} moduleId owner module to look for
 * @returns {string | null}
 */
export function sinkNameForModule(listOutput, moduleId) {
  const owner = new RegExp(`Owner Module:\\s*${String(moduleId).trim()}\\b`)
  for (const block of String(listOutput).split(/\n(?=Sink #)/)) {
    if (!owner.test(block)) continue
    const name = /^\s*Name:\s*(\S+)\s*$/m.exec(block)
    if (name) return name[1]
  }
  return null
}

/** `pactl` argv for unloading a module by id (the sink's teardown). */
export function buildUnloadModuleArgs({ server, moduleId }) {
  return ['--server', server, 'unload-module', String(moduleId)]
}

/**
 * PulseAudio servers to try, in order: an explicit bot override, the ambient
 * `PULSE_SERVER`, then the conventional per-user sockets.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function pulseServerCandidates(env = {}) {
  const listed = [env[PULSE_SERVER_ENV], env['PULSE_SERVER']]
  const runtime = env['XDG_RUNTIME_DIR']
  if (runtime) listed.push(`unix:${path.join(runtime, 'pulse', 'native')}`)
  if (env['HOME']) listed.push(`unix:${path.join(env['HOME'], '.pulse', 'native')}`)
  return listed.filter((s) => typeof s === 'string' && s.length > 0)
}

/**
 * Does this server answer a trivial command? A wedged socket hangs, so it is
 * bounded — and the ANSWER is checked, not just the exit code: `pactl` installs a
 * SIGTERM handler, so a killed (hung) invocation still exits 0 with no output.
 * Trusting the exit code would hand back a dead server.
 */
async function responds(server, runner) {
  try {
    const { stdout } = await runner('pactl', ['--server', server, 'info'], {
      timeout: PACTL_TIMEOUT_MS,
    })
    return /Server String:/i.test(String(stdout))
  } catch {
    return false
  }
}

function waitForSocket(socketPath, deadlineMs, runtimePath) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (existsSync(socketPath)) return resolve()
      if (Date.now() - started > deadlineMs) {
        return reject(
          new Error(
            `PulseAudio socket never appeared at ${socketPath}${daemonLogTail(runtimePath)}`
          )
        )
      }
      setTimeout(tick, 100)
    }
    tick()
  })
}

/** The daemon's own log, quoted in the failure message so the cause is not a guess. */
function daemonLogTail(runtimePath) {
  try {
    const log = readFileSync(path.join(runtimePath, 'daemon.log'), 'utf8').trim()
    return log ? ` — daemon log: ${log.split('\n').slice(-3).join(' | ')}` : ''
  } catch {
    return ''
  }
}

/** A stable runtime dir for the bot's own daemon, so a later run reuses it. */
export function privateRuntimeDir(env = {}) {
  return env[PRIVATE_RUNTIME_DIR_ENV] || path.join(os.tmpdir(), 'rexi-bot-pulse')
}

/**
 * Start a private PulseAudio daemon in its own runtime dir. Used when no ambient
 * server answers: the bot must not depend on the desktop session being healthy
 * (WSLg's PulseAudio sits outside this distro and can wedge, which is exactly the
 * case that made this fallback necessary).
 *
 * The daemon is left running with a 60 s idle timeout instead of being killed on
 * exit: only ONE PulseAudio daemon per user can hold the session bus name, so a
 * short-lived daemon that another concurrent session still needs is worse than one
 * that reaps itself shortly after the last client goes away.
 */
async function startPrivateDaemon({ env, log, runner, spawnFn }) {
  const runtimePath = privateRuntimeDir(env)
  mkdirSync(runtimePath, { recursive: true })
  // PULSE_SERVER would point the new daemon at the wedged server. The D-Bus
  // address is deliberately unreachable: this host's session bus already has an
  // `org.PulseAudio1` owner (the desktop/WSLg server), and PulseAudio treats a lost
  // name race as fatal — it exits before creating its socket. With no bus to claim,
  // it logs a warning and serves normally, which is all the bot needs.
  const daemonEnv = { ...env, PULSE_RUNTIME_PATH: runtimePath }
  delete daemonEnv['PULSE_SERVER']
  daemonEnv['DBUS_SESSION_BUS_ADDRESS'] = 'unix:path=/nonexistent-rexi-bot-dbus'
  const proc = spawnFn(
    'pulseaudio',
    [
      '-n',
      '--daemonize=no',
      '--exit-idle-time=60',
      '--load=module-native-protocol-unix',
      `--log-target=file:${path.join(runtimePath, 'daemon.log')}`,
    ],
    { stdio: 'ignore', env: daemonEnv }
  )
  const server = `unix:${path.join(runtimePath, 'native')}`
  await waitForSocket(path.join(runtimePath, 'native'), DAEMON_BOOT_TIMEOUT_MS, runtimePath)
  if (!(await responds(server, runner))) {
    throw new Error(
      `private PulseAudio daemon did not answer at ${server} — see ${path.join(runtimePath, 'daemon.log')}`
    )
  }
  log.log(`[recording-bot] started private PulseAudio server at ${server}`)
  return { server, owned: true, stop() {}, proc, runtimePath }
}

/**
 * A usable PulseAudio server: the first candidate that answers, else a private
 * daemon. Throws when neither works — a bot that cannot hear must not report a
 * recording.
 *
 * @param {{ env: Record<string, string | undefined>, log?: Console,
 *   runner?: Function, spawnFn?: typeof spawn }} input
 */
export async function ensurePulseServer({
  env,
  log = console,
  runner = execFileAsync,
  spawnFn = spawn,
}) {
  const candidates = [
    ...pulseServerCandidates(env),
    `unix:${path.join(privateRuntimeDir(env), 'native')}`,
  ]
  for (const server of candidates) {
    if (await responds(server, runner)) return { server, owned: false, stop() {}, runner }
  }
  return startPrivateDaemon({ env, log, runner, spawnFn })
}

/**
 * Load the session's dedicated null sink. Returns `{ sinkName, moduleId }`; the
 * caller must unload it (see `unloadSink`) on every path.
 *
 * @param {{ server: string, sinkName: string, runner?: Function, log?: Console }} input
 */
export async function loadSink({ server, sinkName, runner = execFileAsync, log = console }) {
  const { stdout } = await runner('pactl', buildLoadSinkArgs({ server, sinkName }), {
    timeout: PACTL_MODULE_TIMEOUT_MS,
  })
  const moduleId = String(stdout).trim().split('\n').pop()
  if (!moduleId || !/^\d+$/.test(moduleId)) {
    throw new Error(`pactl did not report a module id for sink ${sinkName}: ${stdout}`)
  }
  const listed = await runner('pactl', ['--server', server, 'list', 'sinks'], {
    timeout: PACTL_MODULE_TIMEOUT_MS,
  })
  const actual = sinkNameForModule(String(listed.stdout), moduleId)
  if (!actual) {
    throw new Error(`loaded module ${moduleId} but no sink reports it as its owner`)
  }
  if (actual !== sinkName) {
    log.warn(`[recording-bot] sink ${sinkName} was taken; PulseAudio created ${actual}`)
  }
  log.log(`[recording-bot] null sink ${actual} loaded (module ${moduleId})`)
  return { sinkName: actual, requested: sinkName, moduleId }
}

/** Unload the sink. Best effort: teardown must never mask the session's own outcome. */
export async function unloadSink({ server, moduleId, runner = execFileAsync, log = console }) {
  try {
    await runner('pactl', buildUnloadModuleArgs({ server, moduleId }), {
      timeout: PACTL_MODULE_TIMEOUT_MS,
    })
  } catch (err) {
    log.error(`[recording-bot] could not unload audio module ${moduleId}: ${err.message}`)
  }
}

/**
 * Start recording the sink's monitor into `outPath` (a temp file — never in
 * RECORDINGS_DIR). `stop()` ends the capture and resolves once ffmpeg has flushed
 * the file, so the caller can mux it immediately.
 *
 * @param {{ server: string, sinkName: string, outPath: string,
 *   env: Record<string, string | undefined>, log?: Console, spawnFn?: typeof spawn }} input
 */
export function startCapture({ server, sinkName, outPath, env, log = console, spawnFn = spawn }) {
  const proc = spawnFn('ffmpeg', buildCaptureArgs({ sinkName, outPath }), {
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...env, PULSE_SERVER: server },
  })
  let stderr = ''
  proc.stderr.on('data', (chunk) => {
    stderr += String(chunk)
  })
  log.log(`[recording-bot] capturing ${sinkName}.monitor → ${outPath}`)

  function stop() {
    return new Promise((resolve) => {
      if (proc.exitCode !== null) return resolve()
      proc.once('exit', () => resolve())
      // SIGINT lets ffmpeg finalize the container cleanly; SIGKILL would truncate it.
      proc.kill('SIGINT')
    })
  }

  return {
    proc,
    stop,
    stderr: () => stderr,
    exited: () => proc.exitCode !== null,
  }
}
