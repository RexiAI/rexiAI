import { BookingWidget } from '../components/BookingWidget'
import { FreeModeBanner } from '../components/FreeModeBanner'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ServicesCarousel } from '../components/ServicesCarousel'
import { useSiteConfig } from '../hooks/useSiteConfig'
import { useI18n } from '../i18n/I18nContext'

import { ResultViews } from './ResultViews'
import { isCancelPath, isSuccessPath } from './routing'

export function Landing() {
  const { dict } = useI18n()
  const { billingEnabled } = useSiteConfig()
  const result = isSuccessPath() || isCancelPath()
  if (result) return <ResultViews />

  return (
    <div className="landing">
      {!billingEnabled && <FreeModeBanner dict={dict} />}
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

      <ServicesCarousel />

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
