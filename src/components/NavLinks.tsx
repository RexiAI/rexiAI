import type { MouseEvent } from 'react'

import { useI18n } from '../i18n/I18nContext'

// The nav only renders on the home view, so a brand click never needs a real
// navigation — smooth-scroll back to the top instead of a full page reload.
function handleBrandClick(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function NavBrand() {
  return (
    <a href="/" className="nav-brand" onClick={handleBrandClick}>
      <img className="nav-brand__logo" src="/logo.png" alt="" />
      RexiAI
    </a>
  )
}

export function NavLinks() {
  const { nav } = useI18n().dict
  return (
    <div className="nav-links">
      <NavBrand />
      <a href="#services" className="nav-link">
        {nav.services}
      </a>
      <a href="#booking" className="nav-link">
        {nav.booking}
      </a>
      <a href="#contact" className="nav-link">
        {nav.contact}
      </a>
    </div>
  )
}
