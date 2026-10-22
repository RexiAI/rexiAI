// scripts/recording/insight.mjs — customer brief insight stage (spec 004 Task 4 / Ask C).
//
// Wraps `bl text chat` (flags verified against bl 2.4.0 --help: --system /
// --message). The brief's template skeleton is FIXED literal English headings
// in code (10-tasks.md decision 9) — the same headings, same order, in every
// brief; the LLM fills section bodies in the transcript's language. Client
// email is allowed in the brief (private repo issue + local disk, Ask C);
// secrets/tokens never are: this module reads no secret env value anywhere
// (the prompt is built from the transcript + booking context only).

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const ANALYZED_MARKER = '.rexi-analyzed'
export const BRIEF_FILENAME = 'customer-brief.md'

// The five customer-want categories — fixed literals, fixed order (AC-004-30).
export const BRIEF_SECTIONS = [
  'Requirements',
  'Pain points',
  'Decisions',
  'Commitments',
  'Next steps',
]
const EMPTY_SECTION_PLACEHOLDER = 'None stated'

const ES_MARKERS =
  /\b(hola|necesito|quiero|precio|precios|pagina|cliente|clientes|gracias|porque|reunion|tambien|hoy|cobro|pago|puedo|puedes|somos|este|esta|pero|muy|para|usted|una|unas|el|los|las|de|y|que|es|mi|tu)\b/gi
const EN_MARKERS =
  /\b(need|want|price|prices|customer|customers|hello|thanks|because|meeting|today|pay|payment|can|you|we|this|that|but|very|for|the|and|is|are|manual|invoicing|pricing)\b/gi

/** es/en awareness: count language-marker tokens; ties default to es (Spanish-primary). */
export function detectDominantLanguage(text) {
  const normalized = String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics so página == pagina
  const es = (normalized.match(ES_MARKERS) || []).length
  const en = (normalized.match(EN_MARKERS) || []).length
  return es >= en ? 'es' : 'en'
}

const TEXT_KEYS = new Set(['text', 'sentence', 'transcript'])

/** Flatten bl's transcript JSON to plain text (diarized segments included). */
export function extractTranscriptText(transcriptJson) {
  const acc = []
  collectText(transcriptJson, acc)
  return acc.length > 0 ? acc.join('\n') : JSON.stringify(transcriptJson)
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object'
}

function collectFromObject(node, acc) {
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string' && TEXT_KEYS.has(key)) acc.push(value)
    else if (isRecord(value)) collectText(value, acc)
  }
}

function collectText(node, acc) {
  if (Array.isArray(node)) {
    for (const n of node) collectText(n, acc)
    return
  }
  if (isRecord(node)) collectFromObject(node, acc)
}

/** Pure prompt builder → the `bl text chat` payload (system + user message). */
export function buildInsightMessages(transcriptJson, context) {
  const transcript = extractTranscriptText(transcriptJson)
  const language = detectDominantLanguage(transcript)
  const system = [
    'You are a customer-insight analyst for RexiAI.',
    'From the meeting transcript, extract the customer wants in five categories:',
    'requirements, pain points, decisions, commitments, and next steps.',
    'Answer in Markdown with exactly these level-2 headings in this order:',
    BRIEF_SECTIONS.map((s) => `## ${s}`).join(', '),
    `Write concrete bullet points under each heading. If a category has nothing stated`,
    `in the transcript, write the exact placeholder "${EMPTY_SECTION_PLACEHOLDER}" under it.`,
    'Answer in the transcript dominant language.',
    'Never include secrets, API keys, tokens or credentials in your answer.',
  ].join(' ')

  const langLine =
    language === 'es'
      ? 'Answer in the transcript dominant language: Spanish (responda en espanol).'
      : 'Answer in the transcript dominant language: English (answer in English).'
  const attributionLine = context.unattributed
    ? `Meeting room ${context.room} (${context.sessionDate}) — unattributed recording, no client identified.`
    : `Meeting room ${context.room} (${context.sessionDate}) — client ${context.clientEmail}, booking ${context.bookingId}.`

  return {
    system,
    messages: [
      { role: 'user', content: `${langLine}\n${attributionLine}\n\nTranscript:\n${transcript}` },
    ],
  }
}

