# AC-012: Post-payment result views

Routes `/booking/success` and `/booking/cancel` (plain pathname checks in the SPA; these
are the URLs handed to Stripe Checkout). No router dependency.

## AC-012-01 — Success view shows localized confirmation
Given the visitor lands on /booking/success in any active locale
When the view renders
Then localized confirmation copy is displayed telling the visitor their booking was
received and confirmed by email/calendar

## AC-012-02 — Cancel view shows localized cancellation with a way back
Given the visitor lands on /booking/cancel in any active locale
When the view renders
Then localized cancellation copy is displayed together with an action returning the
visitor to the booking section of the landing page
