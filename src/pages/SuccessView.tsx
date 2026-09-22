import { useI18n } from '../i18n/I18nContext'

export function SuccessView() {
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
