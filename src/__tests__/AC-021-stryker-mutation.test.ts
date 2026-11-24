import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, matchesGlob, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(p, 'utf8')
const json = (p: string) => JSON.parse(read(p))
const pkg = json('package.json')
const conf = () => json('stryker.config.json')
const workflow = () => read('.github/workflows/mutation.yml')

const isMutated = (file: string): boolean => {
  const globs: string[] = conf().mutate
  const pos = globs.filter((g) => !g.startsWith('!'))
  const neg = globs.filter((g) => g.startsWith('!')).map((g) => g.slice(1))
  return pos.some((g) => matchesGlob(file, g)) && !neg.some((g) => matchesGlob(file, g))
}

describe('AC-001 conformance tier', () => {
  it('AC-001-01 tier file declares production', () => {
    expect(read('AGENTS_REXIAI.md')).toMatch(/^## Conformance tier: production$/m)
  })
  it('AC-001-02 tier file wired into opencode instructions', () => {
    const ins: string[] = json('opencode.json').instructions
    expect(ins).toContain('AGENTS_REXIAI.md')
    expect(ins).toContain('.standards/AGENTS.md')
    expect(ins).toContain('.standards/language-specific/javascript/')
  })
})

describe('AC-002 stryker deps', () => {
  const core = '@stryker-mutator/core'
  const runner = '@stryker-mutator/vitest-runner'
  it('AC-002-01 both are devDependencies only', () => {
    expect(pkg.devDependencies).toHaveProperty([core])
    expect(pkg.devDependencies).toHaveProperty([runner])
    expect(pkg.dependencies).not.toHaveProperty([core])
    expect(pkg.dependencies).not.toHaveProperty([runner])
  })
  it('AC-002-02 same major version', () => {
    const major = (v: string) => /\d+/.exec(v)?.[0]
    expect(major(pkg.devDependencies[core])).toBe(major(pkg.devDependencies[runner]))
  })
  it('AC-002-03 lockfile resolves both', () => {
    const lock = json('package-lock.json').packages
    expect(lock[`node_modules/${core}`].version).toMatch(/^\d+\.\d+\.\d+/)
    expect(lock[`node_modules/${runner}`].version).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe('AC-003 stryker config', () => {
  it('AC-003-01 vitest runner and report path', () => {
    expect(conf().testRunner).toBe('vitest')
    expect(conf().coverageAnalysis).toBe('perTest')
    expect(conf().jsonReporter.fileName).toBe('reports/mutation/mutation.json')
  })
  it('AC-003-02 incremental cache', () => {
    expect(conf().incremental).toBe(true)
    expect(conf().incrementalFile).toBe('reports/mutation/stryker-incremental.json')
  })
  it('AC-003-03 thresholds', () => {
    expect(conf().thresholds).toEqual({ high: 90, low: 80, break: 80 })
  })
  it('AC-003-04 production code is mutated', () => {
    for (const f of ['src/domain/pricing.ts', 'src/App.tsx', 'api/_lib/routeGuards.ts']) {
      expect(isMutated(f), f).toBe(true)
    }
  })
  it('AC-003-05 tests, copy and data excluded', () => {
    const excluded = [
      'src/__tests__/x.test.ts',
      'src/domain/pricing.test.ts',
      'src/vite-env.d.ts',
      'src/i18n/locales/en.ts',
      'src/content/privacy.ts',
      'tests/e2e/journey.ts',
      'e2e.config.ts',
      '.standards/scripts/x.ts',
    ]
    for (const f of excluded) expect(isMutated(f), f).toBe(false)
  })
})

describe('AC-003-06 filename', () => {
  it('AC-003-06 wrapper-discoverable filename', () => {
    expect(existsSync('stryker.config.json')).toBe(true)
    expect(existsSync('stryker.conf.json')).toBe(false)
  })
})

describe('AC-004 npm script', () => {
  it('AC-004-01 script calls the bounded wrapper only', () => {
    const s: string = pkg.scripts.mutation
    expect(s).toContain('.standards/scripts/run-mutation.sh')
    for (const bad of ['stryker run', '--all', '--budget']) expect(s).not.toContain(bad)
  })
  it('AC-004-02 args forward to the wrapper (skip exit 2 on clean tree)', () => {
    // Scratch repo with a clean tree: the real tree carries uncommitted spec changes.
    const dir = mkdtempSync(join(tmpdir(), 'mut-'))
    const git = (...a: string[]) => execFileSync('git', a, { cwd: dir })
    git('init', '-q')
    copyFileSync('stryker.config.json', join(dir, 'stryker.config.json'))
    git('add', '.')
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'x')
    const wrapper = resolve('.standards/scripts/run-mutation.sh')
    expect(pkg.scripts.mutation).toContain('.standards/scripts/run-mutation.sh')
    const r = spawnSync('bash', [wrapper, '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' })
    rmSync(dir, { recursive: true, force: true })
    expect(r.stdout).toContain("no changed files against 'HEAD' — nothing to mutate (skip)")
    expect(r.status).toBe(2)
  }, 60000)
})

describe('AC-005 gitignore', () => {
  it('AC-005-01 artifact paths ignored', () => {
    const out = execFileSync('git', [
      'check-ignore',
      'reports/mutation/mutation.json',
      'reports/mutation/stryker-incremental.json',
      '.stryker-tmp/x',
    ]).toString()
    expect(out.trim().split('\n')).toHaveLength(3)
  })
})

describe('AC-006 manual CI job', () => {
  it('AC-006-01 workflow_dispatch only with base input', () => {
    const w = workflow()
    expect(w).toMatch(/^on:\s*\n\s+workflow_dispatch:/m)
    expect(w).not.toMatch(/^\s+(push|pull_request|schedule):/m)
    expect(w).toMatch(/base:[\s\S]*default: origin\/main/)
  })
  it('AC-006-02 runs wrapper, advisory', () => {
    const w = workflow()
    expect(w).toContain('npm ci')
    expect(w).toMatch(
      /npm run mutation -- --base .*inputs\.base|npm run mutation -- --base "\$BASE"/
    )
    expect(w).toContain('continue-on-error: true')
  })
  it('AC-006-03 checkout sufficient for diff scope', () => {
    const w = workflow()
    expect(w).toMatch(/fetch-depth: 0/)
    expect(w).toMatch(/submodules: true/)
  })
  it('AC-006-04 supply-chain hygiene', () => {
    const w = workflow()
    const uses = w.split('\n').filter((l) => /\buses:/.test(l))
    expect(uses.length).toBeGreaterThan(0)
    for (const l of uses) expect(l).toMatch(/@[0-9a-f]{40}\s+#\s*v\d/)
    expect(w).toMatch(/^permissions:\s*\n\s+contents: read\s*$/m)
    expect(w).not.toContain('secrets.')
    expect(w.toLowerCase()).not.toContain('vercel')
  })
  it('AC-006-05 existing CI untouched', () => {
    const diff = execFileSync('git', ['diff', 'main', '--', '.github/workflows/ci.yml']).toString()
    expect(diff).toBe('')
    expect(existsSync('.github/workflows/mutation.yml')).toBe(true)
  })
})
