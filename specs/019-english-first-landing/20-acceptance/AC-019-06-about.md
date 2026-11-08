# AC-019: About block — `Who builds it`

## AC-019-13 — Identity block renders the specified fields

Given a dictionary whose `about.bio` is the empty string
When the about section (`#about`) renders
Then its `<h2>` text content is exactly `Who builds it`
And it contains the text `Daniel Bueno`
And it contains the text `Founder, RexiAI`
And it contains the paragraph `Based in Spain (Europe/Madrid). Working in English and Spanish.`
And it contains an anchor whose `href` is exactly `mailto:info@rexi-ai.com` and whose text is exactly `info@rexi-ai.com`
And it contains an anchor whose `href` is exactly `https://github.com/RexiAI` and whose text is exactly `github.com/RexiAI`
And the section contains no `img` element
And the section contains no employer, credential, years-of-experience or client-count text

Given the same section renders in Spanish
Then the `<h2>` is exactly `Quién lo construye`
And it contains `Fundador, RexiAI`
And it contains `Con base en España (Europe/Madrid). Trabajo en inglés y en español.`
And both anchors keep the same `href` values

## AC-019-14 — The bio renders only when supplied

Given a dictionary whose `about.bio` is the empty string
When the about section renders
Then no element with class `about__bio` is present
And the section renders no empty paragraph in its place

Given a dictionary whose `about.bio` is the empty string but with surrounding whitespace (`'   '`)
When the about section renders
Then no element with class `about__bio` is present

Given a dictionary whose `about.bio` is `Shipped three SaaS products before this one.`
When the about section renders
Then exactly one element with class `about__bio` is present
And its text content is exactly `Shipped three SaaS products before this one.`
And it appears after the `Daniel Bueno` / `Founder, RexiAI` lines in DOM order
