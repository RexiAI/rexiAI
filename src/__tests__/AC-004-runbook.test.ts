// Task 7 (Ask F + D limitation + A local install): runbook + env example + docs.
// Acceptance tests per specs/004-auto-record-transcribe-insights/20-acceptance/AC-004-runbook.md
// Content-assertion pattern (repo precedent: AC-002-env-docs-cleanup.test.ts).
import fs from 'fs'
import path from 'path'

import { describe, expect, it } from 'vitest'

function repoFile(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

describe('AC-004 runbook + env docs', () => {
  it('AC-004-47: recording-pipeline.md documents the insight chain and the sidecar limitation', () => {
    const doc = repoFile('docs/recording-pipeline.md')

    // The extended chain, end to end.
    expect(doc).toMatch(/ALL session/i)
    expect(doc).toContain('chronological order')
    expect(doc).toContain('whisper_transcribe.py')
    expect(doc).toMatch(/Spanish-primary/i)
    expect(doc).toContain('transcript.json')
    expect(doc).toContain('.rexi-transcribed')
    expect(doc).toContain('ollama')
    expect(doc).toContain('customer-brief.md')
    expect(doc).toContain('customer-insight')
    expect(doc).toMatch(/search-before-create|search.*before.*creat/i)
    expect(doc).toContain('.rexi-analyzed')

    // Markers are INDEPENDENT; a billed dir still transcribes; no Stripe dependency.
    expect(doc).toMatch(/independent/i)
    expect(doc).toMatch(/\.rexi-billed.*transcrib|transcrib.*\.rexi-billed/s)
    expect(doc).toMatch(/no Stripe|Stripe-free|never depends on Stripe/i)

    // The sidecar-container limitation: image lacks gh → host-timer mode only.
    expect(doc).toMatch(/lacks\s*`?gh/)
    expect(doc).toMatch(/host-timer|host timer/)
    expect(doc).toMatch(/follow-up|follow up/)
  })

  it('AC-004-48: the deploy README carries the revival runbook', () => {
    const doc = repoFile('deploy/production/README.md')

    expect(doc).toContain('setup-jitsi-host.sh')
    expect(doc).toContain('deploy-jitsi.sh')
    // notes the script now provisions the auto-record module + luac gate
    expect(doc).toMatch(/auto-record module/)
    expect(doc).toMatch(/luac/)
    // Vercel production env pointer
    expect(doc).toContain('MEETING_BASE_URL=https://meet.rexi-ai.com')
    // /etc/rexi-recording.env provisioning trio + timer enable
    expect(doc).toContain('/etc/rexi-recording.env')
    expect(doc).toMatch(/RECORDINGS_DIR/)
    expect(doc).toContain('DASHSCOPE_API_KEY')
    expect(doc).toContain('GH_TOKEN')
    expect(doc).toMatch(/rexi-recording\.timer/)
    expect(doc).toMatch(/systemctl enable|enable.*timer/i)
    // pointer to the local-stack auto-record install steps (e2e oracle doc)
    expect(doc).toContain('docs/local-e2e-testing.md')
    // explicit scope note: actual VPS deployment out of scope for 004 (runbook only)
    expect(doc).toMatch(/out of scope.*004|004.*out of scope/is)
    expect(doc).toMatch(/runbook only/i)
  })

  it('AC-004-48 (consistency): the local-stack install steps the README points to exist', () => {
    const doc = repoFile('docs/local-e2e-testing.md')
    expect(doc).toContain('prosody-plugins-custom')
    expect(doc).toMatch(/GLOBAL_MODULES/)
    expect(doc).toMatch(/XMPP_MUC_MODULES/)
    expect(doc).toMatch(/REXI_AUTO_RECORD_PREFIX/)
    expect(doc).toMatch(/luac -p/)
  })

  it('AC-004-49: the env example carries the new tool credentials', () => {
    const doc = repoFile('deploy/production/rexi-recording.env.example')

    // commented DASHSCOPE_API_KEY documented as bl's ASR/LLM auth
    expect(doc).toMatch(/^#.*DASHSCOPE_API_KEY/m)
    expect(doc).toMatch(/bl/i)

    // GH_TOKEN documented as the issue-delivery credential, read by gh from env
    expect(doc).toMatch(/^#.*GH_TOKEN/m)
    expect(doc).toMatch(/issue/im)

    // REXI_ASR_LANGUAGE documented with default es
    expect(doc).toMatch(/^#.*REXI_ASR_LANGUAGE/m)
    expect(doc).toMatch(/default.*\bes\b|\bes\b.*default/i)

    // REXI_ARCHIVE_DIR stays commented + unimplemented (line 26 semantics).
    expect(doc).toMatch(/^#REXI_ARCHIVE_DIR/m)
    expect(doc).toMatch(/unimplemented|not implemented/i)

    // No real secret values anywhere: secret-bearing keys are placeholders.
    const secretLines = doc
      .split('\n')
      .filter((l) =>
        /^(STRIPE_SECRET_KEY|RECORDED_BILLING_TOKEN|DASHSCOPE_API_KEY|GH_TOKEN)=/.test(l)
      )
    for (const line of secretLines) {
      const value = line.split('=').slice(1).join('=')
      expect(value).toMatch(/REPLACE_ME|example|^$/)
    }
    expect(doc).not.toMatch(/sk_live_[A-Za-z0-9]{8,}/)
    expect(doc).not.toMatch(/ghp_[A-Za-z0-9]{8,}/)
  })
})
