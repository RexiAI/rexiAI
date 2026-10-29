// AC-007 Task 8: the reschedule page document.
// Acceptance tests per
// specs/007-client-requested-reschedule/20-acceptance/AC-007-reschedule-page.md
//
// Like the AC-006 join-page suite: the tests load the SHIPPED document's markup
// into jsdom, run its inline script verbatim against a stubbed fetch, and assert
// on the resulting DOM.
import fs from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

const PAGE_PATH = path.join(process.cwd(), 'deploy/reschedule/index.html')
const SOURCE = fs.readFileSync(PAGE_PATH, 'utf8')
const BODY_MARKUP = SOURCE.slice(SOURCE.indexOf('<body>') + 6, SOURCE.indexOf('</body>'))
const INLINE_SCRIPT = SOURCE.slice(
  SOURCE.lastIndexOf('<script>') + '<script>'.length,
  SOURCE.lastIndexOf('</script>')
)

const TOKEN = 'a'.repeat(64)
const TOKEN_URL = `/reschedule/${TOKEN}`
const CURRENT = { date: '2027-03-01', startTime: '10:00', hours: 1, canReschedule: true }
const JOIN_URL = 'https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es'
const CLIENT_EMAIL = 'client@example.com'
const BOOKING_ID = 'cs_test_123'

interface Route {
  status?: number
  body?: unknown
  throws?: boolean
}

interface Routes {
  resolve?: Route
  availability?: Route
  submit?: Route
}

interface Rendered {
  doc: Document
  calls: string[]
  posted: any[]
}

function response(route: Route): any {
  const status = route.status ?? 200
  return {
    ok: status < 400,
    status,
    json: async () => route.body ?? {},
  }
}

/** Boots the shipped document with a stubbed fetch, at a given URL. */
function bootDocument(pathname: string, search: string): void {
  document.body.innerHTML = BODY_MARKUP
  document.documentElement.lang = 'es'
  document.title = ''
  window.history.replaceState(null, '', `${pathname}${search}`)
  window.eval(INLINE_SCRIPT)
}

/** Picks the route a request should be answered with. */
function routeFor(url: string, init: any, routes: Routes): Route {
  if (init?.method === 'POST') return routes.submit!
  if (url.startsWith('/api/availability')) return routes.availability!
  return routes.resolve!
}

/** The three defaults, so a scenario only states the route it changes. */
function withDefaults(routes: Routes): Routes {
  return {
    resolve: routes.resolve ?? { body: CURRENT },
    availability: routes.availability ?? {
      body: { date: CURRENT.date, slots: ['10:00', '11:00'] },
    },
    submit: routes.submit ?? {
      body: { date: '2027-03-02', startTime: '09:00', hours: 1, joinUrl: JOIN_URL },
    },
  }
}

/** Runs the shipped document's script against a stubbed fetch. */
async function render(pathname = TOKEN_URL, search = '', routes: Routes = {}): Promise<Rendered> {
  const calls: string[] = []
  const posted: any[] = []
  const resolved = withDefaults(routes)

  const fetchStub = vi.fn(async (input: any, init?: any) => {
    const url = String(input)
    calls.push(url)
    if (init?.method === 'POST') posted.push(JSON.parse(init.body))
    const route = routeFor(url, init, resolved)
    if (route.throws) throw new Error('network down')
    return response(route)
  })
  vi.stubGlobal('fetch', fetchStub)
  // window.eval runs in the jsdom realm: make sure the same stub is reachable
  // from the document's own scope, not only from the test's.
  ;(window as unknown as { fetch: typeof fetch }).fetch = fetchStub

  bootDocument(pathname, search)
  await flush()

  return { doc: document, calls, posted }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 8; i += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  for (let i = 0; i < 8; i += 1) await Promise.resolve()
}

function visibleSections(doc: Document): string[] {
  return [...doc.querySelectorAll('section[id]')]
    .filter((el) => !el.hasAttribute('hidden'))
    .map((el) => el.id)
}

function visibleSection(doc: Document): HTMLElement {
  const shown = [...doc.querySelectorAll('section[id]')].filter((el) => !el.hasAttribute('hidden'))
  expect(shown).toHaveLength(1)
  return shown[0] as HTMLElement
}

function visibleText(doc: Document): string {
  return visibleSection(doc).textContent ?? ''
}

function isVisible(el: Element | null): boolean {
  if (!el) return false
  return el.closest('[hidden]') === null && !el.hasAttribute('hidden')
}

