// tests/e2e/auto-record-consent-boundary.e2e.ts — spec 004 Ask G, scenario
// AC-004-51: a non-prefixed room is never auto-recorded. Rewritten by the
// e2e-driven remediation (D4) as an executable, zero-npm-dependency script:
//   node tests/e2e/auto-record-consent-boundary.e2e.ts
// (Playwright-MCP equivalent: join `e2eprobe-<hex>` with the lib's
// fakeMediaSource init script — ignoreHTTPSErrors, display-name-agnostic
// join confirmed by #videoconference_page, no #enter_displayName needed —
// then assert the host filesystem and close the browser to leave; no
// #toolbar-hangup in this build.)
/* global process */
import { existsSync } from 'node:fs'

import {
  assert,
  env,
  joinMeeting,
  log,
  openFakeMediaPage,
  projectRoot,
  recordingsDir,
  sessionDirsForRoom,
  sleep,
  uniqueRoom,
} from './auto-record-lib.mjs'

const STACK_URL = env('REXI_E2E_STACK_URL', 'https://host.docker.internal:8443')
const CLIP_PATH = env('REXI_E2E_CLIP', '/tmp/rexi-e2e-clip.wav')
const SETTLE_MS = Number(env('REXI_E2E_HOLD_SECONDS', '60')) * 1000

async function main() {
  if (!existsSync(CLIP_PATH)) {
    throw new Error(
      `clip missing: ${CLIP_PATH} — synthesize it first (full-chain journey playbook step 1, bl speech synthesize …)`
    )
  }
  const room = uniqueRoom('e2eprobe-')
  const recRoot = recordingsDir(projectRoot())
  log('AC-004-51', `room=${room} RECORDINGS_DIR=${recRoot}`)

  const page = await openFakeMediaPage({
    clipPath: CLIP_PATH,
    tag: 'noconsent',
    stackUrl: STACK_URL,
  })
  try {
    await page.goto(`${STACK_URL}/${room}`)
    await joinMeeting(page, 'E2E Probe')

    // The auto-record trigger fires the instant the first occupant is in the
    // MUC — so the fully-joined, media-live state below is strictly later
    // than any recording decision could hide in. Settle, then judge the
    // filesystem (never-sleep rule satisfied by the join-confirmation wait
    // plus a bounded settle window on the media-live state).
    await sleep(SETTLE_MS)

    const dirs = sessionDirsForRoom(recRoot, room)
    assert(
      dirs.length === 0,
      `expected a zero-recording consent boundary: no Jibri session directory for ${room} may exist under RECORDINGS_DIR and the recording control must never be activated — found ${dirs.join(', ')}`
    )
    log('AC-004-51', 'PASSED — no Jibri session directory appeared for a non-rexi room')
  } finally {
    await page.close()
  }
}

main().catch((err) => {
  log('consent', 'JOURNEY FAILED:', String(err?.stack || err).slice(0, 1200))
  process.exitCode = 1
})
