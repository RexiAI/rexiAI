import { useI18n } from '../i18n/I18nContext'

export function CancelView() {
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
