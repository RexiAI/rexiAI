import { useI18n } from '../i18n/I18nContext'

export function ContactSection() {
  const { dict } = useI18n()
  return (
    <section id="contact" className="contact">
      <h2 className="contact__title">{dict.contact.title}</h2>
      <p className="contact__body">{dict.contact.body}</p>
      <a href={`mailto:${dict.contact.email}`} className="contact__cta">
        {dict.contact.cta}
      </a>
    </section>
  )
}
