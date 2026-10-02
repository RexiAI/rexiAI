// Minimal Vercel-style serverless handler types for the api/ functions.
//
// The api/*.ts handlers run as Vercel serverless functions with the classic
// (req, res) signature. Pulling in @vercel/node just for its VercelRequest/
// VercelResponse types isn't worth a dependency, and `req: ApiRequest`/`res: ApiResponse`
// tripped @typescript-eslint/no-explicit-any across every handler. These two
// interfaces cover exactly the surface the handlers use (see api/*): req.method,
// req.headers, req.body, req.query, req.bodyRaw; res.status().json(),
// res.setHeader. Body is `unknown` so each handler must narrow it explicitly
// (the parse* helpers already validate field-by-field) instead of trusting it.

export type ApiHeaders = Record<string, string | string[] | undefined>

export interface ApiRequest {
  method: string
  /** Optional: handlers read it defensively (`req.headers?.['authorization']`). */
  headers?: ApiHeaders
  /** Parsed JSON body (Vercel parses it). Unknown → handlers must narrow. */
  body?: unknown
  /** Raw body string — only the Stripe webhook needs it (signature check). */
  bodyRaw?: string
  query?: Record<string, string | string[] | undefined>
}

export interface ApiResponse {
  /** Chainable: `res.status(404).json({...})`. */
  status(code: number): ApiResponse
  json(body: unknown): void
  /** Optional: called defensively (`res.setHeader?.('Retry-After', …)`). */
  setHeader?(name: string, value: string | number | readonly string[]): void
}
