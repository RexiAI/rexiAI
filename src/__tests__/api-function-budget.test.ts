// Vercel Hobby allows at most 12 Serverless Functions per deployment. Every
// `.ts` file under `api/` becomes one, including files that are only helpers —
// which is exactly how the deploy broke: on 2026-10-29 an 11-function API
// crossed the limit and every deployment from that commit onwards failed with
// `exceeded_serverless_functions_per_deployment`. The build was green, the site
// stayed up on an old bundle, and nothing in CI noticed for ten days.
//
// Two rules keep it from happening again:
//   1. helper modules live under `api/_lib/` — Vercel ignores files and
//      directories whose name starts with `_`;
//   2. the number of real route files stays under the plan cap.
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const API_DIR = join(process.cwd(), 'api')
const SERVERLESS_FUNCTION_LIMIT = 12

function listTsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return listTsFiles(full)
    return entry.endsWith('.ts') ? [full] : []
  })
}

describe('api function budget', () => {
  const files = listTsFiles(API_DIR).map((f) => relative(API_DIR, f))
  const routes = files.filter((f) => !f.startsWith('_'))

  it('stays within the serverless function limit', () => {
    expect(routes.length).toBeLessThanOrEqual(SERVERLESS_FUNCTION_LIMIT)
  })

  it('keeps helper modules out of the route namespace', () => {
    const helpers = routes.filter((f) => {
      const base = f.split('/').pop() ?? ''
      return /^(types|validation|errors|errorText|httpTypes|routeGuards|resolve|submit|booking)\.ts$/.test(
        base,
      )
    })
    expect(helpers, `helpers must live under api/_lib/, found: ${helpers.join(', ')}`).toEqual([])
  })

  it('has an api/_lib directory for shared modules', () => {
    expect(files.some((f) => f.startsWith('_lib/'))).toBe(true)
  })
})
