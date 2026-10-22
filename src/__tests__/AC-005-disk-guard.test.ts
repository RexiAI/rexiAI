// Task 2 (Ask B): processor disk guard.
// Acceptance tests per specs/005-home-hosted-recording/20-acceptance/AC-005-disk-guard.md
// Injectable-runner unit tests on the spec-004 harness (makeRunner, mkTmpDir;
// a by-level log capture is local here because "no warning logged" vs "warning"
// needs the level, which captureLog's merged lines do not preserve).
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { runCli } from '../../scripts/recording/cli.mjs'
import {
  assessFreeSpace,
  freeSpaceThresholds,
  parseAvailGb,
} from '../../scripts/recording/disk.mjs'
import { scanAll } from '../../scripts/recording/pipeline.mjs'

import { asrProducesOut, ghStdout, mkTmpDir, makeRunner, writeFile } from './recording-harness.ts'
import type { Call, Runner, RunnerResult } from './recording-harness.ts'

const MP4 = 'rexi-abc_2026-10-21-10-00-00.mp4'

// ---------- local helpers ----------

type ByLevelLog = { lines: { log: string[]; warn: string[]; error: string[] } }

function levelLog(): { log: Record<string, (m: string) => void> } & ByLevelLog {
  const lines = { log: [] as string[], warn: [] as string[], error: [] as string[] }
  return {
    lines,
    log: {
      log: (m: string) => lines.log.push(m),
      warn: (m: string) => lines.warn.push(m),
      error: (m: string) => lines.error.push(m),
    },
  }
}

/** df-shaped `df -kP` stdout reporting `gb` whole GB available. */
function dfStdout(gb: number): string {
  const kb = String(gb * 1024 * 1024)
  return `Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sdb ${kb} 0 ${kb} 0% /mnt\n`
}

function dfReports(gb: number): (call: Call) => RunnerResult | undefined {
  return (call) => (call.cmd === 'df' ? { stdout: dfStdout(gb) } : undefined)
}

/** df that throws (runner rejects), as a missing/failing binary produces. */
function dfThrows(): (call: Call) => RunnerResult | undefined {
  return (call) => (call.cmd === 'df' ? { fail: true } : undefined)
}

const CHAT_JSON = JSON.stringify({
  choices: [{ message: { content: '## Requirements\n- pricing page' } }],
})

function blChat(call: Call): RunnerResult | undefined {
  return call.cmd === 'bl' && call.args.includes('chat') ? { stdout: CHAT_JSON } : undefined
}

function ghCall(call: Call): RunnerResult | undefined {
  return call.cmd === 'gh' ? { stdout: ghStdout([call.cmd, ...call.args]) } : undefined
}

function ffprobeStub(call: Call): RunnerResult | undefined {
  if (call.cmd !== 'ffprobe') return undefined
  if (call.args.includes('format=duration')) return { stdout: '120' }
  if (call.args.includes('stream=codec_type')) return { stdout: 'audio\n' }
  return undefined
}

function external(call: Call): RunnerResult | undefined {
  return asrProducesOut(call) ?? blChat(call) ?? ghCall(call) ?? ffprobeStub(call)
}

/** Runner: df answers per `diskBehavior`, the rest answers a healthy chain. */
function runnerWith(diskBehavior: (call: Call) => RunnerResult | undefined): {
  runner: Runner
  calls: Call[]
} {
  return makeRunner((call) => diskBehavior(call) ?? external(call))
}

/** Empty-results fetch stub: every attribution lookup returns no bookings. */
function stubFetch() {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: [], has_more: false }),
  })
}

function sessionRoot(withSession = true): string {
  const root = fs.mkdtempSync(path.join(mkTmpDir('rexi-005-dg-'), 'rec-'))
  if (withSession) {
    const dir = path.join(root, 'rexi-abc_2026-10-21-10-00-00')
    fs.mkdirSync(dir)
    writeFile(dir, MP4)
    writeFile(
      dir,
      'metadata.json',
      JSON.stringify({ meeting_url: 'https://meet.example/rexi-abc' })
    )
  }
  return root
}

function scanWith(rootDir: string, diskBehavior: (call: Call) => RunnerResult | undefined) {
  const chain = runnerWith(diskBehavior)
  const cap = levelLog()
  const fetch = stubFetch()
  return {
    chain,
    cap,
    result: scanAll({
      rootDir,
      env: {},
      deps: { runner: chain.runner, fetch },
      log: cap.log as never,
    }),
  }
}

// ---------- acceptance scenarios ----------

