import { BookingWidget } from './components/BookingWidget'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { I18nProvider, useI18n } from './i18n/I18nContext'

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
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 9999, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24 }}>✓</div>
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: '#18181B' }}>{dict.result.successTitle}</h1>
      <p style={{ fontSize: 16, color: '#52525B', maxWidth: '48ch' }}>{dict.result.successBody}</p>
      <a href="/" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 9999, background: '#18181B', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>{dict.result.successAction}</a>
    </div>
  )
}

function CancelView() {
  const { dict } = useI18n()
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 9999, background: '#E4E4E7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#18181B', fontSize: 24 }}>↺</div>
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: '#18181B' }}>{dict.result.cancelTitle}</h1>
      <p style={{ fontSize: 16, color: '#52525B', maxWidth: '48ch' }}>{dict.result.cancelBody}</p>
      <a href="/#booking" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 9999, background: '#18181B', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>{dict.result.cancelAction}</a>
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
    <div style={{ fontFamily: 'Geist, system-ui, sans-serif', color: '#18181B', background: '#FFFFFF' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', maxHeight: 72, borderBottom: '1px solid #E4E4E7', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>RexiAI</span>
          <a href="#services" style={{ fontSize: 14, color: '#52525B', textDecoration: 'none' }}>{dict.nav.services}</a>
          <a href="#booking" style={{ fontSize: 14, color: '#52525B', textDecoration: 'none' }}>{dict.nav.booking}</a>
          <a href="#contact" style={{ fontSize: 14, color: '#52525B', textDecoration: 'none' }}>{dict.nav.contact}</a>
        </div>
        <LanguageSwitcher />
      </nav>

      <section id="hero" style={{ textAlign: 'center', padding: '80px 24px 64px', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>{dict.hero.catchphrase}</h1>
        <p style={{ fontSize: 18, color: '#52525B', maxWidth: '60ch', margin: '0 auto 24px' }}>{dict.hero.subtext}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a href="#booking" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 9999, background: '#18181B', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>{dict.hero.ctaBooking} →</a>
          <a href="mailto:danielbueno76@gmail.com" style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', borderRadius: 9999, border: '1px solid #E4E4E7', color: '#18181B', textDecoration: 'none', fontWeight: 500 }}>{dict.hero.ctaContact}</a>
        </div>
      </section>

      <section id="services" style={{ padding: '48px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>{dict.services.title}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
          {dict.services.items.map((s, idx) => (
            <div
              key={s.id}
              style={{
                gridColumn: idx === 0 ? '1 / span 2' : undefined,
                background: '#FAFAFA',
                borderRadius: 16,
                overflow: 'hidden',
                padding: 0,
              }}
            >
              <img src={`https://picsum.photos/seed/rexiai-${s.id}/800/600`} alt={s.title} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
              <div style={{ padding: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: '#52525B', maxWidth: '60ch', marginBottom: 8 }}>{s.description}</p>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#71717A' }}>{s.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="booking" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, padding: '48px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>{dict.booking.title}</h2>
          <p style={{ fontSize: 16, color: '#52525B', marginBottom: 16 }}>{dict.booking.narrative}</p>
          <ol style={{ paddingLeft: 20, color: '#52525B', fontSize: 14 }}>
            {dict.booking.steps.map((step, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <BookingWidget />
        </div>
      </section>

      <section id="contact" style={{ background: '#FAFAFA', textAlign: 'center', padding: '56px 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>{dict.contact.title}</h2>
        <p style={{ fontSize: 16, color: '#52525B', marginBottom: 20 }}>{dict.contact.body}</p>
        <a
          href="mailto:danielbueno76@gmail.com"
          style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 9999, background: '#18181B', color: '#fff', textDecoration: 'none', fontWeight: 600 }}
        >
          {dict.contact.cta}
        </a>
      </section>

      <footer style={{ padding: '24px', borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#52525B' }}>
        <span>RexiAI</span>
        <span>© {new Date().getFullYear()} RexiAI. {dict.footer.rights}.</span>
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
