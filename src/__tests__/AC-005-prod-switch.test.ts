// Task 5 (Ask E): guarded production switch — PATH-shim ordering tests.
// Gate ordering + refusal-before-mutation are asserted on the shim call log;
// no test touches the network or real Vercel state. Acceptance tests per
// specs/005-home-hosted-recording/20-acceptance/AC-005-prod-switch.md
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { callsWith, firstCallWith, runShellScript } from './shell-harness.ts'
import type { Shim, ShimRule } from './shell-harness.ts'

const SCRIPT = 'deploy/home/switch-meeting-base-url.sh'
const URL = 'https://good.example'
const PROBE = `${URL}/rexi-probe-switch-check`

/** curl shim: ordered rules — probe page, root status code, then the TLS gate (bare call). */
function curlShim(opts: {
  tlsFail?: boolean
  rootCode?: string
  probe?: { stdout: string; exit?: number }
}): Shim {
  const rules: ShimRule[] = []
  if (opts.probe)
    rules.push({
      match: 'rexi-probe-switch-check',
      stdout: opts.probe.stdout,
      exit: opts.probe.exit,
    })
  else
    rules.push({
      match: 'rexi-probe-switch-check',
      stdout: '<html><body>probe</body></html>\nHTTPCODE=200\n',
    })
  if (opts.rootCode !== undefined) rules.push({ match: '%{http_code}', stdout: opts.rootCode })
  else rules.push({ match: '%{http_code}', stdout: '200' })
  return { cmd: 'curl', rules, exit: opts.tlsFail ? 60 : 0 }
}

function vercelShim(opts: { addExit?: number; addStdout?: string } = {}): Shim {
  return {
    cmd: 'vercel',
    rules: [
      {
        match: 'env add',
        exit: opts.addExit ?? 0,
        stdout: opts.addStdout ?? 'Added MEETING_BASE_URL to Production\n',
      },
      { match: 'deploy', stdout: 'https://good.example deployed\n' },
    ],
  }
}

function allGreenShims() {
  return [curlShim({}), vercelShim()]
}

