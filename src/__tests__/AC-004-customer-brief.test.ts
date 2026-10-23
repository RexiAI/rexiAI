// Task 4 (Ask C): customer brief insight stage.
// Acceptance tests per specs/004-auto-record-transcribe-insights/20-acceptance/AC-004-customer-brief.md
import fs from 'node:fs'

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

import {
  buildInsightMessages,
  renderBrief,
  runInsightStage,
  parseChatStdout,
} from '../../scripts/recording/insight.mjs'

import {
  makeFetch,
  mkTmpDir,
  rmTmpDir,
  writeFile,
  exists,
  SPANISH_TRANSCRIPT,
} from './recording-harness.ts'

const SECTIONS = ['Requirements', 'Pain points', 'Decisions', 'Commitments', 'Next steps']

const ENGLISH_TRANSCRIPT = {
  transcripts: [
    { content: [{ sentence: 'We need a pricing page. The problem is manual invoicing.' }] },
  ],
}

let base: string
const savedEnv: Record<string, string | undefined> = {}
const SECRET_KEYS = ['STRIPE_SECRET_KEY', 'RECORDED_BILLING_TOKEN', 'GH_TOKEN', 'DASHSCOPE_API_KEY']
const SECRET_VALUES = {
  STRIPE_SECRET_KEY: 'sk_live_SECRETISH_STRIPE_123',
  RECORDED_BILLING_TOKEN: 'TOKENISH_BILLING_456',
  GH_TOKEN: 'ghp_TOKENISH_GITHUB_789',
  DASHSCOPE_API_KEY: 'sk-SECRETISH_DASHSCOPE_012',
} as Record<string, string>

beforeAll(() => {
  base = mkTmpDir()
})
afterAll(() => {
  rmTmpDir(base)
})
beforeEach(() => {
  for (const k of SECRET_KEYS) {
    savedEnv[k] = process.env[k]
    process.env[k] = SECRET_VALUES[k]
  }
})
afterEach(() => {
  for (const k of SECRET_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k]
    else process.env[k] = savedEnv[k]
  }
})

function llmFiveSections() {
  return SECTIONS.map((s) => `## ${s}\n- body for ${s}`).join('\n\n')
}

function ollamaChatFetch(content: string) {
  return makeFetch(() => ({ status: 200, body: { message: { content } } }))
}

function contextResolved() {
  return {
    room: 'rexi-abc123',
    sessionDate: '2026-10-21',
    clientEmail: 'client@example.com',
    bookingId: 'cs_test_1',
    unattributed: false,
  }
}
function contextUnattributed() {
  return { room: 'rexi-abc123', sessionDate: '2026-10-21', unattributed: true }
}

function payloadText(p: { system: string; messages: { content: string }[] }): string {
  return [p.system, ...p.messages.map((m) => m.content)].join('\n')
}

