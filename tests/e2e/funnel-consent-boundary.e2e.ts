// tests/e2e/funnel-consent-boundary.e2e.ts — spec 005 Task 9, scenario
// AC-005-51: live proof against THIS host, executed post-PR by the
// e2e/arrangements stage (NOT by npm test). Self-contained plain-node script,
// zero npm imports (004 D4 contract):
//   node tests/e2e/funnel-consent-boundary.e2e.ts
//
// Given tailscale up (node pcdanimoudo-1) and no serve config (first funnel
// use): run deploy/home/expose-funnel.sh. It must REACH the owner-consent
// boundary and print clear manual-consent instructions (or complete the
// configuration, exit 0, if consent was already granted) — a clear status,
// no cryptic failure. Afterwards https://host.docker.internal:8443 must still
// respond: the local stack is untouched by the script.
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
    console.error(`[funnel-consent-boundary] ASSERT FAILED: ${msg}`)
    process.exitCode = 1
    throw new Error(msg)
  }
  console.log(`[funnel-consent-boundary] ok: ${msg}`)
}

function main() {
  const funnel = run('bash', ['deploy/home/expose-funnel.sh'], { cwd: process.cwd() })
  const text = funnel.out

  // Clear status: 0 = fully configured (consent already given), 3 = stopped
  // at the owner-consent boundary with instructions. Anything else (or a
  // cryptic pre-check refusal on a tailscale-up host) fails the journey.
  assert(
    funnel.code === 0 || funnel.code === 3,
    `AC-005-51: expose-funnel.sh exits with a clear status (0 configured / 3 consent boundary) — got ${funnel.code}`
  )
  assert(
    !/Traceback|syntax error|unexpected token/i.test(text),
    'AC-005-51: no cryptic failure in the output'
  )

  if (funnel.code === 3) {
    assert(
      /consent|enable/i.test(text) && /browser|manual/i.test(text),
      'AC-005-51: the consent boundary prints explicit manual browser instructions'
    )
    assert(
      /https?:\/\//.test(text),
      'AC-005-51: the enable/consent URL from the tailscale CLI output is surfaced'
    )
  } else {
    console.log(
      '[funnel-consent-boundary] funnel was already consented — configuration completed (allowed outcome)'
    )
  }

  // The hard-limitation banner must have been printed on this host (no
  // colibri-ws location upstream anymore).
  assert(
    /HTTPS-only/i.test(text) || /colibri-ws proxy present/i.test(text),
    'AC-005-51: the media-transport truth was stated (HTTPS-only banner or colibri-ws detection)'
  )

  // Local stack untouched: https://host.docker.internal:8443 still responds.
  const local = run('curl', [
    '-k',
    '-sS',
    '--max-time',
    '15',
    '-o',
    '/dev/null',
    '-w',
    '%{http_code}',
    'https://host.docker.internal:8443/',
  ])
  assert(
    local.code === 0 && local.out.trim() === '200',
    `AC-005-51: https://host.docker.internal:8443 still responds after the run (got '${local.out.trim()}')`
  )

  console.log('[funnel-consent-boundary] AC-005-51 PASSED')
}

main()
