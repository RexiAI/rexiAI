# AC-019: Document head metadata

## AC-019-19 — Title, description and document language are exact

Given the built `index.html` source file
When its `<html>` element is read
Then the `lang` attribute is exactly `en`

Given the same file
When its `<title>` element is read
Then its text is exactly `RexiAI — fixed-price software for teams stuck on spreadsheets`

Given the same file
When its `<meta name="description">` is read
Then its `content` attribute is exactly `I replace the spreadsheet your business depends on with software that runs itself. Fixed price, scoped in one call, shipped in weeks. First hour free.`

Given the same file
Then the `<meta charset>`, the favicon link, the viewport meta, the `#root` element and the `/src/main.tsx` module script are all still present
And no `<meta name="robots">`, no JSON-LD script and no analytics snippet has been added

## AC-019-20 — Open Graph, Twitter, canonical and hreflang are exact

Given `index.html`
When its Open Graph tags are read
Then `og:type` is exactly `website`
And `og:title` is exactly `RexiAI — fixed-price software for teams stuck on spreadsheets`
And `og:description` is exactly `I replace the spreadsheet your business depends on with software that runs itself. Fixed price, scoped in one call, shipped in weeks. First hour free.`
And `og:url` is exactly `https://www.rexi-ai.com/`
And `og:site_name` is exactly `RexiAI`
And `og:locale` is exactly `en_GB`
And `og:locale:alternate` is exactly `es_ES`
And `og:image` is exactly `/logo.png`

Given the same file
When its Twitter tags are read
Then `twitter:card` is exactly `summary_large_image`
And `twitter:title` is exactly the `<title>` text
And `twitter:description` is exactly the `<meta name="description">` content

Given the same file
Then `<link rel="canonical" href="https://www.rexi-ai.com/">` is present with that exact `href`
And `<link rel="alternate" hreflang="x-default" href="https://www.rexi-ai.com/">` is present with that exact `href`
And no `hreflang` value other than `x-default` is present
And `og:title`, `og:description`, `twitter:title` and `twitter:description` are byte-identical to the `title` and `description` values above (same em dash, same trailing full stop)
