export function isSuccessPath(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/booking/success'
}

// `/privacidad` is accepted as well: the site is Spanish-first and the page is
// linked from the footer, so a Spanish-language link must not 404 into the
// landing page.
//
// `pathname` is read defensively: some tests swap `window.location` for a plain
// `{ href }` stub to prove "no navigation", and that stub has no pathname. A
// missing pathname means "not the privacy page", never a throw.
export function isPrivacyPath(): boolean {
  if (typeof window === 'undefined') return false
  const pathname = window.location?.pathname
  if (typeof pathname !== 'string') return false
  const path = pathname.replace(/\/+$/, '')
  return path === '/privacy' || path === '/privacidad'
}

export function isCancelPath(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/booking/cancel'
}
