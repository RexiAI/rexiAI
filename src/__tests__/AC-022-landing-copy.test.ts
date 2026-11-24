// Spec 022 — landing copy: example wrap fix, euro prices in ES, no pensions
// proof row, AI receptionist example (specs/022-.../20-acceptance/AC-022-0*.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { ALLOWED_AMOUNTS, amounts, renderLanding, repoFile, section } from './landing-harness'

const ES_BOOKING_LINE =
  'Primera llamada gratis. Después acordamos el proyecto: puesta en marcha desde 1.200\u00A0€ y mantenimiento desde 600\u00A0€/mes.'

function cssRule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(css)
  return match?.[1] ?? ''
}

describe('AC-022 landing copy', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-022-01-01: label and text are separate boxes in each cell', async () => {
    const { container } = await renderLanding({ locale: 'es' })
    const cells = section(container, 'services').querySelectorAll('.example-row__cell')
    expect(cells.length).toBe(8)
    const first = cells[0]
    expect(first.querySelector('.example-row__label')?.textContent).toBe('antes')
    const text = first.querySelector('.example-row__text')
    expect(text?.textContent).toBe('Presupuestos a mano en papel.')
    expect(text?.querySelector('.example-row__label')).toBeNull()
    expect(cells[1].querySelector('.example-row__label')?.textContent).toBe('después')
  })

  it('AC-022-01-02: the cell is a grid/flex, the label is not inline', () => {
    const css = repoFile('src/App.css')
    expect(cssRule(css, '.example-row__cell')).toMatch(/display:\s*(grid|flex)\b/)
    expect(cssRule(css, '.example-row__label')).not.toMatch(/display:\s*(inline-block|inline)\b/)
  })

  it('AC-022-01-03: no media query restores block/inline flow on the cell', () => {
    const css = repoFile('src/App.css')
    const media = /@media \(min-width: 641px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(media).not.toMatch(/\.example-row__cell\s*\{[^}]*display:\s*(block|inline)/)
    expect(css).not.toMatch(/\.example-row__text\s*\{[^}]*display:\s*inline\b/)
  })

  it('AC-022-01-04: EN labels and the arrow are preserved', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const labels = Array.from(container.querySelectorAll('.example-row__label')).map(
      (el) => el.textContent
    )
    expect(labels.slice(0, 2)).toEqual(['before', 'after'])
    expect(container.querySelectorAll('.example-row__arrow').length).toBe(4)
  })

  it('AC-022-02-01: ES pricing figures use euros with NBSP', async () => {
    const { container } = await renderLanding({ locale: 'es' })
    const text = section(container, 'pricing').textContent ?? ''
    expect(text).toContain('desde 1.200\u00A0€')
    expect(text).toContain('desde 600\u00A0€/mes')
  })

  it('AC-022-02-02: ES FAQ and booking line use euros', () => {
    expect(es.booking.narrativePaid).toBe(ES_BOOKING_LINE)
    const faq = es.faq.items.map((i) => i.answer).join(' ')
    expect(faq).toContain('600\u00A0€/mes')
  })

  it('AC-022-02-03: no dollar sign on the ES page', async () => {
    const { container } = await renderLanding({ locale: 'es' })
    expect(container.textContent).not.toContain('$')
  })

  it('AC-022-02-04: EN is unchanged and has no euro sign', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const text = container.textContent ?? ''
    expect(text).toContain('from $1,200')
    expect(text).toContain('from $600/month')
    expect(text).not.toContain('€')
  })

  it('AC-022-02-05: exactly two amounts, no hourly text', async () => {
    for (const locale of ['es', 'en'] as const) {
      localStorage.clear()
      const { container } = await renderLanding({ locale })
      const text = (container.textContent ?? '').replace(/\u00A0/g, ' ')
      const raw = text.match(/\$\s?\d[\d,.]*|\d[\d.,]*\s?€/g) ?? []
      const amounts = new Set(raw.map((m) => m.replace(/\D/g, '').replace(/^1200$/, '1200')))
      expect([...amounts].sort()).toEqual(['1200', '600'])
      expect(text).not.toMatch(/\/hora|\/hour/)
      vi.unstubAllGlobals()
    }
  })

  it('AC-022-02-06: head meta stays price-free', () => {
    const html = repoFile('index.html')
    const meta = [...html.matchAll(/<(?:title|meta)[^>]*>(?:[^<]*<\/title>)?/g)]
      .map((m) => m[0])
      .join('\n')
    expect(meta).not.toMatch(/[$€]|1\.200|1,200|600/)
  })

  it('AC-022-04-01: no pensions row or link in either locale', async () => {
    for (const locale of ['es', 'en'] as const) {
      localStorage.clear()
      const { container } = await renderLanding({ locale })
      const proof = section(container, 'proof')
      expect(proof.innerHTML).not.toMatch(/pensions-system/i)
      expect(container.textContent).not.toMatch(/pensiones|pension/i)
      vi.unstubAllGlobals()
    }
  })

  it('AC-022-04-02: honesty intro and tax-advisor link remain', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const proof = section(container, 'proof')
    expect(proof.querySelector('.proof__intro')?.textContent).toContain('No client logos yet')
    const hrefs = Array.from(proof.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(['https://github.com/RexiAI/tax-advisor'])
  })

  it('AC-022-05-01: ES fourth example row', async () => {
    const { container } = await renderLanding({ locale: 'es' })
    const rows = section(container, 'services').querySelectorAll('.example-row')
    expect(rows).toHaveLength(4)
    const row = rows[3]
    expect(row.querySelector('.example-row__trade')?.textContent).toBe('Despachos y consultas')
    expect(row.querySelector('.example-row__cell--before .example-row__text')?.textContent).toBe(
      'Llamadas que se quedan sin contestar.'
    )
    expect(row.querySelector('.example-row__cell--after .example-row__text')?.textContent).toBe(
      'Recepcionista de IA que contesta en español e inglés y agenda la cita.'
    )
  })

  it('AC-022-05-02: EN fourth example row', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const row = section(container, 'services').querySelectorAll('.example-row')[3]
    expect(row.querySelector('.example-row__trade')?.textContent).toBe(
      'Law firms and medical practices'
    )
    expect(row.querySelector('.example-row__cell--before .example-row__text')?.textContent).toBe(
      'Calls that go unanswered.'
    )
    expect(row.querySelector('.example-row__cell--after .example-row__text')?.textContent).toBe(
      'AI receptionist that answers in Spanish and English and books the appointment.'
    )
  })

  it('AC-022-05-03: the receptionist row is illustrative only', async () => {
    for (const locale of ['es', 'en'] as const) {
      localStorage.clear()
      const { container } = await renderLanding({ locale })
      const row = section(container, 'services').querySelectorAll('.example-row')[3]
      expect(row.querySelector('a')).toBeNull()
      expect(row.textContent).not.toMatch(/[\d$€]|Inglés Ejecutivo/)
      vi.unstubAllGlobals()
    }
  })

  it('AC-022-05-04: example ids agree across locales', () => {
    const ids = ['plumber', 'shop', 'salon', 'receptionist']
    expect(es.services.examples.map((e) => e.id)).toEqual(ids)
    expect(en.services.examples.map((e) => e.id)).toEqual(ids)
  })

  it('AC-022-03-01: the migrated test IDs still appear in their original files', () => {
    const expected: Record<string, string[]> = {
      'src/__tests__/AC-020-pricing.test.ts': ['AC-020-14'],
      'src/__tests__/AC-020-faq.test.ts': ['AC-020-19'],
      'src/__tests__/AC-020-e2e-landing.test.ts': ['AC-020-25'],
      'tests/e2e/landing.e2e.ts': ['AC-020-25'],
      'src/__tests__/AC-019-booking-money-story.test.ts': ['AC-019-15', 'AC-019-16'],
      'src/__tests__/AC-011-booking-ui.test.tsx': ['AC-011-03'],
    }
    for (const [file, ids] of Object.entries(expected)) {
      const source = repoFile(file)
      for (const id of ids) expect(source, `${id} missing from ${file}`).toContain(id)
    }
  })

  it('AC-022-03-02: no Spanish-locale assertion expects $1,200 or $600', () => {
    const pricing = repoFile('src/__tests__/AC-020-pricing.test.ts')
    const esPricingLines = pricing.split('\n').filter((line) => line.includes('esPricing'))
    expect(esPricingLines.length).toBeGreaterThan(0)
    const e2e = repoFile('tests/e2e/landing.e2e.ts')
    const esJourney = e2e.slice(0, e2e.indexOf('SWITCH_TO_EN), '))
    const esAssertions = [
      ...esPricingLines,
      ES_BOOKING_LINE,
      repoFile('src/__tests__/AC-019-booking-money-story.test.ts').match(
        /const ES_PAID_NARRATIVE =\s*'[^']*'/
      )?.[0] ?? '',
      repoFile('src/__tests__/AC-011-booking-ui.test.tsx'),
      [...ALLOWED_AMOUNTS.es].join(' '),
      esJourney.slice(esJourney.indexOf('// AC-020-25'), esJourney.indexOf('// AC-022-01')),
    ]
    expect(esAssertions.every((chunk) => chunk.length > 0)).toBe(true)
    for (const chunk of esAssertions) {
      expect(chunk).not.toMatch(/\$\s?1,200|\$\s?600/)
    }
    expect([...ALLOWED_AMOUNTS.es]).toEqual(['1.200\u00A0€', '600\u00A0€'])
  })

  it('AC-022-03-03: the FAQ amount guard rejects an unlisted euro amount', () => {
    const answer = 'Mantenimiento desde 600\u00A0€/mes y una auditoría de 250\u00A0€.'
    const unlisted = amounts(answer).filter((amount) => !ALLOWED_AMOUNTS.es.has(amount))
    expect(amounts(answer)).toContain('250\u00A0€')
    expect(unlisted).toEqual(['250\u00A0€'])
    // A listed amount alone passes, so the guard is not rejecting everything.
    const listed = amounts('desde 1.200\u00A0€ y 600\u00A0€')
    expect(listed.filter((amount) => !ALLOWED_AMOUNTS.es.has(amount))).toEqual([])
  })
})
