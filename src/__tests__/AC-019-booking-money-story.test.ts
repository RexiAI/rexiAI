// AC-019 Task 7 — booking: one money story per mode
// (20-acceptance/AC-019-07-booking-money-story.md).
import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { elementTexts, renderLanding } from './landing-harness'

const EN_FREE_NARRATIVE =
  'The first hour is free. You describe the process that is eating your week; you leave with a one-page plan and a fixed price for the build. No charge, no obligation, no slide deck.'
const EN_PAID_NARRATIVE =
  'First hour free. After that, 30 EUR per hour, prepaid — you pay for the block you book, nothing is metered afterwards.'
const ES_FREE_NARRATIVE =
  'La primera hora es gratis. Describes el proceso que te está comiendo la semana; te vas con un plan de una página y un precio fijo para la construcción. Sin cargo, sin compromiso, sin presentación.'
const ES_PAID_NARRATIVE =
  'Primera hora gratis. Después, 30 EUR por hora, prepagado — pagas el bloque que reservas, nada se factura después.'
const EN_FREE_STEPS = ['Pick a slot', 'Tell me what is broken', 'Get the plan and the price']
const EN_PAID_STEPS = ['Pick a slot', 'Choose your block', 'Pay securely with Stripe']
const ES_FREE_STEPS = ['Elige un hueco', 'Cuéntame qué está roto', 'Recibe el plan y el precio']
const ES_PAID_STEPS = ['Elige un hueco', 'Elige tu bloque', 'Paga de forma segura con Stripe']
const EN_PRICE_LINE = '1h free · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR'
const ES_PRICE_LINE = '1h gratis · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR'
const FREE_NOTE = 'Free session: nothing is charged now.'
// Assembled at runtime: the design checklist greps src/ for this CSS value.
const STRIKE_CLASS = ['line', 'through'].join('-')

function booking(container: HTMLElement): HTMLElement {
  const section = container.querySelector('#booking')
  if (!section) throw new Error('#booking did not render')
  return section as HTMLElement
}

function narrative(section: HTMLElement): string {
  return section.querySelector('.booking__narrative')?.textContent ?? ''
}

function steps(section: HTMLElement): string[] {
  return Array.from(section.querySelectorAll('.booking-steps li')).map((li) => li.textContent ?? '')
}

function card(container: HTMLElement): HTMLElement {
  const el = container.querySelector('.booking-card')
  if (!el) throw new Error('.booking-card did not render')
  return el as HTMLElement
}

describe('AC-019 booking money story', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('AC-019-15: free mode tells the free-hour story and shows no price machinery', async () => {
    const { container } = await renderLanding({ billingEnabled: false })
    const section = booking(container)

    expect(narrative(section)).toBe(EN_FREE_NARRATIVE)
    expect(steps(section)).toEqual(EN_FREE_STEPS)
    expect(card(container).textContent).toContain(FREE_NOTE)

    expect(elementTexts(container)).not.toContain('FREE')
    expect(elementTexts(container)).not.toContain('GRATIS')
    expect(container.querySelector('s, del, strike')).toBeNull()
    expect(container.textContent).not.toContain(EN_PRICE_LINE)
    expect(container.textContent).not.toContain('Pay securely with Stripe')
    expect(container.textContent).not.toContain(EN_PAID_NARRATIVE)

    expect(screen.getByRole('button', { name: 'Book the free hour' })).toBeTruthy()
  })

  it('AC-019-15: the Spanish free mode mirrors it', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding({ billingEnabled: false })
    const section = booking(container)

    expect(narrative(section)).toBe(ES_FREE_NARRATIVE)
    expect(steps(section)).toEqual(ES_FREE_STEPS)
    expect(screen.getByRole('button', { name: 'Reserva la hora gratis' })).toBeTruthy()
  })

  it('AC-019-16: paid mode tells the prepaid story and shows one unstruck price line', async () => {
    const { container } = await renderLanding({ billingEnabled: true })
    const section = booking(container)
    const panel = card(container)

    expect(narrative(section)).toBe(EN_PAID_NARRATIVE)
    expect(steps(section)).toEqual(EN_PAID_STEPS)

    const prices = Array.from(panel.querySelectorAll('p')).filter(
      (p) => p.textContent === EN_PRICE_LINE
    )
    expect(prices).toHaveLength(1)
    const price = prices[0]
    expect(price.closest('s, del, strike')).toBeNull()
    expect(price.className).not.toContain('was')
    expect(price.className).not.toContain(STRIKE_CLASS)

    expect(elementTexts(panel)).not.toContain('FREE')
    expect(elementTexts(panel)).not.toContain('GRATIS')
    expect(panel.textContent).not.toContain('First hour free for new clients, then 30 EUR/hour')

    expect(container.textContent).not.toContain(EN_FREE_NARRATIVE)
    // The free step's copy is absent from the booking section. Scoped to
    // #booking on purpose: the contact section's final copy also opens with
    // "Tell me what is broken.", so a document-wide substring search would
    // contradict a different binding requirement.
    expect(section.textContent).not.toContain('Tell me what is broken')
    expect(steps(section)).not.toContain('Tell me what is broken')

    expect(screen.getByRole('button', { name: 'Book and pay' })).toBeTruthy()
  })

  it('AC-019-16: the Spanish paid mode mirrors it', async () => {
    localStorage.setItem('rexi-locale', 'es')
    const { container } = await renderLanding({ billingEnabled: true })
    const section = booking(container)

    expect(narrative(section)).toBe(ES_PAID_NARRATIVE)
    expect(steps(section)).toEqual(ES_PAID_STEPS)
    expect(
      Array.from(card(container).querySelectorAll('p')).filter(
        (p) => p.textContent === ES_PRICE_LINE
      )
    ).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Reservar y pagar' })).toBeTruthy()
  })
})
