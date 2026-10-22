# AC-005 Task 7 — Pipeline docs rework (`docs/recording-pipeline.md`)

Content assertions on the reworked doc (repo precedent: `AC-004-runbook.test.ts`
asserts the same file). The spec-004 assertions on this file
(`src/__tests__/AC-004-runbook.test.ts:14-40`) must keep passing — the rework
adds and re-labels, it does not delete the insight-chain content.

## AC-005-43 — Home-hosted WSL is the primary deployment; VPS demoted
Given the reworked `docs/recording-pipeline.md`
When its topology sections are inspected
Then the home-hosted-on-WSL deployment is presented as the primary topology
And the VPS route is still documented but explicitly labeled as the alternative
And the existing spec-004 content assertions on this file still hold (insight chain, markers, sidecar limitation, host-timer wording)

## AC-005-44 — Storage layout on this machine
Given the reworked doc
When its storage section is inspected
Then it states that recordings, transcripts (`transcript.json`), and customer briefs (`customer-brief.md`) live under `RECORDINGS_DIR` on this machine (`/home/dbueno/rexi-recordings`)
And it states that customer-insight issues are delivered to the PRIVATE repo (`RexiAI/rexiAI`)

## AC-005-45 — Always-on caveat and consent note
Given the reworked doc
When its operations section is inspected
Then it states the machine must be powered on both for meetings AND for the timer
And it states `Persistent=true` catches up missed scans after downtime
And it states the consent boundary: only rooms prefixed `rexi-` record (`mod_rexi_auto_record`)

## AC-005-46 — Retention guidance
Given the reworked doc
When its retention section is inspected
Then it states retention is manual for now (no automated deletion; `REXI_ARCHIVE_DIR` remains unimplemented)
And it carries the measured sizing: approximately 3 MB per minute of recording
And it notes the current headroom: 821 GB free ≈ months of recordings

## AC-005-47 — Exposure decision matrix (A vs B vs VPS), funnel media truth
Given the reworked doc
When its exposure section is inspected
Then it contains a decision matrix comparing path A (Tailscale Funnel: zero monthly cost, zero router/DNS work, valid Let's Encrypt TLS) against path B (`meet.rexi-ai.com` → home: GoDaddy A record + router forwards 443/tcp and 10000/udp + Windows→WSL2 relay; full media path; dynamic-IP caveat) against the VPS alternative (monthly cost)
And it states the funnel limitation honestly: an HTTPS-only proxy carries the web app and XMPP signaling, but WebRTC media and the SCTP bridge channel need direct UDP 10000 reachability (path B forwards or LAN/tailnet clients)
And it notes colibri-websocket is deprecated/removed upstream (jitsi/docker-jitsi-meet #2285) — the existing "Why not Cloudflare Tunnel / Tailscale Funnel" paragraph is updated to this current truth, not silently deleted
