// Task 7 (Ask F): pipeline docs rework — content assertions on
// docs/recording-pipeline.md (repo precedent: AC-004-runbook.test.ts asserts
// the same file). Acceptance tests per
// specs/005-home-hosted-recording/20-acceptance/AC-005-pipeline-docs.md
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

function doc(): string {
  return fs.readFileSync(path.join(process.cwd(), 'docs/recording-pipeline.md'), 'utf8')
}

describe('AC-005 pipeline docs rework', () => {
  it('AC-005-43: home-hosted WSL is the primary topology; VPS explicitly the alternative', () => {
    const d = doc()
    expect(d).toMatch(/home[- ]hosted/i)
    expect(d).toMatch(/primary/i)
    expect(d).toMatch(/VPS/)
    expect(d).toMatch(/alternative/i)
    // the VPS section survived the rework (relabeled, not deleted)
    expect(d).toMatch(/Production deployment/i)

    // spec-004 content assertions on this file keep holding (re-add of the
    // AC-004-47 core tokens, spot subset — full suite is the oracle)
    expect(d).toMatch(/ALL session/i)
    expect(d).toContain('chronological order')
    expect(d).toContain('whisper_transcribe.py')
    expect(d).toContain('.rexi-transcribed')
    expect(d).toContain('customer-brief.md')
    expect(d).toMatch(/independent/i)
    expect(d).toMatch(/lacks\s*`?gh/)
    expect(d).toMatch(/host-timer|host timer/)
  })

  it('AC-005-44: storage layout on this machine', () => {
    const d = doc()
    expect(d).toMatch(/RECORDINGS_DIR/)
    expect(d).toContain('/home/dbueno/rexi-recordings')
    expect(d).toContain('transcript.json')
    expect(d).toContain('customer-brief.md')
    expect(d).toMatch(/live under|under `RECORDINGS_DIR`|on this machine/i)
    expect(d).toMatch(/PRIVATE repo|private repository/i)
    expect(d).toMatch(/RexiAI\/rexiAI/)
  })

  it('AC-005-45: always-on caveat + consent note', () => {
    const d = doc()
    expect(d).toMatch(/powered on/)
    expect(d).toMatch(/meetings AND|meetings and.*timer|both .*meetings.*timer/i)
    expect(d).toMatch(/Persistent=true/)
    expect(d).toMatch(/catch(es|ing)? up/i)
    expect(d).toMatch(/consent/i)
    expect(d).toMatch(/rexi-/)
    expect(d).toMatch(/mod_rexi_auto_record/)
  })

  it('AC-005-46: retention guidance — manual, measured sizing, current headroom', () => {
    const d = doc()
    expect(d).toMatch(/retention/i)
    expect(d).toMatch(/manual/i)
    expect(d).toMatch(/no automated deletion|not automated|no automated cleanup/i)
    expect(d).toMatch(/REXI_ARCHIVE_DIR/)
    expect(d).toMatch(/unimplemented|not implemented/i)
    expect(d).toMatch(/3 MB per min|~?3 ?MB\/min/i)
    expect(d).toMatch(/821 GB/)
    expect(d).toMatch(/months/i)
  })

  it('AC-005-47: exposure decision matrix A vs B vs VPS with honest funnel media truth', () => {
    const d = doc()
    expect(d).toMatch(/decision matrix|A vs B/i)
    // path A attributes
    expect(d).toMatch(/Tailscale Funnel/i)
    expect(d).toMatch(/zero monthly cost|no monthly cost/i)
    expect(d).toMatch(/Let'?s Encrypt/i)
    // path B attributes
    expect(d).toMatch(/meet\.rexi-ai\.com/)
    expect(d).toMatch(/GoDaddy/)
    expect(d).toMatch(/443\/tcp/)
    expect(d).toMatch(/10000\/udp/)
    expect(d).toMatch(/Windows.{0,30}WSL|WSL2 relay/i)
    expect(d).toMatch(/full media|media path|media-capable/i)
    expect(d).toMatch(/dynamic/i)
    // VPS row
    expect(d).toMatch(/monthly cost/i)

    // honest limitation statement + the updated legacy paragraph
    expect(d).toMatch(/HTTPS-only/i)
    expect(d).toMatch(/web app|page/)
    expect(d).toMatch(/XMPP signaling|signaling/)
    expect(d).toMatch(/WebRTC media|WebRTC/)
    expect(d).toMatch(/SCTP/)
    expect(d).toMatch(/UDP 10000/)
    expect(d).toMatch(/colibri-websocket/i)
    expect(d).toMatch(/#2285/)
    expect(d).toMatch(/Why not Cloudflare Tunnel \/ Tailscale Funnel/) // updated, not deleted
  })
})
