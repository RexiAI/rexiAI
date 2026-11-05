/// <reference types="vite/client" />

// Vite inlines only VITE_-prefixed vars into the SPA bundle. These four carry
// the data-controller identity printed on /privacy (LSSI-CE art. 10, RGPD
// art. 13). They are public by nature — the page renders them — so they are
// deployment config, not secrets: kept out of git because a NIF and a private
// address are the controller's own personal data, not because they grant
// access to anything.
interface ImportMetaEnv {
  readonly VITE_LEGAL_NAME?: string
  readonly VITE_LEGAL_NIF?: string
  readonly VITE_LEGAL_ADDRESS?: string
  readonly VITE_LEGAL_EMAIL?: string
}
