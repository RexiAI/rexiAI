// Delegated (user-consent) auth for Microsoft Graph against a personal
// Microsoft account (hotmail/outlook). App-only (client_credentials) is not
// used: it requires a work/school account, and the calendar owner is a
// personal account (buenopachecodani@hotmail.es).
//
// Flow: user consents once via composeM365OauthUrl → the resulting code is
// exchanged for a refresh token (exchangeCodeForRefreshToken) → the refresh
// token is stored in MICROSOFT_REFRESH_TOKEN and exchanged for short-lived
// access tokens on every call (getMicrosoftAccessToken).
//
// The app registration is a confidential (Web platform) client, so every token
// call also authenticates with the client secret (MICROSOFT_CLIENT_SECRET) —
// the v2.0 endpoint rejects the exchange without it (AADSTS70002).

export const M365_SCOPE = 'Calendars.ReadWrite offline_access'
export const M365_DEFAULT_REDIRECT = 'http://localhost:8787/auth/callback'

const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'
const AUTHORIZE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize'

export interface MicrosoftConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
}

export function getMicrosoftConfig(): MicrosoftConfig | null {
  const clientId = process.env['MICROSOFT_CLIENT_ID']
  const clientSecret = process.env['MICROSOFT_CLIENT_SECRET']
  const refreshToken = process.env['MICROSOFT_REFRESH_TOKEN']
  if (!clientId || !clientSecret || !refreshToken) return null
  if ([clientId, clientSecret, refreshToken].some((v) => v.includes('REPLACE_ME'))) return null
  return { clientId, clientSecret, refreshToken }
}

export function isMicrosoftConfigured(): boolean {
  return getMicrosoftConfig() !== null
}

/**
 * The one-time user-consent URL. Sign in as the personal Microsoft account,
 * approve, and the redirect carries ?code=… which exchangeCodeForRefreshToken
 * turns into the refresh token for MICROSOFT_REFRESH_TOKEN.
 */
export function composeM365OauthUrl(opts?: { redirectUri?: string; state?: string }): string {
  const cfg = getMicrosoftConfig()
  if (!cfg) throw new Error('Microsoft Graph not configured')
  const redirectUri = opts?.redirectUri ?? M365_DEFAULT_REDIRECT
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: M365_SCOPE,
    response_mode: 'query',
  })
  if (opts?.state) params.set('state', opts.state)
  return `${AUTHORIZE_URL}?${params.toString()}`
}

function resolveRedirect(opts?: { redirectUri?: string }): string {
  return opts && opts.redirectUri ? opts.redirectUri : M365_DEFAULT_REDIRECT
}

/** One-time bootstrap: exchange the consent code for a refresh token. */
export async function exchangeCodeForRefreshToken(
  code: string,
  opts?: { redirectUri?: string },
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const cfg = getMicrosoftConfig()
  if (!cfg) throw new Error('Microsoft Graph not configured')
  const redirectUri = resolveRedirect(opts)
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    scope: M365_SCOPE,
  })
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Microsoft token exchange failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { refresh_token?: string }
  if (!data.refresh_token) throw new Error('Microsoft token response missing refresh_token')
  return data.refresh_token
}

export async function getMicrosoftAccessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  const cfg = getMicrosoftConfig()
  if (!cfg) throw new Error('Microsoft Graph not configured')
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: cfg.refreshToken,
    scope: M365_SCOPE,
  })
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Microsoft token failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Microsoft token response missing access_token')
  return data.access_token
}
