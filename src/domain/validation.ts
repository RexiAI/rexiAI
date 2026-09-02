// Conservative RFC-pragmatic shape. Deliberately rejects < > " ' ( ) , ; and
// backslash — those are legal only in quoted-local-form addresses nobody books
// with, and they are exactly what turns an address into live HTML downstream.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const EMAIL_MAX_LENGTH = 254

export function isValidEmail(email: string): boolean {
  if (email.length > EMAIL_MAX_LENGTH) return false
  return EMAIL_RE.test(email)
}

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return false
  // ensure round-trip matches (avoid 2027-02-30 etc)
  const iso = d.toISOString().slice(0, 10)
  return iso === s
}

export function isValidTimeStr(s: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(s)
}
