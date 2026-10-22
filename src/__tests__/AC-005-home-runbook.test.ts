// Task 6 (Ask C/D runbook + G note): home runbook content assertions
// (repo precedent: AC-004-runbook.test.ts). Acceptance tests per
// specs/005-home-hosted-recording/20-acceptance/AC-005-home-runbook.md
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

function readbook(): string {
  return fs.readFileSync(path.join(process.cwd(), 'deploy/home/README.md'), 'utf8')
}

describe('AC-005 home runbook', () => {
  it('AC-005-40: install runbook — prerequisites, usage, what it installs, always-on pointer', () => {
    const doc = readbook()
    expect(doc).toMatch(/WSL2/)
    expect(doc).toMatch(/systemd/)
    expect(doc).toContain('Linger=yes')
    expect(doc).toMatch(/passwordless sudo/i)
    expect(doc).toContain('docker-jitsi-meet')
    for (const tool of ['node', 'bl', 'ffmpeg', 'ffprobe', 'gh']) {
      expect(doc, `prerequisite tool ${tool}`).toMatch(new RegExp(`\\b${tool}\\b`))
    }

    expect(doc).toContain('install-recording-host.sh')
    expect(doc).toMatch(/rexi-recording\.service/)
    expect(doc).toMatch(/rexi-recording\.timer/)
    expect(doc).toContain('/etc/systemd/system/')
    expect(doc).toContain('/etc/rexi-recording.env')
    expect(doc).toMatch(/0600|mode 600/)
    expect(doc).toMatch(/5[- ]?(minute|min)|OnUnitActiveSec=5min/)
    expect(doc).toContain('Persistent=true')

    // always-on caveat: documented here or pointed to the pipeline doc
    expect(doc).toMatch(
      /always[- ]on|powered on|must be (up|running)|see docs\/recording-pipeline\.md/i
    )
  })

  it('AC-005-41: exposure runbook — path A consent step, path B three layers, owner-executed switch, matrix pointer', () => {
    const doc = readbook()

    // path A
    expect(doc).toContain('expose-funnel.sh')
    expect(doc).toMatch(/funnel/i)
    expect(doc).toMatch(/one[- ]time/i)
    expect(doc).toMatch(/consent/i)
    expect(doc).toMatch(/browser/i)
    expect(doc).toMatch(/manual/i)

    // path B as the customer-meeting-capable path (orchestrator ruling)
    expect(doc).toContain('expose-path-b.sh')
    expect(doc).toMatch(/GoDaddy/)
    expect(doc).toMatch(/A record/i)
    expect(doc).toMatch(/meet\.rexi-ai\.com/)
    expect(doc).toMatch(/router/i)
    expect(doc).toMatch(/443\/tcp/)
    expect(doc).toMatch(/10000\/udp/)
    expect(doc).toMatch(/netsh|firewall/i)
    expect(doc).toMatch(/customer[- ]meeting[- ]capable|full media path|media[- ]capable/i)
    expect(doc).toMatch(/mirrored networking|mirrored[- ]networking/i)

    // the switch is owner-executed, never automatic
    expect(doc).toContain('switch-meeting-base-url.sh')
    expect(doc).toMatch(/manually|owner[- ]executed|owner executes/i)
    expect(doc).toMatch(/never run (it )?automatically|not run automatically|never automatic/i)

    // decision matrix pointer
    expect(doc).toMatch(/docs\/recording-pipeline\.md/)
    expect(doc).toMatch(/decision matrix|A-vs-B|A vs B/i)
  })

  it('AC-005-42: jibri finalize-placeholder SEVERE documented — harmless, silencing is host-side', () => {
    const doc = readbook()
    expect(doc).toContain('Failed to run finalize script')
    expect(doc).toContain('/path/to/finalize')
    expect(doc).toMatch(/SEVERE/i)
    expect(doc).toMatch(/harmless/i)
    expect(doc).toMatch(/timer|scan[- ]driven|driven by the timer/i)
    expect(doc).toContain('JIBRI_FINALIZE_RECORDING_SCRIPT_PATH')
    expect(doc).toMatch(/unset/i)
    expect(doc).toMatch(/recreate/i)
    expect(doc).toMatch(/jibri container|jibri-1/i)
    expect(doc).toMatch(/host[- ]side.*not.*repo[- ]side|not a repo change|not a repo-side/i)
  })
})
