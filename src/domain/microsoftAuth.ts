export interface MicrosoftConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  userId: string
}

export function getMicrosoftConfig(): MicrosoftConfig | null {
  const tenantId = process.env['MICROSOFT_TENANT_ID']
  const clientId = process.env['MICROSOFT_CLIENT_ID']
  const clientSecret = process.env['MICROSOFT_CLIENT_SECRET']
  const userId = process.env['MICROSOFT_USER_ID']
  if (!tenantId || !clientId || !clientSecret || !userId) return null
  if ([tenantId, clientId, clientSecret, userId].some((v) => v.includes('REPLACE_ME'))) return null
  return { tenantId, clientId, clientSecret, userId }
}

export function isMicrosoftConfigured(): boolean {
  return getMicrosoftConfig() !== null
}

export async function getMicrosoftAccessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  const cfg = getMicrosoftConfig()
  if (!cfg) throw new Error('Microsoft Graph not configured')
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })
  const res = await fetchImpl(
    `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Microsoft token failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Microsoft token response missing access_token')
  return data.access_token
}
