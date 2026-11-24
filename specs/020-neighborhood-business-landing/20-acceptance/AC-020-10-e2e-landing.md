# AC-020: E2E — landing journey

## AC-020-23 — Zero-import script, target URL from `REXI_E2E_SITE_URL`
Given the Vercel deployment URL is exposed in the env var `REXI_E2E_SITE_URL`
When the journey runs (`node tests/e2e/<name>.e2e.ts`)
Then the script is plain node with zero npm imports
And it loads the site from `REXI_E2E_SITE_URL`

## AC-020-24 — Exact headline/eyebrow, Miami present, Salamanca absent from hero/title
Given the built/preview site
When the journey runs
Then it asserts the exact headline `Tú me lo cuentas. Yo lo construyo.`
And it asserts the eyebrow `Apps a medida para tu negocio`
And it asserts `Miami` appears on the landing
And it asserts `Salamanca` does not appear in the hero or the document title

## AC-020-25 — `$1,200` + `$600` present, no `30 EUR`, no `SaaS`
Given the built/preview site
When the journey runs
Then it asserts `$1,200` and `$600` appear on the landing
And it asserts no `30 EUR` text appears anywhere on the landing
And it asserts no `SaaS` text appears anywhere on the landing

## AC-020-26 — Bio (Valladolid), WhatsApp href, FAQ, nav `Hablemos`
Given the built/preview site
When the journey runs
Then it asserts the About bio is present and contains `Valladolid`
And it asserts the secondary CTA href is `https://wa.me/34644409229`
And it asserts the FAQ section is present
And it asserts the nav label `Hablemos` is present

## AC-020-27 — One offer, primary CTA scrolls to `#booking`, ES/EN switch
Given the built/preview site open in Spanish
When the journey runs
Then it asserts exactly one service offer is rendered
And when it activates the primary CTA, the `#booking` section is scrolled into
  view (hash or viewport)
And when it switches to English, the document title changes to the English title
  and the hero headline changes to `You tell me. I build it.`
And when it switches back to Spanish, the document title and hero headline
  return to the Spanish values
