# AC-007: Reschedule page document (Task 8)

The static, self-contained page the client opens from the reschedule link:
`deploy/reschedule/index.html`. The token is read from `location.pathname`
(`/reschedule/<64 lowercase hex>`); the locale from `?lang=`; every state is a
fully-written section revealed by a synchronous inline script.

## AC-007-39 — A valid token renders the current slot and the available-slot picker
Given a valid reschedule token T that resolves to a booking at date D, startTime S, hours H
And the availability endpoint returns non-empty slots for date D
When the page at /reschedule/T is opened with JavaScript enabled
Then the page renders the current slot D at S and the duration H
And the page renders the available slot choices for date D
And the token T is not written into the rendered document

## AC-007-40 — A date with no open slots shows the empty message and keeps the picker
Given a valid token whose booking's current date has no available slots (availability returns slots: [])
When the page renders the availability for that date
Then the page shows the "no slots that day" message
And the picker (the date input and the move action) stays visible, not replaced by an error state

## AC-007-41 — A successful move renders the new slot and reveals no join URL, booking id, or client email
Given a valid token and a successful POST returning { date: D2, startTime: S2, hours, joinUrl }
When the page renders the success state
Then the new slot D2 S2 is shown
And the join URL, the booking id, and the client email do not appear anywhere in the document

## AC-007-42 — With JavaScript disabled the page is usable via a mailto exit
Given the page at /reschedule/T is opened with JavaScript disabled
When the document renders
Then a noscript block containing both the Spanish and English states is present
And it carries a mailto:info@rexi-ai.com link as the only action

## AC-007-43 — The token never appears in the DOM, storage, or any URL other than the resolve request
Given a valid token T
When the page loads and (optionally) submits
Then T appears only in the GET /api/reschedule resolve request line and the POST body
And T does not appear in any rendered text, attribute, data-* value, history entry, storage (localStorage/sessionStorage/cookie), or href/mailto URL
And after a successful move the address bar is not rewritten

## AC-007-44 — A wrong, expired, or rotated token renders one invalid state with a mailto exit
Given the path token is not 64 lowercase hex, or GET/POST returns INVALID_RESCHEDULE_TOKEN
When the page renders the invalid state
Then it shows a single "this link no longer works" state for all three causes (no distinction between them)
And it carries a mailto:info@rexi-ai.com link
And it offers no retry of the same link

## AC-007-45 — ?lang= selects Spanish or English; absent or unrecognised falls back to Spanish
Given a valid token
When the page is opened with ?lang=en, then ?lang=es, then no lang parameter, then ?lang=fr
Then en renders the English state; es, absent, and fr all render the Spanish state
And the page reads the language from the lang query parameter alone (no Accept-Language, no navigator.language, no cookie, no storage, no path segment)

## AC-007-46 — A client at the reschedule limit renders the limit state directly
Given a valid token whose GET resolve returns canReschedule: false
When the page renders after resolve
Then the page shows the limit state (with a mailto:info@rexi-ai.com exit) instead of the form
And the date input and slot picker are not shown

## AC-007-47 — A 5xx response renders the unconfirmed state with no retry
Given the page receives a 5xx (or network error) from POST /api/reschedule after the move may already have landed
When the page renders the unconfirmed state
Then it shows the "we could not confirm the change" message
And it offers no retry of the move (no button, no "try again" wording)
And it carries a mailto:info@rexi-ai.com link
