// Task 5 (Ask D): GitHub issue delivery unit.
// Acceptance tests per specs/004-auto-record-transcribe-insights/20-acceptance/AC-004-issue-delivery.md
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  ensureLabel,
  findExistingIssue,
  deliverInsightIssue,
  TARGET_REPO,
} from '../../scripts/recording/deliver.mjs'

import { makeRunner, ghStdout } from './recording-harness.ts'

const TOKEN = 'ghp_DISTINCTIVE_TOKEN_VALUE_123'

function healthyRunner(overrides?: Partial<Record<string, string>>) {
  return makeRunner((call) => {
    const key = [call.cmd, ...call.args].filter(Boolean).join(' ')
    for (const [needle, value] of Object.entries(overrides || {})) {
      if (key.includes(needle)) return { stdout: value }
    }
    return { stdout: ghStdout([call.cmd, ...call.args]) }
  })
}

function deliveryArgs(runner: unknown) {
  return deliverInsightIssue({
    room: 'rexi-abc123',
    sessionDate: '2026-10-21',
    briefContent: '# Customer insight body marker',
    transcriptPath: '/data/sess/transcript.json',
    recordingPath: '/data/sess',
    runner,
  })
}

let savedToken: string | undefined
beforeEach(() => {
  savedToken = process.env.GH_TOKEN
  process.env.GH_TOKEN = TOKEN
})
afterEach(() => {
  if (savedToken === undefined) delete process.env.GH_TOKEN
  else process.env.GH_TOKEN = savedToken
})

describe('AC-004 GitHub issue delivery', () => {
  it('AC-004-34: one labeled issue is created when the room has none', async () => {
    const { runner, calls } = healthyRunner()
    await deliveryArgs(runner)

    const creates = calls.filter(
      (c) => c.cmd === 'gh' && c.args[0] === 'issue' && c.args[1] === 'create'
    )
    expect(creates).toHaveLength(1)
    const args = creates[0].args
    expect(TARGET_REPO).toBe('RexiAI/rexiAI')
    expect(args).toContain('--repo')
    expect(args).toContain('RexiAI/rexiAI')
    expect(args[args.indexOf('--title') + 1]).toBe('Customer insight: rexi-abc123 2026-10-21')
    const body = args[args.indexOf('--body') + 1]
    expect(body).toContain('# Customer insight body marker')
    expect(body).toContain('/data/sess/transcript.json')
    expect(body).toContain('/data/sess')
    expect(args[args.indexOf('--label') + 1]).toBe('customer-insight')
  })

  it('AC-004-35: an existing open or closed issue for the room suppresses creation', async () => {
    for (const state of ['open', 'closed']) {
      const { runner, calls } = healthyRunner({
        'issue list': JSON.stringify([
          { number: 7, title: `Customer insight: rexi-abc123 2026-10-21`, state },
        ]),
      })
      const result = await deliveryArgs(runner)
      expect(result.created).toBe(false)
      expect(calls.filter((c) => c.args?.[1] === 'create')).toHaveLength(0)
      // Search must cover BOTH states — that is the --state all flag on the list call.
      const search = calls.find((c) => c.args[0] === 'issue' && c.args[1] === 'list')
      expect(search?.args).toContain('--state')
      expect(search?.args[search.args.indexOf('--state') + 1]).toBe('all')
    }
  })

  it('AC-004-36: a missing label is created exactly once; an existing one is not', async () => {
    const missing = healthyRunner({ 'label list': JSON.stringify([{ name: 'bug' }]) })
    await deliveryArgs(missing.runner)
    const creates = missing.calls.filter((c) => c.args[0] === 'label' && c.args[1] === 'create')
    expect(creates).toHaveLength(1)
    expect(creates[0].args).toContain('customer-insight')

    const present = healthyRunner()
    await deliveryArgs(present.runner)
    expect(
      present.calls.filter((c) => c.args[0] === 'label' && c.args[1] === 'create')
    ).toHaveLength(0)
  })

  it('AC-004-37: the token never appears in argv or output', async () => {
    const captured: string[] = []
    /* eslint-disable no-console -- AC-004-37's purpose is capturing console output
       to prove the GH_TOKEN value never reaches stdout/stderr. */
    const originalLog = console.log
    const originalError = console.error
    const { runner, calls } = healthyRunner()
    console.log = (...a: unknown[]) => captured.push(a.join(' '))
    console.error = (...a: unknown[]) => captured.push(a.join(' '))
    try {
      await ensureLabel(runner)
      await findExistingIssue(runner, 'rexi-abc123')
      await deliveryArgs(runner)
    } finally {
      console.log = originalLog
      console.error = originalError
    }
    /* eslint-enable no-console */
    for (const call of calls) {
      const flat = [call.cmd, ...call.args].join(' ')
      expect(flat).not.toContain(TOKEN)
    }
    expect(captured.join('\n')).not.toContain(TOKEN)
  })

  it('AC-004-38: gh failures propagate, never swallowed', async () => {
    const isLabel = (kind: string) => (c: { cmd: string; args: string[] }) =>
      c.args[0] === 'label' && c.args[1] === kind
    const isIssue = (kind: string) => (c: { cmd: string; args: string[] }) =>
      c.args[0] === 'issue' && c.args[1] === kind
    const labelMissing = { 'label list': JSON.stringify([{ name: 'bug' }]) }
    const cases = [
      { match: isLabel('list'), overrides: {} },
      { match: isLabel('create'), overrides: labelMissing },
      { match: isIssue('list'), overrides: {} },
      { match: isIssue('create'), overrides: {} },
    ]
    for (const { match, overrides } of cases) {
      const { runner, calls } = makeRunner((call) => {
        const key = [call.cmd, ...call.args].join(' ')
        for (const [needle, value] of Object.entries(overrides)) {
          if (key.includes(needle)) return { stdout: value }
        }
        return match(call) ? { fail: true } : { stdout: ghStdout([call.cmd, ...call.args]) }
      })
      await expect(deliveryArgs(runner)).rejects.toThrow()
      // no continuation past the failed call: nothing ran after it
      const idx = calls.findIndex(match)
      expect(calls.slice(idx + 1)).toHaveLength(0)
    }
  })
})
