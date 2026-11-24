// AC-020 Task 9 — locale parity: retire the old offer and rejected labels
// (20-acceptance/AC-020-09-locale-parity.md).
import { describe, expect, it } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { fold, renderLanding, repoFile, section } from './landing-harness'

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

/** Every string leaf as `path` → value, so the About carve-out stays traceable. */
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

const RETIRED_OFFER_IDS = ['saas-products', 'websites-and-apps']
const RETIRED_OFFER_COPY = [
  'productos saas',
  'webs y aplicaciones',
  'websites and apps',
  'herramientas internas',
  'internal tools',
  'saas products',
]

/** No retired offer id or retired offer string survives in either locale. */
function expectRetiredOfferGone(dictionary: string): void {
  for (const retiredId of RETIRED_OFFER_IDS) expect(dictionary).not.toContain(retiredId)
  for (const retiredCopy of RETIRED_OFFER_COPY) {
    expect(fold(dictionary)).not.toContain(retiredCopy)
  }
}

/** `software` is allowed only in the string leaf at one of these paths. */
function expectNoProductSoftware(carveOuts: string[]): void {
  for (const [path, value] of leaves({ es, en })) {
    if (carveOuts.includes(path)) continue
    expect(fold(value), `${path} uses the banned product word`).not.toContain('software')
  }
}

describe('AC-020 locale parity', () => {
  it('AC-020-21: identical shape, retired offer ids gone', () => {
    expect(shapeOf(es)).toEqual(shapeOf(en))

    expectRetiredOfferGone(JSON.stringify({ es, en }))

    // The examples are the same three rows in both locales, by id.
    expect(es.services.examples.map((example) => example.id)).toEqual(
      en.services.examples.map((example) => example.id)
    )
  })

  it('AC-020-22: rejected labels, software, fontaner, Inglés Ejecutivo gone; ES primary', async () => {
    const dictionary = fold(JSON.stringify({ es, en }))
    expect(dictionary).not.toContain('negocios de barrio')
    expect(dictionary).not.toContain('pymes de barrio')
    expect(dictionary).not.toContain('fontaner')
    expect(dictionary).not.toContain('ingles ejecutivo')

    // `software` survives only in the About bio carve-out, in both locales.
    expectNoProductSoftware(['es.about.bio', 'en.about.bio'])
    expect(fold(es.about.bio)).toContain('software')
    expect(fold(en.about.bio)).toContain('software')

    // Rendered landing: product copy is free of it too, the bio is the exception.
    for (const locale of ['en', 'es'] as const) {
      const { container } = await renderLanding({ locale })
      for (const id of ['hero', 'services', 'pricing', 'proof', 'booking', 'faq', 'contact']) {
        expect(fold(section(container, id).textContent ?? ''), id).not.toContain('software')
      }
    }

    // Spanish-first default, US locale codes.
    const html = repoFile('index.html')
    expect(html).toContain('lang="es"')
    expect(html).toContain('content="es_US"')
    expect(html).toContain('content="en_US"')
    expect(es.head.locale).toBe('es_US')
    expect(es.head.alternate).toBe('en_US')
  })
})
