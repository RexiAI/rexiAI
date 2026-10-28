// In-memory stand-in for the slice of Microsoft Graph the calendar adapter uses.
//
// The adapter talks to /me/events with `$filter` / `$expand` / `$top` and PATCHes
// an event by its Graph id, so the only way to prove "the old slot is released"
// (AC-007-09) or "the room never rotates" (AC-007-12) without a live mailbox is a
// fake that actually stores events and honours the filter it is given.
//
// Follows the shell-harness.ts / recording-harness.ts precedent: a plain helper
// module under src/__tests__ that two acceptance files share.

export interface GraphEvent {
  id: string
  subject?: string
  body?: { contentType: string; content: string }
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: Array<{ emailAddress: { address: string }; type?: string }>
  location?: { displayName: string }
  singleValueExtendedProperties: Array<{ id: string; value: string }>
}

export interface RecordedRequest {
  method: string
  url: string
  body?: any
}

const OVERLAP_FILTER = /end\/dateTime gt '([^']+)' and start\/dateTime lt '([^']+)'/
const EVENT_PATH = /\/me\/events\/([^/?]+)$/

function json(value: unknown, status = 200): any {
  return { ok: status < 400, status, json: async () => value, text: async () => '' }
}

/** Lexicographic comparison is correct for the `YYYY-MM-DDTHH:MM:SS` shape. */
function overlaps(event: GraphEvent, lower: string, upper: string): boolean {
  return event.end.dateTime > lower && event.start.dateTime < upper
}

function applyPatch(event: GraphEvent, patch: any): void {
  if (patch.start) event.start = patch.start
  if (patch.end) event.end = patch.end
  if (patch.location) event.location = patch.location
  if (patch.subject !== undefined) event.subject = patch.subject
  if (patch.singleValueExtendedProperties) {
    event.singleValueExtendedProperties = patch.singleValueExtendedProperties
  }
}

function methodOf(init?: any): string {
  return (init?.method ?? 'GET').toUpperCase()
}

/** Parses a request body only when it is a JSON one (the OAuth call is not). */
function jsonBody(init?: any): any {
  const raw = init?.body
  if (typeof raw !== 'string' || !raw.startsWith('{')) return undefined
  return JSON.parse(raw)
}

export function createGraphHarness(seed: GraphEvent[] = []) {
  const events: GraphEvent[] = seed.map((e) => ({ ...e }))
  const requests: RecordedRequest[] = []
  let nextId = 1

  function patchEvent(url: string, patch: any): any {
    const match = EVENT_PATH.exec(url)
    const id = match ? decodeURIComponent(match[1] as string) : ''
    const event = events.find((e) => e.id === id)
    if (!event) return json({ error: { code: 'ErrorItemNotFound' } }, 404)
    applyPatch(event, patch)
    return json(event)
  }

  function createEvent(body: any): any {
    const event: GraphEvent = { id: `ev-${nextId++}`, ...body }
    events.push(event)
    return json(event, 201)
  }

  function listEvents(url: string): any {
    const filter = new URL(url).searchParams.get('$filter')
    const range = filter ? OVERLAP_FILTER.exec(filter) : null
    if (!range) return json({ value: events })
    return json({ value: events.filter((e) => overlaps(e, range[1]!, range[2]!)) })
  }

  /** Routes one request to the store, the way the real endpoint would. */
  function dispatch(url: string, method: string, body: any): any {
    if (url.includes('login.microsoftonline.com')) return json({ access_token: 'graph-token' })
    if (method === 'PATCH') return patchEvent(url, body)
    if (method === 'POST' && url.endsWith('/me/events')) return createEvent(body)
    return listEvents(url)
  }

  const fetchImpl = (async (input: string | URL, init?: any): Promise<any> => {
    const url = String(input)
    const method = methodOf(init)
    const body = jsonBody(init)
    requests.push({ method, url, ...(body === undefined ? {} : { body }) })
    return dispatch(url, method, body)
  }) as unknown as typeof fetch

  return { events, requests, fetchImpl }
}

/** Sets the Microsoft env the adapter's token call needs. */
export function useMicrosoftEnv(): void {
  process.env['MICROSOFT_CLIENT_ID'] = 'client'
  process.env['MICROSOFT_CLIENT_SECRET'] = 'secret'
  process.env['MICROSOFT_REFRESH_TOKEN'] = 'refresh'
}
