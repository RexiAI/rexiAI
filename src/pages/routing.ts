export function isSuccessPath(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/booking/success'
}

export function isCancelPath(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/booking/cancel'
}
