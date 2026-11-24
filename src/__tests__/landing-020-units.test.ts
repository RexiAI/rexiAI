// Unit tests for spec-020 behaviour the acceptance scenarios do not reach: the
// hero's action count, the screen-reader pairing of each before→after example,
// the pricing figures as single unsplit elements, and the runtime head sync.
//
// No AC-020-NN IDs on purpose: these are not scenarios, they are the boundary
// cases behind them.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { en, es } from '../i18n/dictionary'
import { applyDocumentHead } from '../i18n/documentHead'

import { renderLanding, section } from './landing-harness'

describe('landing 020 units', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('the hero exposes exactly two actions and one h1', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const hero = section(container, 'hero')

    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(hero.querySelectorAll('.hero-ctas a')).toHaveLength(2)
    expect(hero.querySelectorAll('.hero-cta--primary')).toHaveLength(1)
    expect(hero.querySelectorAll('.hero-cta--secondary')).toHaveLength(1)
    expect(hero.querySelectorAll('a')).toHaveLength(2)
    expect(hero.querySelector('.hero-cta-microcopy')).toBeNull()
  })

  it('each before→after example carries accessible labels and a hidden arrow', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const services = section(container, 'services')
    const rows = Array.from(services.querySelectorAll('.example-row'))

    expect(rows).toHaveLength(4)
    for (const row of rows) {
      expect(row.querySelectorAll('.example-row__label')).toHaveLength(2)
      const labels = Array.from(row.querySelectorAll('.example-row__label')).map(
        (label) => label.textContent
      )
      expect(labels).toEqual([en.services.beforeLabel, en.services.afterLabel])
      expect(row.querySelector('.example-row__arrow')?.getAttribute('aria-hidden')).toBe('true')
      expect(row.querySelector('.example-row__cell--before')).not.toBeNull()
      expect(row.querySelector('.example-row__cell--after')).not.toBeNull()
    }
  })

  it('the pricing figures are single, unsplit elements', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const figures = Array.from(
      section(container, 'pricing').querySelectorAll('.pricing__figure')
    ).map((figure) => figure.textContent)
    expect(figures).toEqual([en.pricing.setup.figure, en.pricing.monthly.figure])
    // `$1,200` never lands in two elements: the figure is one text node.
    for (const figure of section(container, 'pricing').querySelectorAll('.pricing__figure')) {
      expect(figure.childNodes).toHaveLength(1)
    }
  })

  it('the FAQ questions are h3 and their answers follow in DOM order', async () => {
    const { container } = await renderLanding({ locale: 'en' })
    const faq = section(container, 'faq')
    const questions = Array.from(faq.querySelectorAll('h3'))

    expect(questions).toHaveLength(4)
    for (const question of questions) {
      expect(question.nextElementSibling?.tagName).toBe('P')
    }
    expect(faq.querySelectorAll('button')).toHaveLength(0)
    expect(faq.querySelectorAll('details')).toHaveLength(0)
  })

  it('applyDocumentHead keeps the US locale codes in sync at runtime', () => {
    document.head.innerHTML = `
      <title></title>
      <meta name="description" content="" />
      <meta property="og:title" content="" />
      <meta property="og:description" content="" />
      <meta property="og:locale" content="es_ES" />
      <meta property="og:locale:alternate" content="en_GB" />
      <meta name="twitter:title" content="" />
      <meta name="twitter:description" content="" />
    `

    applyDocumentHead(es.head)
    expect(document.title).toBe(es.head.title)
    expect(document.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe(
      'es_US'
    )
    expect(
      document.querySelector('meta[property="og:locale:alternate"]')?.getAttribute('content')
    ).toBe('en_US')

    applyDocumentHead(en.head)
    expect(document.title).toBe(en.head.title)
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      en.head.description
    )
    expect(document.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe(
      'en_US'
    )
  })
})
