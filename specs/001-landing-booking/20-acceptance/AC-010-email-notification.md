# AC-010: Operator email notification

Sent via the Resend HTTP API using RESEND_API_KEY / EMAIL_FROM; recipient EMAIL_TO.

## AC-010-01 — Operator receives a complete booking summary
Given a completed booking by `client@example.com` for 2027-03-01 10:00–12:00 Madrid,
2 hours, €30 paid
When the notification is sent
Then an email addressed to the operator address (EMAIL_TO) contains the client email,
the date, the Madrid start time, the duration (2 hours), and the amount paid (€30)

## AC-010-02 — Exactly one send per completed booking
Given a single completed booking processed once
When the webhook orchestration finishes
Then exactly one notification email was sent

## AC-010-03 — Provider failure propagates as retryable error
Given the Resend API returns an error
When the notification send is attempted
Then the failure surfaces as an error value so the caller responds 5xx (retry)
