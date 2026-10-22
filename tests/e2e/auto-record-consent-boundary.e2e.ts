// tests/e2e/auto-record-consent-boundary.e2e.ts — spec 004 Ask G, scenario
// AC-004-51: a non-prefixed room is never auto-recorded.
/* global test, agent */

test('AC-004-51: a non-rexi room is never auto-recorded (consent boundary)', async () => {
  const room = `e2eprobe-${Math.floor(Math.random() * 1e9).toString(36)}`
  await agent.act(
    `open https://host.docker.internal:8443/${room} in the media-fake browser (same clip + flags as the full-chain journey, cert warning accepted) and join as "E2E Probe"`
  )
  await agent.assert('the meeting UI shows the self-view and the participant count is 1')
  await agent.assert(
    'NO recording indicator appears — no Jibri session for this room starts automatically'
  )
  // Condition-based settle (never-sleep rule): the auto-record trigger fires
  // the moment the first occupant is in the MUC, so a fully-joined, media-live
  // meeting state is strictly later than any recording decision could hide in.
  await agent.waitFor(
    'the meeting reaches its stable joined state (self-view media live, toolbar rendered)'
  )
  await agent.assert(
    `no Jibri session directory for ${room} exists under the stack RECORDINGS_DIR, and the recording control was never activated`
  )
})
