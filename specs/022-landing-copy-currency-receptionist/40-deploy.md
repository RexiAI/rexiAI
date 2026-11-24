# 40-deploy — spec 022

Verdict: PASS
Phase-3 attempt: 1 of 3
Repo class: frontend (Vercel Git integration)
PR: https://github.com/RexiAI/rexiAI/pull/119
Head SHA: 1dd4a900b75aa0b32983a2f080f5b30846a93ebf
Deploy URL: https://rexi-2h7jqq6d6-danielbueno76-4270s-projects.vercel.app
Build: pass | Health: pass | E2E: pass

## Deployment identity
command: gh api repos/RexiAI/rexiAI/deployments?sha=<head>; deployments/8033083941 (.sha) ; statuses
exit: 0
at: 2026-11-24T15:55:00Z
Deployment 8033083941 (Preview) sha == PR head; status success; `Vercel` commit status success ("Deployment has completed").

## Health check
command: curl with protection bypass (secret masked: ***)
at: 2026-11-24T15:55:43Z
Unauthenticated: 302 (deployment protection). With bypass: 307 (cookie-set redirect), followed with -L: 200.

## E2E
command: REXI_E2E_SITE_URL="<url>/?x-vercel-protection-bypass=***&x-vercel-set-bypass-cookie=true" node tests/e2e/landing.e2e.ts
exit: 0
at: 2026-11-24T15:55:46Z
"AC-020-23…27 PASSED". AC-022-01 example rows: 4 rows, 0 misaligned at 1280px and 390px. ES shows "1.200 €" and "600 €", no $ / EUR / SaaS; EN shows "from $1,200", "from $600/month", no €. No pension text. 

No `vercel deploy` run. No VERCEL_TOKEN needed.
