# AC-005: Free-hour eligibility via Stripe

Stripe runs in test mode; the code path is identical to live mode. Flag key on the
Stripe Customer: `metadata["rexi_free_hour_used"] = "1"`.

## AC-005-01 — Unknown email is eligible
Given no Stripe customer exists for `new@example.com`
When isFreeHourAvailable is called with that email
Then it returns true

## AC-005-02 — Customer without the flag is eligible
Given a Stripe customer exists for `once@example.com` with no `rexi_free_hour_used` metadata
When isFreeHourAvailable is called with that email
Then it returns true

## AC-005-03 — Customer with the flag is not eligible
Given a Stripe customer for `returning@example.com` whose metadata has
`rexi_free_hour_used = "1"`
When isFreeHourAvailable is called with that email
Then it returns false

## AC-005-04 — Marking usage persists the flag
Given any email, whether or not a Stripe customer already exists
When markFreeHourUsed is called and then isFreeHourAvailable is called with the same email
Then the second call returns false (the flag was written to the customer's metadata)

## AC-005-05 — Stripe failure is never treated as eligible
Given the Stripe API call fails (network or API error)
When isFreeHourAvailable is called
Then it surfaces an error value instead of returning true
