// AC-002 Task 3 (repo cleanup): asserts the CONTENT of the two files in scope.
// Reads the working tree like AC-013-deployment-config.test.ts does.
import fs from 'fs'
import path from 'path'

import { describe, expect, it } from 'vitest'

function repoFile(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

function lines(text: string): string[] {
  return text.split('\n')
}

/** Extract the ```bash fenced block of docs/microsoft-cutover.md section 4. */
function section4EnvBlock(doc: string): string {
  const start = doc.indexOf('## 4. Environment variables')
  expect(start).toBeGreaterThanOrEqual(0)
  const end = doc.indexOf('## 5', start)
  const section = doc.slice(start, end === -1 ? undefined : end)
  const blocks = section.match(/```(?:bash|sh)?\n([\s\S]*?)```/g) ?? []
  return blocks.map((b) => b.replace(/^```[a-z]*\n?/, '').replace(/```$/, '')).join('\n')
}

describe('AC-002 env and docs cleanup', () => {
  it('AC-002-18: .env.example drops the dead provider config and keeps every live variable', () => {
    const envExample = repoFile('.env.example')

    // No assignment lines for the dead provider vars, bare or commented out.
    expect(envExample).not.toMatch(/^\s*#?\s*EMAIL_PROVIDER\s*=/m)
    expect(envExample).not.toMatch(/^\s*#?\s*CALENDAR_PROVIDER\s*=/m)
    expect(envExample).not.toMatch(/^# Providers\s*$/m)
    expect(envExample).not.toContain('EMAIL_PROVIDER')
    expect(envExample).not.toContain('CALENDAR_PROVIDER')

    // Every live variable is still listed.
    const required = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'RESEND_API_KEY',
      'EMAIL_FROM',
      'EMAIL_TO',
      'MICROSOFT_CLIENT_ID',
      'MICROSOFT_CLIENT_SECRET',
      'MICROSOFT_REFRESH_TOKEN',
      'AVAILABILITY_TIMEZONE',
      'AVAILABILITY_HOURS',
      'AVAILABILITY_DAYS',
      'RECORDED_BILLING_TOKEN',
      'BILLING_ENABLED',
      'BOOKING_RATE_LIMIT',
      'BOOKING_RATE_WINDOW_MIN',
    ]
    for (const v of required) {
      expect(envExample).toMatch(new RegExp(`^${v}=`, 'm'))
    }
    expect(envExample).toContain('# MEETING_BASE_URL')

    // AC-013-02 parity: no secret-looking values anywhere.
    expect(envExample).not.toContain('sk_test_')
    expect(envExample).not.toContain('whsec_')
    expect(envExample).not.toMatch(/sk_live/)

    // Email guidance: info@rexi-ai.com is the target sender, hola@ is gone.
    expect(envExample).not.toContain('hola@rexi-ai.com')
    expect(envExample).toContain('info@rexi-ai.com')
  })

  it('AC-002-19: docs/microsoft-cutover.md stops documenting dead provider config', () => {
    const doc = repoFile('docs/microsoft-cutover.md')

    // Every remaining mention is annotated as removed/ignored.
    for (const line of lines(doc)) {
      if (/EMAIL_PROVIDER|CALENDAR_PROVIDER/.test(line)) {
        expect(line).toMatch(/removed|ignored/i)
      }
    }

    // The section 4 env block no longer carries the bare entries.
    const envBlock = section4EnvBlock(doc)
    expect(envBlock).not.toMatch(/^\s*CALENDAR_PROVIDER\s*=/m)
    expect(envBlock).not.toMatch(/^\s*EMAIL_PROVIDER\s*=/m)

    // The Account-split table's email row no longer cites EMAIL_PROVIDER=gmail.
    const emailRow = lines(doc).find((l) => l.includes('Email (operator + client'))
    expect(emailRow).toBeDefined()
    expect(emailRow).not.toContain('EMAIL_PROVIDER=gmail')

    // Live config stays documented in the env block.
    for (const entry of [
      'MICROSOFT_CLIENT_ID',
      'MICROSOFT_REFRESH_TOKEN',
      'MEETING_BASE_URL',
      'EMAIL_FROM=info@rexi-ai.com',
      'EMAIL_TO',
    ]) {
      expect(envBlock).toContain(entry)
    }
  })
})
