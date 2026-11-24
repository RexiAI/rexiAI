// AC-022-06-05 / AC-022-06-09 — the complexity <=6 gate covers .mjs files.
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const require = createRequire(import.meta.url)

type ConfigBlock = { files?: string[]; rules?: Record<string, unknown> }
const blocks = require(path.join(root, 'eslint.config.cjs')) as ConfigBlock[]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

/** A function with exactly seven decision paths: 1 + six `if`s. */
const PROBE_SOURCE = `export function probe(a, b, c, d, e, f) {
  if (a) return 1
  if (b) return 2
  if (c) return 3
  if (d) return 4
  if (e) return 5
  if (f) return 6
  return 0
}
`

describe('AC-022-06-05: .mjs files are held to complexity 6', () => {
  it('AC-022-06-05: the **/*.mjs config block sets complexity to error with a limit of 6', () => {
    const mjsBlocks = blocks.filter((block) => block.files?.includes('**/*.mjs'))
    expect(mjsBlocks).toHaveLength(1)
    expect(mjsBlocks[0].rules?.['complexity']).toEqual(['error', 6])
  })

  it('AC-022-06-05: no eslint-disable comment for complexity exists in scripts/ or tests/', () => {
    const files = [...walk(path.join(root, 'scripts')), ...walk(path.join(root, 'tests'))].filter(
      (file) => /\.(mjs|js|ts|cjs)$/.test(file)
    )
    expect(files.length).toBeGreaterThan(10)
    const offenders = files.filter((file) =>
      /eslint-disable[^\n]*complexity/.test(readFileSync(file, 'utf8'))
    )
    expect(offenders).toEqual([])
  })

  it('AC-022-06-05: npx eslint scripts tests exits 0 with no complexity errors', () => {
    const run = spawnSync('npx', ['eslint', 'scripts', 'tests', '--format', 'json'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    const results = JSON.parse(run.stdout) as {
      messages: { ruleId: string | null; severity: number }[]
    }[]
    const complexityErrors = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'complexity' && m.severity === 2)
    expect(complexityErrors).toEqual([])
    expect(run.status).toBe(0)
  }, 120_000)
})

describe('AC-022-06-09: the complexity gate is live for .mjs', () => {
  it('AC-022-06-09: a complexity-7 probe linted with the repo config yields one complexity error', async () => {
    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: path.join(root, 'eslint.config.cjs'),
    })
    const [result] = await eslint.lintText(PROBE_SOURCE, {
      filePath: path.join(root, 'scripts', 'probe.mjs'),
    })
    const complexity = result.messages.filter((m) => m.ruleId === 'complexity')
    expect(complexity).toHaveLength(1)
    expect(complexity[0].severity).toBe(2)
    expect(complexity[0].message).toMatch(/complexity of 7/)
  })

  it('AC-022-06-09: the same function at complexity 6 is clean, so the probe is not vacuous', async () => {
    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: path.join(root, 'eslint.config.cjs'),
    })
    const six = PROBE_SOURCE.replace('  if (f) return 6\n', '')
    const [result] = await eslint.lintText(six, {
      filePath: path.join(root, 'scripts', 'probe.mjs'),
    })
    expect(result.messages.filter((m) => m.ruleId === 'complexity')).toEqual([])
  })
})
