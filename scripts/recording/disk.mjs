// scripts/recording/disk.mjs — scan-mode disk guard (spec 005 Task 2 / Ask B).
//
// Zero-dep, injectable-runner unit, same contract as the spec-004 harness:
// (cmd, args) → {stdout}. Measures free GB on a directory's filesystem with
// `df -kP`, parses the integer GB figure from the POSIX Available column, and
// returns a verdict against two thresholds read ONLY from the passed env
// object — never process.env (repo pattern, transcribe.mjs:36-41).
//
// Verdict mapping (10-tasks.md Task 2):
//   free >= REXI_MIN_FREE_GB        → { level: 'ok' }    — silent
//   REXI_HARD_MIN_FREE_GB <= free < REXI_MIN_FREE_GB → { level: 'warn' }
//   free < REXI_HARD_MIN_FREE_GB    → { level: 'error' } — the CALLER skips the run
//   df throws / unparseable output  → { level: 'warn' } + "cannot determine
//                                     free space" — FAIL OPEN (decision 3):
//                                     the frozen 004 suite's fake runners
//                                     answer every unmatched command with an
//                                     empty stdout; a fail-CLOSED guard would
//                                     skip processing and redden frozen tests,
//                                     which this spec may not modify. A real
//                                     disk-full still surfaces as contained
//                                     per-dir write failures downstream.

export const DEFAULT_MIN_FREE_GB = 20
export const DEFAULT_HARD_MIN_FREE_GB = 5

/**
 * Parse the integer GB figure from `df -kP` output: the 4th column
 * ("Available", in 1024-blocks) of the last non-header line. Null for any
 * unparseable input (empty stdout, error text, missing columns, NaN).
 */
export function parseAvailGb(stdout) {
  const lines = String(stdout || '')
    .split('\n')
    .filter((l) => l.trim().length > 0)
  if (lines.length < 2) return null // no data row after the header
  const cols = lines[lines.length - 1].trim().split(/\s+/)
  if (cols.length < 4) return null
  const availKb = Number(cols[3])
  if (!Number.isFinite(availKb) || availKb < 0) return null
  return Math.floor(availKb / (1024 * 1024))
}

/** Thresholds from the env object only; non-numeric or absent → defaults. */
export function freeSpaceThresholds(env) {
  return {
    minGb: parseGb(env['REXI_MIN_FREE_GB'], DEFAULT_MIN_FREE_GB),
    hardMinGb: parseGb(env['REXI_HARD_MIN_FREE_GB'], DEFAULT_HARD_MIN_FREE_GB),
  }
}

function parseGb(raw, fallback) {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 ? n : fallback
}

/**
 * One free-space assessment for a scan run.
 * @param {{ dir: string, env: Record<string, string|undefined>,
 *   runner: (cmd: string, args: string[]) => Promise<{stdout: string}> }} opts
 * @returns {Promise<{ level: 'ok'|'warn'|'error', message: string|null, freeGb: number|null }>}
 *   'ok' → silent; 'warn' → log.warn the message and CONTINUE; 'error' → the
 *   caller must skip the whole run (log.error the message, process nothing).
 */
export async function assessFreeSpace({ dir, env, runner }) {
  let freeGb = null
  try {
    const { stdout } = await runner('df', ['-kP', dir])
    freeGb = parseAvailGb(stdout)
  } catch {
    // df threw — undeterminable; the null path below fails open (decision 3)
  }
  const { minGb, hardMinGb } = freeSpaceThresholds(env)

  if (freeGb === null) {
    return {
      level: 'warn',
      freeGb: null,
      message:
        `DISK GUARD: cannot determine free space for ${dir} — continuing without ` +
        'the disk check (df failed or output unparseable).',
    }
  }
  if (freeGb < hardMinGb) {
    return {
      level: 'error',
      freeGb,
      message:
        `DISK GUARD: only ${freeGb} GB free at ${dir} — below the hard floor ` +
        `REXI_HARD_MIN_FREE_GB=${hardMinGb} GB. Skipping this scan run entirely; ` +
        'no session directories will be processed.',
    }
  }
  if (freeGb < minGb) {
    return {
      level: 'warn',
      freeGb,
      message:
        `DISK GUARD: low free space — ${freeGb} GB available at ${dir}, below ` +
        `REXI_MIN_FREE_GB=${minGb} GB. Processing continues; watch the disk.`,
    }
  }
  return { level: 'ok', freeGb, message: null }
}
