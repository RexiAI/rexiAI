# AC-020: Locale parity — retire the old offer and rejected labels

## AC-020-21 — Identical shape, retired offer ids gone
Given the `es` and `en` dictionaries
Then they have identical structural shape
And `saas-products` and `websites-and-apps` appear in neither locale
And no dictionary string contains `SaaS`, `productos saas`, `webs y aplicaciones`,
  or `websites and apps`

## AC-020-22 — Rejected labels, `software`, `fontaner`, `Inglés Ejecutivo` gone; ES primary
Given `index.html`, the dictionaries, and the rendered landing
Then no string in either locale contains `negocios de barrio` or `pymes de barrio`
And no product-copy string contains `software`
And no ES string uses `fontaner` (it uses `plomer`)
And no string contains `Inglés Ejecutivo`
And the site opens Spanish-first (default locale `es`, `og:locale=es_US`,
  `og:locale:alternate=en_US`)
