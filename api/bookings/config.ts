import { loadAvailabilityConfig } from '../../src/domain/availability.js'
import { errorText } from '../errorText.js'
import type { ApiResponse } from '../httpTypes.js'

export function loadConfig() {
  return loadAvailabilityConfig()
}

export function loadConfigOrError(res: ApiResponse) {
  try {
    return loadConfig()
  } catch (e) {
    res.status(500).json({ error: { code: 'CONFIG_ERROR', message: errorText(e) } })
    return null
  }
}
