// Task 3 (Ask C): Tailscale Funnel exposure script — PATH-shim tests +
// content assertions. Acceptance tests per
// specs/005-home-hosted-recording/20-acceptance/AC-005-expose-funnel.md
// AC-005-25 implements the OPEN QUESTION default resolution (a) per the
// orchestrator ruling: loud hard-limitation banner, then CONTINUE.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { callsWith, firstCallWith, runShellScript } from './shell-harness.ts'
import type { Shim, ShimRule } from './shell-harness.ts'

const SCRIPT = 'deploy/home/expose-funnel.sh'
const HOST = 'pcdanimoudo-1.tail343219.ts.net'

// Real `tailscale status --self --json` shape (v1.102): node name is
// Self.HostName (capital N), tailnet domain embedded in Self.DNSName — there
// is no standalone "Hostname"/"TailName" field.
const TS_STATUS_JSON =
  '{"Self":{"HostName":"PCDaniMoudo","DNSName":"pcdanimoudo-1.tail343219.ts.net."}}'

const CONSENT_FAIL_OUT =
  'funnel has not been enabled on this tailnet yet.\n' +
  'Visit https://tailscale.com/go-enable-funnel and follow the instructions to enable Funnel.\n'

function funnelOut(): string {
  return `# https://${HOST}:443 => http://127.0.0.1:8000\nfunnel enabled\n`
}

/** Shims for a healthy host: tailscale up, no serve config yet, no colibri-ws, backend answering.
 * `funnelBg` is the rule that answers the configuration attempt itself. */
function healthyShims(funnelBg: ShimRule): Shim[] {
  return [
    {
      cmd: 'tailscale',
      rules: [
        { match: 'status --self --json', stdout: TS_STATUS_JSON },
        { match: 'funnel status', stdout: 'No serve config\n' },
        funnelBg,
      ],
      // plain `status` (the up-check) and anything else: exit 0
      exit: 0,
    },
    { cmd: 'docker', rules: [{ match: 'exec', stdout: '0\n', exit: 1 }] }, // no colibri-ws present
    { cmd: 'curl', rules: [{ match: '127.0.0.1:8000', stdout: '200' }] },
  ]
}

function consentRun() {
  return runShellScript(SCRIPT, {
    shims: healthyShims({ match: 'funnel --bg', stdout: CONSENT_FAIL_OUT, exit: 1 }),
  })
}

function successRun() {
  return runShellScript(SCRIPT, {
    shims: healthyShims({ match: 'funnel --bg', stdout: funnelOut() }),
  })
}

