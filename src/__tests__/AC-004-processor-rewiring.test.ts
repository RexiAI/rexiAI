// Task 6 (Ask B part 3 + E): processor rewiring — marker independence, optional
// attribution, containment, CLI.
// Acceptance tests per specs/004-auto-record-transcribe-insights/20-acceptance/AC-004-processor-rewiring.md
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import { parseCliArgs, runCli } from '../../scripts/recording/cli.mjs'
import {
  processSessionDir,
  scanAll,
  sessionDateFromMp4,
} from '../../scripts/recording/pipeline.mjs'

import {
  makeRunner,
  ffprobeBehavior,
  makeFetch,
  captureLog,
  mkTmpDir,
  rmTmpDir,
  writeFile,
  exists,
  ghStdout,
  asrProducesOut,
} from './recording-harness.ts'
import type { Call, FetchCall, Runner, RunnerResult } from './recording-harness.ts'

const execFileAsync = promisify(execFile)

const MP4 = 'rexi-abc_2026-10-21-10-00-00.mp4'
const APP_BASE = 'http://localhost:4099'
const BILLING_ENV = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  RECORDED_BILLING_TOKEN: 'tok_1',
  APP_BASE_URL: APP_BASE,
}

let base: string
beforeAll(() => {
  base = mkTmpDir()
})
afterAll(() => {
  rmTmpDir(base)
})

function sessionDir(extraFiles: string[] = [], extraMp4s: Array<[string, number?]> = []): string {
  const dir = fs.mkdtempSync(`${base}/pw-`)
  writeFile(dir, MP4)
  writeFile(dir, 'metadata.json', JSON.stringify({ meeting_url: 'https://meet.example/rexi-abc' }))
  for (const name of extraFiles) writeFile(dir, name, '')
  for (const [name, mtime] of extraMp4s) writeFile(dir, name, 'x', mtime)
  return dir
}

function isBl(call: Call, verb: string): boolean {
  return call.cmd === 'bl' && call.args.includes(verb)
}

function defaultExternal(call: Call): RunnerResult {
  const asr = asrProducesOut(call)
  if (asr !== undefined) return asr
  if (isBl(call, 'chat')) {
    return {
      stdout: JSON.stringify({
        choices: [{ message: { content: '## Requirements\n- pricing page' } }],
      }),
    }
  }
  if (call.cmd === 'gh') return { stdout: ghStdout([call.cmd, ...call.args]) }
  return { stdout: '' }
}

/** Runner covering bl (ASR out + chat content) and gh (healthy) defaults. */
function chainRunner(behavior?: (call: Call) => RunnerResult | undefined) {
  return makeRunner((call) => {
    const own = behavior ? behavior(call) : undefined
    return own ?? defaultExternal(call)
  })
}

function postReply(status: number) {
  if (status !== 200) return { status, body: { error: 'boom' } }
  return {
    status,
    body: {
      amountCents: 1500,
      billableMinutes: 30,
      freeMinutes: 60,
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_x',
    },
  }
}

/** A successful local-ollama /api/chat reply — the brief content is irrelevant to
 * these billing tests; the skeleton renderer tolerates any (or empty) content. */
function ollamaReply() {
  return { status: 200, body: { message: { content: '## Requirements\n- pricing page' } } }
}

/** Route the local ollama /api/chat call to a success reply; delegate the rest. */
function withOllama(
  reply: (url: string, init?: FetchCall['init']) => { status: number; body: unknown }
) {
  return (url: string, init?: FetchCall['init']) =>
    url.includes('/api/chat') ? ollamaReply() : reply(url, init)
}

function stripeFetch(sessions: unknown[], postStatus = 200) {
  return makeFetch(
    withOllama((_url, init) => {
      if (init?.method === 'POST') return postReply(postStatus)
      return { status: 200, body: { data: sessions, has_more: false } }
    })
  )
}

const RESERVATION = [
  {
    id: 'cs_test_1',
    metadata: {
      join_url: 'https://meet.example/rexi-abc',
      quoted_hours: '1',
      email: 'client@example.com',
    },
  },
]

