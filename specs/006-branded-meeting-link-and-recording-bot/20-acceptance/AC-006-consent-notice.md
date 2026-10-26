# AC-006: Recording-consent notice in the client booking email

## AC-006-05 — Enabled client email carries the notice in text and HTML
Given a client booking email is built via the billing-enabled path
When the body is rendered
Then the text part contains the recording-consent notice in the booking's language
And the HTML part contains the recording-consent notice in the booking's language

## AC-006-06 — Disabled (direct) client email carries the notice in text and HTML
Given a client booking email is built via the direct path (billingDisabled: true)
When the body is rendered
Then the text part contains the recording-consent notice in the booking's language
And the HTML part contains the recording-consent notice in the booking's language

## AC-006-07 — Notice appears before the join link
Given a client booking email with a join URL present
When the body is rendered
Then the recording-consent notice (in the booking's language) appears before the join link/CTA in reading order
And this holds in both the text part and the HTML part

## AC-006-08 — Operator email has no consent notice
Given an operator email is built (either billing mode)
When the body is rendered
Then neither the text part nor the HTML part contains the recording-consent notice

## AC-006-09 — Existing locked copy is preserved; only the notice is added
Given the direct client email builder with a join URL and billing-disabled mode
When the body is rendered
Then every pre-existing locked line (heading, fact rows, join CTA, calendar CTA, help) is unchanged
And only the recording-consent notice is added
