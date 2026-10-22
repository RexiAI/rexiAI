# AC-005 Task 3 — Exposure path A: Tailscale Funnel (`deploy/home/expose-funnel.sh`)

PATH-shim tests (shimmed `tailscale`/`docker`/`curl` logging calls to a file) +
content assertions. AC-005-25 implements the OPEN QUESTION default resolution (a)
from `10-tasks.md`; if the human picks (b) or (c), this file is amended before stage 2.

## AC-005-21 — Script contract
Given the file `deploy/home/expose-funnel.sh` in the repo
When it is checked with `bash -n` and its source inspected
Then the syntax check passes
And the source contains `set -euo pipefail`
And the file is executable
And external tools (`tailscale`, `docker`, `curl`) are invoked by bare name — no absolute binary paths in the source

## AC-005-22 — Pre-checks refuse before any configuration
Given a shimmed `tailscale` whose `status` invocation exits non-zero (tailscale down)
When the script runs
Then it exits non-zero with a clear message naming the failed pre-check
And the shim call log records zero serve/funnel configuration invocations (refusal before mutation)
And when `tailscale status` succeeds, the script's output reports the node name (on this host: `pcdanimoudo-1`)

## AC-005-23 — Consent-pending is detected and explained, not cryptic
Given a shimmed `tailscale` whose funnel path reports that funnel requires one-time owner consent/enablement at the login server (the live state on this host: `tailscale funnel status` → "No serve config", first use)
When the script runs
Then its output states explicitly that a manual browser consent step by the tailnet owner is required
And it surfaces the consent/enable URL from the CLI output
And it exits with a distinct, clearly-messaged status — no stack trace, no retry loop, no silent success

## AC-005-24 — Funnel target: public HTTPS 443 → local Jitsi web :8000
Given all pre-checks passing (shimmed tailscale healthy, consent granted)
When the script configures exposure
Then the serve/funnel configuration it issues (or prints for the owner to run) proxies HTTPS 443 on the funnel hostname to `http://127.0.0.1:8000` — the local Jitsi web HTTP port (live-verified: the web container publishes `0.0.0.0:8000->8000` and answers HTTP 200)

## AC-005-25 — Media-transport check reports the colibri-ws reality loudly (OPEN QUESTION default (a))
Given the live web container's rendered nginx config contains no `/colibri-ws` proxy location (verified on this host: `docker exec docker-jitsi-meet-web-1 grep colibri /run/web/config/nginx/meet.conf` → empty; colibri-websocket deprecated and removed upstream, jitsi/docker-jitsi-meet #2285)
When the script runs its media-transport check (`docker exec` grep for a `colibri-ws` location against the rendered config)
Then it prints a loud warning that the funnel carries the web app and XMPP signaling only
And the warning states that WebRTC media (and the SCTP bridge channel) require direct UDP 10000 reachability — path B's router forward — or LAN/tailnet-local clients
And the script CONTINUES to the consent/configuration steps (the acceptance shape requires reaching the owner-consent boundary on this machine, where colibri-ws is absent)

## AC-005-26 — PUBLIC_URL change is emitted, never applied
Given the funnel hostname (`<node>.<tailnet>.ts.net`) resolved
When the script finishes its configuration guidance
Then it prints the exact jitsi env change line `PUBLIC_URL=https://<funnel-hostname>` for `~/docker-jitsi-meet/.env`
And it prints the restart-helper command for the stack
And the script itself never writes to `~/docker-jitsi-meet/.env` (no redirection or in-place edit of that file in the source)

## AC-005-27 — Local stack untouched
Given the script source
When it is inspected for destructive surface
Then it contains no change to docker-compose port mappings and no `docker compose down`/`rm`/port-editing command it executes itself
And the local Jitsi endpoints (`https://host.docker.internal:8443`, `http://localhost:8000`) are unaffected by any command the script runs (live re-check after the run: AC-005-51)
