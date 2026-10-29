// AC-008 Task 8 — recordings are organised into <name>_<date> folders.
// Acceptance tests per
// specs/008-customer-name-and-recording-folders/20-acceptance/AC-008-recording-folders.md
//
// The rename is asserted on the real filesystem (temp dirs), because the whole
// contract — in-place rename, marker idempotency, collision suffixes — is
// filesystem behaviour.
import fs from 'node:fs'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ORGANIZED_MARKER, organizeSessionDir } from '../../scripts/recording/folder.mjs'
import {
  processSessionDir,
  scanAll,
  sessionDateFromMp4,
} from '../../scripts/recording/pipeline.mjs'

import {
  captureLog,
  exists,
  ffprobeBehavior,
  makeFetch,
  makeRunner,
  mkTmpDir,
  rmTmpDir,
  writeFile,
} from './recording-harness.ts'

const ROOM = 'rexi-abc'
const MP4 = `${ROOM}_2026-10-28-10-00-00.mp4`
const SESSION_DATE = '2026-10-28'

let base: string
beforeAll(() => {
  base = mkTmpDir('rexi-008-')
})
afterAll(() => {
  rmTmpDir(base)
})

/** A Jibri-shaped session directory under its own recordings root. */
function sessionDir(root: string, mp4 = MP4): string {
  fs.mkdirSync(root, { recursive: true })
  const dir = fs.mkdtempSync(path.join(root, 'jibri-'))
  writeFile(dir, mp4)
  writeFile(dir, 'metadata.json', JSON.stringify({ meeting_url: `https://meet.example/${ROOM}` }))
  return dir
}

function root(name: string): string {
  return path.join(base, name)
}

function attributionWith(name: string, date = SESSION_DATE) {
  return { bookingId: 'cs_test_1', email: 'ana@example.com', name, date, quotedHours: 1 }
}

function organize(
  dir: string,
  attribution: { name?: string; date?: string } | null,
  sessionDate = SESSION_DATE
) {
  const { log } = captureLog()
  return organizeSessionDir({ dir, attribution, sessionDate, log })
}

describe('AC-008 recording folders', () => {
  it('AC-008-17: the folder is named <name>_<date>', () => {
    const dir = sessionDir(root('ac17'))

    const organized = organize(dir, attributionWith('Maria Garcia'))

    expect(path.basename(organized)).toBe('Maria_Garcia_2026-10-28')
    expect(path.dirname(organized)).toBe(path.dirname(dir))
    expect(fs.existsSync(dir)).toBe(false) // renamed in place, not copied
    expect(exists(organized, ORGANIZED_MARKER)).toBe(true)
    expect(exists(organized, MP4)).toBe(true) // contents travelled with the rename
  })

  it('AC-008-18: the name is sanitised for the filesystem', () => {
    const dir = sessionDir(root('ac18'))

    const organized = organize(dir, attributionWith('Ana/López\\ <script>'))
    const folder = path.basename(organized)

    expect(folder).toBe('Ana_López_script_2026-10-28')
    expect(folder).not.toMatch(/[/\\<>]/)
    expect(folder).not.toMatch(/\s/)
  })

  it('AC-008-19: a recording with no name falls back to unattributed_<date>', () => {
    const dir = sessionDir(root('ac19'))

    const organized = organize(dir, attributionWith(''))

    expect(path.basename(organized)).toBe('unattributed_2026-10-28')
  })

  it('AC-008-22: a colliding name + date appends a numeric suffix', () => {
    const recordings = root('ac22')
    const dir = sessionDir(recordings)
    fs.mkdirSync(path.join(recordings, 'Maria_Garcia_2026-10-28'))

    const organized = organize(dir, attributionWith('Maria Garcia'))

    expect(path.basename(organized)).toBe('Maria_Garcia_2026-10-28-2')
    // The sibling that owned the name is untouched.
    expect(fs.existsSync(path.join(recordings, 'Maria_Garcia_2026-10-28'))).toBe(true)
  })

  it('AC-008-23: a re-scan does not rename an organised directory again', async () => {
    const recordings = root('ac23')
    const organizedName = 'Maria_Garcia_2026-10-28-2'
    const dir = path.join(recordings, organizedName)
    fs.mkdirSync(dir, { recursive: true })
    writeFile(dir, MP4)
    writeFile(dir, 'metadata.json', JSON.stringify({ meeting_url: `https://meet.example/${ROOM}` }))
    writeFile(dir, ORGANIZED_MARKER, 'done\n')
    for (const marker of ['.rexi-billed', '.rexi-transcribed', '.rexi-analyzed'])
      writeFile(dir, marker)

    // The guard itself: a marked directory is never renamed again.
    expect(path.basename(organize(dir, attributionWith('Maria Garcia')))).toBe(organizedName)

    const { log } = captureLog()
    const { runner } = makeRunner(ffprobeBehavior({ duration: () => 120, audio: () => true }))
    const { fetch } = makeFetch(() => ({ status: 200, body: { data: [], has_more: false } }))
    await scanAll({ rootDir: recordings, env: {}, deps: { runner, fetch }, log })

    expect(fs.existsSync(dir)).toBe(true)
    expect(fs.readdirSync(recordings).sort()).toEqual([organizedName])
  })

  it('AC-008-24: a fully unattributed recording falls back to the session date', async () => {
    const recordings = root('ac24')
    const dir = sessionDir(recordings)
    // A silent capture keeps this to the organise step: no ASR, no insight call.
    const { runner } = makeRunner(ffprobeBehavior({ duration: () => 120, audio: () => false }))
    const { fetch } = makeFetch(() => ({ status: 200, body: { data: [], has_more: false } }))
    const { log } = captureLog()

    const { dir: organized } = await processSessionDir({
      dir,
      env: {},
      deps: { runner, fetch },
      log,
    })

    expect(path.basename(organized)).toBe('unattributed_2026-10-28')
    expect(fs.existsSync(dir)).toBe(false)
  })

  it('unit: sanitisation is deterministic and preserves unicode letters', () => {
    const dir = sessionDir(root('unit-sanitise'))

    expect(path.basename(organize(dir, attributionWith('  Ana   María  Núñez  ')))).toBe(
      'Ana_María_Núñez_2026-10-28'
    )
    expect(sessionDateFromMp4(`/x/${MP4}`)).toBe(SESSION_DATE)
  })

  it('unit: a dry run reports the rename without touching the filesystem', () => {
    const dir = sessionDir(root('unit-dry'))
    const { lines, log } = captureLog()

    const organized = organizeSessionDir({
      dir,
      attribution: attributionWith('Maria Garcia'),
      sessionDate: SESSION_DATE,
      dryRun: true,
      log,
    })

    expect(organized).toBe(dir)
    expect(fs.existsSync(dir)).toBe(true)
    expect(exists(dir, ORGANIZED_MARKER)).toBe(false)
    expect(lines.join('\n')).toContain('Maria_Garcia_2026-10-28')
  })
})
