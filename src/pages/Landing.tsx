import { useEffect } from 'react'

import { Footer } from '../components/Footer'
import { Nav } from '../components/Nav'
import { SkipLink } from '../components/SkipLink'
import { applyDocumentHead } from '../i18n/documentHead'
import { useI18n } from '../i18n/I18nContext'

import { LandingSections } from './LandingSections'
import { ResultViews } from './ResultViews'
import { isCancelPath, isSuccessPath } from './routing'

export function Landing() {
  const { dict } = useI18n()

  // A client-side language switch changes visible copy, so it must change the
  // tab title and share metadata too.
  useEffect(() => {
    applyDocumentHead(dict.head)
  }, [dict])

  if (isSuccessPath() || isCancelPath()) return <ResultViews />

  return (
    <div className="landing">
      <SkipLink />
      <Nav />
      <LandingSections />
      <Footer />
    </div>
  )
}
