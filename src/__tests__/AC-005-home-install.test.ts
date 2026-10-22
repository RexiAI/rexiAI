// Task 1 (Ask A): home install script — content/contract assertions on the
// script source (repo precedent: AC-013-deployment-config.test.ts,
// AC-004-runbook.test.ts). Live install proof is the AC-005-49/50 journey.
// Acceptance tests per specs/005-home-hosted-recording/20-acceptance/AC-005-home-install.md
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const SCRIPT = 'deploy/home/install-recording-host.sh'

function src(): string {
  return fs.readFileSync(path.join(process.cwd(), SCRIPT), 'utf8')
}

/** Body of the top-level main() — the literal control-flow order. */
function mainBody(s: string): string {
  const m = s.match(/^main\(\)\s*\{([\s\S]*?)^\}/m)
  expect(m, 'install script must run through a main() function').not.toBeNull()
  return m![1]
}

describe('AC-005 home install script', () => {
  it('AC-005-06: script contract — bash -n clean, strict mode, executable, never prints the env file', () => {
    execFileSync('bash', ['-n', path.join(process.cwd(), SCRIPT)], { stdio: 'pipe' })

    const s = src()
    expect(s).toContain('set -euo pipefail')

    const mode = fs.statSync(path.join(process.cwd(), SCRIPT)).mode
    expect(mode & 0o111).not.toBe(0)

    // no command prints the env file's contents or values
    expect(s).not.toMatch(/cat[^#\n]*rexi-recording\.env/)
    expect(s).not.toMatch(/echo[^#\n]*\/etc\/rexi-recording\.env/)
    expect(s).not.toMatch(/echo[^#\n]*\$\{?(RECORDINGS_DIR|APP_BASE_URL|MEETING_BASE_URL)\}?/)
    expect(s).not.toMatch(/grep[^#\n]*rexi-recording\.env/)
  })

  it('AC-005-07: units are repo-derived at runtime; shipped VPS artifacts stay untouched', () => {
    const s = src()
    expect(s).toMatch(/BASH_SOURCE/)
    expect(s).toMatch(/WorkingDirectory=\$\{?REPO/)
    expect(s).toMatch(/ExecStart=.*scripts\/recording-cron\.sh/)
    expect(s).not.toContain('/opt/rexiAI')

    // writes units only under /etc/systemd/system; never touches deploy/production
    expect(s).toContain('/etc/systemd/system/rexi-recording.service')
    expect(s).toContain('/etc/systemd/system/rexi-recording.timer')
    expect(s).not.toContain('deploy/production')

    // frozen shipped contract re-verified (this spec must not have modified it)
    const svc = fs.readFileSync('deploy/production/rexi-recording.service', 'utf8')
    const tmr = fs.readFileSync('deploy/production/rexi-recording.timer', 'utf8')
    expect(svc).toContain('WorkingDirectory=/opt/rexiAI')
    expect(tmr).toContain('OnUnitActiveSec=5min')
    expect(tmr).toContain('Persistent=true')
  })

  it('AC-005-08: env file — exactly the three home values, mode 0600, no secret keys', () => {
    const s = src()
    expect(s).toContain('RECORDINGS_DIR=/home/dbueno/rexi-recordings')
    expect(s).toContain('APP_BASE_URL=https://rexi-ai.com')
    expect(s).toContain('MEETING_BASE_URL=https://meet.jit.si')
    expect(s).toMatch(/install -m 600|chmod 600/)

    for (const secret of [
      'STRIPE_SECRET_KEY',
      'RECORDED_BILLING_TOKEN',
      'GH_TOKEN',
      'DASHSCOPE_API_KEY',
    ]) {
      expect(s, `secret key must appear nowhere: ${secret}`).not.toContain(secret)
    }
  })

  it('AC-005-09: unit contract — dbueno, PATH from command -v node, timer semantics preserved', () => {
    const s = src()
    expect(s).toContain('User=dbueno')
    expect(s).toContain('Environment=PATH=')
    expect(s).toMatch(/dirname "\$\(command -v node\)"|\$\(dirname "\$\(command -v node\)"\)/)
    expect(s).toContain('/usr/local/bin:/usr/bin:/bin')
    expect(s).not.toMatch(/\bv2\d+\b/) // no hardcoded nvm version
    expect(s).toContain('EnvironmentFile=/etc/rexi-recording.env')
    expect(s).toContain('Type=oneshot')
    expect(s).toContain('TimeoutStartSec=300')

    for (const pin of [
      'OnBootSec=2min',
      'OnUnitActiveSec=5min',
      'Persistent=true',
      'RandomizedDelaySec=30',
      'WantedBy=timers.target',
    ]) {
      expect(s, `timer must carry ${pin}`).toContain(pin)
    }
  })

  it('AC-005-10: disk pre-flight refuses before any mutation (main flow order)', () => {
    const s = src()
    // the pre-flight is df-based and gated on REXI_MIN_FREE_GB (default 20)
    expect(s).toMatch(/df -kP/)
    expect(s).toMatch(/REXI_MIN_FREE_GB:-20/)
    expect(s).toMatch(/-lt "\$\{?MIN_FREE_GB/)

    // and in the executed flow it comes BEFORE every write and every systemctl enable/start
    const body = mainBody(s)
    const order = [
      'preflight_disk_space',
      'write_env_file',
      'write_unit_files',
      'enable_timer',
      'verify_first_run',
    ]
    const idx = order.map((fn) => body.indexOf(fn))
    for (const [i, at] of idx.entries()) {
      expect(at, `main() must call ${order[i]}`).toBeGreaterThan(-1)
      if (i > 0)
        expect(idx[i]!, `main() order: ${order[i]} after ${order[i - 1]}`).toBeGreaterThan(
          idx[i - 1]!
        )
    }
  })

  it('AC-005-11: install never touches prod config or the guarded switch', () => {
    const s = src()
    expect(s).not.toContain('switch-meeting-base-url')
    expect(s).not.toMatch(/vercel/i)
    // the only MEETING_BASE_URL it writes is the meet.jit.si placeholder
    const writes = s.match(/MEETING_BASE_URL=\S+/g) ?? []
    expect(writes).toEqual(['MEETING_BASE_URL=https://meet.jit.si'])
  })

  it('AC-005-12: first scan cycle verified via journalctl — evidence, not stage success', () => {
    const s = src()
    // exactly one immediate service run
    expect(s.match(/systemctl start rexi-recording\.service/g) ?? []).toHaveLength(1)

    // journalctl queried for the scan-cycle evidence line (either token)
    expect(s).toMatch(/journalctl -u rexi-recording\.service/)
    expect(s).toContain("grep -qE '\\[recording-cron\\]|Scanning'")

    // success declared only on evidence; otherwise non-zero + journal tail
    expect(s).toMatch(/no scan-cycle evidence/)
    expect(s).toMatch(/tail|journal tail/i)

    // verification keys ONLY on evidence — a stage failure (ASR 401, spec 006
    // pending) inside the scan must not flip the verdict
    const verifyFn = s.match(/verify_first_run\(\)\s*\{([\s\S]*?)^\}/m)
    expect(verifyFn).not.toBeNull()
    expect(verifyFn![1]).not.toMatch(/grep[^#\n]*-i[^#\n]*error/)
    expect(verifyFn![1]).not.toMatch(/grep[^#\n]*ASR|grep[^#\n]*401/)
  })
})
