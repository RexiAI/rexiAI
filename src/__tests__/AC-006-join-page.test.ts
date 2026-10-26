// AC-006 join interstitial: the language comes from `?lang=` alone, the room from
// the pathname, and the primary action points at the real meet.jit.si room with
// no query string. The tests load the SHIPPED document's markup into the test
// environment's own jsdom, execute its inline script verbatim, and assert on the
// resulting DOM.
// Acceptance tests per
// specs/006-branded-meeting-link-and-recording-bot/20-acceptance/AC-006-notice-locale.md
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { realRoomUrl } from '../domain/meetingUrl'

const PAGE_PATH = path.join(process.cwd(), 'deploy/join/index.html')
const ROOM = 'rexi-0123456789abcdef'
const SOURCE = fs.readFileSync(PAGE_PATH, 'utf8')

/** The document's own markup and its own script, taken from the shipped file. */
const BODY_MARKUP = SOURCE.slice(SOURCE.indexOf('<body>') + 6, SOURCE.indexOf('</body>'))
const INLINE_SCRIPT = SOURCE.slice(
  SOURCE.lastIndexOf('<script>') + '<script>'.length,
  SOURCE.lastIndexOf('</script>')
)

function renderJoinPage(pathname = `/${ROOM}`, search = ''): Document {
  document.body.innerHTML = BODY_MARKUP
  document.documentElement.lang = 'es'
  document.title = ''
  window.history.replaceState(null, '', `${pathname}${search}`)
  window.eval(INLINE_SCRIPT)
  return document
}

function visibleSections(doc: Document): string[] {
  return [...doc.querySelectorAll('section[id]')]
    .filter((el) => !el.hasAttribute('hidden'))
    .map((el) => el.id as string)
}

function visibleSection(doc: Document): HTMLElement {
  const shown = [...doc.querySelectorAll('section[id]')].filter((el) => !el.hasAttribute('hidden'))
  expect(shown).toHaveLength(1) // exactly one state is ever rendered
  return shown[0] as HTMLElement
}

function visibleText(doc: Document): string {
  return visibleSection(doc).textContent ?? ''
}

function action(doc: Document): HTMLAnchorElement {
  const link = visibleSection(doc).querySelector('[data-role="action"]') as HTMLAnchorElement | null
  expect(link).not.toBeNull()
  return link as HTMLAnchorElement
}

