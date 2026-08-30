import { loadAvailabilityConfig } from '../../src/domain/availability.js'

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function loadConfig() {
  return loadAvailabilityConfig()
}

export function loadConfigOrError(res: any) {
  try {
    return loadConfig()
  } catch (e) {
    res.status(500).json({ error: { code: 'CONFIG_ERROR', message: errMsg(e) } })
    return null
  }
}
