import { useI18n } from '../i18n/I18nContext'

/** First focusable element: jumps keyboard users past the repeated nav. */
export function SkipLink() {
  const { dict } = useI18n()
  return (
    <a className="skip-link" href="#main">
      {dict.a11y.skipToContent}
    </a>
  )
}