describe('AC-005 expose-funnel.sh', () => {
  it('AC-005-21: script contract — bash -n clean, strict mode, executable, bare-name tools', () => {
    execFileSync('bash', ['-n', path.join(process.cwd(), SCRIPT)], { stdio: 'pipe' })

    const s = fs.readFileSync(path.join(process.cwd(), SCRIPT), 'utf8')
    expect(s).toContain('set -euo pipefail')
    expect(fs.statSync(path.join(process.cwd(), SCRIPT)).mode & 0o111).not.toBe(0)

    // external tools by bare name: no absolute binary path for the four tools
    for (const tool of ['tailscale', 'docker', 'curl', 'grep']) {
      expect(s).not.toMatch(new RegExp(`/(usr|bin|sbin|opt)/[^ "\\n]*\\b${tool}\\b`))
    }
  })

  it('AC-005-22: pre-checks refuse before any configuration; healthy status reports the node name', () => {
    // tailscale down → refuse, zero serve/funnel configuration invocations
    const down = runShellScript(SCRIPT, {
      shims: [
        { cmd: 'tailscale', exit: 1, stdout: 'Failed to connect to local Tailscale service\n' },
      ],
    })
    expect(down.code).not.toBe(0)
    expect(`${down.out}${down.err}`).toMatch(/tailscale (is )?not (up|running)|tailscale status/i)
    expect(callsWith(down.calls, 'funnel')).toHaveLength(0)
    expect(callsWith(down.calls, 'serve')).toHaveLength(0)

    // healthy status → node name reported in the output
    const up = consentRun()
    expect(up.out).toMatch(/pcdanimoudo-1/)
  })

  it('AC-005-23: consent-pending detected and explained — distinct exit, URL surfaced, no retry loop', () => {
    const run = consentRun()
    const combined = `${run.out}${run.err}`
    expect(run.code).toBe(3) // distinct, clearly-messaged status
    expect(combined).toMatch(/browser/i)
    expect(combined).toMatch(/owner|consent|enable/i)
    expect(combined).toMatch(/https:\/\/tailscale\.com\/go-enable-funnel/) // URL surfaced from CLI output
    expect(run.calls.filter((c) => c.includes('funnel --bg'))).toHaveLength(1) // no retry loop
    expect(combined).not.toMatch(/Traceback|syntax error|line \d+: .*unexpected/i)
  })

  it('AC-005-24: funnel target — public HTTPS 443 proxies to local Jitsi web http://127.0.0.1:8000', () => {
    const run = successRun()
    expect(run.code).toBe(0)
    const configure = run.calls.find((c) => c.includes('funnel --bg'))
    expect(configure).toBeDefined()
    expect(configure).toContain('http://127.0.0.1:8000')
    expect(run.out).toMatch(/:443\s*=>\s*http:\/\/127\.0\.0\.1:8000|443.*127\.0\.0\.1:8000/)
  })

  it('AC-005-25: media-transport check prints the hard-limitation banner loudly, then continues', () => {
    const run = successRun()
    const out = `${run.out}${run.err}`

    // the banner text (orchestrator ruling on the OPEN QUESTION)
    expect(out).toMatch(/HTTPS-only/i)
    expect(out).toMatch(/colibri-websocket/)
    expect(out).toMatch(/#2285/)
    expect(out).toMatch(/web app .*(signaling|signal)|signaling/i)
    expect(out).toMatch(/NOT.{0,40}media|no media|not.*\bMEDIA\b/i)
    expect(out).toMatch(/UDP 10000/)
    expect(out).toMatch(/path B/)
    expect(out).toMatch(/tailnet-internal|LAN\/tailnet/i)

    // …and the script CONTINUES past the check to configuration (AC-005-23 pins
    // the same continue into the consent boundary)
    expect(firstCallWith(run.calls, 'docker exec')).toBeGreaterThanOrEqual(0)
    expect(run.calls.some((c) => c.includes('funnel --bg'))).toBe(true)
    expect(firstCallWith(run.calls, 'docker exec')).toBeLessThan(
      firstCallWith(run.calls, 'tailscale funnel --bg')
    )
  })

  it('AC-005-26: PUBLIC_URL change is emitted, never applied', () => {
    const run = successRun()
    expect(run.out).toContain(`PUBLIC_URL=https://${HOST}`)
    expect(run.out).toMatch(/~\/docker-jitsi-meet\/\.env/)
    expect(run.out).toMatch(/docker compose up -d web/) // restart-helper command printed

    // the stack .env is only ever referenced inside printed guidance — never written
    const s = fs.readFileSync(path.join(process.cwd(), SCRIPT), 'utf8')
    for (const line of s.split('\n')) {
      if (line.includes('docker-jitsi-meet/.env') && !line.trim().startsWith('#')) {
        expect(line.trim(), `non-printed mention: ${line}`).toMatch(/^(echo|printf)\b/)
      }
    }
    // consent-path also emits the PUBLIC_URL guidance (hostname resolved from status)
    const consent = consentRun()
    expect(consent.out).toContain(`PUBLIC_URL=https://${HOST}`)
  })

  it('AC-005-27: local stack untouched — no destructive compose/port surface', () => {
    const s = fs.readFileSync(path.join(process.cwd(), SCRIPT), 'utf8')
    expect(s).not.toMatch(/docker compose (down|rm|stop)/)
    expect(s).not.toMatch(/-p\s*\d+:\d+|ports:/)
    // every docker-compose mention is printed guidance, never an executed command
    for (const line of s.split('\n')) {
      if (line.includes('docker compose up -d web')) {
        expect(line).toMatch(/echo|printf|^\s*#/)
      }
    }
    // the executed docker surface is the read-only nginx-config check only
    const run = successRun()
    for (const c of run.calls.filter((x) => x.startsWith('docker '))) {
      expect(c).toMatch(/^docker exec .*grep/)
    }
  })

  it('unit: backend probe runs before configuration; refusal message names the failed pre-check', () => {
    // curl answers a non-200 on :8000 → warning, still reaches the boundary (not pinned, honest default)
    const run = runShellScript(SCRIPT, {
      shims: [
        {
          cmd: 'tailscale',
          rules: [
            { match: 'status --self --json', stdout: TS_STATUS_JSON },
            { match: 'funnel status', stdout: 'No serve config\n' },
            { match: 'funnel --bg', stdout: CONSENT_FAIL_OUT, exit: 1 },
          ],
        },
        { cmd: 'docker', rules: [{ match: 'exec', stdout: '0\n', exit: 1 }] },
        { cmd: 'curl', rules: [{ match: '127.0.0.1:8000', stdout: '000', exit: 7 }] },
      ],
    })
    expect(run.code).toBe(3)
    expect(`${run.out}${run.err}`).toMatch(/8000/)
  })
})
