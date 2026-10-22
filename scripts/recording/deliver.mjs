// scripts/recording/deliver.mjs — GitHub issue delivery unit (spec 004 Task 5 / Ask D).
//
// Wraps the `gh` CLI through an injected runner, argv arrays only. The token
// travels ONLY via the environment (GH_TOKEN/GITHUB_TOKEN, read by gh itself —
// 10-tasks.md decision 11): no argv element, no console output ever carries it.
// Any gh failure propagates to the caller — never swallowed, never reported as
// success, no continuation past a failed call. List-scan-before-create keeps
// delivery idempotent across re-runs (AC-004-35): GitHub's issue SEARCH index
// lags seconds behind reality, so a re-run minutes after the first create saw
// an empty search and opened a duplicate issue (live e2e defect D3: #73/#74
// for one room). The plain issue LIST endpoint is index-independent, and the
// title format is deterministic (decision 7) — that exact-title scan is the
// primary; the old search stays as a secondary for issues beyond the list
// window.

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

/**
 * Find an existing issue for this room, open AND closed (--state all).
 * Primary: the plain `--state all` listing, matched CLIENT-side on the
 * deterministic title (decision 7) — immune to the search index's
 * seconds-fresh blindness (live defect D3). Secondary: the search index
 * (`<room> in:title`), still useful for issues older than the list window.
 * `expectedTitle` is optional: without it the match degrades to the room id
 * appearing in the title, same semantics as the old search.
 */
export async function findExistingIssue(runner, room, expectedTitle) {
  const { stdout } = await gh(runner, [
    'issue',
    'list',
    '--repo',
    TARGET_REPO,
    '--state',
    'all',
    '--json',
    'number,title,url',
    '--limit',
    '200',
  ])
  const listed = JSON.parse(stdout)
  const matches = (title) =>
    expectedTitle ? title === expectedTitle : String(title).includes(room)
  const hit = listed.find((issue) => matches(issue.title))
  if (hit) return hit

  const secondary = await gh(runner, [
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
  const found = JSON.parse(secondary.stdout)
  return found.length > 0 ? found[0] : null
}

/**
 * Full delivery: label ensure → idempotent existence scan → exactly one
 * create. Title date is the RECORDING session date (decision 7), computed
 * here and handed to the scan — parsed from the <room>_<YYYY-MM-DD-HH-MM-SS>.mp4
 * filename, never the processing date, so re-runs produce the stable title the
 * list-scan matches even before the search index catches up.
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
  const title = `Customer insight: ${room} ${sessionDate}`
  const existing = await findExistingIssue(runner, room, title)
  if (existing) return { created: false, existing }

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
