import { Analytics } from '@vercel/analytics/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App.tsx'

// Cookieless Web Analytics (Vercel's own — no cookie, no device storage, so no
// consent banner). This is the only source of truth for whether anyone reaches
// the page and where they came from; without it the free/paid flip is
// unmeasurable. It no-ops outside a Vercel deployment, so dev and tests are
// unaffected. Web Analytics must also be enabled for the project in the Vercel
// dashboard, or the endpoint it posts to collects nothing.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>
)
