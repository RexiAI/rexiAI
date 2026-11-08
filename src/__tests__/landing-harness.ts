// src/__tests__/landing-harness.ts — shared render + source-tree helpers for the
// spec-019 landing acceptance tests.
//
// It is NOT a test file (no *.test.* name): vitest never collects it and the
// traceability gate never treats it as a reference site (precedent:
// shell-harness.ts, recording-harness.ts).
//
// Two reasons the render helper exists instead of inline setup per file:
//
// 1. useSiteConfig caches /api/config at module level ("one fetch per page
//    load"), so testing both billing modes needs a FRESH module graph per
//    render — vi.resetModules() + dynamic import, the AC-003 pattern.
// 2. Every spec-019 acceptance file renders the same app behind the same stubs;
//    twelve copies of that setup would drift.
import fs from 'node:fs'
import path from 'node:path'

import { act, render } from '@testing-library/react'
import { createElement } from 'react'
import { vi } from 'vitest'

/** A fetch stub body. Typed loosely: only ok/json are read by the app. */
export function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

export interface LandingOptions {
  /** What /api/config answers. Defaults to the billing-enabled (fail-safe) mode. */
  billingEnabled?: boolean
  /** Answer /api/availability with one slot, so the form can reach submit. */
  availability?: boolean
  /**
   * Pin the active locale before mount. Spanish is the first-time default
   * (spec 020), so a test that asserts English copy must ask for English
   * explicitly rather than leaning on the default.
   */
  locale?: 'es' | 'en'
}

export interface RenderedLanding {
  /** The element RTL mounted the app into — the whole landing tree. */
  container: HTMLElement
  fetchMock: ReturnType<typeof vi.fn>
}

/**
 * Render the real app on a fresh module graph.
 *
 * Call it at most once per mounted tree: a second call while the first is still
 * mounted leaves two app roots in the document and every query goes ambiguous.
 * `cleanup()` (RTL's automatic one, or an explicit call) unmounts first.
 */
export async function renderLanding(options: LandingOptions = {}): Promise<RenderedLanding> {
  const fetchMock = vi.fn((url: unknown) => {
    const target = String(url)
    if (target.includes('/api/config')) {
      return Promise.resolve(jsonResponse({ billingEnabled: options.billingEnabled ?? true }))
    }
    if (target.includes('/api/availability')) {
      return Promise.resolve(
        jsonResponse(
          options.availability ? { date: '2027-03-01', slots: ['10:00'] } : { slots: [] }
        )
      )
    }
    return Promise.resolve(jsonResponse({}))
  })
  vi.stubGlobal('fetch', fetchMock)
  if (options.locale) localStorage.setItem('rexi-locale', options.locale)
  vi.resetModules()
  const { default: App } = await import('../App')
  const mounted = render(createElement(App))
  // useSiteConfig seeds from its fail-safe default (billing ON) and only adopts
  // the /api/config answer once that promise settles. Flush it here so every
  // assertion runs against the mode it asked for rather than the seeded one.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return { container: mounted.container, fetchMock }
}

/** Every element's textContent in a subtree — for "no exact text X anywhere" rules. */
export function elementTexts(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('*')).map((el) => el.textContent ?? '')
}

export interface SourceFile {
  /** Repo-relative path, e.g. src/pages/Landing.tsx. */
  rel: string
  text: string
}

/** Read a repo file (used by the source-tree criteria the scenarios state directly). */
export function repoFile(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

/** Every file under src/, recursively, with its contents. */
export function srcFiles(dir: string = path.join(process.cwd(), 'src')): SourceFile[] {
  const files: SourceFile[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...srcFiles(full))
    } else {
      files.push({ rel: path.relative(process.cwd(), full), text: fs.readFileSync(full, 'utf8') })
    }
  }
  return files
}
