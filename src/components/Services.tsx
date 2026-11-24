import type { Dictionary } from '../i18n/dictionary'
import { useI18n } from '../i18n/I18nContext'

type ServiceExample = Dictionary['services']['examples'][number]

/**
 * One before-to-after row: the trade leads, then the two cells.
 *
 * The arrow is a glyph (`aria-hidden`) and each cell carries a visible
 * `antes`/`después` (EN `before`/`after`) label, so the relationship is
 * announced rather than drawn.
 */
function ExampleRow({
  example,
  beforeLabel,
  afterLabel,
}: {
  example: ServiceExample
  beforeLabel: string
  afterLabel: string
}) {
  return (
    <li className="example-row">
      <h3 className="example-row__trade">{example.trade}</h3>
      <p className="example-row__pair">
        <span className="example-row__cell example-row__cell--before">
          <span className="example-row__label">{beforeLabel}</span>
          <span className="example-row__text">{example.before}</span>
        </span>
        <span className="example-row__arrow" aria-hidden="true">
          →
        </span>
        <span className="example-row__cell example-row__cell--after">
          <span className="example-row__label">{afterLabel}</span>
          <span className="example-row__text">{example.after}</span>
        </span>
      </p>
    </li>
  )
}

/**
 * `What I build` (spec 020 Task 2): one offer card, then four stacked
 * before-to-after example rows in the buyer's own trades.
 *
 * The rows are examples, not client cases: no name, logo, metric or
 * testimonial belongs here, which is why the section is plain text.
 */
export function Services() {
  const { dict } = useI18n()
  return (
    <section id="services" className="services">
      <h2 className="section-title">{dict.services.title}</h2>
      <article className="offer-card">
        <h3 className="offer-card__title">{dict.services.offer.title}</h3>
        <p className="offer-card__desc">{dict.services.offer.description}</p>
      </article>
      <ol className="examples">
        {dict.services.examples.map((example) => (
          <ExampleRow
            key={example.id}
            example={example}
            beforeLabel={dict.services.beforeLabel}
            afterLabel={dict.services.afterLabel}
          />
        ))}
      </ol>
    </section>
  )
}
