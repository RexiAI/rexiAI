import type { MouseEvent } from 'react'

import { About } from '../components/About'
import { BookingWidget } from '../components/BookingWidget'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Proof } from '../components/Proof'
import { Services } from '../components/Services'
import { useSiteConfig } from '../hooks/useSiteConfig'
import { useI18n } from '../i18n/I18nContext'

import { ResultViews } from './ResultViews'
import { isCancelPath, isSuccessPath } from './routing'

export function Landing() {
  const { dict } = useI18n()
  const { billingEnabled } = useSiteConfig()
  const result = isSuccessPath() || isCancelPath()
  if (result) return <ResultViews />

  // The nav only renders on the home view, so a brand click never needs a real
  // navigation — smooth-scroll back to the top instead of a full page reload.
  function handleBrandClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // One money story per mode (spec 019 Task 7): the same `billingEnabled` the
  // booking card consumes decides both the narrative and the step list, so the
  // section can never describe one mode while the card books the other.
  const narrative = billingEnabled ? dict.booking.narrativePaid : dict.booking.narrativeFree
  const steps = billingEnabled ? dict.booking.stepsPaid : dict.booking.stepsFree

  return (
    <div className="landing">
      <nav className="nav">
        <div className="nav-links">
          <a href="/" className="nav-brand" onClick={handleBrandClick}>
            <img className="nav-brand__logo" src="/logo.png" alt="" />
            RexiAI
          </a>
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
          <a href={`mailto:${dict.contact.email}`} className="hero-cta--secondary">
            {dict.hero.ctaContact}
          </a>
        </div>
        <p className="hero-cta-microcopy">{dict.hero.ctaMicrocopy}</p>
      </section>

      <Services />

      <Proof />

      <About dict={dict} />

      <section id="booking" className="booking">
        <div>
          <h2 className="booking__title">{dict.booking.title}</h2>
          <p className="booking__narrative">{narrative}</p>
          <ol className="booking-steps">
            {steps.map((step, i) => (
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
        <a href={`mailto:${dict.contact.email}`} className="contact__cta">
          {dict.contact.cta}
        </a>
      </section>

      <footer className="footer">
        <span>RexiAI</span>
        <span>
          © {new Date().getFullYear()} RexiAI. {dict.footer.rights}.{' '}
          <a href="/privacy" className="footer__link">
            {dict.footer.privacy}
          </a>
        </span>
      </footer>
    </div>
  )
}
