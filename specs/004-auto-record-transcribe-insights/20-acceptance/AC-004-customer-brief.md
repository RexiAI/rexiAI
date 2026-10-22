# AC-004: Customer brief insight stage (Task 4, Ask C)

Unit: `scripts/recording/insight.mjs` — wraps `bl text chat` (flags verified:
`--message`/`--system`/`--messages-file`). Template skeleton is fixed literals
in code (same headings, same order in every brief); LLM output fills section
bodies in the transcript's language (es/en aware).

## AC-004-29 — Insight prompt asks for the five customer-want categories, language-aware
Given a transcript JSON whose content is Spanish
When buildInsightMessages runs
Then the message payload instructs extraction of: requirements, pain points, decisions, commitments, and next steps
And it instructs the model to answer in the transcript's dominant language (es/en awareness)
And the payload contains no value of any secret env variable (STRIPE_SECRET_KEY, RECORDED_BILLING_TOKEN, GH_TOKEN/GITHUB_TOKEN, DASHSCOPE_API_KEY)

## AC-004-30 — customer-brief.md renders the fixed skeleton beside the recording
Given an LLM response covering the five categories
When the insight stage renders and writes the brief
Then <sessionDir>/customer-brief.md exists
And it contains the fixed section headings in fixed order — Requirements, Pain points, Decisions, Commitments, Next steps — plus a booking-context section
And given the LLM reports nothing for a category, that section is still present with the fixed placeholder ("None stated"), so the skeleton is identical across briefs

## AC-004-31 — Booking context is best-effort and never fabricated
Given attribution resolved with a client email and booking id
When the brief renders
Then the booking-context section contains the client email and the booking id
And given attribution absent (unattributed recording)
Then the booking-context section states the recording is unattributed and the brief renders with the identical skeleton
And in no case does the brief invent a client email that attribution did not provide

## AC-004-32 — Secrets never appear in the brief
Given env values STRIPE_SECRET_KEY, RECORDED_BILLING_TOKEN, GH_TOKEN, and DASHSCOPE_API_KEY each set to a distinctive recognizable string
When the insight stage completes and customer-brief.md is written
Then none of the four secret values appears anywhere in the brief file content

## AC-004-33 — .rexi-analyzed is written only after brief AND issue delivery succeed
Given the brief file writes successfully and the delivery unit (Task 5) succeeds
When runInsightStage completes
Then <sessionDir>/customer-brief.md exists and <sessionDir>/.rexi-analyzed exists
And given the delivery call fails (gh runner rejects) after the brief was written
Then no .rexi-analyzed marker exists in the session directory
And the stage propagates the failure to the caller, leaving the directory eligible for the next scan (a duplicate issue on retry is prevented by the delivery search, AC-004-35)
