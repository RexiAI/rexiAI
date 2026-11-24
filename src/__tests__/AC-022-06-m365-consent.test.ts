// AC-022-06-01 — characterization of the redirect handler in scripts/m365-consent.mjs
// (the async arrow passed to http.createServer).
//
// The script acts on import and listens on a fixed port, so each case imports a
// fresh copy with node:http replaced by a fake server (nothing listens), fake
// timers (no 5-minute exit timer), process.cwd pointed at an empty directory (no
// .env), a recording process.exit, and a stubbed global fetch for the token call.
// The real Microsoft token endpoint is never contacted.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (req: unknown, res: unknown) => Promise<void>
const captured = vi.hoisted(() => ({ handler: null as null | Handler, closed: 0 }))

vi.mock('node:http', () => {
  const createServer = (handler: Handler) => {
    captured.handler = handler
    return {
      listen: () => {},
      close: () => {
        captured.closed += 1
      },
    }
  }
  return { default: { createServer }, createServer }
})

let emptyDir = ''
let exits: number[]
let errors: string[]
let logs: string[]
const savedEnv = {
  id: process.env['MICROSOFT_CLIENT_ID'],
  secret: process.env['MICROSOFT_CLIENT_SECRET'],
}

beforeEach(() => {
  emptyDir = mkdtempSync(path.join(tmpdir(), 'rexi-m365-'))
  exits = []
  errors = []
  logs = []
  captured.handler = null
  captured.closed = 0
  process.env['MICROSOFT_CLIENT_ID'] = 'cid'
  process.env['MICROSOFT_CLIENT_SECRET'] = 'sec'
  vi.useFakeTimers()
  vi.spyOn(process, 'cwd').mockReturnValue(emptyDir)
  vi.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a.join(' ')))
  vi.spyOn(console, 'log').mockImplementation((...a) => void logs.push(a.join(' ')))
  vi.resetModules()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  for (const [name, value] of [
    ['MICROSOFT_CLIENT_ID', savedEnv.id],
    ['MICROSOFT_CLIENT_SECRET', savedEnv.secret],
  ] as const) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  rmSync(emptyDir, { recursive: true, force: true })
})

/** process.exit that records; `stop` makes it throw so the real "no return" holds. */
function stubExit(stop: boolean) {
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exits.push(code ?? 0)
    if (stop) throw new Error(`exit:${code}`)
  }) as never)
}

async function loadHandler(stop = true): Promise<Handler> {
  stubExit(stop)
  await import('../../scripts/m365-consent.mjs')
  return captured.handler as Handler
}

function fakeRes() {
  const res = {
    head: null as null | [number, Record<string, string>?],
    body: '',
    writeHead(code: number, headers?: Record<string, string>) {
      res.head = [code, headers]
      return res
    },
    end(text: string) {
      res.body = text
      return res
    },
  }
  return res
}
const req = (url: string) => ({ url })

