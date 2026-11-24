import { useI18n } from '../i18n/I18nContext'

import { BookingIntro } from './BookingIntro'
import { BookingWidget } from './BookingWidget'

export function BookingSection() {
  const { dict } = useI18n()
  return (
    <section id="booking" className="booking">
      <div>
        <h2 className="booking__title">{dict.booking.title}</h2>
        <BookingIntro />
      </div>
      <div>
        <BookingWidget />
      </div>
    </section>
  )
}