function depsOf(
  runner: Runner,
  fetchHandle: { fetch: (url: string, init?: object) => Promise<unknown> }
) {
  return { runner, fetch: fetchHandle.fetch }
}

function ffprobeAudioOk(call: Call): RunnerResult | undefined {
  if (call.cmd !== 'ffprobe') return undefined
  if (call.args.includes('format=duration')) return { stdout: '120' }
  if (call.args.includes('stream=codec_type')) return { stdout: 'audio\n' }
  return undefined
}

function newestFirstProbe(newest: string) {
  return (call: Call): RunnerResult | undefined => {
    if (call.cmd !== 'ffprobe') return undefined
    if (!call.args.includes('format=duration')) return { stdout: 'audio\n' }
    const file = call.args[call.args.length - 1]
    return { stdout: file === newest ? '5400' : '60' }
  }
}

/** Stripe-billing POSTs only — the local ollama /api/chat call is also a POST
 * and must not be counted as a billing attempt. */
function billingPosts(handle: { calls: FetchCall[] }) {
  return handle.calls.filter((c) => c.init?.method === 'POST' && !c.url.includes('/api/chat'))
}

function postCall(handle: { calls: FetchCall[] }) {
  return handle.calls.find(
    (c) => c.init && c.init.method === 'POST' && !c.url.includes('/api/chat')
  )
}

