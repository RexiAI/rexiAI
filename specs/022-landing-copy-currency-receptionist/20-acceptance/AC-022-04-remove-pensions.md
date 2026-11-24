# AC-022-04: Pensions removed from Proof

## AC-022-04-01 — Item gone in both locales
Given the landing in ES and EN
When the Proof section renders
Then no row named "pensions-system" and no href containing "pensions-system" exists
And the page text contains no "pensiones"/"Pension"

## AC-022-04-02 — Remaining proof intact
Given the Proof section in either locale
When it renders
Then the honesty intro is present
And the tax-advisor row links to https://github.com/RexiAI/tax-advisor
