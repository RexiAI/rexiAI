# AC-022-03: Existing price tests assert per-locale form, IDs kept

## AC-022-03-01 — IDs preserved
Given the test tree after the change
When grepping
Then AC-020-14, AC-020-19, AC-020-25 (unit and tests/e2e/landing.e2e.ts), AC-019-15, AC-019-16 and AC-011-03 each still appear in their original files

## AC-022-03-02 — No ES assertion expects dollars
Given those tests
When ES-locale assertions are read
Then none expects "$1,200" or "$600"; they expect "1.200\u00A0€" / "600\u00A0€"

## AC-022-03-03 — FAQ amount guard catches euros
Given AC-020-19 "no invented price" test
When an ES answer contained an unlisted "€" amount
Then the test fails (matcher covers "€" figures, allow-list per locale)
