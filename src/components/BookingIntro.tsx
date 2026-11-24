import { useSiteConfig } from '../hooks/useSiteConfig'
import { useI18n } from '../i18n/I18nContext'

import { BookingSteps } from './BookingSteps'

export function BookingIntro() {
  const { dict } = useI18n()
  const { ready } = useSiteConfig()
  if (ready) return <BookingSteps />
  return (
    <p className="booking__pending" role="status">
      {dict.booking.pending}
    </p>
  )
}
