import { BookingWidget } from './components/BookingWidget'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { I18nProvider, useI18n } from './i18n/I18nContext'
import './App.css'

function isSuccessPath(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/booking/success'
}
function isCancelPath(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/booking/cancel'
}

function SuccessView() {
  const { dict } = useI18n()
  return (
    <div className="result-view">
      <div className="result-icon result-icon--success">✓</div>
      <h1 className="result-title">{dict.result.successTitle}</h1>
      <p className="result-body">{dict.result.successBody}</p>
      <a href="/" className="result-action">
        {dict.result.successAction}
      </a>
    </div>
  )
}

function CancelView() {
  const { dict } = useI18n()
  return (
    <div className="result-view">
      <div className="result-icon result-icon--cancel">↺</div>
      <h1 className="result-title">{dict.result.cancelTitle}</h1>
      <p className="result-body">{dict.result.cancelBody}</p>
      <a href="/#booking" className="result-action">
        {dict.result.cancelAction}
      </a>
    </div>
  )
}

function ResultViews() {
  if (isSuccessPath()) return <SuccessView />
  if (isCancelPath()) return <CancelView />
  return null
}

function Landing() {
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

function App() {
  return (
    <I18nProvider>
      <Landing />
    </I18nProvider>
  )
}

export default App
