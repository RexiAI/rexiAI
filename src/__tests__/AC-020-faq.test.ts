// AC-020 Task 7 — FAQ: four honest, generic questions
// (20-acceptance/AC-020-07-faq.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { fold, renderLanding, section } from './landing-harness'

/** Public figures only: any other `$` amount in the FAQ is an invented price. */
const ALLOWED_AMOUNTS = new Set(['$1,200', '$600'])

function pairs(container: ParentNode): { question: string; answer: string }[] {
  return Array.from(container.querySelectorAll('.faq__item')).map((item) => ({
    question: item.querySelector('.faq__question')?.textContent ?? '',
    answer: item.querySelector('.faq__answer')?.textContent ?? '',
  }))
}

function amounts(text: string): string[] {
  return text.match(/\$\d[\d,]*/g) ?? []
}

describe('AC-020 FAQ', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-020-19: exactly four honest Q/A pairs in both locales', async () => {
    const enPage = await renderLanding({ locale: 'en' })
    const enPairs = pairs(section(enPage.container, 'faq'))
    expect(enPairs).toHaveLength(4)
    const enText = fold(enPairs.map((p) => `${p.question} ${p.answer}`).join(' '))
    // maintenance cost · what if it breaks · who owns the data · mobile
    expect(enText).toMatch(/maintenance/)
    expect(enText).toMatch(/cost|price|fee/)
    expect(enText).toMatch(/break|stop working/)
    expect(enText).toMatch(/own.*data|data.*own/)
    expect(enText).toMatch(/mobile|phone/)

    localStorage.setItem('rexi-locale', 'es')
    const esPage = await renderLanding()
    const esPairs = pairs(section(esPage.container, 'faq'))
    expect(esPairs).toHaveLength(4)
    const esText = fold(esPairs.map((p) => `${p.question} ${p.answer}`).join(' '))
    expect(esText).toMatch(/mantenimiento/)
    expect(esText).toMatch(/cuesta|costo|precio|cuota/)
    expect(esText).toMatch(/rompe|deja de funcionar/)
    expect(esText).toMatch(/datos/)
    expect(esText).toMatch(/movil/)

    for (const locale of [en, es]) {
      expect(locale.faq.items).toHaveLength(4)
    }
  })

  it('AC-020-19: no invented SLA, price, or metric in any answer', async () => {
    for (const locale of ['en', 'es'] as const) {
      if (locale === 'es') localStorage.setItem('rexi-locale', 'es')
      const { container } = await renderLanding({ locale })
      const faq = section(container, 'faq')
      const text = faq.textContent ?? ''

      // No uptime percentage: not `%` at all, not `99.9`.
      expect(text).not.toContain('%')
      expect(text).not.toContain('99.9')
      for (const amount of amounts(text)) {
        expect(ALLOWED_AMOUNTS.has(amount), `${amount} is not a public figure`).toBe(true)
      }
      // No invented metric: no multiplier or count-out claims.
      expect(fold(text)).not.toMatch(/\b\d+x\b/)
      // No accordion: every answer is rendered, not behind disclosure.
      expect(faq.querySelector('details')).toBeNull()
      expect(faq.querySelector('button')).toBeNull()
      for (const pair of pairs(faq)) expect(pair.answer.trim().length).toBeGreaterThan(0)
    }
  })
})
