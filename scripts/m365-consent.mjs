// One-time Microsoft Graph consent helper.
//
// Usage:  node scripts/m365-consent.mjs
//
// What it does:
//   1. Prints the authorize URL — open it, sign in with the hotmail calendar
//      account, approve the permissions.
//   2. Listens on http://localhost:8787/auth/callback and captures the
//      authorization code when the browser redirects (no copy/paste — auth
//      codes expire within minutes).
//   3. Exchanges the code for a refresh token (confidential client: sends the
//      client secret) and prints it. Paste the refresh token into
//      MICROSOFT_REFRESH_TOKEN in .env (and Vercel).

import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const REDIRECT_PATH = '/auth/callback'
const PORT = 8787
const SCOPE = 'Calendars.ReadWrite offline_access'
const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'
const AUTHORIZE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize'

function loadDotEnv(name) {
  const p = join(process.cwd(), '.env')
  if (!existsSync(p)) return undefined
  const line = readFileSync(p, 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`${name}=`))
  if (!line) return undefined
  const v = line.slice(name.length + 1).trim()
  return v && !v.includes('REPLACE_ME') ? v : undefined
}

const clientId = process.env['MICROSOFT_CLIENT_ID'] || loadDotEnv('MICROSOFT_CLIENT_ID')
const clientSecret = process.env['MICROSOFT_CLIENT_SECRET'] || loadDotEnv('MICROSOFT_CLIENT_SECRET')
if (!clientId || !clientSecret) {
  console.error('Missing MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET (set in .env)')
  process.exit(1)
}

const redirectUri = `http://localhost:${PORT}${REDIRECT_PATH}`
const authorizeUrl =
  `${AUTHORIZE_URL}?client_id=${encodeURIComponent(clientId)}` +
  `&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&scope=${encodeURIComponent(SCOPE)}&response_mode=query`

console.log('\nOpen this URL and sign in with the hotmail calendar account:\n')
console.log(authorizeUrl)
console.log('\nWaiting for the redirect on port 8787 (5 min timeout)...\n')

async function exchange(code) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    scope: SCOPE,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const j = await res.json()
  if (!j.refresh_token) {
    throw new Error(`token exchange failed (${res.status}): ${j.error} - ${j.error_description}`)
  }
  return j
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  if (url.pathname !== REDIRECT_PATH) {
    res.writeHead(404).end('Not found')
    return
  }
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')
  if (err) {
    res.writeHead(400, { 'Content-Type': 'text/html' }).end(`<p>Consent failed: ${err}</p>`)
    console.error(`Consent error: ${err} — ${url.searchParams.get('error_description') || ''}`)
    process.exit(1)
  }
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' }).end('<p>No code in redirect</p>')
    console.error('Redirect had no code parameter')
    process.exit(1)
  }
  res
    .writeHead(200, { 'Content-Type': 'text/html' })
    .end('<p>Consent captured. You can close this tab and return to the terminal.</p>')
  server.close()
  try {
    const j = await exchange(code)
    console.log('Exchange OK. Paste this into MICROSOFT_REFRESH_TOKEN in .env:')
    console.log()
    console.log(j.refresh_token)
    console.log()
    console.log(`(access token valid for ${j.expires_in}s; refresh token ~90 days of inactivity)`)
    process.exit(0)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
})

server.listen(PORT, () => {})
setTimeout(
  () => {
    console.error('Timed out waiting for the redirect.')
    process.exit(1)
  },
  5 * 60 * 1000
)
