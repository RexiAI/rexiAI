// AC-020 Task 4 — head metadata: Miami only, es_US / en_US
// (20-acceptance/AC-020-04-document-head.md).
import { describe, expect, it } from 'vitest'

import { en, es } from '../i18n/dictionary'

import { fold, repoFile } from './landing-harness'

const BANNED_JARGON = [
  'saas',
  'auth',
  'autenticación',
  'deploy',
  'despliegue',
  'mutation',
  'mutación',
  'internal tools',
  'herramientas internas',
  'spec pipeline',
  'pipeline de especificaciones',
  'ci gates',
  'billing',
  'facturación',
]
const RETIRED_OFFER = [
  'herramientas internas',
  'internal tools',
  'productos saas',
  'websites and apps',
]
const ES_TRADE_STEMS = [
  'plomer',
  'clinic',
  'despacho',
  'abogad',
  'contratist',
  'electricist',
  'tienda',
  'salon',
]
const EN_TRADE_STEMS = [
  'plumber',
  'clinic',
  'office',
  'lawyer',
  'contractor',
  'electrician',
  'shop',
  'store',
  'salon',
]

function head(): Document {
  return new DOMParser().parseFromString(repoFile('index.html'), 'text/html')
}

function meta(doc: Document, key: string, value: string): string | null {
  return doc.head.querySelector(`meta[${key}="${value}"]`)?.getAttribute('content') ?? null
}

describe('AC-020 document head', () => {
  it('AC-020-12: the head names the buyer and Miami only', () => {
    const esHead = fold(`${es.head.title} ${es.head.description}`)
    const enHead = fold(`${en.head.title} ${en.head.description}`)

    expect(ES_TRADE_STEMS.some((stem) => esHead.includes(stem))).toBe(true)
    expect(EN_TRADE_STEMS.some((stem) => enHead.includes(stem))).toBe(true)
    expect(es.head.title).toContain('Miami')
    expect(es.head.description).toContain('Miami')
    expect(en.head.title).toContain('Miami')
    expect(en.head.description).toContain('Miami')

    for (const headText of [esHead, enHead]) {
      expect(headText).not.toContain('salamanca')
      for (const banned of [...BANNED_JARGON, ...RETIRED_OFFER]) {
        expect(headText).not.toContain(fold(banned))
      }
      expect(headText).not.toContain('negocios de barrio')
      expect(headText).not.toContain('pymes de barrio')
      expect(headText).not.toContain('software')
      expect(headText).not.toContain(fold('Inglés Ejecutivo'))
    }
  })

  it('AC-020-13: the static head stays in sync, Spanish-first, US locale codes', () => {
    const doc = head()
    const title = doc.querySelector('title')?.textContent
    const description = meta(doc, 'name', 'description')

    expect(title).toBe(es.head.title)
    expect(description).toBe(es.head.description)
    expect(meta(doc, 'property', 'og:title')).toBe(es.head.title)
    expect(meta(doc, 'property', 'og:description')).toBe(es.head.description)
    expect(meta(doc, 'name', 'twitter:title')).toBe(es.head.title)
    expect(meta(doc, 'name', 'twitter:description')).toBe(es.head.description)

    expect(doc.documentElement.getAttribute('lang')).toBe('es')
    expect(meta(doc, 'property', 'og:locale')).toBe('es_US')
    expect(meta(doc, 'property', 'og:locale:alternate')).toBe('en_US')
    expect(es.head.locale).toBe('es_US')
    expect(es.head.alternate).toBe('en_US')
    expect(en.head.locale).toBe('en_US')
    expect(en.head.alternate).toBe('es_US')
  })
})
