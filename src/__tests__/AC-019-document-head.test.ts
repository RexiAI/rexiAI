// AC-019 Task 9 — document head metadata
// (20-acceptance/AC-019-09-document-head.md).
//
// The head is static markup in index.html, so the assertions read the file and
// parse it the same way a browser would. Landing also updates the title and
// meta tags at runtime when the locale changes; AC-019-locale-default covers
// that path.
//
// Spec 020 made the head Spanish-first: the title/description/OG/Twitter copy is
// the Spanish set, `og:locale` is `es_ES`, and English is the advertised
// alternate. The scenario IDs are unchanged — the same tags are asserted byte
// for byte, in the language the site now opens with.
import { describe, expect, it } from 'vitest'

import { repoFile } from './landing-harness'

const TITLE = 'RexiAI — software a precio fijo para negocios atrapados en Excel'
const DESCRIPTION =
  'Sustituyo el Excel del que depende tu negocio por software que funciona solo. Precio fijo, alcance cerrado en una llamada, entregado en semanas. Primera hora gratis.'

function head(): Document {
  return new DOMParser().parseFromString(repoFile('index.html'), 'text/html')
}

function meta(doc: Document, key: string, value: string): string | null {
  return doc.head.querySelector(`meta[${key}="${value}"]`)?.getAttribute('content') ?? null
}

describe('AC-019 document head', () => {
  it('AC-019-19: language, title and description are exact', () => {
    const doc = head()
    expect(doc.documentElement.getAttribute('lang')).toBe('es')
    expect(doc.querySelector('title')?.textContent).toBe(TITLE)
    expect(meta(doc, 'name', 'description')).toBe(DESCRIPTION)
  })

  it('AC-019-19: the original head and body wiring is preserved', () => {
    const doc = head()
    expect(doc.querySelector('meta[charset]')).not.toBeNull()
    expect(doc.querySelector('link[rel="icon"]')).not.toBeNull()
    expect(doc.querySelector('meta[name="viewport"]')).not.toBeNull()
    expect(doc.querySelector('#root')).not.toBeNull()
    expect(doc.querySelector('script[src="/src/main.tsx"]')).not.toBeNull()

    expect(doc.querySelector('meta[name="robots"]')).toBeNull()
    expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull()
    expect(doc.head.querySelectorAll('script')).toHaveLength(0)
  })

  it('AC-019-20: Open Graph, Twitter, canonical and hreflang are exact', () => {
    const doc = head()
    expect(meta(doc, 'property', 'og:type')).toBe('website')
    expect(meta(doc, 'property', 'og:title')).toBe(TITLE)
    expect(meta(doc, 'property', 'og:description')).toBe(DESCRIPTION)
    expect(meta(doc, 'property', 'og:url')).toBe('https://www.rexi-ai.com/')
    expect(meta(doc, 'property', 'og:site_name')).toBe('RexiAI')
    expect(meta(doc, 'property', 'og:locale')).toBe('es_ES')
    expect(meta(doc, 'property', 'og:locale:alternate')).toBe('en_GB')
    expect(meta(doc, 'property', 'og:image')).toBe('/logo.png')

    expect(meta(doc, 'name', 'twitter:card')).toBe('summary_large_image')
    expect(meta(doc, 'name', 'twitter:title')).toBe(doc.querySelector('title')?.textContent)
    expect(meta(doc, 'name', 'twitter:description')).toBe(meta(doc, 'name', 'description'))

    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://www.rexi-ai.com/'
    )
    expect(
      doc.head.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute('href')
    ).toBe('https://www.rexi-ai.com/')

    const hreflangs = Array.from(doc.head.querySelectorAll('link[hreflang]')).map((link) =>
      link.getAttribute('hreflang')
    )
    expect(hreflangs).toEqual(['x-default'])
  })
})
