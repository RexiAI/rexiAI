import type { Dictionary } from './dictionary'

type Head = Dictionary['head']

function setMeta(attribute: 'name' | 'property', key: string, content: string): void {
  const element = document.querySelector(`meta[${attribute}="${key}"]`)
  if (element) element.setAttribute('content', content)
}

/**
 * Keep the document head in sync with the active locale.
 *
 * `index.html` is the Spanish-first static head a crawler sees; this updates the
 * title, description, and Open Graph/Twitter tags after a client-side language
 * switch so an English reader does not get a Spanish tab or share card.
 *
 * Social crawlers do not execute JavaScript, so this is a runtime fix for
 * readers, not a substitute for separate indexed language URLs.
 */
export function applyDocumentHead(head: Head): void {
  if (typeof document === 'undefined') return
  document.title = head.title
  setMeta('name', 'description', head.description)
  setMeta('property', 'og:title', head.title)
  setMeta('property', 'og:description', head.description)
  setMeta('property', 'og:locale', head.locale)
  setMeta('property', 'og:locale:alternate', head.alternate)
  setMeta('name', 'twitter:title', head.title)
  setMeta('name', 'twitter:description', head.description)
}
