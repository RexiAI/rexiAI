import { useI18n } from '../i18n/I18nContext'

export function Hero() {
  const { dict } = useI18n()
  return (
    <section id="hero" className="hero">
      <p className="hero-eyebrow">{dict.hero.eyebrow}</p>
      <h1 className="hero-title">{dict.hero.headline}</h1>
      <p className="hero-subtext">{dict.hero.subtext}</p>
      <div className="hero-ctas">
        <a href="#booking" className="hero-cta--primary">
          {dict.hero.ctaBooking}
        </a>
        <a href={dict.hero.whatsappUrl} className="hero-cta--secondary">
          {dict.hero.ctaWhatsApp}
        </a>
      </div>
    </section>
  )
}
