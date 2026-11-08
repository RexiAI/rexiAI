// AC-019 Task 10 — locale parity and ES sync
// (20-acceptance/AC-019-10-locale-parity.md).
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

function strings(value: unknown): string[] {
  return leaves(value).map(([, text]) => text)
}

const CHANGED_SECTIONS = ['hero', 'services', 'proof', 'about', 'booking'] as const

/** Values that are legitimately identical in both locales (Task 10 list). */
const IDENTICAL_ALLOWED =
  /^(about\.(name|email|githubLabel|githubUrl|bio)|proof\.items\[\d+\]\.(name|href)|services\.items\[\d+\]\.id)$/

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
    ]
    for (const retired of retiredKeys) {
      expect(dictionary).not.toContain(retired)
    }
    expect(Object.keys(es.booking)).not.toContain('narrative')
    expect(Object.keys(en.booking)).not.toContain('narrative')
    for (const locale of [es, en]) {
      for (const item of locale.services.items) {
        expect(Object.keys(item)).toEqual(['id', 'title', 'description'])
      }
    }
  })

  it('AC-019-21: the three service ids and the proof links agree across locales', () => {
    expect(es.services.items.map((i) => i.id)).toEqual([
      'internal-tools',
      'saas-products',
      'websites-and-apps',
    ])
    expect(en.services.items.map((i) => i.id)).toEqual(es.services.items.map((i) => i.id))

    expect(es.proof.items).toHaveLength(3)
    expect(en.proof.items).toHaveLength(3)
    es.proof.items.forEach((item, index) => {
      expect(en.proof.items[index].name).toBe(item.name)
      expect(en.proof.items[index].href).toBe(item.href)
    })

    expect(es.contact.email).toBe('info@rexi-ai.com')
    expect(en.contact.email).toBe('info@rexi-ai.com')
  })

  it('AC-019-21: one em dash, in the paid narrative only, and no en dash anywhere', () => {
    const esDashes = [...new Set(strings(es).filter((text) => text.includes('—')))]
    const enDashes = [...new Set(strings(en).filter((text) => text.includes('—')))]
    expect(esDashes).toEqual([es.booking.narrativePaid])
    expect(enDashes).toEqual([en.booking.narrativePaid])
    expect(JSON.stringify({ es, en })).not.toContain('–')
  })

  it('AC-019-22: the Spanish page says what the English page now says', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding({ billingEnabled: false })

    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe(
      'Tu negocio funciona con una hoja de cálculo que solo una persona entiende.'
    )
    expect(container.querySelector('#services h2')?.textContent).toBe('Lo que construyo')
    expect(container.querySelector('#proof h2')?.textContent).toBe('Publicado, no presentación')
    expect(container.querySelector('#about h2')?.textContent).toBe('Quién lo construye')
    expect(container.querySelector('#booking .booking__narrative')?.textContent).toBe(
      'La primera hora es gratis. Describes el proceso que te está comiendo la semana; te vas con un plan de una página y un precio fijo para la construcción. Sin cargo, sin compromiso, sin presentación.'
    )
  })

  it('AC-019-22: no Spanish value is a copied English one, or empty, or retired copy', () => {
    for (const section of CHANGED_SECTIONS) {
      const esLeaves = new Map(leaves(es[section]))
      for (const [path, esValue] of leaves(en[section])) {
        const translated = esLeaves.get(path)
        expect(translated, `${section}.${path} is missing from es`).toBeDefined()
        const fullPath = `${section}.${path}`
        if (IDENTICAL_ALLOWED.test(fullPath)) continue
        expect(translated, `${fullPath} is untranslated`).not.toBe(esValue)
        expect(translated, `${fullPath} is empty`).not.toBe('')
      }
    }
    // about.bio is the one deliberate empty value (Task 6: optional field).
    expect(es.about.bio).toBe('')

    const dictionary = JSON.stringify(es)
    for (const retired of [
      'Olvídate de tu Excel. Automatiza, con o sin IA.',
      'SaaS · Producto',
      'Web · Frontend',
      'App · Móvil',
      'Consultoría · Estrategia',
      '30 EUR/h',
    ]) {
      expect(dictionary).not.toContain(retired)
    }
    expect(es.services.title).not.toBe('Servicios')
  })
})
