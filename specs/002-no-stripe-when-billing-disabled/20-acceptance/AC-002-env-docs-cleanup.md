# AC-002: Repo env and docs cleanup (Task 3)

Files under test: `.env.example` and `docs/microsoft-cutover.md` ONLY. The
local `.env` / `.env.local` are gitignored and must not be touched; the
existing tests `AC-013-deployment-config.test.ts` (AC-013-02) and the
`EMAIL_PROVIDER`-staleness tests (AC-014/016/018) must pass UNMODIFIED — these
scenarios assert file content, so they belong in a `*.test.ts` file reading
the repo files, in the style of `AC-013-deployment-config.test.ts`.

## AC-002-18 — `.env.example` drops the dead provider config and keeps every live variable
Given the repository's `.env.example` file
When its content is inspected
Then no line assigns `EMAIL_PROVIDER` or `CALENDAR_PROVIDER` — neither bare nor commented out — and the `# Providers` comment block is gone
And all of the following variables are still present: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REFRESH_TOKEN`, `AVAILABILITY_TIMEZONE`, `AVAILABILITY_HOURS`, `AVAILABILITY_DAYS`, `RECORDED_BILLING_TOKEN`, `BILLING_ENABLED`, `BOOKING_RATE_LIMIT`, `BOOKING_RATE_WINDOW_MIN`
And the `MEETING_BASE_URL` guidance comment is still present
And none of the strings `sk_test_`, `whsec_`, `sk_live` appear anywhere in the file (AC-013-02 parity)
And `hola@rexi-ai.com` no longer appears in the file
And the `EMAIL_FROM` guidance names `info@rexi-ai.com` as the target sender (verified Resend domain, GoDaddy mailbox)

## AC-002-19 — `docs/microsoft-cutover.md` stops documenting dead provider config
Given the `docs/microsoft-cutover.md` file
When its content is inspected
Then no line presents `EMAIL_PROVIDER` or `CALENDAR_PROVIDER` as live configuration: every remaining mention is explicitly annotated as removed or ignored
And the section 4 env block no longer contains the bare entries `CALENDAR_PROVIDER=microsoft` or `EMAIL_PROVIDER=gmail`
And the Account-split table's email row no longer cites `EMAIL_PROVIDER=gmail` as live configuration
And the section 4 env block still documents `MICROSOFT_CLIENT_ID`, `MICROSOFT_REFRESH_TOKEN`, `MEETING_BASE_URL`, `EMAIL_FROM=info@rexi-ai.com`, and `EMAIL_TO`
