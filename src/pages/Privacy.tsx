import { useEffect } from 'react'

import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { SkipLink } from '../components/SkipLink'
import { privacy, type PrivacySection } from '../content/privacy'
import { useI18n } from '../i18n/I18nContext'

import './Privacy.css'

function SectionView({ section }: { section: PrivacySection }) {
  return (
    <section className="privacy__section" id={section.id}>
      <h2 className="privacy__heading">{section.heading}</h2>
      {section.paragraphs?.map((text, i) => (
        <p key={`p-${i}`} className="privacy__text">
          {text}
        </p>
      ))}
      {section.list && (
        <ul className="privacy__list">
          {section.list.map((item, i) => (
            <li key={`li-${i}`}>{item}</li>
          ))}
        </ul>
      )}
      {section.table && (
        <div className="privacy__table-wrap">
          <table className="privacy__table">
            <thead>
              <tr>
                {section.table.headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => (
                    <td key={cell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function Privacy() {
  const { locale, dict } = useI18n()
  const doc = privacy[locale]

  useEffect(() => {
    document.title = `${doc.title} · RexiAI`
    return () => {
      document.title = 'RexiAI'
    }
  }, [doc.title])

  return (
    <div className="privacy">
      <SkipLink />
      <nav className="nav">
        <div className="nav-links">
          <a href="/" className="nav-brand">
            <img className="nav-brand__logo" src="/logo.png" alt="" />
            RexiAI
          </a>
        </div>
        <LanguageSwitcher />
      </nav>

      <main id="main" className="privacy__main">
        <h1 className="privacy__title">{doc.title}</h1>
        <p className="privacy__updated">{doc.updated}</p>
        {doc.intro.map((text, i) => (
          <p key={`intro-${i}`} className="privacy__text privacy__text--lead">
            {text}
          </p>
        ))}
        {doc.sections.map((section) => (
          <SectionView key={section.id} section={section} />
        ))}
        <a className="privacy__back" href="/">
          ← {doc.backHome}
        </a>
      </main>

      <footer className="footer">
        <span>RexiAI</span>
        <span>
          © {new Date().getFullYear()} RexiAI. {dict.footer.rights}.
        </span>
      </footer>
    </div>
  )
}
