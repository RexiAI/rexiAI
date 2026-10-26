// Invariant tests for the consent-notice module (spec 006 Task 2).
//
// WHY NOT fast-check: not a dependency, tier is `mvp`. The input domain that
// matters is "whatever a caller might pass as a locale", so it is enumerated
// exhaustively below — the notices are a closed two-element codomain, which makes
// exhaustive checking stronger than sampling.
//
// These are structural invariants, not acceptance scenarios: they carry no AC id.
import { describe, expect, it } from 'vitest'

import {
  NOTICE_EN,
  NOTICE_ES,
  consentNotice,
  consentNoticeLines,
  noticeLangAttribute,
} from '../domain/consentNotice'

/**
 * Everything a caller could plausibly hand a locale parameter: the supported
 * values, malformed casing/whitespace/region variants, and non-string junk.
 */
const LOCALE_INPUTS: unknown[] = [
  'es',
  'en',
  'EN',
  'En',
  'en-US',
  'en_GB',
  ' en',
  'en ',
  '',
  'fr',
  'de-DE',
  'es-ES',
  undefined,
  null,
  0,
  1,
  true,
  false,
  {},
  [],
  ['en'],
]

/** The only two inputs the module documents as selecting English. */
const ENGLISH_SELECTORS = new Set<unknown>(['en'])

describe('PROP consentNotice: every locale renders both lines', () => {
  it('always yields exactly two non-empty lines, for any input', () => {
    for (const input of LOCALE_INPUTS) {
      const notice = consentNotice(input)
      expect(Array.isArray(notice)).toBe(true)
      expect(notice).toHaveLength(2)
      for (const line of notice) {
        expect(typeof line).toBe('string')
        expect(line.trim()).not.toBe('')
      }
    }
  })

  it('always yields exactly two renderer lines whose values are the notice copy', () => {
    for (const input of LOCALE_INPUTS) {
      const lines = consentNoticeLines(input)
      expect(lines).toHaveLength(2)
      const pair = consentNotice(input)
      expect(lines.map((l) => l.value)).toEqual([pair[0], pair[1]])
    }
  })

  it('the two locales never render identical copy', () => {
    // A notice that stops localising is a real defect, not a formatting choice.
    expect(NOTICE_ES[0]).not.toBe(NOTICE_EN[0])
    expect(NOTICE_ES[1]).not.toBe(NOTICE_EN[1])
    expect(consentNotice('es')).not.toEqual(consentNotice('en'))
  })
})

describe('PROP consentNotice: nothing but the locale selects English', () => {
  it('English is selected by exactly one input value', () => {
    for (const input of LOCALE_INPUTS) {
      const isEnglish = JSON.stringify(consentNotice(input)) === JSON.stringify(NOTICE_EN)
      expect(isEnglish).toBe(ENGLISH_SELECTORS.has(input))
    }
  })

  it('every non-English input renders byte-identical Spanish', () => {
    for (const input of LOCALE_INPUTS) {
      if (ENGLISH_SELECTORS.has(input)) continue
      expect(consentNotice(input)).toEqual(NOTICE_ES)
    }
  })

  it('renders by locale alone: equal locales give equal output, always', () => {
    // Determinism / no hidden state: the same input twice is the same output.
    for (const input of LOCALE_INPUTS) {
      expect(consentNotice(input)).toEqual(consentNotice(input))
      expect(noticeLangAttribute(input)).toBe(noticeLangAttribute(input))
    }
  })
})

describe('PROP consentNotice: the lang attribute is a closed two-value codomain', () => {
  it('emits the English lang attribute only for English, never a partial value', () => {
    for (const input of LOCALE_INPUTS) {
      const attribute = noticeLangAttribute(input)
      if (ENGLISH_SELECTORS.has(input)) expect(attribute).toBe(' lang="en"')
      else expect(attribute).toBe('')
      // Never anything other than those two exact strings.
      expect(['', ' lang="en"']).toContain(attribute)
    }
  })

  it('the attribute agrees with the copy it decorates', () => {
    for (const input of LOCALE_INPUTS) {
      const englishCopy = JSON.stringify(consentNotice(input)) === JSON.stringify(NOTICE_EN)
      const englishAttribute = noticeLangAttribute(input) !== ''
      // A screen reader must never be told the wrong language.
      expect(englishAttribute).toBe(englishCopy)
    }
  })
})
