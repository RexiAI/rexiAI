import { useI18n } from '../i18n/I18nContext'

/**
 * `Shipped code, not slideshow` (spec 019 Task 5): a left-aligned list of
 * source links — the honesty line first, then three rows, each row one anchor.
 * The row says `View source` because the href is a repository, not a live
 * product; claiming otherwise would overstate the proof.
 * Deliberately not a logo wall: no image, no metric, no testimonial.
 */
export function Proof() {
  const { dict } = useI18n()
  return (
    <section id="proof" className="proof">
      <h2 className="section-title">{dict.proof.title}</h2>
      <p className="proof__intro">{dict.proof.intro}</p>
      <div className="proof__list">
        {dict.proof.items.map((item) => (
          <a key={item.name} className="proof__item" href={item.href}>
            <span className="proof__name">{item.name}</span>
            <span className="proof__line">{item.line}</span>
            <span className="proof__cta">{dict.proof.linkLabel} ↗</span>
          </a>
        ))}
      </div>
    </section>
  )
}
