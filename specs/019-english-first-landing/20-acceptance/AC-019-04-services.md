# AC-019: `What I build` — three cards, carousel removed

## AC-019-09 — The section is retitled and carries exactly three problem-first cards

Given the landing page renders in English
When the services section (`#services`) is read
Then its `<h2>` text content is exactly `What I build`
And it contains exactly three `article.service-card` elements, in this order:
And card 1's title is exactly `Internal tools` and its line is exactly `The process living in three spreadsheets and one person's head, rebuilt as one tool your team actually opens.`
And card 2's title is exactly `SaaS products` and its line is exactly `If the thing you need does not exist, I build v1: auth, billing, deploys, the boring parts done properly.`
And card 3's title is exactly `Websites and apps` and its line is exactly `Fast, clear, and it converts. No page builder, no template.`
And no card contains the text `SaaS · Product`, `Web · Frontend`, `App · Mobile` or `Consulting · Strategy`
And no card contains an `img` or `svg` element

Given the landing page renders in Spanish
Then the `<h2>` is exactly `Lo que construyo`
And the three card titles are, in order, `Herramientas internas`, `Productos SaaS`, `Webs y aplicaciones`
And the three card lines are, in order: `El proceso que vive en tres hojas de cálculo y en la cabeza de una persona, reconstruido como una sola herramienta que tu equipo abre de verdad.`, `Si lo que necesitas no existe, construyo la v1: autenticación, facturación, despliegues, las partes aburridas bien hechas.`, `Rápidas, claras y convierten. Sin page builders, sin plantillas.`

## AC-019-10 — The carousel is gone; all three cards render at every breakpoint

Given viewport width 375, then 768, then 1440
When the landing page renders at each width
Then the services section contains exactly three `article.service-card` elements at every width
And three distinct card titles are present in the document at every width (no card is hidden by a scroll track)
And no card-carrying container has an inline `overflow-x` of `auto` or `scroll`

Given the services section in any mode and at any width
Then it contains zero `button` elements
And it contains no element whose class contains `carousel`
And it contains no element with an `aria-roledescription` attribute
And neither locale's `dict.services` has `carouselPrev`, `carouselNext`, `carouselPosition` or `carouselRole`
And no `service-card__meta` element renders

Given the source tree
Then `src/components/ServicesCarousel.tsx` and `src/components/ServicesCarousel.css` do not exist
And no file under `src/` contains the string `services-carousel`
