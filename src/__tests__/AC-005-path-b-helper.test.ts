// Task 4 (Ask D): path-B DNS/port-forward truth-printer — content assertions +
// one shimmed-run test (the script performs NO mutation; netsh/PowerShell lines
// appear ONLY as printed output). Acceptance tests per
// specs/005-home-hosted-recording/20-acceptance/AC-005-path-b-helper.md
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { runShellScript } from './shell-harness.ts'

const SCRIPT = 'deploy/home/expose-path-b.sh'

const FAKE_PUBLIC_IP = '203.0.113.7' // TEST-NET-3, RFC 5737 — never a real host IP
const FAKE_WSL_IP = '198.51.100.42' // TEST-NET-2

function readSrc(): string {
  return fs.readFileSync(path.join(process.cwd(), SCRIPT), 'utf8')
}

function truthRun() {
  return runShellScript(SCRIPT, {
    shims: [
      { cmd: 'curl', rules: [{ match: 'ipify', stdout: FAKE_PUBLIC_IP }] },
      { cmd: 'hostname', rules: [{ match: '-I', stdout: `${FAKE_WSL_IP} 172.17.0.1\n` }] },
    ],
  })
}

describe('AC-005 expose-path-b.sh', () => {
  it('AC-005-28: script contract — bash -n clean, strict mode, executable, bare-name tools', () => {
    execFileSync('bash', ['-n', path.join(process.cwd(), SCRIPT)], { stdio: 'pipe' })
    const s = readSrc()
    expect(s).toContain('set -euo pipefail')
    expect(fs.statSync(path.join(process.cwd(), SCRIPT)).mode & 0o111).not.toBe(0)
    for (const tool of ['curl', 'hostname']) {
      expect(s).not.toMatch(new RegExp(`/(usr|bin|sbin|opt)/[^ "\\n]*\\b${tool}\\b`))
    }
  })

  it('AC-005-29: DNS layer — live IP lookup, exact GoDaddy record, DDNS caveat, no hardcoded IP', () => {
    const run = truthRun()
    expect(run.code).toBe(0)
    expect(run.out).toContain(FAKE_PUBLIC_IP) // the fetched IP, printed
    expect(run.out).toMatch(/A\s+record|type A/i)
    expect(run.out).toMatch(/host[:= ]+meet\b/)
    expect(run.out).toContain('meet.rexi-ai.com')
    expect(run.out).toMatch(/dynamic|DDNS/i) // residential IP caveat

    // no public/WSL IP literal baked into the source (today's live values only)
    const s = readSrc()
    expect(s).not.toContain('79.117.136.26')
    expect(s).not.toContain('172.27.113.121')
    const literals = s.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) ?? []
    for (const ip of literals) expect(['0.0.0.0', '127.0.0.1'], `${ip} hardcoded`).toContain(ip)
  })

  it('AC-005-30: router layer — 443/tcp and 10000/udp forwards to the Windows host', () => {
    const run = truthRun()
    expect(run.out).toMatch(/443\/tcp|443.*TCP|TCP.*443/)
    expect(run.out).toMatch(/10000\/udp|10000.*UDP|UDP.*10000/)
    expect(run.out).toMatch(/[Ww]indows host/)
  })

  it('AC-005-31: Windows→WSL2 relay — exact portproxy/firewall lines, runtime WSL IP, UDP truth', () => {
    const run = truthRun()
    expect(run.out).toContain('netsh interface portproxy add v4tov4')
    expect(run.out).toContain('listenport=443')
    expect(run.out).toContain(`connectaddress=${FAKE_WSL_IP}`) // resolved at runtime, not hardcoded
    expect(run.out).toMatch(/New-NetFirewallRule/)
    expect(run.out).toMatch(/netsh interface portproxy .*TCP-only|portproxy is TCP-only|TCP ONLY/i)
    expect(run.out).toContain(FAKE_WSL_IP)
    expect(run.out).toMatch(/mirrored networking|router.{0,40}WSL (direct|IP)/i)

    // no printed PowerShell line claims to portproxy UDP
    for (const line of run.out.split('\n')) {
      if (line.includes('portproxy add')) {
        expect(line).not.toMatch(/udp/i)
      }
    }
  })

  it('AC-005-32: read-only truth-printer — no DNS API, no netsh execution, no file writes, cert pointer', () => {
    const run = truthRun()
    // the ONLY external commands are the two read-only lookups
    expect(run.calls).toEqual([
      expect.stringMatching(/^curl .*/),
      expect.stringMatching(/^hostname -I/),
    ])

    // source: netsh appears only inside printed lines
    const s = readSrc()
    for (const line of s.split('\n')) {
      if (line.includes('netsh') && !line.trim().startsWith('#')) {
        expect(line.trim(), `netsh outside print: ${line}`).toMatch(/^(echo|printf)\b/)
      }
    }
    // no file-writing constructs at all (a > /dev/null discard is not a write)
    expect(s).not.toMatch(/(^|[^&\d>])>\s*"?(?!\/dev\/null)(\/|~|\$)/)
    expect(s).not.toMatch(/\btee\b/)
    expect(s).not.toMatch(/sed -i/)
    // authenticated DNS mutation surface absent — the only network call is the
    // read-only IP echo (no API keys, no auth headers, no zone writes)
    expect(s).not.toMatch(
      /api\.godaddy|GODADDY_API_KEY|Authorization|nsupdate|-X[[:space:]]+(POST|PUT|PATCH|DELETE)/i
    )

    // cert-strategy pointer
    expect(run.out).toContain('ENABLE_LETSENCRYPT')
    expect(run.out).toContain('LETSENCRYPT_DOMAIN')
    expect(run.out).toContain('LETSENCRYPT_EMAIL')
  })

  it('unit: IP-echo failure is a clear, non-zero stop (never a half-truth print)', () => {
    const run = runShellScript(SCRIPT, {
      shims: [
        { cmd: 'curl', exit: 6, stdout: '' },
        { cmd: 'hostname', rules: [{ match: '-I', stdout: `${FAKE_WSL_IP}\n` }] },
      ],
    })
    expect(run.code).not.toBe(0)
    expect(`${run.out}${run.err}`).toMatch(/public IP/)
  })
})
