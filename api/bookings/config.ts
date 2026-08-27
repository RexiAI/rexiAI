import fs from 'fs'
import path from 'path'

import { parseAvailabilityYaml } from '../../src/domain/availability.js'

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function loadConfig() {
  const p = path.join(process.cwd(), 'config', 'availability.yaml')
  const yaml = fs.readFileSync(p, 'utf8')
  return parseAvailabilityYaml(yaml)
}

export function loadConfigOrError(res: any) {
  try {
    return loadConfig()
  } catch (e) {
    res.status(500).json({ error: { code: 'CONFIG_ERROR', message: errMsg(e) } })
    return null
  }
}