/** OpenAI-shaped chat choice content (undefined when the envelope has none). */
function choiceContent(parsed) {
  return parsed?.choices?.[0]?.message?.content
}

/** Chat-response shapes worth checking, in precedence order. */
function contentCandidates(parsed) {
  return [choiceContent(parsed), parsed?.output_text, parsed?.message?.content]
}

/** First candidate that is PRESENT (null/undefined skipped — `??` semantics), else null. */
function firstPresent(values) {
  for (const value of values) {
    if (value !== null && value !== undefined) return value
  }
  return null
}

/** bl --output json envelope, with a plain-text fallback; never throws. */
export function parseChatStdout(stdout) {
  let parsed
  try {
    parsed = JSON.parse(stdout)
  } catch {
    return String(stdout)
  }
  const content = firstPresent(contentCandidates(parsed))
  return typeof content === 'string' && content.length > 0 ? content : String(stdout)
}

function splitLlmSections(llmContent) {
  const map = new Map()
  let current = null
  for (const line of String(llmContent).split(/\r?\n/)) {
    const heading = line.match(/^#{2,3}\s+(.*)\s*$/)
    if (heading) {
      current = heading[1].trim().toLowerCase()
      if (!map.has(current)) map.set(current, [])
      continue
    }
    if (current) map.get(current).push(line)
  }
  return map
}

function sectionBody(map, section) {
  const lines = map.get(section.toLowerCase()) || []
  const body = lines.join('\n').trim()
  return body.length > 0 ? body : EMPTY_SECTION_PLACEHOLDER
}

function bookingContextLines(context) {
  if (context.unattributed) {
    return `Unattributed recording — no client email or booking id was resolved for room ${context.room}.`
  }
  return `- Client: ${context.clientEmail}\n- Booking: ${context.bookingId}`
}

/** Deterministic template render: fixed skeleton, LLM bodies, never a fabricated email. */
export function renderBrief(llmContent, context) {
  const map = splitLlmSections(llmContent)
  const blocks = [
    `# Customer insight: ${context.room} (${context.sessionDate})`,
    `## Booking context\n\n${bookingContextLines(context)}`,
    ...BRIEF_SECTIONS.map((s) => `## ${s}\n\n${sectionBody(map, s)}`),
  ]
  return `${blocks.join('\n\n')}\n`
}

/**
 * transcript.json → bl text chat → customer-brief.md → deliver → .rexi-analyzed.
 * The marker lands ONLY after the brief write AND delivery succeed (decision 4):
 * any failure propagates unmarked, so the next scan regenerates the brief and
 * re-attempts delivery — the Task 5 search-before-create guards duplicates.
 */
export async function runInsightStage({ sessionDir, transcriptPath, context, runner, deliver }) {
  const transcriptJson = JSON.parse(readFileSync(transcriptPath, 'utf8'))
  const { system, messages } = buildInsightMessages(transcriptJson, context)
  const argv = [
    'bl',
    'text',
    'chat',
    '--system',
    system,
    '--message',
    messages.map((m) => m.content).join('\n\n'),
    '--output',
    'json',
  ]
  const { stdout } = await runner(argv[0], argv.slice(1))

  const brief = renderBrief(parseChatStdout(stdout), context)
  writeFileSync(path.join(sessionDir, BRIEF_FILENAME), brief)

  await deliver({
    room: context.room,
    sessionDate: context.sessionDate,
    briefContent: brief,
    transcriptPath,
    recordingPath: sessionDir,
  })

  writeFileSync(path.join(sessionDir, ANALYZED_MARKER), `${new Date().toISOString()} analyzed\n`)
}
