# AC-001: Declare conformance tier production

## AC-001-01 — Tier file declares production
Given the repo root
When `AGENTS_REXIAI.md` is read
Then it contains the line `## Conformance tier: production`

## AC-001-02 — Tier file wired into opencode instructions
Given `opencode.json`
When its `instructions` array is parsed
Then it contains `AGENTS_REXIAI.md`
And every entry present before this spec is still present
