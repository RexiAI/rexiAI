# AC-002: Landing page content sections

## AC-002-01 — Hero displays localized catchphrase
Given the landing page is rendered
When the hero section is examined
Then it displays the catchphrase string defined for the active locale's dictionary

## AC-002-02 — Services section lists exactly four services
Given the landing page is rendered in any active locale
When the services section is examined
Then exactly four service cards are shown: SaaS products, websites, apps, consulting —
each with a title and description taken from the active locale's dictionary

## AC-002-03 — Contact CTA is a mailto link
Given the landing page is rendered in any active locale
When the contact section is examined
Then it contains a prominent link whose `href` is `mailto:danielbueno76@gmail.com`
with a label from the active locale's dictionary

## AC-002-04 — Page structure has the four main sections
Given the new landing page replaces the previous one-pager (`src/App.tsx`)
When the rendered DOM is examined
Then sections for hero, services, booking, and contact are present with stable anchor ids
(`#services`, `#booking`, `#contact` plus the hero), and the old capabilities/repos
sections are gone
