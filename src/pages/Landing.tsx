import { BookingWidget } from '../components/BookingWidget'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useI18n } from '../i18n/I18nContext'

import { ResultViews } from './ResultViews'
import { isCancelPath, isSuccessPath } from './routing'

export function Landing() {
  const { dict } = useI18n()
  const result = isSuccessPath() || isCancelPath()
  if (result) return <ResultViews />

  return (
    <div className="landing">
      <nav className="nav">
        <div className="nav-links">
          <span className="nav-brand">RexiAI</span>
          <a href="#services" className="nav-link">
            {dict.nav.services}
          </a>
          <a href="#booking" className="nav-link">
            {dict.nav.booking}
          </a>
          <a href="#contact" className="nav-link">
            {dict.nav.contact}
          </a>
        </div>
        <LanguageSwitcher />
      </nav>

      <section id="hero" className="hero">
        <h1 className="hero-title">{dict.hero.catchphrase}</h1>
        <p className="hero-subtext">{dict.hero.subtext}</p>
        <div className="hero-ctas">
          <a href="#booking" className="hero-cta--primary">
            {dict.hero.ctaBooking} →
          </a>
          <a href="mailto:danielbueno76@gmail.com" className="hero-cta--secondary">
            {dict.hero.ctaContact}
          </a>
        </div>
      </section>

      <section id="services" className="services">
        <h2 className="section-title">{dict.services.title}</h2>
        <div className="services-grid">
          {dict.services.items.map((s, idx) => (
            <div key={s.id} className={`service-card${idx === 0 ? ' service-card--featured' : ''}`}>
              <img
                src={`https://picsum.photos/seed/rexiai-${s.id}/800/600`}
                alt={s.title}
                className="service-card__image"
              />
              <div className="service-card__body">
                <h3 className="service-card__title">{s.title}</h3>
                <p className="service-card__desc">{s.description}</p>
                <p className="service-card__meta">{s.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="booking" className="booking">
        <div>
          <h2 className="booking__title">{dict.booking.title}</h2>
          <p className="booking__narrative">{dict.booking.narrative}</p>
          <ol className="booking-steps">
            {dict.booking.steps.map((step, i) => (
              <li key={i} className="booking-steps__item">
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <BookingWidget />
        </div>
      </section>

      <section id="contact" className="contact">
        <h2 className="contact__title">{dict.contact.title}</h2>
        <p className="contact__body">{dict.contact.body}</p>
        <a href="mailto:danielbueno76@gmail.com" className="contact__cta">
          {dict.contact.cta}
        </a>
      </section>

      <footer className="footer">
        <span>RexiAI</span>
        <span>
          © {new Date().getFullYear()} RexiAI. {dict.footer.rights}.
        </span>
      </footer>
    </div>
  )
}
