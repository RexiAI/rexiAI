# AC-004: Pricing calculator

Rule: `priceCents(hours, freeHourAvailable) = freeHourAvailable ? (hours − 1) × 3000 : hours × 3000`.

## AC-004-01 — First-time client pricing table
Given a client whose free hour is still available
When priceCents is called for hours 1, 2, 3, and 4
Then the results are 0, 3000, 6000, and 9000 cents respectively (€0, €30, €60, €90)

## AC-004-02 — Returning client pricing table
Given a client whose free hour has already been used
When priceCents is called for hours 1, 2, 3, and 4
Then the results are 3000, 6000, 9000, and 12000 cents respectively (€30–€120)

## AC-004-03 — Zero hours rejected
Given hours = 0
When priceCents is called
Then it returns a rejection (typed error value) stating duration must be at least 1 hour

## AC-004-04 — Hours above maximum rejected
Given hours = 5
When priceCents is called
Then it returns a rejection stating duration may be at most 4 hours

## AC-004-05 — Negative hours rejected
Given hours = -1
When priceCents is called
Then it returns a rejection rather than a price

## AC-004-06 — Fractional hours rejected
Given hours = 1.5
When priceCents is called
Then it returns a rejection stating durations must be whole hours
