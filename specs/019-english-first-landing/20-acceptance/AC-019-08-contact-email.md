# AC-019: Contact email replacement

## AC-019-17 — No occurrence of the old mailbox remains in src/

Given the source tree under `src/`
When every file is searched for the string `danielbueno76`
Then there are zero matches (including `src/i18n/dictionary.ts`,
`src/pages/Landing.tsx`, `src/content/legalEntity.ts` and every test file)
And `src/i18n/dictionary.ts` holds `contact.email === 'info@rexi-ai.com'` for both `es` and `en`
And `src/content/legalEntity.ts`'s default email constant is `'info@rexi-ai.com'`
And no other email address appears in either dictionary

## AC-019-18 — Every visible mailto points at the new address

Given `VITE_LEGAL_EMAIL` is unset
When `LEGAL_ENTITY` is read
Then `LEGAL_ENTITY.email` is exactly `info@rexi-ai.com`

Given `VITE_LEGAL_EMAIL` is `  legal@example.com  `
When `LEGAL_ENTITY` is read
Then `LEGAL_ENTITY.email` is exactly `legal@example.com` (trimmed, unchanged behaviour)

Given the landing page renders in English
When the hero secondary CTA is read
Then its `href` is exactly `mailto:info@rexi-ai.com`
When the contact section's CTA is read
Then its `href` is exactly `mailto:info@rexi-ai.com`

Given the landing page renders in Spanish
Then both CTAs' `href` values are exactly `mailto:info@rexi-ai.com`

Given the dictionary's `contact.email` is changed to `other@example.com` in a test build
Then both anchors' `href` values become `mailto:other@example.com` (the address is read from the dictionary, never duplicated as a JSX literal)
