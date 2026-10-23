// tests/e2e/switch-refusal.e2e.ts — spec 005 Task 9, scenario AC-005-52:
// live proof against THIS host, executed post-PR by the e2e/arrangements
// stage (NOT by npm test). Self-contained plain-node script, zero npm imports
// (004 D4 contract):
//   node tests/e2e/switch-refusal.e2e.ts
//
// Given the dead URL https://meet.rexi-ai.com (NXDOMAIN — host-verified):
// deploy/home/switch-meeting-base-url.sh must exit non-zero naming the failed
// gate (DNS resolution fails before any TLS/reachability success), and
// Vercel production env must be PROVABLY unchanged: a `vercel env ls
// production` snapshot taken before and after is identical, and
// MEETING_BASE_URL remains absent (its pre-run state).
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
    console.error(`[switch-refusal] ASSERT FAILED: ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
  }
  console.log(`[switch-refusal] ok: ${msg}`)
}

function snapshot() {
  // Read-only listing of the production env (names + ids only; values are
  // never printed). --json keeps the comparison exact.
  const r = run('vercel', ['env', 'ls', 'production', '--json'], { cwd: process.cwd() })
  assert(r.code === 0, `vercel env ls production succeeded (got ${r.code}): ${r.out.slice(0, 300)}`)
  const entries = JSON.parse(r.out)
  return { raw: r.out, names: (Array.isArray(entries) ? entries : []).map((e) => e.key).sort() }
}

function main() {
  const before = snapshot()
  assert(
    !before.names.includes('MEETING_BASE_URL'),
    'AC-005-52: pre-run production has no MEETING_BASE_URL (documented pre-state)'
  )

  const refusal = run(
    'bash',
    ['deploy/home/switch-meeting-base-url.sh', 'https://meet.rexi-ai.com'],
    { cwd: process.cwd() }
  )
  assert(
    refusal.code !== 0,
    `AC-005-52: the switch refuses the dead URL — exits non-zero (got ${refusal.code})`
  )
  assert(
    /gate/i.test(refusal.out),
    'AC-005-52: the refusal message names the failed gate (TLS/reachability — DNS fails first)'
  )
  assert(
    !/rollback/i.test(refusal.out),
    'AC-005-52: nothing was printed as a completed switch/rollback guidance'
  )

  const after = snapshot()
  assert(
    after.raw === before.raw,
    'AC-005-52: vercel env ls production snapshot before === after (production provably unchanged)'
  )
  assert(
    !after.names.includes('MEETING_BASE_URL'),
    'AC-005-52: MEETING_BASE_URL remains absent after the refusal'
  )

  console.log('[switch-refusal] AC-005-52 PASSED')
}

main()