describe('AC-004 processor rewiring', () => {
  it('AC-004-39: .rexi-billed does not short-circuit transcription', async () => {
    const dir = sessionDir(['.rexi-billed'])
    const chain = chainRunner(ffprobeBehavior({ duration: () => 120, audio: () => true }))
    const { log } = captureLog()
    const fetch = makeFetch(() => ({ status: 200, body: { data: [], has_more: false } }))

    await processSessionDir({ dir, env: {}, deps: depsOf(chain.runner, fetch), log })

    expect(exists(dir, 'transcript.json')).toBe(true)
    expect(exists(dir, '.rexi-transcribed')).toBe(true)
    // The marker still guards billing exactly as today: no POST ever attempted.
    expect(billingPosts(fetch)).toHaveLength(0)
  })

  it('AC-004-40: missing STRIPE_SECRET_KEY no longer aborts the run', async () => {
    const dir = sessionDir()
    const chain = chainRunner(ffprobeBehavior({ duration: () => 120, audio: () => true }))
    const { lines, log } = captureLog()
    const fetch = makeFetch(() => ({ status: 200, body: { data: [], has_more: false } }))

    await processSessionDir({ dir, env: {}, deps: depsOf(chain.runner, fetch), log })

    // Stages complete with zero Stripe configuration; billing fails closed with a
    // clear skip log — the old startup hard-exit at the entry is gone (next test).
    expect(exists(dir, 'transcript.json')).toBe(true)
    expect(exists(dir, '.rexi-analyzed')).toBe(true)
    expect(lines.join('\n')).toMatch(/SKIP billing/i)
    expect(billingPosts(fetch)).toHaveLength(0)
  })

  it('AC-004-40: the entry script no longer carries the STRIPE_SECRET_KEY startup gate', () => {
    const entry = fs.readFileSync(path.join(process.cwd(), 'scripts/process-recording.mjs'), 'utf8')
    expect(entry).not.toMatch(/STRIPE_SECRET_KEY not set/)
    expect(entry).toContain('process-recording') // still the CLI entry
  })

  it('AC-004-41: an unattributed recording still transcribes (lookup returns null)', async () => {
    const dir = sessionDir()
    const chain = chainRunner(ffprobeBehavior({ duration: () => 120, audio: () => true }))
    const { lines, log } = captureLog()
    const fetch = stripeFetch([]) // no session matches the room

    await processSessionDir({ dir, env: BILLING_ENV, deps: depsOf(chain.runner, fetch), log })

    expect(lines.join('\n')).toMatch(/unattributed/i)
    expect(exists(dir, 'transcript.json')).toBe(true)
    expect(fs.readFileSync(`${dir}/customer-brief.md`, 'utf8')).toMatch(/unattributed/i)
    expect(billingPosts(fetch)).toHaveLength(0)
    expect(exists(dir, '.rexi-billed')).toBe(false)
  })

  it('AC-004-41: an attribution lookup that THROWS is non-fatal — still transcribes', async () => {
    const dir = sessionDir()
    const chain = chainRunner(ffprobeBehavior({ duration: () => 120, audio: () => true }))
    const { lines, log } = captureLog()
    const fetch = makeFetch(withOllama(() => ({ status: 401, body: { error: 'bad key' } }))) // throws inside lookup

    await processSessionDir({ dir, env: BILLING_ENV, deps: depsOf(chain.runner, fetch), log })

    expect(lines.join('\n')).toMatch(/unattributed/i)
    expect(exists(dir, 'transcript.json')).toBe(true)
    expect(exists(dir, '.rexi-analyzed')).toBe(true)
  })

  it('AC-004-42: the billing-enabled path is unchanged', async () => {
    const dir = sessionDir(
      [],
      [
        ['rexi-abc_2026-10-21-09-00-00.mp4', Date.now() - 60_000], // older: would read 1 min
      ]
    )
    const newest = path.join(dir, MP4) // newest by mtime: must be the one probed
    const chain = chainRunner(newestFirstProbe(newest))
    const { log } = captureLog()
    const fetch = stripeFetch(RESERVATION)

    const { ok } = await processSessionDir({
      dir,
      env: BILLING_ENV,
      deps: depsOf(chain.runner, fetch),
      log,
    })

    expect(ok).toBe(true)
    const post = postCall(fetch)
    expect(post).toBeDefined()
    const init = post!.init!
    expect(post!.url).toBe(`${APP_BASE}/api/bookings/recorded-billing`)
    expect(init.headers && init.headers.authorization).toBe('Bearer tok_1')
    expect(JSON.parse(init.body || '{}')).toEqual({
      bookingId: 'cs_test_1',
      email: 'client@example.com',
      actualMinutes: 90,
    })
    expect(exists(dir, '.rexi-billed')).toBe(true)
  })

  it('AC-004-43: silent recording — existing warning, no transcription or insight markers, billing as today', async () => {
    const dir = sessionDir()
    const chain = chainRunner(ffprobeBehavior({ duration: () => 120, audio: () => false }))
    const { lines, log } = captureLog()
    const fetch = stripeFetch(RESERVATION)

    const { ok } = await processSessionDir({
      dir,
      env: BILLING_ENV,
      deps: depsOf(chain.runner, fetch),
      log,
    })

    expect(lines.join('\n')).toContain('WARNING: no audio stream')
    for (const f of [
      '.rexi-transcribed',
      '.rexi-analyzed',
      'transcript.json',
      'customer-brief.md',
    ]) {
      expect(exists(dir, f)).toBe(false)
    }
    expect(
      chain.calls.filter((c) => c.cmd === 'bl' || c.cmd === 'gh' || c.cmd === 'python3')
    ).toHaveLength(0)
    // A billing-enabled deployment still bills the silent recording, exactly as today.
    expect(billingPosts(fetch).length).toBeGreaterThan(0)
    expect(exists(dir, '.rexi-billed')).toBe(true)
    expect(ok).toBe(true)
  })

  it('AC-004-44: scan containment — one bad directory never kills the run', async () => {
    const root = fs.mkdtempSync(`${base}/scan-`)
    const dirs = ['A', 'B', 'C'].map((n) => {
      const d = path.join(root, n)
      fs.mkdirSync(d)
      fs.writeFileSync(path.join(d, MP4), 'x')
      fs.writeFileSync(
        path.join(d, 'metadata.json'),
        JSON.stringify({ meeting_url: 'https://x/rexi-abc' })
      )
      return d
    })
    const [dirA, dirB] = dirs
    const badFfmpeg = (call: Call) => call.cmd === 'ffmpeg' && String(call.args).includes(dirA)
    const behavior = (call: Call) => (badFfmpeg(call) ? { fail: true } : ffprobeAudioOk(call))

    const first = chainRunner(behavior)
    const { lines, log } = captureLog()
    const fetch = makeFetch(() => ({ status: 200, body: { data: [], has_more: false } }))

    const result = await scanAll({ rootDir: root, env: {}, deps: depsOf(first.runner, fetch), log })

    expect(result.failed).toEqual([dirA]) // logged with its path, counted in the summary
    expect(result.processed).toBe(2) // B and C fully processed in the same run
    expect(lines.join('\n')).toContain(dirA)
    expect(lines.join('\n')).toMatch(/Failures:\s*1/)
    expect(exists(dirA, '.rexi-transcribed')).toBe(false) // A left unmarked
    expect(exists(dirB, '.rexi-analyzed')).toBe(true)
    // containment: scanAll returned normally — the sweep exits 0 (runCli scan mode)

    // second scan: A attempted again (unmarked), B/C completed stages skipped via markers
    const second = chainRunner(behavior)
    const { log: log2 } = captureLog()
    const again = await scanAll({
      rootDir: root,
      env: {},
      deps: depsOf(second.runner, fetch),
      log: log2,
    })
    expect(second.calls.some((c) => c.cmd === 'ffmpeg' && String(c.args).includes(dirA))).toBe(true)
    expect(again.failed).toEqual([dirA])
    expect(again.processed).toBe(2)
    for (const d of dirs.slice(1)) {
      expect(
        second.calls.filter(
          (c) =>
            (c.cmd === 'bl' || c.cmd === 'gh' || c.cmd === 'python3') && String(c.args).includes(d)
        )
      ).toHaveLength(0)
    }
    expect(exists(dirA, '.rexi-transcribed')).toBe(false)
  })

  it('AC-004-44: a completed sweep exits 0 even with a failed directory', async () => {
    const root = fs.mkdtempSync(`${base}/scan0-`)
    const dirA = path.join(root, 'A')
    fs.mkdirSync(dirA)
    fs.writeFileSync(path.join(dirA, MP4), 'x')
    fs.writeFileSync(
      path.join(dirA, 'metadata.json'),
      JSON.stringify({ meeting_url: 'https://x/rexi-abc' })
    )
    const chain = chainRunner((call) =>
      call.cmd === 'ffprobe' && String(call.args).includes(dirA) ? { fail: true } : undefined
    )
    const { log } = captureLog()
    const fetch = makeFetch(() => ({ status: 200, body: { data: [], has_more: false } }))

    const { exitCode } = await runCli({
      argv: ['--scan'],
      env: { RECORDINGS_DIR: root },
      deps: depsOf(chain.runner, fetch),
      log,
    })
    // Decision 13: per-dir failures are contained; the sweep exits 0.
    expect(exitCode).toBe(0)
  })

  it('AC-004-45: MAX_MINUTES gates billing only', async () => {
    const dir = sessionDir()
    const chain = chainRunner(ffprobeBehavior({ duration: () => 36000, audio: () => true }))
    const { lines, log } = captureLog()
    const fetch = stripeFetch(RESERVATION)

    await processSessionDir({ dir, env: BILLING_ENV, deps: depsOf(chain.runner, fetch), log })

    expect(lines.join('\n')).toMatch(/exceeds the 480 min ceiling/)
    expect(billingPosts(fetch)).toHaveLength(0)
    expect(exists(dir, '.rexi-billed')).toBe(false)
    expect(exists(dir, '.rexi-transcribed')).toBe(true) // still transcribes…
    expect(exists(dir, '.rexi-analyzed')).toBe(true) // …and analyzes
  })

  it('AC-004-46: CLI modes preserved — scan, one-off, room+recording, usage', () => {
    expect(parseCliArgs(['--scan'])).toMatchObject({ mode: 'scan' })
    expect(parseCliArgs(['--jibri-dir', '/x'])).toMatchObject({ mode: 'oneoff', target: '/x' })
    expect(parseCliArgs(['--room', 'r', '--recording', '/y.mp4'])).toMatchObject({
      mode: 'oneoff',
      target: '/y.mp4',
      room: 'r',
    })
    expect(parseCliArgs([])).toMatchObject({ mode: 'usage' })
    expect(parseCliArgs(['--scan', '--dry-run'])).toMatchObject({ mode: 'scan', dryRun: true })
  })

  it('AC-004-46: the real entry with no arguments prints usage and exits 2', async () => {
    let code = 0
    let text: string
    try {
      const r = await execFileAsync('node', ['scripts/process-recording.mjs'], {
        cwd: process.cwd(),
      })
      text = r.stdout
    } catch (err) {
      const e = err as Error & { code?: number; stdout?: string; stderr?: string }
      code = e.code ?? 0
      text = `${e.stdout ?? ''}${e.stderr ?? ''}`
    }
    expect(code).toBe(2)
    expect(text).toMatch(/Usage/)
    for (const mode of ['--scan', '--jibri-dir', '--recording']) expect(text).toContain(mode)
  })

  it('AC-004-46: --dry-run mutates nothing (no POST, no bl/gh, no files, planned actions logged)', async () => {
    const dir = sessionDir()
    const chain = chainRunner(ffprobeBehavior({ duration: () => 120, audio: () => true }))
    const { lines, log } = captureLog()
    const fetch = stripeFetch(RESERVATION)

    const { exitCode } = await runCli({
      argv: ['--room', 'rexi-abc', '--recording', dir, '--dry-run'],
      env: BILLING_ENV,
      deps: depsOf(chain.runner, fetch),
      log,
    })

    expect(exitCode).toBe(0)
    expect(billingPosts(fetch)).toHaveLength(0)
    expect(
      chain.calls.filter((c) => c.cmd === 'bl' || c.cmd === 'gh' || c.cmd === 'python3')
    ).toHaveLength(0)
    for (const f of [
      '.rexi-transcribed',
      '.rexi-analyzed',
      '.rexi-billed',
      'transcript.json',
      'customer-brief.md',
    ]) {
      expect(exists(dir, f)).toBe(false)
    }
    expect(lines.join('\n')).toContain('DRY-RUN')
  })

  it('unit: runCli one-off on a healthy dir completes the chain and exits 0', async () => {
    const dir = sessionDir()
    const chain = chainRunner(ffprobeBehavior({ duration: () => 120, audio: () => true }))
    const { log } = captureLog()
    const fetch = makeFetch(() => ({ status: 200, body: { data: [], has_more: false } }))

    const { exitCode } = await runCli({
      argv: ['--jibri-dir', dir],
      env: {},
      deps: depsOf(chain.runner, fetch),
      log,
    })

    expect(exitCode).toBe(0)
    expect(exists(dir, '.rexi-analyzed')).toBe(true)
  })

  it('unit: runCli one-off without any mp4 exits 1 with the classic error', async () => {
    const empty = fs.mkdtempSync(`${base}/nomp4-`)
    const { runner } = chainRunner()
    const { lines, log } = captureLog()
    const fetch = makeFetch(() => ({ status: 200, body: { data: [], has_more: false } }))

    const { exitCode } = await runCli({
      argv: ['--jibri-dir', empty],
      env: {},
      deps: depsOf(runner, fetch),
      log,
    })

    expect(exitCode).toBe(1)
    expect(lines.join('\n')).toContain('No .mp4 found in/at')
  })

  it('unit: billing POST failure keeps one-off exit at 1 and writes no marker', async () => {
    const dir = sessionDir()
    const chain = chainRunner(ffprobeBehavior({ duration: () => 120, audio: () => true }))
    const { log } = captureLog()
    const fetch = stripeFetch(RESERVATION, 500)

    const { exitCode } = await runCli({
      argv: ['--jibri-dir', dir],
      env: BILLING_ENV,
      deps: depsOf(chain.runner, fetch),
      log,
    })

    expect(exitCode).toBe(1)
    expect(exists(dir, '.rexi-billed')).toBe(false)
    // marker independence: the transcription/insight stages still completed
    expect(exists(dir, '.rexi-transcribed')).toBe(true)
  })

  it('unit: sessionDateFromMp4 parses the Jibri timestamp; falls back to a date', () => {
    expect(sessionDateFromMp4('/x/rexi-abc_2026-10-21-10-30-00.mp4')).toBe('2026-10-21')
    expect(sessionDateFromMp4('/x/weirdname.mp4')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
