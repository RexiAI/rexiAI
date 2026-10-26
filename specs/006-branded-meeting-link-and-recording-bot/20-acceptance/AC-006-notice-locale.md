# AC-006: Locale-aware recording-consent notice

The notice's language follows the booking's locale. Spanish is the default and
the exact copy from `15-design.md` (Task 2); English is the two-line translation
below. Only the two notice lines are localised — every other line of the email
stays Spanish and byte-identical to today (the spec 003 locked copy). The notice
is placed before the join link in both parts, as Task 2 already requires.

English notice (same meaning, same two lines, same placement, dash-free, no
banned billing stem, "audio" not "video"):

> Recording notice: this meeting is recorded as audio.
> We use the recording to document the session. If you prefer it not to be recorded, reply to this email before the meeting.

## AC-006-27 — Spanish locale renders the exact Spanish notice (both variants)
Given a booking made with locale "es"
And the client confirmation email is built via the billing-enabled or the direct (billing-disabled) path
When the body is rendered
Then the notice is exactly "Aviso de grabación: la reunión se graba en audio."
And exactly "Usamos la grabación para documentar la sesión. Si prefieres que no se grabe, responde a este correo antes de la reunión."
And these two lines are the only consent notice present

## AC-006-28 — English locale renders the exact English notice (both variants)
Given a booking made with locale "en"
And the client confirmation email is built via the billing-enabled or the direct path
When the body is rendered
Then the notice is exactly "Recording notice: this meeting is recorded as audio."
And exactly "We use the recording to document the session. If you prefer it not to be recorded, reply to this email before the meeting."
And the notice appears before the join link in both the text part and the HTML part

## AC-006-29 — Missing or unrecognised locale falls back to Spanish, never crashes
Given a booking whose locale is missing, null, or any value other than "es" or "en" (e.g. "fr", "", "EN")
When the client confirmation email is built
Then the notice is the Spanish copy
And the build does not throw and the email still sends
And the notice is never the English copy

## AC-006-30 — Locale changes only the notice and the join URL's lang value; every other line is byte-identical
Given a booking made with locale "en" and the same booking made with locale "es" (same email, date, time, hours, and room name)
When both client confirmation emails are rendered (either variant)
Then the two emails differ only in the two notice lines and the join URL's "lang" query value ("en" vs "es")
And the heading, all fact rows except the join URL's, the join CTA label, the calendar CTA, the billing lines, and the help line are byte-identical between the two
And those non-notice, non-join-URL lines are byte-identical to today's Spanish locked copy

## AC-006-31 — Operator email is unaffected by locale
Given an operator email is built (either billing mode) for a booking of any locale
When the body is rendered
Then it contains no recording-consent notice in any language
And its content is byte-identical regardless of the booking's locale

## AC-006-32 — Enabled-path email localises using the locale captured at booking time
Given a billing-enabled booking made with locale "en"
When the Stripe checkout completes and the confirmation email is sent from the webhook
Then the notice in that email is the English copy
And the locale used is the one captured at booking time, not a webhook-time default

## AC-006-33 — The join URL in the booking email carries lang matching the booking's locale
Given a booking made with locale "en"
And another otherwise-identical booking made with locale "es"
When the client confirmation email is built (either path, either variant)
Then the join URL in the "en" email carries the query parameter "?lang=en"
And the join URL in the "es" email carries the query parameter "?lang=es"
And in both emails the join URL's host, path, and room name are unchanged from the locale-less shape
And no query parameter other than "lang" is present on either join URL

## AC-006-34 — The join page derives its language from the lang parameter alone
Given a join URL "https://meet.rexi-ai.com/rexi-<16 hex>?lang=en"
When the join page is rendered
Then the page renders the English column using only that parameter
And the page does not read Accept-Language, any path segment other than the room, or any cookie to decide its language

## AC-006-35 — Absent, empty, or unrecognised lang falls back to Spanish, never a crash, never English
Given a join URL whose "lang" parameter is absent, empty (""), or a value other than "es" or "en" (e.g. "fr", "EN")
When the join page is rendered
Then the page renders the Spanish column
And the page does not crash and does not render a half-translated page
And the page is never the English column

## AC-006-36 — The lang parameter never reaches the real Jitsi room
Given a join URL "https://meet.rexi-ai.com/rexi-0123456789abcdef?lang=es"
When the join page's primary action (and any redirect) resolves the real room URL
Then the real room URL is "https://meet.jit.si/rexi-0123456789abcdef"
And the real room URL carries no query parameter, including no "lang"
And the room identity ("rexi-0123456789abcdef") is unchanged, so the bot's room derivation is unaffected