describe('AC-005 switch-meeting-base-url.sh', () => {
  it('AC-005-33: usage validation — no argument, no action', () => {
    execFileSync('bash', ['-n', path.join(process.cwd(), SCRIPT)], { stdio: 'pipe' })
    const s = fs.readFileSync(path.join(process.cwd(), SCRIPT), 'utf8')
    expect(s).toContain('set -euo pipefail')
    expect(fs.statSync(path.join(process.cwd(), SCRIPT)).mode & 0o111).not.toBe(0)

    const run = runShellScript(SCRIPT, { shims: allGreenShims() })
    expect(run.out).toContain('<public-url>')
    expect(run.code).not.toBe(0)
    expect(run.calls).toHaveLength(0) // zero external invocations
  })

  it('AC-005-34: happy path — three gates in order, only then vercel mutates; rollback printed', () => {
    const run = runShellScript(SCRIPT, { shims: allGreenShims(), args: [URL] })
    expect(run.code).toBe(0)

    const curls = run.calls.filter((c) => c.startsWith('curl'))
    expect(curls.length).toBeGreaterThanOrEqual(3)
    // gate 1: TLS check WITHOUT -k/--insecure against the root
    expect(curls[0]).not.toMatch(/(?:^| )-k(?: |$)|--insecure/)
    expect(curls[0]).toContain(URL)
    // gate 2: root reachability via %{http_code}
    expect(curls[1]).toContain('%{http_code}')
    // gate 3: the probe room page
    expect(curls[2]).toContain(PROBE)

    // first vercel call strictly after all three gate checks
    const firstVercel = firstCallWith(run.calls, 'vercel')
    const lastGate = run.calls.findIndex((c, i) => c.startsWith('curl') && i === 2)
    expect(firstVercel).toBeGreaterThan(lastGate)

    // the env mutation: name + production scope + value + overwrite mechanism,
    // and the production redeploy trigger follow it
    const add = run.calls.find((c) => c.includes('env add'))
    expect(add).toContain('MEETING_BASE_URL')
    expect(add).toContain(URL)
    expect(add).toContain('production')
    expect(run.calls.some((c) => c.includes('deploy') && c.includes('--prod'))).toBe(true)
    // and nowhere in the run does the script weaken TLS
    for (const c of run.calls.filter((x) => x.startsWith('curl')))
      expect(c).not.toMatch(/-k|--insecure/)

    expect(run.out).toMatch(/rollback/i)
    expect(run.out).toContain('MEETING_BASE_URL')
  })

  it('AC-005-35: TLS gate failure — refuse, zero vercel invocations, no rollback output', () => {
    const run = runShellScript(SCRIPT, {
      shims: [curlShim({ tlsFail: true }), vercelShim()],
      args: [URL],
    })
    expect(run.code).not.toBe(0)
    expect(`${run.out}${run.err}`).toMatch(/TLS/i)
    expect(callsWith(run.calls, 'vercel')).toHaveLength(0)
    expect(run.out).not.toMatch(/rollback/i)
  })

  it('AC-005-36: reachability gate failure — refuse, zero vercel invocations', () => {
    const run = runShellScript(SCRIPT, {
      shims: [curlShim({ rootCode: '503' }), vercelShim()],
      args: [URL],
    })
    expect(run.code).not.toBe(0)
    expect(`${run.out}${run.err}`).toMatch(/reachab/i)
    expect(callsWith(run.calls, 'vercel')).toHaveLength(0)
  })

  it('AC-005-37: probe-room gate failure — refuse on non-200 AND on non-HTML body', () => {
    const notFound = runShellScript(SCRIPT, {
      shims: [curlShim({ probe: { stdout: 'not found\nHTTPCODE=404\n' } }), vercelShim()],
      args: [URL],
    })
    expect(notFound.code).not.toBe(0)
    expect(`${notFound.out}${notFound.err}`).toMatch(/probe/i)
    expect(callsWith(notFound.calls, 'vercel')).toHaveLength(0)

    const notHtml = runShellScript(SCRIPT, {
      shims: [
        curlShim({ probe: { stdout: 'plain text, no markup\nHTTPCODE=200\n' } }),
        vercelShim(),
      ],
      args: [URL],
    })
    expect(notHtml.code).not.toBe(0)
    expect(`${notHtml.out}${notHtml.err}`).toMatch(/probe/i)
    expect(callsWith(notHtml.calls, 'vercel')).toHaveLength(0)
  })

  it('AC-005-38: existing variable is replaced, never an abort (--force overwrite path)', () => {
    // --force means the CLI itself overwrites; the observable replacement path
    // is the executed env-add carrying the overwrite flag, exiting 0.
    const run = runShellScript(SCRIPT, {
      shims: [
        curlShim({}),
        vercelShim({
          addStdout: 'MEETING_BASE_URL already existed in Production — overwrote (--force)\n',
        }),
      ],
      args: [URL],
    })
    expect(run.code).toBe(0)
    const add = run.calls.find((c) => c.includes('env add'))!
    expect(add).toContain('--force')
    expect(add).toContain(URL)
    // an "already exists" condition never aborted: gates, replace, redeploy all ran
    expect(run.calls.some((c) => c.includes('deploy') && c.includes('--prod'))).toBe(true)
  })

  it('AC-005-39: never invoked automatically — no executable call site in any repo shell script', () => {
    for (const rel of listShellFiles(process.cwd())) {
      assertNoCallSite(rel)
    }
    // no deploy/home script other than the switch contains a vercel env mutation
    for (const rel of listShellFiles(process.cwd()).filter((f) => f.startsWith('deploy/home/'))) {
      assertNoVercelEnv(rel)
    }
  })

  // ---------- unit coverage the scenarios do not reach ----------

  it('unit: http:// (TLS-less) URLs are rejected before any call', () => {
    const run = runShellScript(SCRIPT, { shims: allGreenShims(), args: ['http://no-tls.example'] })
    expect(run.code).not.toBe(0)
    expect(`${run.out}${run.err}`).toMatch(/https/)
    expect(run.calls).toHaveLength(0)
  })
})

const SWITCH_SCRIPT = 'deploy/home/switch-meeting-base-url.sh'
const CALL_SITE = /(^|[\s;(&])[\w./$-]*switch-meeting-base-url\.sh\b/

/** Textual mentions of the switch in other .sh files must be comment-only. */
function assertNoCallSite(rel: string): void {
  if (rel === SWITCH_SCRIPT) return
  for (const line of fs.readFileSync(rel, 'utf8').split('\n')) {
    if (CALL_SITE.test(line) && !line.trim().startsWith('#')) {
      expect(`${rel}: executable call site found: ${line}`).toBe('no executable call sites')
    }
  }
}

/** No other deploy/home script may contain an executed `vercel env` command. */
function assertNoVercelEnv(rel: string): void {
  if (rel === SWITCH_SCRIPT) return
  for (const line of fs.readFileSync(rel, 'utf8').split('\n')) {
    if (/vercel env/.test(line) && !line.trim().startsWith('#')) {
      expect(`${rel}: vercel env mutation found: ${line}`).toBe('no vercel env mutations')
    }
  }
}

const SKIP_DIRS = new Set(['node_modules', '.standards', '.git'])

function listShellFiles(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string, rel: string): void => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue
      const relPath = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) walk(`${dir}/${e.name}`, relPath)
      else if (e.name.endsWith('.sh')) out.push(relPath)
    }
  }
  walk('.', '')
  return out
}
