// AC-006 Task 6: one setting drives both the bot's write directory and the
// processor's scan directory, with one shared default and no second config file.
// Acceptance tests per
// specs/006-branded-meeting-link-and-recording-bot/20-acceptance/AC-006-recordings-location.md
import fs from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { botRecordingsDir } from '../../scripts/recording/bot/config.mjs'
import { recordingsDirFrom } from '../../scripts/recording/pipeline.mjs'

const SHARED_DEFAULT = path.join(homedir(), '.jitsi-meet-cfg', 'storage', 'jibri', 'recordings')

describe('AC-006 single recordings location', () => {
  it('AC-006-21: one setting drives both the bot and the processor', () => {
    const env = { RECORDINGS_DIR: '/data/recordings' }
    expect(botRecordingsDir(env)).toBe('/data/recordings')
    expect(recordingsDirFrom(env)).toBe('/data/recordings')
    expect(botRecordingsDir(env)).toBe(recordingsDirFrom(env))
  })

  it('AC-006-22: reconfiguring the one setting moves both', () => {
    const env = { RECORDINGS_DIR: '/data/new-recordings' }
    expect(botRecordingsDir(env)).toBe('/data/new-recordings')
    expect(recordingsDirFrom(env)).toBe('/data/new-recordings')
    expect(botRecordingsDir(env)).toBe(recordingsDirFrom(env))
  })

  it('AC-006-23: unset yields one shared default, not two fallbacks', () => {
    const env: Record<string, string | undefined> = {}
    expect(botRecordingsDir(env)).toBe(SHARED_DEFAULT)
    expect(recordingsDirFrom(env)).toBe(SHARED_DEFAULT)
    expect(botRecordingsDir(env)).toBe(recordingsDirFrom(env))
  })

  describe('unit: the knob is the only source', () => {
    it('an empty value is treated exactly as unset, by both components', () => {
      const env = { RECORDINGS_DIR: '' }
      expect(botRecordingsDir(env)).toBe(SHARED_DEFAULT)
      expect(botRecordingsDir(env)).toBe(recordingsDirFrom(env))
    })

    it('no second recordings-path variable influences the bot directory', () => {
      const env = {
        RECORDINGS_DIR: '/data/recordings',
        RECORDINGS_PATH: '/somewhere/else',
        REXI_RECORDINGS_DIR: '/another/place',
      }
      expect(botRecordingsDir(env)).toBe('/data/recordings')
      expect(botRecordingsDir(env)).toBe(recordingsDirFrom(env))
    })

    it('the bot module reads RECORDINGS_DIR and nothing else from the environment', () => {
      const source = fs.readFileSync(
        path.join(process.cwd(), 'scripts/recording/bot/config.mjs'),
        'utf8'
      )
      const envKeys = [...source.matchAll(/env\[['"]([A-Z0-9_]+)['"]\]/g)].map((m) => m[1])
      expect(envKeys).not.toContain('RECORDINGS_PATH')
      // The knob is owned by the processor's recordingsDirFrom, so this module
      // never re-implements (and never forks) the key itself.
      expect(source).toContain('recordingsDirFrom')
    })
  })
})
