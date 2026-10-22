// scripts/recording/deliver.mjs — GitHub issue delivery unit (spec 004 Task 5 / Ask D).
//
// Wraps the `gh` CLI through an injected runner, argv arrays only. The token
// travels ONLY via the environment (GH_TOKEN/GITHUB_TOKEN, read by gh itself —
// 10-tasks.md decision 11): no argv element, no console output ever carries it.
// Any gh failure propagates to the caller — never swallowed, never reported as
// success, no continuation past a failed call. Search-before-create keeps
// delivery idempotent across re-runs (AC-004-35).

/** Ask D pins the target repo — deliberately no knob. */
export const TARGET_REPO = 'RexiAI/rexiAI'
export const INSIGHT_LABEL = 'customer-insight'

const LABEL_COLOR = '0E8A16'
const LABEL_DESCRIPTION = 'Customer insight brief auto-generated from RexiAI meeting recordings'

function gh(runner, args) {
  return runner('gh', args)
}

/** gh label list → create customer-insight only when missing. Returns whether it created. */
export async function ensureLabel(runner) {
  const { stdout } = await gh(runner, [
    'label',
    'list',
    '--repo',
    TARGET_REPO,
    '--json',
    'name',
    '--limit',
    '200',
  ])
  const names = JSON.parse(stdout).map((label) => label.name)
  if (names.includes(INSIGHT_LABEL)) return false
  await gh(runner, [
    'label',
    'create',
    INSIGHT_LABEL,
    '--repo',
    TARGET_REPO,
    '--color',
    LABEL_COLOR,
    '--description',
    LABEL_DESCRIPTION,
  ])
  return true
}

/** Search open AND closed (--state all) for the room id in the title; a match suppresses creation. */
export async function findExistingIssue(runner, room) {
  const { stdout } = await gh(runner, [
    'issue',
    'list',
    '--repo',
    TARGET_REPO,
    '--state',
    'all',
    '--search',
    `${room} in:title`,
    '--json',
    'number,title,url',
    '--limit',
    '10',
  ])
  const matches = JSON.parse(stdout)
  return matches.length > 0 ? matches[0] : null
}

/**
 * Full delivery: label ensure → idempotent search → exactly one create.
 * Title date is the RECORDING session date (decision 7), passed in by the
 * caller — parsed from the <room>_<YYYY-MM-DD-HH-MM-SS>.mp4 filename, never
 * the processing date, so re-runs produce the stable title the search matches.
 */
export async function deliverInsightIssue({
  room,
  sessionDate,
  briefContent,
  transcriptPath,
  recordingPath,
  runner,
}) {
  await ensureLabel(runner)
  const existing = await findExistingIssue(runner, room)
  if (existing) return { created: false, existing }

  const title = `Customer insight: ${room} ${sessionDate}`
  const body = [
    briefContent,
    '',
    '---',
    '',
    `Transcript: ${transcriptPath}`,
    `Recording: ${recordingPath}`,
  ].join('\n')

  const { stdout } = await gh(runner, [
    'issue',
    'create',
    '--repo',
    TARGET_REPO,
    '--title',
    title,
    '--body',
    body,
    '--label',
    INSIGHT_LABEL,
  ])
  return { created: true, url: String(stdout).trim() }
}
