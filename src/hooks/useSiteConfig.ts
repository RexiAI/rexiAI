import { useEffect, useState } from 'react'

export interface SiteConfig {
  billingEnabled: boolean
  /** False until /api/config settles. Callers must not render a money story yet. */
  ready: boolean
}

// Fail-safe default: billing ENABLED, but not ready. If /api/config is
// unreachable we assume charging is on, so a backend hiccup never accidentally
// advertises "free" — and the booking card stays neutral until that is known.
const DEFAULT: SiteConfig = { billingEnabled: true, ready: false }

// Module-level cache + in-flight dedupe: Landing and the booking widget both
// read the flag, but it should only be fetched once per page load.
let cached: SiteConfig | null = null
let inflight: Promise<SiteConfig> | null = null

function load(): Promise<SiteConfig> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    // A hung /api/config must not leave the booking card pending forever. The
    // abort falls through to the fail-safe paid mode with `ready: true`.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    inflight = fetch('/api/config', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : DEFAULT))
      .then((j: { billingEnabled?: unknown }) => {
        cached = { billingEnabled: j?.billingEnabled !== false, ready: true }
        return cached
      })
      .catch(() => {
        cached = { billingEnabled: true, ready: true }
        return cached
      })
      .finally(() => clearTimeout(timer))
  }
  return inflight
}

export function useSiteConfig(): SiteConfig {
  const [cfg, setCfg] = useState<SiteConfig>(cached ?? DEFAULT)
  useEffect(() => {
    let alive = true
    void load().then((c) => {
      if (alive) setCfg(c)
    })
    return () => {
      alive = false
    }
  }, [])
  return cfg
}
