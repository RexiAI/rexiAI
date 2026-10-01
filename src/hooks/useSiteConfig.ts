import { useEffect, useState } from 'react'

export interface SiteConfig {
  billingEnabled: boolean
}

// Fail-safe default: billing ENABLED. If /api/config is unreachable we assume
// charging is on, so a backend hiccup never accidentally advertises "free".
const DEFAULT: SiteConfig = { billingEnabled: true }

// Module-level cache + in-flight dedupe: Landing and the booking widget both
// read the flag, but it should only be fetched once per page load.
let cached: SiteConfig | null = null
let inflight: Promise<SiteConfig> | null = null

function load(): Promise<SiteConfig> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = fetch('/api/config')
      .then((r) => (r.ok ? r.json() : DEFAULT))
      .then((j: { billingEnabled?: unknown }) => {
        cached = { billingEnabled: j?.billingEnabled !== false }
        return cached
      })
      .catch(() => {
        cached = DEFAULT
        return cached
      })
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
