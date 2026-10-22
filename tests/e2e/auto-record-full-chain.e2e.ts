// tests/e2e/auto-record-full-chain.e2e.ts — spec 004 Ask G full-chain journey
// (scenarios AC-004-50, AC-004-52, AC-004-53). Rewritten by the e2e-driven
// remediation (D4) as a SELF-CONTAINED, EXECUTABLE script: run it directly
// with plain node (Node >= 23 strips the .ts types; the body is plain JS) —
//   node tests/e2e/auto-record-full-chain.e2e.ts
// It needs no npm packages: browser automation is DevTools-Protocol over the
// native WebSocket in tests/e2e/auto-record-lib.mjs, and the stack tools are
// host binaries (chromium, node, gh, bl/ffmpeg via the processor).
//
// ── Playwright-MCP playbook (the alternative operator path; same contract) ──
// If the runner prefers Playwright (MCP browser tools, or an EXTERNALLY
// provided playwright-core — never a repo dependency), replay these steps;
// every media requirement is the lib's fakeMediaSource(clip) init script:
//   1. Synthesize the customer clip (Spanish, scripted asks — a pricing-page
//      requirement "necesito una página de precios" + one pain point):
//      bl speech synthesize --text "Hola. Necesito una página de precios en mi
//      sitio web. El problema es que hoy gestiono todas las citas a mano y
//      pierdo clientes." --language es --format wav --out /tmp/rexi-e2e-clip.wav
//   2. Launch chromium with ignoreHTTPSErrors (self-signed cert on the stack)
//      and register fakeMediaSource(base64 clip) as an init script
//      (Playwright: page.addInitScript). The WSL2-proven workaround replaces
//      the browser flags --use-fake-device-for-media-capture and
//      --use-file-for-fake-audio-capture=<clip>, which produce ZERO capture
//      devices on this host (proven live: enumerateDevices empty, GUM
//      NotFoundError): a page-level getUserMedia override serving a looping
//      WebAudio MediaStreamAudioDestinationNode of the clip + a canvas
//      captureStream video track.
//   3. Open https://host.docker.internal:8443/<room> for a fresh
//      rexi-<16hex> room. Display-name-agnostic join: fill whatever name
//      input appears and click whatever join button appears; if no dialog
//      appears (this build exposes no stable #enter_displayName), proceed —
//      confirmation is always #videoconference_page.
//   4. Assert via the HOST filesystem, never the UI: a Jibri session dir
//      <RECORDINGS_DIR>/<uuid>/<room>_<ts>.mp4 appears without anyone
//      touching a recording control (no recording control was touched).
//   5. Second browser, same room → NO additional Jibri session (exactly once).
//   6. Leave = CLOSE the browser (this build has no #toolbar-hangup; the
//      disconnection is the departure and Jibri finalizes).
//   7. Processor one-off — the deterministic command (equivalent to the lib's
//      runProcessor; env passthrough RECORDINGS_DIR, DASHSCOPE_API_KEY,
//      GH_TOKEN): node scripts/process-recording.mjs --room <room> --recording <dir>.
//      A bl 401 InvalidApiKey there is the owner-side credential issue D5,
//      not a journey defect — fix DASHSCOPE_API_KEY and re-run.
//   8. Hygiene after asserting (runner's call, e2e-testing rules): close the
//      issue the journey created.
//
// Env: REXI_E2E_STACK_URL (default https://host.docker.internal:8443),
//      REXI_E2E_CLIP (default /tmp/rexi-e2e-clip.wav), RECORDINGS_DIR (else
//      repo .env), CHROME_EXEC, REXI_E2E_HOLD_SECONDS (default 60),
//      REXI_E2E_STOP_AFTER = join|record|finalize|process|all (default all) —
//      lets an operator stop before the bl/gh steps while D5 is unresolved.
/* global process */
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import {
  assert,
  env,
  joinMeeting,
  listInsightIssues,
  log,
  openFakeMediaPage,
  projectRoot,
  recordingsDir,
  runProcessor,
  sessionDateFromMp4,
  sessionDirsForRoom,
  sleep,
  uniqueRoom,
  waitForFinalized,
  waitForJibriSession,
} from './auto-record-lib.mjs'

const STACK_URL = env('REXI_E2E_STACK_URL', 'https://host.docker.internal:8443')
const CLIP_PATH = env('REXI_E2E_CLIP', '/tmp/rexi-e2e-clip.wav')
const HOLD_MS = Number(env('REXI_E2E_HOLD_SECONDS', '60')) * 1000
const STAGES = ['join', 'record', 'finalize', 'process', 'all']

function shouldStop(stage) {
  return STAGES.indexOf(process.env.REXI_E2E_STOP_AFTER || 'all') <= STAGES.indexOf(stage)
}

/**
 * AC-004-50: join a fresh rexi-* room; the prosody module (not any UI click)
 * auto-starts recording; a second occupant must not start a second session.
 * Returns the Jibri session dir, or null when stopped at 'join'.
 */
