# AC-005 Task 9 — E2E live proofs + in-suite traceability guard

Live proofs executed post-PR against THIS host by the e2e/arrangements stage.
`*.e2e.ts` files are invisible to `check-scenario-traceability.sh` (include
patterns cover `*.test.ts`/`*.spec.ts` only), so the in-suite guard
`src/__tests__/AC-005-e2e-journeys.test.ts` cites AC-005-49…52 and asserts each
journey file exists and embeds its scenario IDs — pure file assertions, no
Docker/systemctl/network/vercel, `npm test` stays green in a bare checkout
(spec-004 decision-③ pattern, `AC-004-e2e-journeys.test.ts`). Journeys are
self-contained plain-node scripts with zero npm imports (004 D4 contract),
picked up by the existing `tests/**/*.e2e.ts` glob in `e2e.config.ts`.

## AC-005-49 — Timer installed, first scan cycle proven in the journal
Given the home host with the install script (Task 1) run to completion
When the journey `tests/e2e/home-timer-scan.e2e.ts` executes
Then `systemctl list-timers` shows `rexi-recording.timer`
And `journalctl -u rexi-recording.service` shows at least one scan cycle (the `[recording-cron]` or `Scanning` evidence line)
And ASR-stage failure containment inside that cycle is tolerated and expected (spec 006 pending) — the journey asserts scan-cycle evidence, never stage success
And the journey file embeds the ID `AC-005-49`

## AC-005-50 — Env file permissions, journal secrecy, idempotent re-run
Given the install script has run once
When the same journey continues
Then `/etc/rexi-recording.env` exists with mode `600` (`stat -c %a`)
And the journal for the service contains no secret-key dump — no line matching `STRIPE_SECRET_KEY=`, `RECORDED_BILLING_TOKEN=`, `DASHSCOPE_API_KEY=`, or `GH_TOKEN=`
And a second execution of `install-recording-host.sh` exits 0 with the timer still enabled and active afterwards
And the journey file embeds the ID `AC-005-50`

## AC-005-51 — Funnel script reaches the owner-consent boundary; local stack survives
Given the home host with tailscale up (node `pcdanimoudo-1`) and no serve config (first funnel use)
When the journey `tests/e2e/funnel-consent-boundary.e2e.ts` executes `deploy/home/expose-funnel.sh`
Then the script reaches the owner-consent boundary and prints clear manual-consent instructions (or completes the configuration if consent was already given)
And it exits with a clear status — no cryptic failure
And afterwards `https://host.docker.internal:8443` still responds (local stack untouched)
And the journey file embeds the ID `AC-005-51`

## AC-005-52 — Switch refuses a dead URL and Vercel prod is provably unchanged
Given the home host and the URL `https://meet.rexi-ai.com` (NXDOMAIN — host-verified, informal spec)
When the journey `tests/e2e/switch-refusal.e2e.ts` executes `deploy/home/switch-meeting-base-url.sh https://meet.rexi-ai.com`
Then the script exits non-zero with a message naming the failed gate (TLS/reachability — DNS resolution fails before any HTTP success)
And Vercel production env is unchanged: a `vercel env ls production` snapshot taken before and after the run is identical, and `MEETING_BASE_URL` remains absent (its pre-run state, informal-verified)
And the journey file embeds the ID `AC-005-52`
