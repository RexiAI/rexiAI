import { useI18n } from '../i18n/I18nContext'

import { LanguageSwitcher } from './LanguageSwitcher'

export function NavMeta() {
  const { dict } = useI18n()
  return (
    <div className="nav-meta">
      <a href="/privacy" className="nav-link">
        {dict.nav.privacy}
      </a>
      <LanguageSwitcher />
    </div>
  )
}
