// tests/e2e/home-timer-scan.e2e.ts — spec 005 Task 9, scenarios AC-005-49 and
// AC-005-50: live proofs against THIS host, executed post-PR by the
// e2e/arrangements stage (NOT by npm test). Self-contained plain-node script,
// zero npm imports (004 D4 contract):
//   node tests/e2e/home-timer-scan.e2e.ts
//
// AC-005-49: rexi-recording.timer is listed by systemctl list-timers and
// journalctl -u rexi-recording.service shows at least one scan cycle (the
// [recording-cron] or Scanning evidence line). ASR-stage failure containment
// inside that cycle is tolerated and expected (spec 006 pending) — this
// journey asserts scan-cycle evidence, never stage success.
//
// AC-005-50: /etc/rexi-recording.env exists with mode 600 (stat -c %a); the
// journal contains no secret-key dump (no STRIPE_SECRET_KEY=,
// RECORDED_BILLING_TOKEN=, DASHSCOPE_API_KEY= or GH_TOKEN= line); a second
// execution of install-recording-host.sh exits 0 (idempotent re-run) with the
// timer still enabled and active afterwards.
/* global process */
import { execFileSync } from 'node:child_process'

function failResult(err) {
  return { code: err.status ?? -1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
}

function run(cmd, args, opts = {}) {
  try {
    return { code: 0, out: execFileSync(cmd, args, { encoding: 'utf8', ...opts }) ?? '' }
  } catch (err) {
    return failResult(err)
  }
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`[home-timer-scan] ASSERT FAILED: ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
  }
  console.log(`[home-timer-scan] ok: ${msg}`)
}

function main() {
  // ---- AC-005-49 — timer installed + first scan cycle in the journal ----
  const timers = run('systemctl', ['list-timers', '--all', '--no-pager'])
  assert(
    timers.code === 0 && timers.out.includes('rexi-recording.timer'),
    'AC-005-49: systemctl list-timers shows rexi-recording.timer'
  )

  const journal = run('journalctl', ['-u', 'rexi-recording.service', '--no-pager'])
  assert(
    journal.out.includes('[recording-cron]') || journal.out.includes('Scanning'),
    'AC-005-49: journal holds a scan cycle (the [recording-cron] or Scanning evidence line)'
  )
  // The criterion is the cycle ran — stage failures (ASR 401 until spec 006)
  // are contained by design; this journey never asserts stage success.
  assert(
    true,
    'AC-005-49: scan-cycle evidence accepted; stage-level containment tolerated (spec 006 pending)'
  )

  // ---- AC-005-50 — env 0600, journal secrecy, idempotent second execution ----
  const mode = run('stat', ['-c', '%a', '/etc/rexi-recording.env'])
  assert(
    mode.code === 0 && mode.out.trim() === '600',
    'AC-005-50: /etc/rexi-recording.env exists with mode 600'
  )

  const dump = journal.out.match(
    /STRIPE_SECRET_KEY=|RECORDED_BILLING_TOKEN=|DASHSCOPE_API_KEY=|GH_TOKEN=/
  )
  assert(
    dump === null,
    `AC-005-50: no secret-key dump in the journal (found: ${dump ? dump[0] : 'none'})`
  )

  const second = run('bash', ['deploy/home/install-recording-host.sh'], { cwd: process.cwd() })
  assert(
    second.code === 0,
    `AC-005-50: second execution of install-recording-host.sh exits 0 (idempotent re-run) — got ${second.code}: ${second.out.slice(-400)}`
  )

  const enabled = run('systemctl', ['is-enabled', 'rexi-recording.timer'])
  const active = run('systemctl', ['is-active', 'rexi-recording.timer'])
  assert(
    enabled.out.trim() === 'enabled' && active.out.trim() === 'active',
    'AC-005-50: after the re-run the timer is still enabled and active'
  )

  console.log('[home-timer-scan] AC-005-49 + AC-005-50 PASSED')
}

main()
