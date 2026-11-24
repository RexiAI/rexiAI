// tests/e2e/landing.e2e.ts — spec 020 Task 10, scenarios AC-020-23…27:
// the landing journey against the deployed (or locally previewed) site.
//
// Self-contained plain-node script, ZERO npm imports (the 004 D4 contract):
//   REXI_E2E_SITE_URL=https://<deployment> node tests/e2e/landing.e2e.ts
// or locally:
//   npm run build && npm run preview   # then, in another shell:
//   REXI_E2E_SITE_URL=http://localhost:4173 node tests/e2e/landing.e2e.ts
//
// The URL comes from the Vercel deployment (preview or production), resolved
// into the env var at run time — nothing is hardcoded and nothing is
// defaulted, because a journey that silently proves the wrong host proves
// nothing. Browser automation is the DevTools Protocol over Node's native
// WebSocket (Node >= 22), the same mechanism as tests/e2e/auto-record-lib.mjs.
//
// Env: REXI_E2E_SITE_URL (required), REXI_E2E_CHROME or CHROME_EXEC (browser
// binary; defaults to the Playwright chromium cache, then google-chrome),
// REXI_E2E_TIMEOUT_MS (default 45000).
/* global process, WebSocket */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const TAG = 'landing'
const SITE_URL = process.env.REXI_E2E_SITE_URL
const TIMEOUT_MS = Number(process.env.REXI_E2E_TIMEOUT_MS || '45000')

