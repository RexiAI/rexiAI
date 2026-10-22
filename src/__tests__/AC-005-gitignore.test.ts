// Task 8 (Ask G sanctioned chore): .gitignore gains runs.jsonl.
// Acceptance tests per specs/005-home-hosted-recording/20-acceptance/AC-005-gitignore.md
// (the separate `chore:` commit itself is a PR-Opener-stage action; this spec's
// Coder stage does not commit — see docs/SPEC_PIPELINE §Commit and push carve-out)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('AC-005 gitignore chore', () => {
  it('AC-005-48: runs.jsonl is ignored', () => {
    const gi = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8')
    const entries = gi
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
    expect(entries).toContain('runs.jsonl')

    // live confirmation is the e2e stage; in-suite we may ask git itself,
    // read-only and network-free:
    const r = execFileSync('git', ['check-ignore', 'runs.jsonl'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf8',
    })
    expect(String(r).trim()).toBe('runs.jsonl')
  })
})
