// scripts/recording/folder.mjs — the organise step (spec 008 Task 8).
//
// Renames a finished Jibri session directory, IN PLACE, to
// `<sanitized-name>_<YYYY-MM-DD>` — the customer name first, then the meeting date
// from the booking's Stripe metadata (never the processing date). Falls back to
// `unattributed_<date>` when no name was resolved, and appends `-2`, `-3`, …
// when a different directory already owns the target name.
//
// Idempotency is the `.rexi-organized` marker inside the directory: a re-scan of
// an organised directory never renames it again and never appends a new suffix.
// The marker is written AFTER a successful rename, so a failed rename leaves the
// directory unmarked and eligible on the next scan (the sweep contains the throw).
//
// Nothing here is a pipeline stage with its own skip verdict: it is a rename plus
// a marker, so it stays out of the stage-marker triad in pipeline.mjs.

import { existsSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const ORGANIZED_MARKER = '.rexi-organized'
/** Folder token used when no customer name was resolved. Never a fabricated name. */
export const UNATTRIBUTED_TOKEN = 'unattributed'

// `/:<>"|?*` are illegal on Windows, `/` alone is fatal on POSIX, and control
// characters are illegal in both — all collapse to `_`. Whitespace is included
// because a folder name with a space is the thing this feature exists to avoid.
// `\p{Cc}` (unicode "control") rather than a \x00-\x1f range: same set, and it
// keeps the rule set lint-clean (no-control-regex).
const UNSAFE_CHARS = /[\s/\\<>:"|?*\p{Cc}]/gu
// Bounded collision probe: an unbounded `while (exists)` loop on a pathological
// directory is a hang, and a four-digit sibling count is not a real workflow.
const MAX_COLLISION_SUFFIX = 1000

/**
 * Filesystem-safe token for a person's name: unsafe characters and whitespace
 * become `_`, runs collapse, edges are stripped. Accents and other unicode
 * letters are preserved — `María Núñez` stays readable. Deterministic: the same
 * input always yields the same token, which is what makes the rename idempotent.
 */
export function sanitizeFolderToken(name) {
  if (typeof name !== 'string') return ''
  return name
    .replace(UNSAFE_CHARS, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** `<name>_<date>`, or `unattributed_<date>` when the name sanitises to nothing. */
export function folderNameFor({ name, date }) {
  const token = sanitizeFolderToken(name)
  const day = typeof date === 'string' ? date.trim() : ''
  const base = token === '' ? UNATTRIBUTED_TOKEN : token
  return day === '' ? base : `${base}_${day}`
}

/** First free `<base>`, `<base>-2`, `<base>-3`, … in `parent`; `base` when it is
 *  this directory's own current name. */
function freeTargetName(parent, base, currentName) {
  if (base === currentName) return base
  let candidate = base
  for (let n = 2; n <= MAX_COLLISION_SUFFIX; n += 1) {
    if (!existsSync(path.join(parent, candidate))) return candidate
    candidate = `${base}-${n}`
  }
  return candidate
}

function markOrganized(dir) {
  writeFileSync(path.join(dir, ORGANIZED_MARKER), `${new Date().toISOString()} organised\n`)
}

function isOrganized(dir) {
  return existsSync(path.join(dir, ORGANIZED_MARKER))
}

/** The booking's metadata.date wins; the recording's own date is the fallback for
 *  a recording with no reservation at all. */
function dateFor(attribution, sessionDate) {
  return attribution?.date || sessionDate
}

/** The target name for this directory, resolving collisions against its siblings. */
function targetNameFor({ parent, current, attribution, sessionDate }) {
  const base = folderNameFor({ name: attribution?.name, date: dateFor(attribution, sessionDate) })
  return freeTargetName(parent, base, current)
}

/** Already carrying the right name: mark it so it is never touched again (a rename
 *  whose marker write failed lands here on the next scan). */
function keepCurrentName(dir, dryRun) {
  if (!dryRun) markOrganized(dir)
  return dir
}

/** Rename first, mark after: a failed rename leaves no marker, so the next scan
 *  retries instead of skipping a half-organised directory. */
function renameAndMark({ dir, parent, current, targetName, log }) {
  const target = path.join(parent, targetName)
  renameSync(dir, target)
  markOrganized(target)
  log.log(`    ORGANISED: ${current} -> ${targetName}`)
  return target
}

/**
 * Organise one session directory.
 *
 * @param {{ dir: string, attribution?: { name?: string, date?: string } | null,
 *   sessionDate: string, dryRun?: boolean,
 *   log?: { log: Function } }} opts
 * @returns {string} the directory to keep working with — the renamed path on a
 *   successful rename, otherwise the unchanged `dir`.
 */
export function organizeSessionDir({
  dir,
  attribution,
  sessionDate,
  dryRun = false,
  log = console,
}) {
  if (isOrganized(dir)) {
    log.log('    SKIP organise: .rexi-organized marker (already organised).')
    return dir
  }

  const parent = path.dirname(dir)
  const current = path.basename(dir)
  const targetName = targetNameFor({ parent, current, attribution, sessionDate })

  if (targetName === current) return keepCurrentName(dir, dryRun)
  if (dryRun) {
    log.log(`    DRY-RUN: would rename ${current} -> ${targetName}`)
    return dir
  }
  return renameAndMark({ dir, parent, current, targetName, log })
}
