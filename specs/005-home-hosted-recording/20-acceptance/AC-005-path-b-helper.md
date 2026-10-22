# AC-005 Task 4 — Exposure path B: DNS/port-forward truth-printer (`deploy/home/expose-path-b.sh`)

Content assertions on the script source + a shimmed-run test (shimmed `curl`
for the IP lookup) where behavior is pinned. The script performs NO mutation —
owner-side router/DNS/Windows changes are out of scope (informal §Out of scope).

## AC-005-28 — Script contract
Given the file `deploy/home/expose-path-b.sh` in the repo
When it is checked with `bash -n` and its source inspected
Then the syntax check passes
And the source contains `set -euo pipefail`
And the file is executable
And external tools are invoked by bare name (no absolute binary paths)

## AC-005-29 — DNS layer: live IP lookup, exact GoDaddy record, DDNS caveat
Given a shimmed IP-echo `curl` returning a public IP
When the script runs
Then it prints the fetched current public IP
And it prints the exact GoDaddy record to create: type A, host `meet`, value = the fetched IP (yielding `meet.rexi-ai.com`; live-verified NXDOMAIN today)
And it prints a DDNS caveat noting the residential IP is likely dynamic and the record needs refreshing when it changes
And no public IP literal is hardcoded in the script source (today's 79.117.136.26 appears nowhere)

## AC-005-30 — Router layer: both forwards printed
Given the script source (or a shimmed run's output)
When the router-layer guidance is inspected
Then it contains a port-forward line for `443/tcp` → the Windows host
And a port-forward line for `10000/udp` → the Windows host

## AC-005-31 — Windows→WSL2 relay: exact admin-PowerShell lines, runtime WSL IP, UDP truth
Given the script runs inside WSL2
When its relay-layer output is inspected
Then it prints exact admin-PowerShell `netsh interface portproxy add v4tov4` line(s) for 443/tcp with the WSL2 IP resolved AT RUNTIME (first address of `hostname -I` — live-verified 172.27.113.121 today; not hardcoded)
And matching `New-NetFirewallRule` (or equivalent firewall) lines
And for UDP 10000 it prints the truthful note that `netsh interface portproxy` is TCP-only, plus the current WSL IP for the owner-chosen UDP path (mirrored networking or router→WSL direct route)
And no printed PowerShell line claims to portproxy UDP

## AC-005-32 — Read-only truth-printer with cert-strategy pointer
Given the script source
When it is inspected for mutation surface
Then it performs no DNS-provider API call (no authenticated HTTP mutation; the only network call is the read-only IP lookup)
And it never executes `netsh` (all netsh/PowerShell lines appear only inside printed output)
And it writes no file (output is stdout only)
And it prints the cert-strategy pointer for the jitsi web container: the docker-jitsi-meet Let's Encrypt option (`ENABLE_LETSENCRYPT`, `LETSENCRYPT_DOMAIN`, `LETSENCRYPT_EMAIL` — live-verified in `~/docker-jitsi-meet/env.example:61-67`)
