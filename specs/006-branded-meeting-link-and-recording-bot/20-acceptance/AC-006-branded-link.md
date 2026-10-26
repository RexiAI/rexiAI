# AC-006: Branded meeting link and real-room resolution

## AC-006-01 — Client join URL uses the branded domain, https, one path segment, and a lang query parameter
Given MEETING_BASE_URL is set to "https://meet.rexi-ai.com"
And the booking's locale is "en"
When a meeting link is created
Then the join URL is "https://meet.rexi-ai.com/rexi-<16 lowercase hex>?lang=en"
And the scheme is https
And the URL contains no IP address literal
And the path is exactly one segment, matching ^rexi-[0-9a-f]{16}$
And the room name (the last path segment) is unchanged from today
And the query string contains exactly one parameter, "lang", whose value is exactly "es" or "en"
And no query parameter other than "lang" is present

## AC-006-02 — Room name is rexi- plus 16 hex, last path segment
Given a meeting link is created
When the room name is extracted from the join URL's last path segment
Then it matches ^rexi-[0-9a-f]{16}$

## AC-006-03 — Real Jitsi room resolves to meet.jit.si with the same room
Given a room name "rexi-0123456789abcdef"
When the real Jitsi room URL is resolved
Then it is "https://meet.jit.si/rexi-0123456789abcdef"
And its room segment equals the branded URL's room segment

## AC-006-04 — Missing brand config fails loud, never a meet.jit.si join URL
Given MEETING_BASE_URL is unset (or empty)
When a meeting link is created
Then the result status is "error"
And no join URL with host meet.jit.si is produced