describe('AC-022-06-01: m365-consent startup and redirect handler are pinned', () => {
  it('AC-022-06-01: missing client credentials exit 1 with the .env hint', async () => {
    delete process.env['MICROSOFT_CLIENT_ID']
    stubExit(true)
    await expect(import('../../scripts/m365-consent.mjs')).rejects.toThrow('exit:1')
    expect(errors).toEqual(['Missing MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET (set in .env)'])
    expect(captured.handler).toBeNull()
  })

  it('AC-022-06-01: with credentials it prints the authorize URL for the fixed redirect', async () => {
    await loadHandler()
    const url = logs.find((l) => l.startsWith('https://login.microsoftonline.com/'))
    expect(url).toBe(
      'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=cid' +
        '&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A8787%2Fauth%2Fcallback' +
        '&scope=Calendars.ReadWrite%20offline_access&response_mode=query'
    )
  })

  it('AC-022-06-01: any path other than /auth/callback is a 404 "Not found"', async () => {
    const handler = await loadHandler()
    const res = fakeRes()
    await handler(req('/elsewhere'), res)
    expect(res.head).toEqual([404, undefined])
    expect(res.body).toBe('Not found')
    expect(exits).toEqual([])
  })

  it('AC-022-06-01: an error parameter answers 400, reports it and exits 1', async () => {
    const handler = await loadHandler()
    const res = fakeRes()
    await expect(
      handler(req('/auth/callback?error=access_denied&error_description=nope'), res)
    ).rejects.toThrow('exit:1')
    expect(res.head).toEqual([400, { 'Content-Type': 'text/html' }])
    expect(res.body).toBe('<p>Consent failed: access_denied</p>')
    expect(errors).toEqual(['Consent error: access_denied — nope'])
  })

  it('AC-022-06-01: an error parameter without a description reports an empty one', async () => {
    const handler = await loadHandler()
    await expect(handler(req('/auth/callback?error=x'), fakeRes())).rejects.toThrow('exit:1')
    expect(errors).toEqual(['Consent error: x — '])
  })

  it('AC-022-06-01: a redirect without a code answers 400 and exits 1', async () => {
    const handler = await loadHandler()
    const res = fakeRes()
    await expect(handler(req('/auth/callback'), res)).rejects.toThrow('exit:1')
    expect(res.head).toEqual([400, { 'Content-Type': 'text/html' }])
    expect(res.body).toBe('<p>No code in redirect</p>')
    expect(errors).toEqual(['Redirect had no code parameter'])
  })

  it('AC-022-06-01: a good code answers 200, closes the server, prints the refresh token, exits 0', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 200,
      json: async () => ({ refresh_token: 'RT-123', expires_in: 3600 }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const handler = await loadHandler(false)
    const res = fakeRes()
    await handler(req('/auth/callback?code=abc'), res)
    expect(res.head).toEqual([200, { 'Content-Type': 'text/html' }])
    expect(res.body).toBe(
      '<p>Consent captured. You can close this tab and return to the terminal.</p>'
    )
    expect(captured.closed).toBe(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://login.microsoftonline.com/consumers/oauth2/v2.0/token')
    expect(init.method).toBe('POST')
    expect(String(init.body)).toBe(
      'client_id=cid&client_secret=sec&grant_type=authorization_code&code=abc' +
        '&redirect_uri=http%3A%2F%2Flocalhost%3A8787%2Fauth%2Fcallback' +
        '&scope=Calendars.ReadWrite+offline_access'
    )
    expect(logs).toContain('RT-123')
    expect(logs).toContain('Exchange OK. Paste this into MICROSOFT_REFRESH_TOKEN in .env:')
    expect(logs).toContain('(access token valid for 3600s; refresh token ~90 days of inactivity)')
    expect(exits).toEqual([0])
  })

  it('AC-022-06-01: a token response without a refresh_token reports status and error, exits 1', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 400,
        json: async () => ({ error: 'invalid_grant', error_description: 'expired' }),
      }))
    )
    const handler = await loadHandler(false)
    await handler(req('/auth/callback?code=abc'), fakeRes())
    expect(errors).toEqual(['token exchange failed (400): invalid_grant - expired'])
    expect(exits).toEqual([1])
    expect(captured.closed).toBe(1)
  })

  it('AC-022-06-01: a network failure during the exchange reports its message, exits 1', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      })
    )
    const handler = await loadHandler(false)
    await handler(req('/auth/callback?code=abc'), fakeRes())
    expect(errors).toEqual(['offline'])
    expect(exits).toEqual([1])
  })

  it('AC-022-06-01: the 5-minute timeout exits 1 with its message', async () => {
    await loadHandler(false)
    vi.advanceTimersByTime(5 * 60 * 1000 - 1)
    expect(exits).toEqual([])
    vi.advanceTimersByTime(1)
    expect(errors).toEqual(['Timed out waiting for the redirect.'])
    expect(exits).toEqual([1])
  })
})