describe('AC-006 join interstitial', () => {
  it('AC-006-34: ?lang=en selects the English column from that parameter alone', () => {
    const doc = renderJoinPage(`/${ROOM}`, '?lang=en')

    expect(doc.documentElement.lang).toBe('en')
    expect(visibleSections(doc)).toEqual(['join-en'])
    expect(doc.title).toBe('Join the meeting · RexiAI')
    expect(visibleSection(doc).querySelector('h1')?.textContent).toBe('Your meeting with RexiAI')
    expect(visibleSection(doc).querySelector('[data-role="room"]')?.textContent).toBe(
      `Room ${ROOM}`
    )
    expect(action(doc).textContent?.trim()).toBe('Join the meeting')
    expect(action(doc).getAttribute('href')).toBe(`https://meet.jit.si/${ROOM}`)

    // Nothing else is a language source: no header sniffing, no cookie, no path
    // segment, no stored preference anywhere in the shipped document.
    expect(SOURCE).not.toMatch(/Accept-Language/i)
    expect(SOURCE).not.toMatch(/navigator\.language/)
    expect(SOURCE).not.toMatch(/document\.cookie|localStorage|sessionStorage/)

    // A locale-looking PATH segment is not a language source (and is not a room).
    const prefixed = renderJoinPage(`/en/${ROOM}`)
    expect(visibleSections(prefixed)).toEqual(['invalid-es'])
  })

  it('AC-006-35: absent, empty or unrecognised lang renders Spanish and never English', () => {
    for (const search of ['', '?lang=', '?lang=fr', '?lang=EN', '?lang=de-DE', '?other=1']) {
      const doc = renderJoinPage(`/${ROOM}`, search)
      expect(visibleSections(doc)).toEqual(['join-es'])
      expect(doc.documentElement.lang).toBe('es')
      expect(visibleSection(doc).querySelector('h1')?.textContent).toBe('Tu reunión con RexiAI')
      expect(doc.title).toBe('Entrar en la reunión · RexiAI')
      // Never a half-translated page: the rendered column carries no English copy.
      expect(visibleText(doc)).not.toContain('Your meeting with RexiAI')
      expect(visibleText(doc)).not.toContain('Join the meeting')
    }
  })

  it('AC-006-36: the lang parameter never reaches the real Jitsi room', () => {
    for (const [search, column] of [
      ['?lang=es', 'join-es'],
      ['?lang=en', 'join-en'],
    ] as const) {
      const doc = renderJoinPage(`/${ROOM}`, search)
      expect(visibleSections(doc)).toEqual([column])

      const href = action(doc).getAttribute('href') as string
      expect(href).toBe(`https://meet.jit.si/${ROOM}`)
      expect(href).toBe(realRoomUrl(ROOM))
      expect(href).not.toContain('?')
      expect(href).not.toContain('lang')
      // Room identity is unchanged, so the pipeline's room derivation still matches.
      expect(new URL(href).pathname).toBe(`/${ROOM}`)
    }
  })

  describe('unit: the shipped document honours its stated contract', () => {
    it('zero motion: no timers, no automatic navigation, no transitions', () => {
      for (const banned of [
        'setTimeout',
        'setInterval',
        'requestAnimationFrame',
        'location.replace',
        'location.href',
        'http-equiv="refresh"',
        'http-equiv="Refresh"',
        'transition',
        '@keyframes',
      ]) {
        expect(SOURCE).not.toContain(banned)
      }
    })

    it('one self-contained document: both columns, no external requests', () => {
      expect(SOURCE).toContain('Tu reunión con RexiAI')
      expect(SOURCE).toContain('Your meeting with RexiAI')
      expect(SOURCE).toContain('Aviso de grabación: la reunión se graba en audio.')
      expect(SOURCE).toContain('Recording notice: this meeting is recorded as audio.')
      expect(SOURCE).not.toMatch(/<script[^>]+src=/)
      expect(SOURCE).not.toMatch(/<link[^>]+stylesheet/)
      expect(SOURCE).not.toMatch(/<img/i)
      expect(SOURCE).not.toMatch(/@font-face|fonts\.googleapis/)
    })

    it('a broken or missing room renders the recovery page, never a dead end', () => {
      for (const pathname of [
        '/',
        '/rexi-0123456789ABCDEF',
        '/rexi-0123456789abcde',
        `/${ROOM}/x`,
      ]) {
        const doc = renderJoinPage(pathname, '?lang=en')
        expect(visibleSections(doc)).toEqual(['invalid-en'])
        expect(doc.title).toBe('Invalid link · RexiAI')
        const mailto = action(doc)
        expect(mailto.getAttribute('href')).toBe('mailto:info@rexi-ai.com')
        expect(mailto.textContent?.trim()).toBe('Email RexiAI')
      }
      const spanish = renderJoinPage('/', '?lang=es')
      expect(visibleSections(spanish)).toEqual(['invalid-es'])
      expect(visibleSection(spanish).querySelector('h1')?.textContent).toBe(
        'Este enlace no es válido'
      )
    })

    it('a single trailing slash is accepted; two are not', () => {
      expect(visibleSections(renderJoinPage(`/${ROOM}/`))).toEqual(['join-es'])
      expect(visibleSections(renderJoinPage(`/${ROOM}//`))).toEqual(['invalid-es'])
    })

    it('the document declares noindex, a viewport and the brand language default', () => {
      expect(SOURCE).toMatch(/<meta name="robots" content="noindex"\s*\/?>/)
      expect(SOURCE).toMatch(/<meta name="referrer" content="no-referrer"\s*\/?>/)
      expect(SOURCE).toMatch(
        /<meta name="viewport" content="width=device-width, initial-scale=1"\s*\/?>/
      )
      expect(SOURCE).not.toContain('user-scalable=no')
      expect(SOURCE).toContain('100dvh')
      expect(SOURCE).not.toContain('—') // no em dashes in either locale
    })
  })
})