describe('AC-005 disk guard', () => {
  it('AC-005-13: ample free space — silent, normal processing', async () => {
    const root = sessionRoot()
    const { chain, cap, result } = scanWith(root, dfReports(100))
    const r = await result

    expect(r.processed).toBe(1)
    expect(cap.lines.warn.join('\n')).not.toMatch(/free space|DISK GUARD/i)
    expect(cap.lines.error.join('\n')).not.toMatch(/free space|DISK GUARD/i)
    expect(chain.calls.some((c) => c.cmd === 'df')).toBe(true) // the check ran
  })

  it('AC-005-14: below soft minimum — loud warning naming the figures, processing continues', async () => {
    const root = sessionRoot()
    const { cap, result } = scanWith(root, dfReports(10))
    const r = await result

    expect(r.processed).toBe(1)
    const warn = cap.lines.warn.join('\n')
    expect(warn).toMatch(/10 GB/)
    expect(warn).toMatch(/REXI_MIN_FREE_GB=20|20 GB/)
  })

  it('AC-005-15: boundary — exactly 20 GB is not "below" the soft minimum', async () => {
    const root = sessionRoot()
    const { cap, result } = scanWith(root, dfReports(20))
    const r = await result

    expect(cap.lines.warn.join('\n')).not.toMatch(/free space|DISK GUARD/i)
    expect(r.processed).toBe(1) // processing proceeds normally
  })

  it('AC-005-16: boundary — exactly 5 GB warns (below soft min) but never skips the run', async () => {
    const root = sessionRoot()
    const { cap, result } = scanWith(root, dfReports(5))
    const r = await result

    expect(cap.lines.warn.join('\n')).toMatch(/5 GB/)
    expect(cap.lines.error.join('\n')).not.toMatch(/DISK GUARD|skipping/i)
    expect(r.processed).toBe(1)
  })

  it('AC-005-17: below the hard floor — whole run skipped, contained exit 0', async () => {
    const root = sessionRoot()
    const { cap, result } = scanWith(root, dfReports(2))
    const r = await result

    const err = cap.lines.error.join('\n')
    expect(err).toMatch(/2 GB/)
    expect(err).toMatch(/REXI_HARD_MIN_FREE_GB=5|hard floor/i)
    expect(r.processed).toBe(0)
    expect(r.failed).toEqual([])

    // frozen containment: runCli --scan still exits 0 (its own log capture)
    const chain2 = runnerWith(dfReports(2))
    const cap2 = levelLog()
    const fetch2 = stubFetch()
    const { exitCode } = await runCli({
      argv: ['--scan'],
      env: { RECORDINGS_DIR: root },
      deps: { runner: chain2.runner, fetch: fetch2 as never },
      log: cap2.log as never,
    })
    expect(exitCode).toBe(0)
    // zero session dirs processed ⇒ zero ffprobe calls in the skipped run
    expect(chain2.calls.filter((c) => c.cmd === 'ffprobe')).toHaveLength(0)
  })

  it('AC-005-18: thresholds read exclusively from the passed env object', async () => {
    const root = sessionRoot()
    const chain = runnerWith(dfReports(45))
    const cap = levelLog()
    const fetch = stubFetch()

    const r = await scanAll({
      rootDir: root,
      env: { REXI_MIN_FREE_GB: '50', REXI_HARD_MIN_FREE_GB: '40' },
      deps: { runner: chain.runner, fetch: fetch as never },
      log: cap.log as never,
    })

    const warn = cap.lines.warn.join('\n')
    expect(warn).toMatch(/45 GB/) // below the overridden soft minimum
    expect(warn).toMatch(/REXI_MIN_FREE_GB=50/)
    expect(cap.lines.error.join('\n')).not.toMatch(/DISK GUARD.*skip|skipping this scan/i)
    expect(r.processed).toBe(1) // above the overridden hard floor — processing continues

    // source contract: the disk unit never READS process.env (prose mentions
    // of the forbidden pattern are allowed; a property access or index is not)
    const diskSrc = fs.readFileSync(path.join(process.cwd(), 'scripts/recording/disk.mjs'), 'utf8')
    expect(diskSrc).not.toMatch(/process\.env\s*[.[]/)
  })

  it('AC-005-19: undeterminable free space fails open with a loud warning', async () => {
    // df throws
    const thrown = scanWith(sessionRoot(), dfThrows())
    const rThrown = await thrown.result
    expect(thrown.cap.lines.warn.join('\n')).toMatch(/cannot determine free space/i)
    expect(rThrown.processed).toBe(1)

    // df answers empty stdout (the frozen 004 fake-runner behavior)
    const empty = scanWith(sessionRoot(), (call) =>
      call.cmd === 'df' ? { stdout: '' } : undefined
    )
    const rEmpty = await empty.result
    expect(empty.cap.lines.warn.join('\n')).toMatch(/cannot determine free space/i)
    expect(rEmpty.processed).toBe(1)

    // unparseable garbage
    const junk = scanWith(sessionRoot(), (call) =>
      call.cmd === 'df' ? { stdout: 'df: not a filesystem\nonly one line\n' } : undefined
    )
    const rJunk = await junk.result
    expect(junk.cap.lines.warn.join('\n')).toMatch(/cannot determine free space/i)
    expect(rJunk.processed).toBe(1)
  })

  it('AC-005-20: one-off modes never invoke the guard; exit semantics unchanged', async () => {
    const fetch = stubFetch()

    // healthy --room/--recording one-off: 0 df calls, exit 0
    const dir = sessionRoot()
    const session = path.join(dir, fs.readdirSync(dir)[0])
    const c1 = runnerWith(dfReports(2)) // even a hard-floor df must never be consulted
    const cap1 = levelLog()
    const one = await runCli({
      argv: ['--room', 'rexi-abc', '--recording', session],
      env: {},
      deps: { runner: c1.runner, fetch: fetch as never },
      log: cap1.log as never,
    })
    expect(one.exitCode).toBe(0)
    expect(c1.calls.filter((c) => c.cmd === 'df')).toHaveLength(0)

    // --jibri-dir one-off: same
    const c2 = runnerWith(dfReports(2))
    const cap2 = levelLog()
    const two = await runCli({
      argv: ['--jibri-dir', session],
      env: {},
      deps: { runner: c2.runner, fetch: fetch as never },
      log: cap2.log as never,
    })
    expect(two.exitCode).toBe(0)
    expect(c2.calls.filter((c) => c.cmd === 'df')).toHaveLength(0)

    // missing mp4 → 1, usage → 2 (unchanged one-off semantics)
    const empty = fs.mkdtempSync(path.join(mkTmpDir('rexi-005-dg-'), 'empty-'))
    const c3 = runnerWith(dfReports(2))
    const cap3 = levelLog()
    const noMp4 = await runCli({
      argv: ['--jibri-dir', empty],
      env: {},
      deps: { runner: c3.runner, fetch: fetch as never },
      log: cap3.log as never,
    })
    expect(noMp4.exitCode).toBe(1)
    const usage = await runCli({
      argv: [],
      env: {},
      deps: { runner: c3.runner, fetch: fetch as never },
      log: cap3.log as never,
    })
    expect(usage.exitCode).toBe(2)
  })

  // ---------- unit coverage the scenarios do not reach ----------

  it('unit: parseAvailGb — df -kP column 4, garbage and empty inputs are null', () => {
    expect(parseAvailGb(dfStdout(821))).toBe(821)
    expect(parseAvailGb('')).toBeNull()
    expect(parseAvailGb('Filesystem 1024-blocks Used Available Capacity Mounted on\n')).toBeNull()
    expect(parseAvailGb('df: /nope: No such file or directory\n')).toBeNull()
    const hdr = 'Filesystem 1024-blocks Used Available Capacity Mounted on'
    expect(parseAvailGb(`${hdr}\nfs 100 10 90 10% /mnt extra-col\n`)).toBe(0) // 90 KB → floor → 0 GB
    expect(parseAvailGb(`${hdr}\nfs a b c d e\n`)).toBeNull()
    expect(parseAvailGb(`${hdr}\n`)).toBeNull()
  })

  it('unit: freeSpaceThresholds — defaults, overrides, garbage falls back to defaults', () => {
    expect(freeSpaceThresholds({})).toEqual({ minGb: 20, hardMinGb: 5 })
    expect(freeSpaceThresholds({ REXI_MIN_FREE_GB: '50', REXI_HARD_MIN_FREE_GB: '40' })).toEqual({
      minGb: 50,
      hardMinGb: 40,
    })
    expect(freeSpaceThresholds({ REXI_MIN_FREE_GB: 'lots' })).toEqual({ minGb: 20, hardMinGb: 5 })
  })

  it('unit: assessFreeSpace verdicts directly — ok/warn/skip/unknown', async () => {
    const mk = (gb: number | null) =>
      assessFreeSpace({
        dir: '/tmp/x',
        env: {},
        runner: makeRunner((c) =>
          c.cmd === 'df' ? (gb === null ? { fail: true } : { stdout: dfStdout(gb) }) : undefined
        ).runner as never,
      })

    expect((await mk(100)).level).toBe('ok')
    expect((await mk(100)).message).toBeNull()
    expect((await mk(19)).level).toBe('warn')
    expect((await mk(4)).level).toBe('error')
    const unknown = await mk(null)
    expect(unknown.level).toBe('warn')
    expect(unknown.message).toMatch(/cannot determine free space/i)
  })
})