/** Submits the ready form, checking a slot first (the real client path). */
async function submitForm(doc: Document, slot = '11:00'): Promise<void> {
  const radio = [
    ...doc.querySelectorAll<HTMLInputElement>(
      '#state-ready-es input[type="radio"], #state-ready-en input[type="radio"]'
    ),
  ]
  const chosen = radio.find((r) => r.value === slot) ?? radio[0]
  expect(chosen).toBeDefined()
  chosen!.checked = true
  const form = visibleSection(doc).querySelector('form')
  expect(form).not.toBeNull()
  form!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
  await flush()
}

describe('AC-007 reschedule page', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('AC-007-39: A valid token renders the current slot and the available-slot picker', async () => {
    const { doc, calls } = await render()

    expect(visibleSections(doc)).toEqual(['state-ready-es'])
    const currentDate = visibleSection(doc).querySelector('[data-role="current-date"]')
    expect(currentDate?.getAttribute('datetime')).toBe('2027-03-01')
    expect(currentDate?.textContent).toBe(longDate('es', '2027-03-01'))
    expect(visibleText(doc)).toContain('10:00')
    expect(visibleSection(doc).querySelector('[data-role="duration"]')?.textContent).toBe('1 hora')
    // Slot choices for the current date.
    const chips = [...visibleSection(doc).querySelectorAll('input[type="radio"]')].map(
      (r) => (r as HTMLInputElement).value
    )
    expect(chips).toEqual(['10:00', '11:00'])
    // The two documented requests, in order, and nothing else.
    expect(calls[0]).toBe(`/api/reschedule?token=${TOKEN}`)
    expect(calls[1]).toBe('/api/availability?date=2027-03-01')
    // The token itself is never rendered.
    expect(doc.body.innerHTML).not.toContain(TOKEN)
  })

  it('AC-007-40: A date with no open slots shows the empty message and keeps the picker', async () => {
    const { doc } = await render(TOKEN_URL, '', {
      availability: { body: { date: CURRENT.date, slots: [] } },
    })

    const empty = visibleSection(doc).querySelector('[data-slot-state="empty"]')
    expect(isVisible(empty)).toBe(true)
    expect(empty?.textContent).toContain('Sin huecos ese día')
    // The picker stays: no error state replaced it.
    expect(isVisible(visibleSection(doc).querySelector('input[data-role="date"]'))).toBe(true)
    expect(isVisible(visibleSection(doc).querySelector('button[type="submit"]'))).toBe(true)
    expect(visibleSections(doc)).toEqual(['state-ready-es'])
  })

  it('AC-007-41: A successful move renders the new slot and reveals no join URL, booking id, or client email', async () => {
    const { doc } = await render()
    await submitForm(doc)

    expect(visibleSections(doc)).toEqual(['state-success-es'])
    const text = visibleText(doc)
    const newDate = visibleSection(doc).querySelector('[data-role="new-date"]')
    expect(newDate?.getAttribute('datetime')).toBe('2027-03-02')
    expect(newDate?.textContent).toBe(longDate('es', '2027-03-02'))
    expect(text).toContain('09:00')
    for (const secret of [JOIN_URL, 'rexi-0123456789abcdef', BOOKING_ID, CLIENT_EMAIL, 'joinUrl']) {
      expect(doc.body.innerHTML).not.toContain(secret)
    }
  })

  it('AC-007-42: With JavaScript disabled the page is usable via a mailto exit', async () => {
    const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(SOURCE)?.[1] ?? ''
    expect(noscript).not.toBe('')
    // Both languages, unconditionally: with JS off the page cannot read ?lang=.
    expect(noscript).toContain('Cambia la hora por correo')
    expect(noscript).toContain('Change the time by email')
    expect(noscript).toContain('lang="en"')
    // One action per language, and it is always the mailto.
    expect(noscript.match(/<a /g) ?? []).toHaveLength(2)
    const hrefs = [...noscript.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(hrefs)).toEqual(new Set(['mailto:info@rexi-ai.com']))
  })

  it('AC-007-43: The token never appears in the DOM, storage, or any URL other than the resolve request', async () => {
    const before = window.location.href
    const { doc, posted } = await render()
    await submitForm(doc)

    // The token reached the server exactly twice: the resolve line and the POST body.
    expect(posted[0].token).toBe(TOKEN)
    // Nowhere in the document.
    expect(doc.documentElement.outerHTML).not.toContain(TOKEN)
    expect(doc.title).not.toContain(TOKEN)
    const hrefs = [...doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? '')
    for (const href of hrefs) expect(href).not.toContain(TOKEN)
    // No data-* attribute, storage entry or history rewrite carries it either.
    expect(SOURCE).not.toMatch(/data-token|textContent *= *token|setAttribute\([^)]*token/)
    expect(SOURCE).not.toMatch(/localStorage|sessionStorage|document\.cookie|indexedDB/)
    expect(SOURCE).not.toMatch(/history\.(push|replace)State/)
    // The address bar is left exactly as the client opened it.
    expect(window.location.href).toBe(before)
  })

  it('AC-007-44: A wrong, expired, or rotated token renders one invalid state with a mailto exit', async () => {
    // 1. A path token that is not 64 lowercase hex needs no request at all.
    for (const pathname of [
      '/reschedule',
      '/reschedule/',
      `/reschedule/${'A'.repeat(64)}`,
      `/reschedule/${'a'.repeat(63)}`,
    ]) {
      const { doc, calls } = await render(pathname)
      expect(visibleSections(doc)).toEqual(['state-invalid-es'])
      expect(calls).toHaveLength(0)
      expect(mailtoOf(doc)).toBe('mailto:info@rexi-ai.com')
    }

    // 2. Every server-side refusal (wrong / expired / rotated) is one state.
    for (const route of [
      { status: 404, body: { error: { code: 'INVALID_RESCHEDULE_TOKEN', message: 'x' } } },
      { status: 400, body: { error: { code: 'INVALID_RESCHEDULE_TOKEN', message: 'y' } } },
    ]) {
      const { doc } = await render(TOKEN_URL, '', { resolve: route })
      expect(visibleSections(doc)).toEqual(['state-invalid-es'])
      expect(visibleText(doc)).toContain('Este enlace ya no sirve')
      expect(mailtoOf(doc)).toBe('mailto:info@rexi-ai.com')
      // Nothing invites a retry of the same link.
      expect(visibleSection(doc).querySelector('button')).toBeNull()
      expect(visibleText(doc)).not.toMatch(/reintentar|try again/i)
    }
  })

  it('AC-007-45: ?lang= selects Spanish or English; absent or unrecognised falls back to Spanish', async () => {
    const english = await render(TOKEN_URL, '?lang=en')
    expect(visibleSections(english.doc)).toEqual(['state-ready-en'])
    expect(english.doc.documentElement.lang).toBe('en')
    expect(visibleText(english.doc)).toContain('Change the time of your meeting')
    expect(english.doc.title).toBe('Change your meeting time · RexiAI')

    for (const search of ['?lang=es', '', '?lang=', '?lang=fr', '?lang=EN']) {
      const { doc } = await render(TOKEN_URL, search)
      expect(visibleSections(doc)).toEqual(['state-ready-es'])
      expect(doc.documentElement.lang).toBe('es')
      expect(visibleText(doc)).toContain('Cambia la hora de tu reunión')
    }

    // The language comes from ?lang= alone.
    expect(SOURCE).not.toMatch(/Accept-Language/i)
    expect(SOURCE).not.toMatch(/navigator\.language|navigator\.languages/)
    expect(SOURCE).not.toMatch(/document\.cookie|localStorage|sessionStorage/)
  })

  it('AC-007-46: A client at the reschedule limit renders the limit state directly', async () => {
    const { doc } = await render(TOKEN_URL, '', {
      resolve: { body: { ...CURRENT, canReschedule: false } },
    })

    expect(visibleSections(doc)).toEqual(['state-limit-es'])
    expect(visibleText(doc)).toContain('Esta reunión ya no se puede mover desde aquí')
    expect(doc.querySelector('#state-ready-es')).toHaveAttribute('hidden')
    expect(mailtoOf(doc)).toBe('mailto:info@rexi-ai.com')
  })

  it('AC-007-47: A 5xx response renders the unconfirmed state with no retry', async () => {
    for (const submit of [
      { status: 500, body: { error: { code: 'EMAIL_ERROR', message: 'x' } } },
      { status: 502, body: {} },
      { throws: true },
    ]) {
      const { doc } = await render(TOKEN_URL, '', { submit })
      await submitForm(doc)

      expect(visibleSections(doc)).toEqual(['state-unconfirmed-es'])
      expect(visibleText(doc)).toContain('No sabemos si el cambio se ha hecho')
      expect(visibleText(doc)).not.toMatch(/reintentar|try again/i)
      expect(visibleSection(doc).querySelector('button')).toBeNull()
      expect(mailtoOf(doc)).toBe('mailto:info@rexi-ai.com')
    }
  })

  describe('unit: the shipped document honours its stated contract', () => {
    it('zero motion: no timers, no transitions, no automatic navigation', () => {
      expect(SOURCE).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/)
      expect(SOURCE).not.toMatch(/@keyframes|animation:|transition:/)
      expect(SOURCE).not.toMatch(/location\.reload|location\.replace|location\.assign/)
      expect(SOURCE).not.toMatch(/history\.(push|replace)State/)
      expect(SOURCE).not.toMatch(/http-equiv="refresh"/i)
    })

    it('one self-contained document: no external request, no icon set, no webfont', () => {
      expect(SOURCE).not.toMatch(/<script[^>]+src=/)
      expect(SOURCE).not.toMatch(/<link[^>]+stylesheet/)
      expect(SOURCE).not.toMatch(/<img/i)
      expect(SOURCE).not.toMatch(/@font-face|fonts\.googleapis/)
      expect(SOURCE).not.toMatch(/https?:\/\//)
      expect(SOURCE).toMatch(/<meta name="robots" content="noindex"\s*\/?>/)
      expect(SOURCE).toMatch(/<meta name="referrer" content="no-referrer"\s*\/?>/)
      expect(SOURCE).not.toContain('\u2014')
      expect(SOURCE).not.toContain('\u2013')
      expect(SOURCE).not.toContain('danielbueno76')
    })

    it('every state ships in both locales, and the mailto escape hatch is everywhere', () => {
      for (const state of [
        'loading',
        'load-failed',
        'invalid',
        'ready',
        'success',
        'limit',
        'rate-limited',
        'unconfirmed',
      ]) {
        for (const locale of ['es', 'en']) {
          expect(SOURCE).toContain(`id="state-${state}-${locale}"`)
        }
      }
      const mailtos = SOURCE.split('mailto:info@rexi-ai.com').length - 1
      expect(mailtos).toBeGreaterThanOrEqual(8)
      // Every revealable section carries its own title for the document title.
      for (const match of SOURCE.matchAll(/<section id="state-[^"]+"([^>]*)>/g)) {
        expect(match[1]).toContain('data-title=')
      }
    })

    it('fetch targets are relative and the token appears in exactly one request line', () => {
      expect(SOURCE).not.toMatch(/fetch\(['"]https?:\/\//)
      expect(SOURCE).not.toMatch(/fetch\(['"]\/\//)
      expect(SOURCE.match(/\?token=/g) ?? []).toHaveLength(1)
      expect(SOURCE).not.toMatch(/joinUrl|join_url/)
      expect(SOURCE).not.toContain('innerHTML')
      expect(SOURCE).not.toContain('Accept-Language')
    })

    it('the date input cannot trigger the iOS zoom, and only two radii exist', () => {
      expect(SOURCE).toMatch(/input\[type='date'\]|input\[type="date"\]/)
      const radii = [...SOURCE.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1]!.trim())
      for (const radius of radii)
        expect(['var(--radius-full)', 'var(--radius-md)']).toContain(radius)
    })

    it('a failed resolve renders the load-failed state, which does offer a retry', async () => {
      const { doc } = await render(TOKEN_URL, '', { resolve: { throws: true } })
      expect(visibleSections(doc)).toEqual(['state-load-failed-es'])
      expect(visibleText(doc)).toContain('No hemos podido cargar tu reunión')
      const retry = visibleSection(doc).querySelector('[data-role="retry-load"]')
      expect(retry).not.toBeNull()
      expect(mailtoOf(doc)).toBe('mailto:info@rexi-ai.com')
    })

    it('a 429 renders the rate-limited state', async () => {
      const { doc } = await render(TOKEN_URL, '', {
        resolve: { status: 429, body: { error: { code: 'RATE_LIMITED', message: 'x' } } },
      })
      expect(visibleSections(doc)).toEqual(['state-rate-limited-es'])
      expect(mailtoOf(doc)).toBe('mailto:info@rexi-ai.com')
    })

    it('a 4xx on submit without a known code falls back to the unconfirmed state', async () => {
      const { doc } = await render(TOKEN_URL, '', {
        submit: { status: 400, body: { error: { code: 'SOMETHING_ELSE', message: 'x' } } },
      })
      await submitForm(doc)
      expect(visibleSections(doc)).toEqual(['state-unconfirmed-es'])
    })

    it('an INVALID_RESCHEDULE_TOKEN from submit renders the invalid state', async () => {
      const { doc } = await render(TOKEN_URL, '', {
        submit: {
          status: 404,
          body: { error: { code: 'INVALID_RESCHEDULE_TOKEN', message: 'x' } },
        },
      })
      await submitForm(doc)
      expect(visibleSections(doc)).toEqual(['state-invalid-es'])
    })

    it('a slot conflict keeps the picker and shows the inline rejection', async () => {
      const { doc } = await render(TOKEN_URL, '', {
        submit: { status: 409, body: { error: { code: 'SLOT_CONFLICT', message: 'x' } } },
      })
      await submitForm(doc)

      expect(visibleSections(doc)).toEqual(['state-ready-es'])
      expect(isVisible(visibleSection(doc).querySelector('[data-message="slot-rejected"]'))).toBe(
        true
      )
      expect(isVisible(visibleSection(doc).querySelector('input[data-role="date"]'))).toBe(true)
    })

    it('a PAST_DATE rejection keeps the picker and shows the date message', async () => {
      const { doc } = await render(TOKEN_URL, '', {
        submit: { status: 400, body: { error: { code: 'PAST_DATE', message: 'x' } } },
      })
      await submitForm(doc)
      expect(visibleSections(doc)).toEqual(['state-ready-es'])
      expect(isVisible(visibleSection(doc).querySelector('[data-message="date-past"]'))).toBe(true)
    })

    it('RESCHEDULE_LIMIT on submit renders the limit state', async () => {
      const { doc } = await render(TOKEN_URL, '', {
        submit: { status: 409, body: { error: { code: 'RESCHEDULE_LIMIT', message: 'x' } } },
      })
      await submitForm(doc)
      expect(visibleSections(doc)).toEqual(['state-limit-es'])
    })

    it('a double submit is ignored: the second tap never sends a second move', async () => {
      let release: (() => void) | undefined
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      const calls: string[] = []
      const gatedFetch = vi.fn(async (input: any, init?: any) => {
        const url = String(input)
        calls.push(url)
        if (init?.method === 'POST') await gate
        return {
          ok: true,
          status: 200,
          json: async () => {
            if (init?.method === 'POST') {
              return { date: '2027-03-02', startTime: '09:00', hours: 1, joinUrl: JOIN_URL }
            }
            if (url.startsWith('/api/availability')) {
              return { date: CURRENT.date, slots: ['11:00'] }
            }
            return CURRENT
          },
        }
      })
      vi.stubGlobal('fetch', gatedFetch)
      ;(window as unknown as { fetch: typeof fetch }).fetch = gatedFetch as unknown as typeof fetch

      document.body.innerHTML = BODY_MARKUP
      window.history.replaceState(null, '', TOKEN_URL)
      window.eval(INLINE_SCRIPT)
      await flush()
      await submitForm(document)
      await submitForm(document)
      release?.()
      await flush()

      expect(calls.filter((url) => url === '/api/reschedule')).toHaveLength(1)
      expect(visibleSections(document)).toEqual(['state-success-es'])
    })

    it('a retry after a failed resolve asks the same endpoint again', async () => {
      const { doc, calls } = await render(TOKEN_URL, '', { resolve: { throws: true } })
      const before = calls.length
      ;(visibleSection(doc).querySelector('[data-role="retry-load"]') as HTMLElement).click()
      await flush()
      expect(calls.length).toBeGreaterThan(before)
      expect(calls[calls.length - 1]).toBe(`/api/reschedule?token=${TOKEN}`)
    })

    it('the duration pluralises from the stored hours', async () => {
      const { doc } = await render(TOKEN_URL, '', {
        resolve: { body: { ...CURRENT, hours: 3 } },
      })
      expect(visibleSection(doc).querySelector('[data-role="duration"]')?.textContent).toBe(
        '3 horas'
      )
    })
  })
})

/** The page's own long-date format, so the assertion never hardcodes ICU output. */
function longDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`))
}

function mailtoOf(doc: Document): string | null {
  const link = visibleSection(doc).querySelector('a[href^="mailto:"]')
  return link?.getAttribute('href') ?? null
}
