// Data-controller identity printed on /privacy (LSSI-CE art. 10, RGPD art. 13).
//
// The values are deployment config, read from VITE_LEGAL_* env vars so the
// identity never has to be edited into source. Vite inlines them at BUILD time,
// which means production needs the same four vars in the Vercel project — a
// build without them renders the «…» placeholder, which is visibly wrong rather
// than silently wrong.
//
// They are not secrets: every one of them is displayed on a public page. They
// stay out of git because the controller's own NIF and address are personal
// data, not because they unlock anything.

export interface LegalEntity {
  name: string
  nif: string
  address: string
  email: string
}

/** Rendered verbatim when a var is unset, so an unfilled field is obvious. */
const PLACEHOLDER = {
  name: '«NOMBRE Y APELLIDOS»',
  nif: '«NIF»',
  address: '«DIRECCIÓN FISCAL COMPLETA»',
} as const

/**
 * The contact address already published on the landing page, used when
 * VITE_LEGAL_EMAIL is unset. A placeholder here would leave data-subject rights
 * requests with nowhere to go, which is worse than a non-ideal mailbox.
 */
const DEFAULT_EMAIL = 'info@rexi-ai.com'

function env(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

export const LEGAL_ENTITY: LegalEntity = {
  name: env(import.meta.env.VITE_LEGAL_NAME, PLACEHOLDER.name),
  nif: env(import.meta.env.VITE_LEGAL_NIF, PLACEHOLDER.nif),
  address: env(import.meta.env.VITE_LEGAL_ADDRESS, PLACEHOLDER.address),
  email: env(import.meta.env.VITE_LEGAL_EMAIL, DEFAULT_EMAIL),
}
