import { useI18n } from '../i18n/I18nContext'

export function Footer() {
  const { dict } = useI18n()
  return (
    <footer className="footer">
      <span>RexiAI</span>
      <span>
        © {new Date().getFullYear()} RexiAI. {dict.footer.rights}.{' '}
        <a href="/privacy" className="footer__link">
          {dict.footer.privacy}
        </a>
      </span>
    </footer>
  )
}
