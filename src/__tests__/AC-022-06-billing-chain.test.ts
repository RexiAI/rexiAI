// AC-022-06-04 — characterization of scripts/test-billing-chain.mjs
// findRecordingForRoom and the in-process recorded-billing request handler.
//
// The script has no exports and acts on import, so each case imports a fresh copy
// with: a fake process.exit that throws, a non-sk_test STRIPE_SECRET_KEY (so the
// import always stops at "Refusing", before any Stripe call or socket), the two
// API modules stubbed, and node:http's createServer wrapped to capture the handler.
// findRecordingForRoom is observed through which of the two exits the import takes:
// "No recording found" (null) or "Refusing" (a recording path was found).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const captured = vi.hoisted(() => ({
  handler: null as null | ((req: unknown, res: unknown) => Promise<void>),
}))
const recordedBilling = vi.hoisted(() => vi.fn())

vi.mock('node:http', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:http')>()
  const createServer = (...args: Parameters<typeof real.createServer>) => {
    captured.handler = args[0] as never
    return real.createServer(...args)
  }
  return { ...real, default: { ...real, createServer }, createServer }
})
vi.mock('../../api/bookings/checkout.js', () => ({ createCheckout: vi.fn() }))
vi.mock('../../api/bookings/recorded-billing.js', () => ({ default: recordedBilling }))

const ROOM = 'rexiroom'
const saved = {
  argv: process.argv,
  dir: process.env['RECORDINGS_DIR'],
  key: process.env['STRIPE_SECRET_KEY'],
}
let root = ''
let errors: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'rexi-chain-'))
  process.env['RECORDINGS_DIR'] = root
  process.env['STRIPE_SECRET_KEY'] = 'not-a-test-key'
  process.argv = [saved.argv[0], saved.argv[1], ROOM]
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`exit:${code}`)
  }) as never)
  vi.resetModules()
  captured.handler = null
  recordedBilling.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  process.argv = saved.argv
  for (const [name, value] of [
    ['RECORDINGS_DIR', saved.dir],
    ['STRIPE_SECRET_KEY', saved.key],
  ] as const) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  rmSync(root, { recursive: true, force: true })
})

/** Import the script; resolves to which exit message it stopped on. */
async function outcome(): Promise<'found' | 'none'> {
  await expect(import('../../scripts/test-billing-chain.mjs')).rejects.toThrow('exit:1')
  const text = errors.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')
  if (text.includes('No recording found')) return 'none'
  expect(text).toContain('Refusing: STRIPE_SECRET_KEY is not sk_test')
  return 'found'
}

function session(name: string, files: Record<string, string>) {
  const dir = path.join(root, name)
  mkdirSync(dir, { recursive: true })
  for (const [file, text] of Object.entries(files)) writeFileSync(path.join(dir, file), text)
}
const meta = (url: string) => JSON.stringify({ meeting_url: url })

describe('AC-022-06-04: findRecordingForRoom branches are pinned', () => {
  it('AC-022-06-04: a missing recordings directory finds nothing', async () => {
    rmSync(root, { recursive: true, force: true })
    expect(await outcome()).toBe('none')
  })

  it('AC-022-06-04: an empty directory finds nothing', async () => {
    expect(await outcome()).toBe('none')
  })

  it('AC-022-06-04: a session whose metadata names the room and has an mp4 is found', async () => {
    session('s1', { 'metadata.json': meta(`https://m/${ROOM}`), 'rec.mp4': 'x' })
    expect(await outcome()).toBe('found')
  })

  it('AC-022-06-04: a plain file in the recordings dir is skipped', async () => {
    writeFileSync(path.join(root, 'stray.txt'), 'x')
    expect(await outcome()).toBe('none')
  })

  it('AC-022-06-04: a session without metadata.json is skipped', async () => {
    session('s1', { 'rec.mp4': 'x' })
    expect(await outcome()).toBe('none')
  })

  it('AC-022-06-04: malformed metadata is skipped, a later good session still matches', async () => {
    session('a-bad', { 'metadata.json': '{nope', 'rec.mp4': 'x' })
    session('b-good', { 'metadata.json': meta(`https://m/${ROOM}`), 'rec.mp4': 'x' })
    expect(await outcome()).toBe('found')
  })

  it('AC-022-06-04: metadata for a different room, or without meeting_url, does not match', async () => {
    session('s1', { 'metadata.json': meta('https://m/otherroom'), 'rec.mp4': 'x' })
    session('s2', { 'metadata.json': JSON.stringify({}), 'rec.mp4': 'x' })
    expect(await outcome()).toBe('none')
  })

  it('AC-022-06-04: a matching session with no .mp4 is not a recording', async () => {
    session('s1', { 'metadata.json': meta(`https://m/${ROOM}`), 'rec.wav': 'x' })
    expect(await outcome()).toBe('none')
  })

  it('AC-022-06-04: the match is on "/<room>" anywhere in the url, not an exact room', async () => {
    session('s1', { 'metadata.json': meta(`https://m/${ROOM}-extra?x=1`), 'rec.mp4': 'x' })
    expect(await outcome()).toBe('found')
  })
})

