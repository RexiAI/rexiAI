import { loadAvailabilityConfig } from '../../src/domain/availability.js'
import type { ApiResponse } from '../httpTypes.js'

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function loadConfig() {
  return loadAvailabilityConfig()
}

export function loadConfigOrError(res: ApiResponse) {
  try {
    return loadConfig()
  } catch (e) {
    res.status(500).json({ error: { code: 'CONFIG_ERROR', message: errMsg(e) } })
    return null
  }
}