const ES_EYEBROW = 'Apps a medida para tu negocio'
const ES_HEADLINE = 'Tú me lo cuentas. Yo lo construyo.'
const EN_HEADLINE = 'You tell me. I build it.'
const WHATSAPP_HREF = 'https://wa.me/34644409229'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function log(...rest) {
  console.log(new Date().toISOString(), `[e2e:${TAG}]`, ...rest)
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[e2e:${TAG}] ASSERT FAILED: ${message}`)
    process.exitCode = 1
    throw new Error(message)
  }
  log(`ok: ${message}`)
}

/** Poll a page predicate until it is true or the deadline expires. */
async function waitFor(page, expression, label, timeoutMs = TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await page.evaluate(expression)) return
    await sleep(150)
  }
  throw new Error(`timed out after ${timeoutMs}ms waiting for ${label}`)
}

// Minimal DevTools-Protocol client: browser websocket + one flat page session.

class CdpConnection {
  constructor(ws) {
    this.ws = ws
    this.nextId = 1
    this.pending = new Map()
    ws.onmessage = (event) => this.dispatch(JSON.parse(event.data))
  }

  static connect(url) {
    const ws = new WebSocket(url)
    return new Promise((resolve, reject) => {
      ws.onopen = () => resolve(new CdpConnection(ws))
      ws.onerror = () => reject(new Error('cdp websocket error'))
    })
  }

  dispatch(message) {
    if (message.id === undefined) return
    const pending = this.pending.get(message.id)
    if (!pending) return
    this.pending.delete(message.id)
    if (message.error) pending.reject(new Error(`cdp ${message.error.message}`))
    else pending.resolve(message.result)
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params }
    this.ws.send(JSON.stringify(payload))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  close() {
    try {
      this.ws.close()
    } catch {
      /* already closed */
    }
  }
}

function chromeExecutable() {
  const candidates = [
    process.env.REXI_E2E_CHROME,
    process.env.CHROME_EXEC,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) throw new Error('no chromium binary found: set REXI_E2E_CHROME')
  return found
}

async function readDevToolsPort(profileDir) {
  const file = path.join(profileDir, 'DevToolsActivePort')
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (existsSync(file)) {
      const [port] = readFileSync(file, 'utf8').split('\n')
      if (/^\d+$/.test((port ?? '').trim())) return port.trim()
    }
    await sleep(150)
  }
  throw new Error('chrome never wrote DevToolsActivePort')
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId
  )
  if (result.exceptionDetails) {
    throw new Error(`page evaluate threw: ${result.exceptionDetails.text}`)
  }
  return result.result.value
}

async function openPage(url) {
  const profileDir = mkdtempSync(path.join(tmpdir(), 'rexi-e2e-landing-'))
  const proc = spawn(
    chromeExecutable(),
    [
      '--headless=new',
      `--user-data-dir=${profileDir}`,
      '--remote-debugging-port=0',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--window-size=1280,900',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  )
  const port = await readDevToolsPort(profileDir)
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
  const cdp = await CdpConnection.connect(version.webSocketDebuggerUrl)
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  await cdp.send('Page.enable', {}, sessionId)
  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Page.navigate', { url }, sessionId)

  const page = {
    evaluate: (expression) => evaluate(cdp, sessionId, expression),
    waitFor: (expression, label, timeoutMs) => waitFor(page, expression, label, timeoutMs),
    close: async () => {
      cdp.close()
      proc.kill('SIGTERM')
      await sleep(500)
      if (proc.exitCode === null) proc.kill('SIGKILL')
      rmSync(profileDir, { recursive: true, force: true })
    },
  }
  return page
}

// Page probes. Every probe is a plain expression string: no bundler, no
// transpiler, nothing this repo would have to install.

const HERO_TEXT = `document.querySelector('#hero')?.textContent || ''`
const DOCUMENT_TITLE = `document.title`

const PROBE = {
  eyebrow: `document.querySelector('#hero .hero-eyebrow')?.textContent || ''`,
  headline: `document.querySelector('#hero h1')?.textContent || ''`,
  documentText: `document.body.textContent || ''`,
  documentTitle: DOCUMENT_TITLE,
  heroText: `(${HERO_TEXT}).trim()`,
  whatsappHref: `document.querySelector('#hero a.hero-cta--secondary')?.getAttribute('href') || ''`,
  whatsappLabel: `document.querySelector('#hero a.hero-cta--secondary')?.textContent || ''`,
  primaryHref: `document.querySelector('#hero a.hero-cta--primary')?.getAttribute('href') || ''`,
  offerCount: `document.querySelectorAll('#services .offer-card').length`,
  faqPairs: `document.querySelectorAll('#faq .faq__item').length`,
  navBookingLabel: `document.querySelector('nav a[href="#booking"]')?.textContent || ''`,
  aboutBio: `document.querySelector('#about .about__bio')?.textContent || ''`,
}

/** Click the primary CTA and report where the browser ended up. */
const CLICK_PRIMARY_CTA = `(() => {
  var cta = document.querySelector('#hero a.hero-cta--primary')
  if (!cta) return { clicked: false }
  cta.click()
  var target = document.querySelector('#booking')
  var rect = target ? target.getBoundingClientRect() : null
  return {
    clicked: true,
    hash: window.location.hash,
    inViewport: !!rect && rect.top < window.innerHeight && rect.bottom > 0,
  }
})()`

const SWITCH_TO_EN = `(() => {
  var button = document.querySelector('button[aria-label="English"]')
  if (!button) return false
  button.click()
  return true
})()`

const SWITCH_TO_ES = `(() => {
  var button = document.querySelector('button[aria-label="Español"]')
  if (!button) return false
  button.click()
  return true
})()`

// The journey (AC-020-23…27).

async function journey(page) {
  await page.waitFor(`!!document.querySelector('#hero .hero-eyebrow')`, 'the landing hero')

  // AC-020-24: exact headline + eyebrow, Miami present, Salamanca absent from
  // the hero and the document title.
  const eyebrow = await page.evaluate(PROBE.eyebrow)
  assert(eyebrow.trim() === ES_EYEBROW, `AC-020-24: eyebrow is "${ES_EYEBROW}" (got "${eyebrow}")`)

  const headline = await page.evaluate(PROBE.headline)
  assert(
    headline.trim() === ES_HEADLINE,
    `AC-020-24: headline is "${ES_HEADLINE}" (got "${headline}")`
  )

  const documentText = await page.evaluate(PROBE.documentText)
  assert(documentText.includes('Miami'), 'AC-020-24: Miami appears on the landing')

  const heroText = await page.evaluate(PROBE.heroText)
  assert(!heroText.includes('Salamanca'), 'AC-020-24: Salamanca is absent from the hero')

  const title = await page.evaluate(PROBE.documentTitle)
  assert(!title.includes('Salamanca'), `AC-020-24: Salamanca is absent from the title ("${title}")`)

  // AC-020-25: the two public figures present, no hourly figure, no SaaS.
  assert(documentText.includes('$1,200'), 'AC-020-25: $1,200 appears on the landing')
  assert(documentText.includes('$600'), 'AC-020-25: $600 appears on the landing')
  assert(!documentText.includes('30 EUR'), 'AC-020-25: no "30 EUR" text on the landing')
  assert(!/\bEUR\b/.test(documentText), 'AC-020-25: no EUR text on the landing')
  assert(!documentText.includes('€'), 'AC-020-25: no euro sign on the landing')
  assert(!/saas/i.test(documentText), 'AC-020-25: no "SaaS" text on the landing')

  // AC-020-26: bio (Valladolid), WhatsApp href, FAQ, nav `Hablemos`.
  const bio = await page.evaluate(PROBE.aboutBio)
  assert(bio.trim().length > 0, 'AC-020-26: the About bio is present')
  assert(bio.includes('Valladolid'), 'AC-020-26: the About bio names Valladolid')

  const whatsappHref = await page.evaluate(PROBE.whatsappHref)
  assert(
    whatsappHref === WHATSAPP_HREF,
    `AC-020-26: the secondary CTA href is ${WHATSAPP_HREF} (got "${whatsappHref}")`
  )
  const whatsappLabel = await page.evaluate(PROBE.whatsappLabel)
  assert(whatsappLabel.includes('WhatsApp'), 'AC-020-26: the secondary CTA names WhatsApp')

  const faqPairs = await page.evaluate(PROBE.faqPairs)
  assert(faqPairs === 4, `AC-020-26: the FAQ renders 4 pairs (got ${faqPairs})`)

  const navLabel = await page.evaluate(PROBE.navBookingLabel)
  assert(navLabel.trim() === 'Hablemos', `AC-020-26: the nav label is Hablemos (got "${navLabel}")`)

  // AC-020-27: one offer, the primary CTA reaches #booking, ES/EN switch.
  const offerCount = await page.evaluate(PROBE.offerCount)
  assert(offerCount === 1, `AC-020-27: exactly one service offer (got ${offerCount})`)

  const primaryHref = await page.evaluate(PROBE.primaryHref)
  assert(
    primaryHref === '#booking',
    `AC-020-27: the primary CTA targets #booking (got "${primaryHref}")`
  )

  const scroll = await page.evaluate(CLICK_PRIMARY_CTA)
  assert(scroll.clicked, 'AC-020-27: the primary CTA is clickable')
  assert(
    scroll.hash === '#booking' || scroll.inViewport,
    `AC-020-27: the CTA reaches #booking (hash "${scroll.hash}", inViewport ${scroll.inViewport})`
  )

  assert(await page.evaluate(SWITCH_TO_EN), 'AC-020-27: the EN switcher is present')
  await page.waitFor(
    `document.title.includes('Miami') && document.title !== ${JSON.stringify(title)}`,
    'the English title'
  )
  const enTitle = await page.evaluate(PROBE.documentTitle)
  const enHeadline = await page.evaluate(PROBE.headline)
  assert(
    enHeadline.trim() === EN_HEADLINE,
    `AC-020-27: the English headline is "${EN_HEADLINE}" (got "${enHeadline}")`
  )
  assert(enTitle !== title, 'AC-020-27: the document title changes with the locale')

  assert(await page.evaluate(SWITCH_TO_ES), 'AC-020-27: the ES switcher is present')
  await page.waitFor(
    `document.querySelector('#hero h1')?.textContent === ${JSON.stringify(ES_HEADLINE)}`,
    'the Spanish headline'
  )
  const backTitle = await page.evaluate(PROBE.documentTitle)
  assert(backTitle === title, `AC-020-27: the Spanish title returns (got "${backTitle}")`)
}

async function main() {
  if (!SITE_URL) {
    console.error(
      `[e2e:${TAG}] REXI_E2E_SITE_URL is required (preview or production deployment URL)`
    )
    process.exitCode = 1
    return
  }
  log(`target: ${SITE_URL}`)
  const page = await openPage(SITE_URL)
  try {
    await journey(page)
    log('AC-020-23…27 PASSED')
  } finally {
    await page.close()
  }
}

main().catch((error) => {
  console.error(`[e2e:${TAG}] journey failed: ${error.message}`)
  process.exitCode = 1
})
