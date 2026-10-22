// Shared harness for the spec-004 recording-unit tests (src/__tests__/AC-004-*.test.ts).
//
// Global constraints (specs/004 §Global constraints): units take an injected
// execFile-like runner and, where they do HTTP, an injected fetch — this file
// provides those fakes plus temp-dir helpers. It is NOT a test file (no *.test.*
// name): vitest and the traceability gate never treat it as one.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type Call = { cmd: string; args: string[] }
export type RunnerResult = { stdout?: string; fail?: boolean }
export type Runner = (cmd: string, args: string[]) => Promise<{ stdout: string }>

/** execFile-like fake: records every (cmd, args) call, behaviour per call. */
export function makeRunner(behavior?: (call: Call) => RunnerResult | undefined): {
  runner: Runner
  calls: Call[]
} {
  const calls: Call[] = []
  const runner: Runner = async (cmd, args) => {
    const call = { cmd, args }
    calls.push(call)
    const result = behavior ? behavior(call) : undefined
    if (result?.fail) throw runnerError(cmd, result.stdout)
    return { stdout: result?.stdout ?? '' }
  }
  return { runner, calls }
}

function runnerError(cmd: string, stdout?: string): Error & { stdout?: string } {
  const err = new Error(`runner: ${cmd} exited non-zero`) as Error & { stdout?: string }
  err.stdout = stdout ?? ''
  return err
}

export function argvOf(call: Call): string[] {
  return [call.cmd, ...call.args]
}

/** Full argv of every recorded call. */
export function argvList(calls: Call[]): string[][] {
  return calls.map(argvOf)
}

export function mkTmpDir(prefix = 'rexi-004-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}
export function rmTmpDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

/** Write a placeholder file inside dir, optionally back-dating its mtime. */
export function writeFile(dir: string, name: string, content = 'x', mtimeMs?: number): string {
  const p = path.join(dir, name)
  fs.writeFileSync(p, content)
  if (mtimeMs !== undefined) {
    const t = new Date(mtimeMs)
    fs.utimesSync(p, t, t)
  }
  return p
}

export function exists(dir: string, name: string): boolean {
  return fs.existsSync(path.join(dir, name))
}

/** Minimal Response-shaped fetch fake that records calls. */
export type FetchCall = {
  url: string
  init?: { method?: string; headers?: Record<string, string>; body?: string }
}
export type FetchReply = { status: number; body: unknown }

export function makeFetch(reply: (url: string, init?: FetchCall['init']) => FetchReply): {
  fetch: (url: string, init?: FetchCall['init']) => Promise<unknown>
  calls: FetchCall[]
} {
  const calls: FetchCall[] = []
  const fetchFn = async (url: string, init?: FetchCall['init']) => {
    calls.push({ url, init })
    const { status, body } = reply(url, init)
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }
  }
  return { fetch: fetchFn, calls }
}

/** console-shaped log fake collecting every line by level. */
export type Log = {
  log: (m: string) => void
  warn: (m: string) => void
  error: (m: string) => void
}
export function captureLog(): { log: Log; lines: string[] } {
  const lines: string[] = []
  const push = (m: string) => lines.push(m)
  return { lines, log: { log: push, warn: push, error: push } }
}

/**
 * ffprobe-shaped stdout: which file each call probes and what it answers.
 * behavior keyed on the probed path (last argv element of an ffprobe call).
 */
export function ffprobeBehavior(map: {
  duration?: (file: string) => number | undefined
  audio?: (file: string) => boolean | undefined
}): (call: Call) => RunnerResult | undefined {
  return (call) => {
    if (call.cmd !== 'ffprobe') return undefined
    const file = call.args[call.args.length - 1]
    if (call.args.includes('format=duration')) return durationResult(map, file)
    if (call.args.includes('stream=codec_type')) return audioResult(map, file)
    return { stdout: '' }
  }
}

function durationResult(
  map: { duration?: (file: string) => number | undefined },
  file: string
): RunnerResult {
  const secs = map.duration ? map.duration(file) : undefined
  return { stdout: secs === undefined ? '0' : String(secs) }
}

function audioResult(
  map: { audio?: (file: string) => boolean | undefined },
  file: string
): RunnerResult {
  const ok = map.audio ? map.audio(file) : true
  return { stdout: ok ? 'audio\n' : '' }
}

/**
 * Default gh CLI stdout on a healthy repo: label present, no matching issue,
 * and a create URL. Shared by every test that stands in for a working gh.
 */
export function ghStdout(cmdArgs: string[]): string {
  const joined = cmdArgs.join(' ')
  if (joined.includes('label list')) return JSON.stringify([{ name: 'customer-insight' }])
  if (joined.includes('issue list')) return JSON.stringify([])
  return 'https://github.com/RexiAI/rexiAI/issues/1'
}

/** The bl ASR side effect as recorded: the --out target gets a transcript file. */
export function blProducesOut(call: Call): RunnerResult | undefined {
  if (call.cmd !== 'bl' || !call.args.includes('--out')) return undefined
  const out = call.args[call.args.indexOf('--out') + 1]
  fs.writeFileSync(out, JSON.stringify({ transcripts: [] }))
  return { stdout: '{}' }
}

export const SPANISH_TRANSCRIPT = {
  transcripts: [
    {
      content: [
        { sentence: 'Hola, necesito una página de precios para mi sitio web.' },
        { sentence: 'El problema es que hoy cobro a mano y pierdo clientes.' },
      ],
    },
  ],
}
