# Branded reschedule page (`deploy/reschedule/index.html`)

The page a client opens from the reschedule link in their booking email (spec 007
Task 8). One self-contained HTML document: inline styles, no framework, no
webfont, no icons, no external request other than the page's own two API calls.

## URL contract

```
https://meet.rexi-ai.com/reschedule/<64 lowercase hex>?lang=es|en
```

- exactly one path segment after `/reschedule/`, the opaque token
  (`/^[0-9a-f]{64}$/`); a trailing slash is tolerated, anything else is the
  invalid state and makes **no API request at all`;
- the token identifies the booking and is rotated on every successful reschedule,
  so an old link, a truncated link and a guessed token all land on the same
  invalid state;
- exactly one query parameter, `lang`, whose only values are `es` and `en`
  (anything else, including absent or empty, renders Spanish). The parameter is
  never forwarded: no `href`, `mailto:` or storage call carries the token, and the
  address bar is not rewritten after a move.

## Hosting contract (not implemented here — hosting's job)

- A valid token path must serve **this document**, never the marketing SPA and
  never a 404. `vercel.json` rewrites `/(.*)` to `/index.html`; a branded host that
  inherits that rewrite would show the homepage instead of the form. `?lang=` must
  survive the rewrite. Verify behaviourally: request the page with `?lang=en` and
  confirm the English section comes back.
- **`/api/*` must be same-origin on `meet.rexi-ai.com`.** The page calls relative
  `/api/reschedule` and `/api/availability`. The branded host and the API are
  separate deployments, so either the branded host proxies `/api/*` to the API
  deployment or this page is served from the API host. Do not "fix" this in the
  page with an absolute API host or CORS: a second host inside a
  capability-bearing page is a trust regression.
- The document itself can be cached publicly (it is token-agnostic; the token is
  read client-side). `/api/reschedule` responses must not be: they carry
  `Cache-Control: no-store` at the API layer.
- The token reaches the branded host's access log through the resolve request
  line. Scrubbing those logs is an ops task, not a code change (decision D6).
- TLS, a valid certificate and an HTTPS response are launch blockers, for the same
  reason the join interstitial states it.

## Constraints that are easy to regress

- No timers and no motion: no `setTimeout`, no `setInterval`, no `@keyframes`, no
  `transition`, no spinner. Both fetches carry `AbortSignal.timeout(12000)` so a
  bad connection cannot sit on the loading state forever.
- No automatic navigation and no history rewriting: no `location.reload`,
  `location.replace`, `history.pushState`. After a move the address bar keeps the
  URL the client arrived on.
- No storage of any kind: no `localStorage`, `sessionStorage`, cookie or IndexedDB.
- No `Accept-Language` and no `navigator.language`: `?lang=` alone selects the
  language.
- No markup injection: every dynamic value is written with `textContent`.
- Both locale sections ship for every state (16 sections) plus the `<noscript>`
  block, which carries both languages because with JavaScript off the page cannot
  read `?lang=`.
- The success state renders the new slot and nothing else: no join URL, no booking
  id, no client email, no old slot. A screenshot of the page must not identify the
  booking.
