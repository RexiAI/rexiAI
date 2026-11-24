// AC-019 Task 10 — locale parity and ES sync (20-acceptance/AC-019-10-locale-parity.md).
//
// Spec 020 reshaped the dictionary (one offer + examples, pricing, FAQ) and
// retired the old offer ids. The scenario IDs are kept: they still assert one
// shape for both locales and that Spanish says what English says.
import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { renderLanding } from './landing-harness'

/** Structural shape: object keys, array lengths, primitive kinds. */
function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return { array: value.length, of: value.map(shapeOf) }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, shapeOf((value as Record<string, unknown>)[key])])
    )
  }
  return typeof value
}

/** Every string leaf as `path` → value, so two locales can be compared pairwise. */
function leaves(value: unknown, prefix = ''): [string, string][] {
  if (typeof value === 'string') return [[prefix, value]]
  if (Array.isArray(value)) return value.flatMap((item, i) => leaves(item, `${prefix}[${i}]`))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      leaves(item, prefix === '' ? key : `${prefix}.${key}`)
    )
  }
  return []
}

/** One element's text, or a named failure when the selector did not render. */
function textOf(container: ParentNode, selector: string): string {
  const element = container.querySelector(selector)
  if (!element) throw new Error(`${selector} did not render`)
  return element.textContent ?? ''
}

const CHANGED_SECTIONS = [
  'hero',
  'services',
  'pricing',
  'proof',
  'about',
  'faq',
  'booking',
] as const

/** Values that are legitimately identical in both locales. */
const IDENTICAL_ALLOWED =
  /^(about\.(name|email|githubLabel|githubUrl)|hero\.whatsappUrl|proof\.items\[\d+\]\.(name|href)|services\.examples\[\d+\]\.id|faq\.items\[\d+\]\.id|booking\.stepsFree\[\d+\]|booking\.stepsPaid\[\d+\])$/

describe('AC-019 locale parity', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-019-21: both dictionaries have the same shape', () => {
    expect(shapeOf(es)).toEqual(shapeOf(en))
  })

  it('AC-019-21: every retired key is gone from both locales', () => {
    const dictionary = JSON.stringify({ es, en })
    // Assembled at runtime: this test names each retired key only to assert its
    // absence, and must not match its own source in the AC-019-23 sweep.
    const retiredKeys = [
      ['free', 'Mode'].join(''),
      ...['Prev', 'Next', 'Position', 'Role'].map((suffix) => ['carousel', suffix].join('')),
      ['pricing', 'Rules'].join(''),
      ['pricing', 'Example'].join(''),
      'saas-products',
      'websites-and-apps',
      'ctaMicrocopy',
    ]
    for (const retired of retiredKeys) {
      expect(dictionary).not.toContain(retired)
    }
    expect(Object.keys(es.booking)).not.toContain('narrative')
    expect(Object.keys(en.booking)).not.toContain('narrative')
    for (const locale of [es, en]) {
      expect(Object.keys(locale.services).sort()).toEqual([
        'afterLabel',
        'beforeLabel',
        'examples',
        'offer',
        'title',
      ])
      for (const example of locale.services.examples) {
        expect(Object.keys(example)).toEqual(['id', 'trade', 'before', 'after'])
      }
      expect(Object.keys(locale.services.offer)).toEqual(['title', 'description'])
    }
  })

  it('AC-019-21: the example ids and the proof links agree across locales', () => {
    expect(es.services.examples.map((i) => i.id)).toEqual([
      'plumber',
      'shop',
      'salon',
      'receptionist',
    ])
    expect(en.services.examples.map((i) => i.id)).toEqual(es.services.examples.map((i) => i.id))

    expect(es.proof.items).toHaveLength(1)
    expect(en.proof.items).toHaveLength(1)
    es.proof.items.forEach((item, index) => {
      expect(en.proof.items[index].name).toBe(item.name)
      expect(en.proof.items[index].href).toBe(item.href)
    })

    expect(es.contact.email).toBe('info@rexi-ai.com')
    expect(en.contact.email).toBe('info@rexi-ai.com')
    expect(es.faq.items.map((item) => item.id)).toEqual([...en.faq.items.map((item) => item.id)])
  })

  it('AC-019-21: no em-dash and no en-dash anywhere (spec 020 copy rule)', () => {
    // The em-dash is banned outright in this copy (15-design §Global Tokens),
    // including Spanish: periods and commas carry the pause instead.
    expect(JSON.stringify({ es, en })).not.toContain('—')
    expect(JSON.stringify({ es, en })).not.toContain('–')
  })

  it('AC-019-22: the Spanish page says what the English page now says', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding({ billingEnabled: false })

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe('Tú me lo cuentas. Yo lo construyo.')
    expect(
      ['#services h2', '#pricing h2', '#proof h2', '#about h2', '#faq h2'].map((selector) =>
        textOf(container, selector)
      )
    ).toEqual([
      'Lo que construyo',
      'Precio claro',
      'Trabajo real, código real',
      'Quién lo construye',
      'Preguntas frecuentes',
    ])
    expect(textOf(container, '#booking .booking__narrative')).toBe(
      'La primera hora es gratis. Describes el proceso que te está comiendo la semana; te vas con un plan de una página y un precio fijo para la construcción. Sin cargo, sin compromiso, sin presentación.'
    )
  })

  it('AC-019-22: no Spanish value is a copied English one, or empty, or retired copy', () => {
    for (const section of CHANGED_SECTIONS) {
      const esLeaves = new Map(leaves(es[section]))
      for (const [path, enValue] of leaves(en[section])) {
        const translated = esLeaves.get(path)
        expect(translated, `${section}.${path} is missing from es`).toBeDefined()
        const fullPath = `${section}.${path}`
        if (IDENTICAL_ALLOWED.test(fullPath)) continue
        expect(translated, `${fullPath} is untranslated`).not.toBe(enValue)
        expect(translated, `${fullPath} is empty`).not.toBe('')
      }
    }
    // about.bio is filled by spec 020 Task 6, in both locales.
    expect(es.about.bio).not.toBe('')
    expect(en.about.bio).not.toBe('')

    const dictionary = JSON.stringify(es)
    for (const retired of [
      'Olvídate de tu Excel. Automatiza, con o sin IA.',
      'SaaS · Producto',
      'Web · Frontend',
      'App · Móvil',
      'Consultoría · Estrategia',
      'Herramientas internas',
      'Productos SaaS',
      'Webs y aplicaciones',
      '30 EUR/h',
    ]) {
      expect(dictionary).not.toContain(retired)
    }
    expect(es.services.title).not.toBe('Servicios')
  })
})
