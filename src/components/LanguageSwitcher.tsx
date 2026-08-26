import { useI18n } from '../i18n/I18nContext'

function buttonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 12px',
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    background: active ? '#18181B' : 'transparent',
    color: active ? '#fff' : '#18181B',
    fontSize: 13,
    fontWeight: 500,
  }
}

function LangButton({ active, label, ariaLabel, onClick }: { active: boolean; label: string; ariaLabel: string; onClick: () => void }) {
  return (
    <button aria-pressed={active} aria-label={ariaLabel} onClick={onClick} style={buttonStyle(active)}>
      {label}
    </button>
  )
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  return (
    <div role="group" aria-label="Language switcher" style={{ display: 'inline-flex', border: '1px solid #E4E4E7', borderRadius: '9999px', overflow: 'hidden', padding: 2 }}>
      <LangButton active={locale === 'es'} label="ES" ariaLabel="Español" onClick={() => setLocale('es')} />
      <LangButton active={locale === 'en'} label="EN" ariaLabel="English" onClick={() => setLocale('en')} />
    </div>
  )
}
