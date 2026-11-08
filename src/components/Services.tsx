import { useI18n } from '../i18n/I18nContext'

/**
 * `What I build` (spec 019 Task 4): three text-only cards in a plain grid.
 * No carousel, no arrows, no dots, no media — every card is visible at every
 * breakpoint because the grid does the work, not a scroll track.
 */
export function Services() {
  const { dict } = useI18n()
  return (
    <section id="services" className="services">
      <h2 className="section-title">{dict.services.title}</h2>
      <div className="services-grid">
        {dict.services.items.map((item) => (
          <article key={item.id} className="service-card">
            <h3 className="service-card__title">{item.title}</h3>
            <p className="service-card__desc">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