async function runMeetingPhase(recRoot, room) {
  const main = await openFakeMediaPage({ clipPath: CLIP_PATH, tag: 'main', stackUrl: STACK_URL })
  let second = null
  try {
    await main.goto(`${STACK_URL}/${room}`)
    await joinMeeting(main, 'E2E Customer')
    if (shouldStop('join')) return null

    const dir = await waitForJibriSession(recRoot, room)
    assert(
      dir,
      `no Jibri session directory appeared for ${room} — auto-record did not fire unassisted (no recording control was touched)`
    )
    log('AC-004-50', `auto-record fired: ${dir}`)
    if (shouldStop('record')) return dir

    second = await openFakeMediaPage({ clipPath: CLIP_PATH, tag: 'second', stackUrl: STACK_URL })
    await second.goto(`${STACK_URL}/${room}`)
    await joinMeeting(second, 'E2E Second')
    const dirs = sessionDirsForRoom(recRoot, room)
    assert(
      dirs.length === 1,
      `expected exactly 1 session dir, found ${dirs.length}: NO additional Jibri session may appear for the second occupant (module idempotency, one session per meeting)`
    )
    await sleep(HOLD_MS)
    return dir
  } finally {
    // Leaving = closing the browser (no #toolbar-hangup in this build).
    await main.close()
    if (second) await second.close()
  }
}

/** AC-004-52: one-off processor run over the REAL session dir + its artifacts. */
function runProcessPhase(room, sessionDir) {
  const run1 = runProcessor({ repoRoot: projectRoot(), room, sessionDir })
  assert(
    run1.status === 0,
    `processor run exited ${run1.status}; stderr tail: ${(run1.stderr || run1.stdout).slice(-400)} (bl "InvalidApiKey" HTTP 401 is owner-side D5)`
  )

  const transcriptPath = path.join(sessionDir, 'transcript.json')
  const briefPath = path.join(sessionDir, 'customer-brief.md')
  assert(existsSync(transcriptPath), 'transcript.json missing after the one-off run')
  assert(existsSync(briefPath), 'customer-brief.md missing after the one-off run')

  const transcript = readFileSync(transcriptPath, 'utf8')
  assert(
    /precios|pricing|price/i.test(transcript),
    'transcript.json does not recognizably carry the scripted asks — the pricing-page requirement ("página de precios" / pricing page) and a pain point — tolerant of ASR variance'
  )
  assert(
    /precios|pricing|price/i.test(readFileSync(briefPath, 'utf8')),
    'customer-brief.md does not mention the scripted pricing-page requirement'
  )
  assert(
    existsSync(path.join(sessionDir, '.rexi-transcribed')) &&
      existsSync(path.join(sessionDir, '.rexi-analyzed')),
    'both stage markers (.rexi-transcribed, .rexi-analyzed) must exist after a successful run'
  )
  log('AC-004-52', 'transcript, brief, and both markers present')
}

/** AC-004-53: exactly one customer-insight label issue; second run changes nothing. */
function runDeliveryPhase(room, sessionDate, sessionDir, mtimeBefore) {
  // Decision 7: the title format is deterministic — `Customer insight: <room> <YYYY-MM-DD>`.
  const expectedTitle = `Customer insight: ${room} ${sessionDate}`
  const issues = listInsightIssues(expectedTitle)
  assert(
    issues.length === 1,
    `expected exactly one issue titled "${expectedTitle}" carrying the customer-insight label, found ${issues.length}`
  )
  const labels = (issues[0].labels || []).map((l) => l.name)
  assert(labels.includes('customer-insight'), 'the issue lacks the customer-insight label')

  const run2 = runProcessor({ repoRoot: projectRoot(), room, sessionDir })
  assert(run2.status === 0, `second identical processor run exited ${run2.status}`)
  assert(
    listInsightIssues(expectedTitle).length === 1,
    'the second identical run must find the same single issue — no duplicate created'
  )
  const mtimeAfter = {
    transcript: statSync(path.join(sessionDir, 'transcript.json')).mtimeMs,
    brief: statSync(path.join(sessionDir, 'customer-brief.md')).mtimeMs,
  }
  assert(
    mtimeAfter.transcript === mtimeBefore.transcript && mtimeAfter.brief === mtimeBefore.brief,
    'transcript.json and customer-brief.md must not be regenerated on the second run — the .rexi-transcribed and .rexi-analyzed markers short-circuit those stages (mtimes unchanged)'
  )
  log('AC-004-53', `issue #${issues[0].number} stable across the re-run`)
}

async function main() {
  if (!existsSync(CLIP_PATH)) {
    throw new Error(
      `clip missing: ${CLIP_PATH} — synthesize it first (playbook step 1, bl speech synthesize …)`
    )
  }
  const recRoot = recordingsDir(projectRoot())
  const room = uniqueRoom('rexi-')
  log('full-chain', `room=${room} RECORDINGS_DIR=${recRoot}`)

  const sessionDir = await runMeetingPhase(recRoot, room)
  if (!sessionDir) return
  if (shouldStop('record')) return

  const mp4s = await waitForFinalized(sessionDir)
  const sessionDate = sessionDateFromMp4(mp4s)
  if (shouldStop('finalize')) return

  runProcessPhase(room, sessionDir)
  const mtimeBefore = {
    transcript: statSync(path.join(sessionDir, 'transcript.json')).mtimeMs,
    brief: statSync(path.join(sessionDir, 'customer-brief.md')).mtimeMs,
  }
  if (shouldStop('process')) return

  runDeliveryPhase(room, sessionDate, sessionDir, mtimeBefore)
  log('full-chain', 'AC-004-50 + AC-004-52 + AC-004-53 journey PASSED')
}

main().catch((err) => {
  log('full-chain', 'JOURNEY FAILED:', String(err?.stack || err).slice(0, 1200))
  process.exitCode = 1
})
