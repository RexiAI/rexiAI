# Branded join interstitial (`deploy/join/index.html`)

The page a client lands on after tapping the join link in their booking email
(spec 006 Task 1). One self-contained HTML document: inline styles, no framework,
no webfont, no icons, no external request other than the navigation the visitor
chooses.

## URL contract

```
https://meet.rexi-ai.com/rexi-<16 lowercase hex>?lang=es|en
```

- exactly one path segment (`rexi-<16 hex>`), which is also the Jitsi room;
- exactly one query parameter, `lang`, whose only values are `es` and `en`
  (anything else, including absent or empty, renders Spanish);
- no fragment, no credentials, no port, no IP literal, `https` only;
- the page's own action links to `https://meet.jit.si/<room>` with **no query
  string**: `?lang=` is the page's concern and is never forwarded to Jitsi. The
  room identity the recording pipeline derives (`pipeline.mjs` `deriveRoom`) is
  therefore unaffected.

## Hosting contract (not implemented here — hosting's job)

- A valid room path must serve **this document**, never the marketing SPA and
  never a 404. The SPA's `vercel.json` rewrites `/(.*)` to `/index.html`; a
  branded host that inherits that rewrite would show the homepage instead of the
  room.
- The `lang` query string must survive the rewrite. Verify behaviourally, not by
  reading config: request the page with `?lang=en` and confirm the English column
  comes back.
- TLS, a valid certificate, and an HTTPS response are launch blockers: a
  certificate warning or a plain-HTTP page on this domain is exactly the phishing
  signal the page exists to remove.

## Constraints that are easy to regress

- No automatic navigation of any kind: no timer, no `meta refresh`, no
  `location.replace`, no countdown. The visitor taps the button or nothing happens
  (`10-tasks.md` decision 8).
- No `Accept-Language` sniffing, no cookie, no stored preference, no locale path
  segment. `?lang=` alone selects the language.
- No analytics, fonts, or images: each is an extra request in the three seconds
  this page is judged on.
- Both locale columns ship in the same document; the synchronous inline script
  reveals exactly one of them before the first paint.
