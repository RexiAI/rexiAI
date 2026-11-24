import { useI18n } from '../i18n/I18nContext'

/**
 * `Frequently asked questions` (spec 020 Task 7): four stacked question/answer
 * pairs, all expanded.
 *
 * Deliberately not an accordion: an owner reading on a phone should not need a
 * tap per answer to learn what happens if the app breaks, so there is no
 * `<details>`, no toggle and no `aria-expanded` control. Each question is an
 * `h3` and its answer follows in DOM order for screen readers.
 */
export function Faq() {
  const { dict } = useI18n()
  return (
    <section id="faq" className="faq">
      <h2 className="section-title">{dict.faq.title}</h2>
      <div className="faq__list">
        {dict.faq.items.map((item) => (
          <div key={item.id} className="faq__item">
            <h3 className="faq__question">{item.question}</h3>
            <p className="faq__answer">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
