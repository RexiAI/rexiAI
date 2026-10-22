// tests/e2e/auto-record-full-chain.e2e.ts — spec 004 Ask G, scenarios
// AC-004-50, AC-004-52, AC-004-53 (the scripted journey; executed post-PR by
// the e2e-runner against the LIVE local stack — see docs/local-e2e-testing.md
// §2b for the auto-record install and §"the three pieces" for the running app).
//
// Prerequisites the e2e-runner must satisfy before `npx e2e run` (v0.17.0):
//   1. Synthesize the customer audio clip (Spanish, scripted asks — a
//      pricing-page requirement "necesito una página de precios" + one pain
//      point). Command documented for the runner:
//        bl speech synthesize --text "Hola. Necesito una página de precios en mi sitio web. El problema es que hoy gestiono todas las citas a mano y pierdo clientes." --language es --format wav --out /tmp/rexi-e2e-clip.wav
//   2. Launch the browser with:
//        --use-fake-device-for-media-capture
//        --use-file-for-fake-audio-capture=/tmp/rexi-e2e-clip.wav
//      and accept the self-signed cert for https://host.docker.internal:8443.
//   3. Fresh unique room per run: rexi-<16 lowercase hex> (crypto.randomBytes(8)
//      hex) so cross-run issue-search idempotency stays sound — each room maps
//      to at most one issue ever.
//   4. RECORDINGS_DIR per repo .env (decision 10) — the stack's configured
//      directory is what gets polled; the processor takes the same env/flag.
//   5. One-off processing between phases is DETERMINISTIC SCRIPT, not agent
//      work (the e2e standard: everything that can be a script stays one):
//        node scripts/process-recording.mjs --room <room> --recording <sessionDir>
//   6. Data hygiene after asserting (e2e-testing skill rules, the runner's
//      call): close the customer-insight issue the journey created.
/* global test, agent */

const CLIP_PATH = '/tmp/rexi-e2e-clip.wav'

function uniqueRoom(): string {
  // Replaced by the runner's harness; shape per AC-004-50.
  const hex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  return `rexi-${hex}`
}

test('AC-004-50: auto-recording fires for the first occupant without any UI action, exactly once', async () => {
  const room = uniqueRoom()
  await agent.act(
    `open https://host.docker.internal:8443/${room} in the media-fake browser (clip ${CLIP_PATH}, cert warning accepted) and join as "E2E Customer"`
  )
  await agent.assert(
    'the meeting UI shows the self-view and the participant count is 1; no recording control was touched'
  )
  // Auto-record: module fires server-side on first occupant — nobody clicked.
  await agent.waitFor('the Jitsi recording indicator shows a recording in progress (auto-started)')
  await agent.assert(
    `a Jibri session directory for room ${room} exists under the stack RECORDINGS_DIR with an mp4 inside`
  )
  await agent.act(
    'open the same room in a SECOND browser profile (also media-fake) and join as "E2E Second"'
  )
  await agent.assert(
    'the second participant is in the meeting; NO additional Jibri session directory appeared for this room (one session per meeting — module idempotency)'
  )
})

test('AC-004-52: one-off processing of the REAL session dir yields transcript and brief carrying the scripted content', async () => {
  // Runner script between phases: both participants leave, Jibri finalizes
  // (~20s wait for the session dir to close), then:
  //   node scripts/process-recording.mjs --room <room> --recording <sessionDir>
  await agent.act(
    'confirm both meeting tabs show the left-meeting screen and the Jibri session directory is finalized'
  )
  await agent.assert('the one-off processor run exited 0')
  await agent.assert(
    'transcript.json exists in the session directory and its text recognizably contains the scripted asks — a pricing-page requirement ("página de precios" / pricing page) and a pain point — tolerant of ASR variance'
  )
  await agent.assert(
    'customer-brief.md exists and its Requirements section mentions the scripted pricing-page requirement'
  )
})

test('AC-004-53: one labeled issue per recording; the second run is idempotent', async () => {
  await agent.assert(
    `exactly one RexiAI/rexiAI issue (open or closed) exists titled "Customer insight: <room> <YYYY-MM-DD>" carrying the customer-insight label, its body containing the brief content plus the transcript path and the recording (session-dir) path`
  )
  // Runner script: re-run the identical one-off command, then re-search.
  await agent.assert(
    'after the second identical processor run the search still returns exactly one issue for the room (no duplicate created)'
  )
  await agent.assert(
    'transcript.json and customer-brief.md were not regenerated on the second run — the .rexi-transcribed and .rexi-analyzed markers short-circuited those stages (mtimes unchanged)'
  )
})
