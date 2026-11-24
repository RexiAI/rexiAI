# 40-deploy — spec 021 (stage 5c)

Repo classification: frontend (vercel.json + Vercel Git integration; no skip permitted by deployer.md — spec is tooling-only but the lane still gets verified)
Deploy URL: https://rexi-ai-git-spec-021-stryke-65e47c-danielbueno76-4270s-projects.vercel.app
Inspector: https://vercel.com/danielbueno76-4270s-projects/rexi-ai/Hb2DNYakqiexf4Dfy5hvgqaeTTw7
PR head: d6cabc69c85acd7c667ab0458ff6dd4872f5393e (PR #118)
Phase-3 attempt: 1 of 3

## Build
command: gh api commits/d6cabc69…/status (context Vercel) + PR bot comment
exit: 0
at: 2026-11-24T14:30:00Z
Vercel status: success; bot comment: Ready, Preview URL above, deployed for the PR head. Build: pass.

## Health check
command: curl -H "x-vercel-protection-bypass: <redacted>" <deploy URL>/
exit: 0
at: 2026-11-24T14:30:30Z
Unauthenticated: HTTP 302 (Vercel deployment protection). With bypass header: HTTP 200. Health: pass.

## E2E
command: REXI_E2E_SITE_URL=<deploy URL>?x-vercel-protection-bypass=<redacted>&x-vercel-set-bypass-cookie=true node tests/e2e/landing.e2e.ts
exit: 0
at: 2026-11-24T14:31:22Z
Output tail: "[e2e:landing] AC-020-23…27 PASSED" (all checks ok). E2E: pass.

Note: no VERCEL_TOKEN used; deployment resolved via commit status and bot comment.

Verdict: PASS
