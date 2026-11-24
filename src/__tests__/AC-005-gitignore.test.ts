// Task 8 (Ask G sanctioned chore), superseded: spec 005 originally made
// runs.jsonl gitignored. The engineering standards (docs/SPEC_PIPELINE.md
// §Commit and push carve-out, standards 1.55.2) now require the append-only
// ledger runs.jsonl to be TRACKED and committed by the PR Opener, never
// gitignored. Owner-authorized assertion inversion; scenario ID kept.
// Acceptance tests per docs/changes/005-home-hosted-recording.md (AC-005-48).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('AC-005 gitignore chore', () => {
  it('AC-005-48: runs.jsonl is tracked, not ignored', () => {
    const gi = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8')
    const entries = gi
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
    expect(entries).not.toContain('runs.jsonl')

    // git itself, read-only and network-free: check-ignore exits 1 when the
    // path is not ignored.
    const actual = spawnSync('git', ['check-ignore', 'runs.jsonl'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).status
    expect(actual).toBe(1)
  })
})
