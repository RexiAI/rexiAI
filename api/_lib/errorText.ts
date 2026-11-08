// A thrown value → the message a log line or an error envelope carries.
//
// Every api/ handler needs this and nothing more: `catch (e)` gives `unknown`,
// and an error envelope is a string. Four handlers each owned a copy under two
// names (`errMsg`, `errorText`), which is one rule with one reason to change —
// so it lives here.
export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
