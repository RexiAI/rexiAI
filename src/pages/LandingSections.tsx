import { About } from '../components/About'
import { BookingSection } from '../components/BookingSection'
import { ContactSection } from '../components/ContactSection'
import { Faq } from '../components/Faq'
import { Hero } from '../components/Hero'
import { Pricing } from '../components/Pricing'
import { Proof } from '../components/Proof'
import { Services } from '../components/Services'
import { useI18n } from '../i18n/I18nContext'

export function LandingSections() {
  const { dict } = useI18n()
  return (
    <main id="main">
      <Hero />
      <Services />
      <Pricing />
      <Proof />
      <About dict={dict} />
      <BookingSection />
      <Faq />
      <ContactSection />
    </main>
  )
}
