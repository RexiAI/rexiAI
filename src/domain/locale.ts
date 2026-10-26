// The one locale vocabulary the booking flow shares (spec 006 Task 8). The SPA
// already has `type Locale = 'es' | 'en'` in src/i18n/dictionary.ts; this module
// is the API-side twin so normalisation is defined once and never re-derived.
//
// Rule (AC-006-29/35): only the exact string 'en' selects English. Everything
// else — 'es', an absent field, null, '', 'EN', 'fr' — is Spanish. Normalisation
// never throws and never rejects a booking: a locale is a presentation hint.

export type Locale = 'es' | 'en'

export const DEFAULT_LOCALE: Locale = 'es'

export function normalizeLocale(raw: unknown): Locale {
  return raw === 'en' ? 'en' : DEFAULT_LOCALE
}
