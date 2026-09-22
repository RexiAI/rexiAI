import { useI18n } from '../i18n/I18nContext'

function LangButton({
  active,
  label,
  ariaLabel,
  onClick,
}: {
  active: boolean
  label: string
  ariaLabel: string
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`lang-btn${active ? ' lang-btn--active' : ''}`}
    >
      {label}
    </button>
  )
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  return (
    <div role="group" aria-label="Language switcher" className="lang-switcher">
      <LangButton
        active={locale === 'es'}
        label="ES"
        ariaLabel="Español"
        onClick={() => setLocale('es')}
      />
      <LangButton
        active={locale === 'en'}
        label="EN"
        ariaLabel="English"
        onClick={() => setLocale('en')}
      />
    </div>
  )
}