type FakeRes = { head: [number, object] | null; body: string }
function fakeRes() {
  const res = {
    head: null as FakeRes['head'],
    body: '',
    writeHead(code: number, headers: object) {
      res.head = [code, headers]
    },
    end(text: string) {
      res.body = text
    },
  }
  return res
}
function fakeReq(method: string, url: string, body = '') {
  return {
    method,
    url,
    headers: { h: '1' },
    async *[Symbol.asyncIterator]() {
      if (body) yield body
    },
  }
}

describe('AC-022-06-04: the in-process recorded-billing handler is pinned', () => {
  async function handler() {
    await expect(import('../../scripts/test-billing-chain.mjs')).rejects.toThrow('exit:1')
    return captured.handler as (req: unknown, res: unknown) => Promise<void>
  }

  it('AC-022-06-04: anything but POST /api/bookings/recorded-billing is a 404 NOT_FOUND', async () => {
    const h = await handler()
    for (const [method, url] of [
      ['GET', '/api/bookings/recorded-billing'],
      ['POST', '/api/other'],
    ]) {
      const res = fakeRes()
      await h(fakeReq(method, url), res)
      expect(res.head).toEqual([404, { 'content-type': 'application/json' }])
      expect(JSON.parse(res.body)).toEqual({ error: { code: 'NOT_FOUND' } })
    }
    expect(recordedBilling).not.toHaveBeenCalled()
  })

  it('AC-022-06-04: the query string is ignored when matching, and the JSON body is parsed', async () => {
    recordedBilling.mockImplementationOnce(async (req, res) => {
      res.status(202).json({ got: req.body, method: req.method, query: req.query })
    })
    const h = await handler()
    const res = fakeRes()
    await h(fakeReq('POST', '/api/bookings/recorded-billing?x=1', '{"a":1}'), res)
    expect(res.head).toEqual([202, { 'content-type': 'application/json' }])
    expect(JSON.parse(res.body)).toEqual({ got: { a: 1 }, method: 'POST', query: {} })
  })

  it('AC-022-06-04: an empty or invalid body becomes {}', async () => {
    recordedBilling.mockImplementation(async (req, res) => res.json({ got: req.body }))
    const h = await handler()
    for (const raw of ['', '{bad']) {
      const res = fakeRes()
      await h(fakeReq('POST', '/api/bookings/recorded-billing', raw), res)
      expect(JSON.parse(res.body)).toEqual({ got: {} })
    }
  })

  it('AC-022-06-04: a throwing handler answers 500 HANDLER_ERROR with String(error)', async () => {
    recordedBilling.mockRejectedValueOnce(new Error('kaput'))
    const h = await handler()
    const res = fakeRes()
    await h(fakeReq('POST', '/api/bookings/recorded-billing'), res)
    expect(res.head).toEqual([500, { 'content-type': 'application/json' }])
    expect(JSON.parse(res.body)).toEqual({
      error: { code: 'HANDLER_ERROR', message: 'Error: kaput' },
    })
  })
})
