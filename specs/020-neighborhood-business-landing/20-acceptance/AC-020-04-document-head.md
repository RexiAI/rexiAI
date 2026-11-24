# AC-020: Head — title/description name Miami only, es_US / en_US

## AC-020-12 — The head names the buyer and Miami only
Given `index.html` and the dictionary `head`
Then `es.head.title` and `es.head.description` together name at least one ES
  US-Spanish trade term and `Miami`
And `en.head.title` and `en.head.description` together name at least one EN trade
  term and `Miami`
And neither head names `Salamanca`
And neither head contains the three-offer enumeration, banned labels, banned
  jargon, `software`, or `Inglés Ejecutivo`

## AC-020-13 — The static head stays in sync, Spanish-first, US locale codes
Given `index.html`
Then `<title>` equals `es.head.title` byte-for-byte
And `<meta name="description">` equals `es.head.description` byte-for-byte
And `og:title`, `og:description`, `twitter:title`, `twitter:description` match
  the same title/description
And `lang="es"` and `og:locale=es_US` and `og:locale:alternate=en_US` are set
