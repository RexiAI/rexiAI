// Pure email-render primitives (spec 003 split). escapeHtml + the line-shaped
// body model are shared by the billing-enabled builders in email.ts and the
// billing-disabled variants in emailDirect.ts. Kept in a leaf module so
// emailDirect never imports email.ts (which would cycle). Bodies are verbatim
// from email.ts pre-spec-003 — AC-003-19/25 pin byte-identical enabled output.

/**
 * clientEmail is attacker-controlled and reaches the operator's mailbox as HTML.
 * & must be replaced first, otherwise the ampersands introduced by the later
 * replacements get double-escaped.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface BodyLine {
  label?: string
  value: string
}

/**
 * Operator-facing customer-name row (spec 008 Task 4). Lives here, in the leaf
 * module both builders already import, so the billing-enabled and billing-disabled
 * variants cannot drift and email.ts <-> emailDirect.ts stay cycle-free.
 *
 * Absent/empty name => no row at all, which is what keeps a name-less booking's
 * output byte-identical to the pre-name email.
 */
export function clientNameRows(clientName?: string | null): BodyLine[] {
  if (!clientName) return []
  return [{ label: 'Nombre', value: clientName }]
}

export function renderText(lines: BodyLine[]): string {
  return lines.map((l) => (l.label ? `${l.label}: ${l.value}` : l.value)).join('\n')
}

export function renderHtml(lines: BodyLine[]): string {
  const inner = lines
    .map((l) => (l.label ? `${escapeHtml(l.label)}: ${escapeHtml(l.value)}` : escapeHtml(l.value)))
    .join('<br/>')
  return `<p>${inner}</p>`
}