describe('AC-004 customer brief insight stage', () => {
  it('AC-004-29: insight prompt asks for the five customer-want categories, language-aware', () => {
    const p = buildInsightMessages(SPANISH_TRANSCRIPT, contextResolved())
    const text = payloadText(p).toLowerCase()
    for (const want of ['requirements', 'pain points', 'decisions', 'commitments', 'next steps']) {
      expect(text).toContain(want)
    }
    // Spanish transcript → instructed to answer in Spanish (es/en aware).
    expect(text).toMatch(/spanish|español/)
    // English transcript → instructed to answer in English.
    const en = payloadText(
      buildInsightMessages(ENGLISH_TRANSCRIPT, contextResolved())
    ).toLowerCase()
    expect(en).toMatch(/english/)
  })

  it('AC-004-29: the payload embeds no value of any secret env variable', () => {
    const text = payloadText(buildInsightMessages(SPANISH_TRANSCRIPT, contextResolved()))
    for (const k of SECRET_KEYS) {
      expect(text).not.toContain(SECRET_VALUES[k])
    }
  })

  it('AC-004-30: customer-brief.md renders the fixed skeleton in fixed order', () => {
    const brief = renderBrief(llmFiveSections(), contextResolved())
    expect(brief).toContain('# Customer insight')
    expect(brief).toMatch(/## Booking context/i)
    let last = -1
    for (const s of SECTIONS) {
      const i = brief.indexOf(`## ${s}\n`)
      expect(i).toBeGreaterThan(-1)
      expect(i).toBeGreaterThan(last)
      last = i
    }
    expect(brief).toContain('body for Requirements')
  })

  it('AC-004-30: an empty category still renders with the fixed placeholder', () => {
    const brief = renderBrief('## Requirements\n- need a pricing page', contextResolved())
    expect(brief).toContain('None stated')
    // Skeleton is identical across briefs regardless of what the LLM reported:
    for (const s of SECTIONS) expect(brief).toContain(`## ${s}\n`)
    expect(brief).toMatch(/## Pain points\n\n?None stated/)
  })

  it('AC-004-31: booking context is best-effort and never fabricated', () => {
    const resolved = renderBrief(llmFiveSections(), contextResolved())
    expect(resolved).toContain('client@example.com')
    expect(resolved).toContain('cs_test_1')

    const plain = renderBrief(llmFiveSections(), contextUnattributed())
    expect(plain).toMatch(/unattributed/i)
    expect(plain).not.toContain('client@example.com')
    expect(plain).not.toContain('@') // never an invented email
    // Identical skeleton either way:
    for (const s of SECTIONS) {
      expect(resolved).toContain(`## ${s}\n`)
      expect(plain).toContain(`## ${s}\n`)
    }
  })

  it('AC-004-32: secrets never appear in the brief', async () => {
    const dir = fs.mkdtempSync(`${base}/brief-32-`)
    writeFile(dir, 'transcript.json', JSON.stringify(SPANISH_TRANSCRIPT))
    const llm = ollamaChatFetch(llmFiveSections())
    const deliver = async () => ({ created: true })
    await runInsightStage({
      sessionDir: dir,
      transcriptPath: `${dir}/transcript.json`,
      context: contextResolved(),
      fetch: llm.fetch,
      env: {},
      deliver,
    })
    const brief = fs.readFileSync(`${dir}/customer-brief.md`, 'utf8')
    for (const k of SECRET_KEYS) expect(brief).not.toContain(SECRET_VALUES[k])
  })

  it('AC-004-33: .rexi-analyzed is written only after brief AND issue delivery succeed', async () => {
    const dir = fs.mkdtempSync(`${base}/brief-33-ok-`)
    writeFile(dir, 'transcript.json', JSON.stringify(SPANISH_TRANSCRIPT))
    const llm = ollamaChatFetch(llmFiveSections())
    await runInsightStage({
      sessionDir: dir,
      transcriptPath: `${dir}/transcript.json`,
      context: contextResolved(),
      fetch: llm.fetch,
      env: {},
      deliver: async () => ({ created: true }),
    })
    expect(exists(dir, 'customer-brief.md')).toBe(true)
    expect(exists(dir, '.rexi-analyzed')).toBe(true)
  })

  it('AC-004-33: a delivery failure leaves no .rexi-analyzed and propagates', async () => {
    const dir = fs.mkdtempSync(`${base}/brief-33-fail-`)
    writeFile(dir, 'transcript.json', JSON.stringify(SPANISH_TRANSCRIPT))
    const llm = ollamaChatFetch(llmFiveSections())
    await expect(
      runInsightStage({
        sessionDir: dir,
        transcriptPath: `${dir}/transcript.json`,
        context: contextResolved(),
        fetch: llm.fetch,
        env: {},
        deliver: async () => {
          throw new Error('gh: issue create failed')
        },
      })
    ).rejects.toThrow(/gh/)
    expect(exists(dir, 'customer-brief.md')).toBe(true) // brief written before delivery attempt
    expect(exists(dir, '.rexi-analyzed')).toBe(false) // never mark done on failure
  })

  it('unit: bl chat stdout is parsed defensively (json envelope, plain text fallback)', () => {
    const content = llmFiveSections()
    expect(parseChatStdout(fromEnvelope(content))).toBe(content)
    expect(parseChatStdout(content)).toBe(content) // non-JSON stdout passes through
  })
})

function fromEnvelope(content: string): string {
  return JSON.stringify({ choices: [{ message: { content } }] })
}
