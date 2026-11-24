import { useI18n } from '../i18n/I18nContext'

/**
 * `Clear pricing` (spec 020 Task 5): two anchored figures and one plain
 * sentence. No table, no toggle, no third number — the owner asks "how much"
 * and the answer is a setup figure and a monthly figure, each labelled with
 * what it buys.
 *
 * Each figure is one text node so `$1,200` is never split across elements and
 * reads as a number to assistive tech; the recurrence lives in the figure.
 */
export function Pricing() {
  const { dict } = useI18n()
  return (
    <section id="pricing" className="pricing">
      <h2 className="section-title">{dict.pricing.title}</h2>
      <div className="pricing-block">
        <div className="pricing-cell">
          <p className="pricing__label">{dict.pricing.setup.label}</p>
          <p className="pricing__figure">{dict.pricing.setup.figure}</p>
          <p className="pricing__note">{dict.pricing.setup.note}</p>
        </div>
        <div className="pricing-cell">
          <p className="pricing__label">{dict.pricing.monthly.label}</p>
          <p className="pricing__figure">{dict.pricing.monthly.figure}</p>
          <p className="pricing__note">{dict.pricing.monthly.note}</p>
        </div>
      </div>
      <p className="pricing__fineprint">{dict.pricing.note}</p>
    </section>
  )
}
