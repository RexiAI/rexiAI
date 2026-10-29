// scripts/recording/cli.mjs — the processor CLI core (spec 004 Task 6 / Ask E).
//
// Injectable argv/env/deps/log so the CLI surface (--scan, --jibri-dir,
// --room/--recording, usage, --dry-run) is testable in-process; the entry
// script scripts/process-recording.mjs wires the real execFile/fetch/console.

import { existsSync, statSync } from 'node:fs'
import path from 'node:path'

import { findMp4 } from './billing.mjs'
import { processSessionDir, scanAll, recordingsDirFrom } from './pipeline.mjs'

export function usageText() {
  return `Usage:
  node scripts/process-recording.mjs --room rexi-<hex> --recording <mp4|dir> [--dry-run]
  node scripts/process-recording.mjs --jibri-dir <recording_dir> [--dry-run]   (Jibri finalize-script)
  node scripts/process-recording.mjs --scan [--dry-run]                        (cron/manual sweep)`
}

function flagValue(argv, flag) {
  const i = argv.indexOf(flag)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null
}

/** Pure argv classification — the three modes plus usage, exactly the old CLI. */
export function parseCliArgs(argv) {
  const dryRun = argv.includes('--dry-run')
  const recording = flagValue(argv, '--recording')
  const jibriDir = flagValue(argv, '--jibri-dir')
  if (recording || jibriDir) {
    return {
      mode: 'oneoff',
      target: recording || jibriDir,
      room: flagValue(argv, '--room'),
      dryRun,
    }
  }
  if (argv.includes('--scan')) return { mode: 'scan', dryRun }
  return { mode: 'usage', dryRun }
}

function sessionDirFor(target) {
  if (existsSync(target) && statSync(target).isFile()) return path.dirname(target)
  return target
}

/**
 * Run one CLI invocation. Returns { exitCode } — the entry does process.exit
 * with it. One-off stage errors PROPAGATE (the entry's catch prints
 * "processor error:" and exits 1, exactly as today); scan contains per-dir.
 *
 * @param {{ argv: string[], env: Record<string, string|undefined>,
 *   deps: { runner: Function, fetch: Function },
 *   log?: { log: Function, warn: Function, error: Function } }} opts
 */
export async function runCli({ argv, env, deps, log = console }) {
  const opts = parseCliArgs(argv)
  if (opts.mode === 'usage') {
    log.log(usageText())
    return { exitCode: 2 }
  }

  if (opts.mode === 'scan') {
    await scanAll({ rootDir: recordingsDirFrom(env), dryRun: opts.dryRun, env, deps, log })
    return { exitCode: 0 }
  }

  const target = opts.target
  const mp4 = findMp4(target)
  if (!mp4) {
    log.error(`No .mp4 found in/at: ${target}`)
    return { exitCode: 1 }
  }
  const dir = sessionDirFor(target)
  const { ok, dir: workDir } = await processSessionDir({
    dir,
    room: opts.room,
    dryRun: opts.dryRun,
    env,
    deps,
    log,
  })
  // `workDir` is the directory the run ended in: the organise step (spec 008
  // Task 8) renames a session in place, so it may differ from `dir`.
  return { exitCode: ok ? 0 : 1, dir: workDir }
}
