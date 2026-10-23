// src/__tests__/shell-harness.ts — shared PATH-shim harness for the spec-005
// deploy/home shell-script tests.
//
// Pattern pinned by specs/005-home-hosted-recording/10-tasks.md §Global
// constraints ("shell-logic test pattern"): spawn `bash <script>` with
// PATH=<shim-dir>:<minimal>, where every shimmed external tool appends
// '"<cmd> <args>"' lines to a call log and answers per scenario. Refusal-
// before-mutation and gate ordering are asserted on the call log.
//
// The scripts invoke external tools by BARE PATH-resolved name precisely so
// this shim set can shadow them; the minimal PATH keeps /usr/bin:/bin real
// utilities (grep, awk, mktemp) available while every controlled tool is fake.
//
// It is NOT a test file (no *.test.* name): vitest and the traceability gate
// never treat it as one (precedent: recording-harness.ts).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type ShimRule = {
  /** substring of the space-joined args; the FIRST matching rule answers (ordered). */
  match: string
  /** stdout the shim prints when this rule matches */
  stdout?: string
  /** exit code the shim returns when this rule matches (default 0) */
  exit?: number
}

export type Shim = {
  /** bare tool name the shim is installed under */
  cmd: string
  /** ordered scenario rules; fallthrough when none match */
  rules?: ShimRule[]
  /** fallback stdout when no rule matched */
  stdout?: string
  /** fallback exit code when no rule matched (default 0) */
  exit?: number
}

export type ShellRun = {
  /** exit code of bash <script> */
  code: number
  out: string
  err: string
  /** every shimmed invocation recorded as "<cmd> <args>", in call order */
  calls: string[]
}

/** Run a repo shell script under a generated PATH-shim set. Pure: no network. */
export function runShellScript(
  scriptRel: string,
  opts: { shims?: Shim[]; args?: string[]; env?: Record<string, string> } = {}
): ShellRun {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rexi-005-sh-'))
  try {
    const callLog = path.join(dir, 'calls.log')
    buildShims(dir, opts.shims ?? [], callLog)
    const res = spawnSync('bash', [path.join(process.cwd(), scriptRel), ...(opts.args ?? [])], {
      encoding: 'utf8',
      env: shimEnv(dir, callLog, opts.env),
    })
    return finishRun(res, callLog)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

function finishRun(
  res: { status: number | null; stdout?: string; stderr?: string },
  callLog: string
): ShellRun {
  return {
    code: res.status ?? -1,
    out: res.stdout ?? '',
    err: res.stderr ?? '',
    calls: readLog(callLog),
  }
}

function shimEnv(dir: string, callLog: string, extra?: Record<string, string>): NodeJS.ProcessEnv {
  return {
    HOME: process.env['HOME'] ?? '',
    PATH: `${path.join(dir, 'bin')}:/usr/bin:/bin`,
    REXI_CALL_LOG: callLog,
    ...(extra ?? {}),
  }
}

function buildShims(dir: string, shims: Shim[], callLog: string): void {
  const shimDir = path.join(dir, 'bin')
  fs.mkdirSync(shimDir)
  fs.writeFileSync(callLog, '')
  for (const shim of shims) writeShim(shimDir, dir, shim)
}

function readLog(callLog: string): string[] {
  return fs
    .readFileSync(callLog, 'utf8')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
}

/** Index of the first call starting with prefix, or -1. */
export function firstCallWith(calls: string[], prefix: string): number {
  return calls.findIndex((c) => c.startsWith(prefix))
}

/** All call lines mentioning the substring. */
export function callsWith(calls: string[], needle: string): string[] {
  return calls.filter((c) => c.includes(needle))
}

function writeShim(shimDir: string, baseDir: string, shim: Shim): void {
  const body: string[] = [
    '#!/usr/bin/env bash',
    'args="$*"',
    `printf '%s %s\\n' '${shim.cmd}' "$args" >> "$REXI_CALL_LOG"`,
  ]
  let outIdx = 0
  for (const rule of shim.rules ?? []) {
    body.push(ruleLine(baseDir, shim.cmd, outIdx++, rule))
  }
  if (shim.stdout !== undefined)
    body.push(`cat -- '${outFile(baseDir, `${shim.cmd}-def`, shim.stdout)}'`)
  body.push(`exit ${shim.exit ?? 0}`)
  fs.writeFileSync(path.join(shimDir, shim.cmd), body.join('\n') + '\n', { mode: 0o755 })
}

function ruleLine(baseDir: string, cmd: string, idx: number, rule: ShimRule): string {
  const cat =
    rule.stdout !== undefined ? `cat -- '${outFile(baseDir, `${cmd}-${idx}`, rule.stdout)}'; ` : ''
  return `if [[ "$args" == *"${rule.match}"* ]]; then ${cat}exit ${rule.exit ?? 0}; fi`
}

function outFile(baseDir: string, name: string, content: string): string {
  const f = path.join(baseDir, `out-${name}`)
  fs.writeFileSync(f, content)
  return f
}
