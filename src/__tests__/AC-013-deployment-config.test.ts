import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { parseAvailabilityYaml, computeSlotsForDate } from '../domain/availability'

describe('AC-013', () => {
  it('AC-013-01: Committed availability config parses', () => {
    const yaml = fs.readFileSync(path.join(process.cwd(), 'config', 'availability.yaml'), 'utf8')
    const cfg = parseAvailabilityYaml(yaml)
    // should produce slots for at least one weekday (monday)
    const monday = '2027-03-01' // monday
    const slots = computeSlotsForDate(cfg, monday)
    expect(slots.length).toBeGreaterThan(0)
  })
  it('AC-013-02: Environment template lists every backend variable with no secrets', () => {
    const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8')
    const required = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'GOOGLE_CALENDAR_ID',
      'GOOGLE_SERVICE_ACCOUNT_JSON',
      'RESEND_API_KEY',
      'EMAIL_FROM',
      'EMAIL_TO',
    ]
    for (const v of required) {
      expect(envExample).toContain(v)
    }
    expect(envExample).not.toContain('sk_test_')
    expect(envExample).not.toContain('whsec_')
    // no real credential values - ensure lines are empty or placeholder
    expect(envExample).not.toMatch(/sk_live/)
  })
  it('AC-013-03: Serverless functions mounted alongside the SPA rewrite', () => {
    const vercel = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'))
    expect(vercel.rewrites).toBeDefined()
    // SPA rewrite still present
    const hasRewrite = vercel.rewrites.some((r: any) => r.destination === '/index.html')
    expect(hasRewrite).toBe(true)
    // api handlers exist
    expect(fs.existsSync(path.join(process.cwd(), 'api', 'availability.ts'))).toBe(true)
    expect(fs.existsSync(path.join(process.cwd(), 'api', 'bookings.ts'))).toBe(true)
    expect(fs.existsSync(path.join(process.cwd(), 'api', 'stripe-webhook.ts'))).toBe(true)
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8')
    expect(readme.toLowerCase()).toContain('env')
  })
})
