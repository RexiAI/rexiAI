#!/usr/bin/env bash
# deploy/home/expose-path-b.sh — spec 005 Task 4 (Ask D): exposure path B —
# the DNS/port-forward TRUTH-PRINTER for meeting.rexi-ai.com.
#
# This script is READ-ONLY by contract (AC-005-32): it performs no DNS-provider
# API call, executes no netsh, writes no file. Every netsh/PowerShell/router
# line below exists ONLY as printed guidance for the owner to run — the script
# runs inside WSL and cannot elevate to admin PowerShell from here. Router and
# Windows changes are owner-side work (10-tasks.md §Out of scope).
#
# Per the orchestrator ruling on the path-A open question, PATH B is the
# customer-meeting-capable path: it is the only route that gives external
# clients direct UDP 10000 reachability for WebRTC media.
#
# What it prints, layer by layer:
#   1. DNS      — the live public IP (fetched at runtime) + the exact GoDaddy
#                 A record + the dynamic-IP (DDNS) caveat
#   2. ROUTER   — forwards 443/tcp and 10000/udp → the Windows host
#   3. WINDOWS  — the admin-PowerShell netsh portproxy + firewall lines for
#                 443/tcp with the WSL2 IP resolved at runtime, and the TRUTH
#                 about UDP 10000: netsh portproxy is TCP-only, so there is no
#                 working UDP portproxy line to print (decision 8)
#   4. CERT     — the docker-jitsi-meet Let's Encrypt option for the web
#                 container
# All external tools by bare PATH-resolved name; output is stdout only.
set -euo pipefail

log() { echo "[expose-path-b] $*"; }
die() { echo "[expose-path-b] ERROR: $*" >&2; exit 1; }

lookup_public_ip() {
  # Live lookup, never a cached or hardcoded value — residential IPs change.
  local ip
  ip="$(curl -fsS --max-time 15 https://api.ipify.org || true)"
  [[ -n "$ip" ]] || die "could not fetch the public IP (read-only lookup failed) — no guidance printed"
  printf '%s' "$ip"
}

wsl_ip() {
  # WSL2's current IP moves every boot — resolved at runtime, never baked in.
  hostname -I | awk '{print $1}'
}

print_dns_layer() {
  local ip="$1"
  echo
  log "LAYER 1 — DNS (GoDaddy):"
  printf '[expose-path-b]   your current public IP: %s\n' "$ip"
  printf '[expose-path-b]   create/update the GoDaddy record: type A, host: meet, value: %s, TTL 600\n' "$ip"
  printf '[expose-path-b]   → the public name meet.rexi-ai.com points at this home IP\n'
  printf '[expose-path-b]   CAVEAT: residential IPs are dynamic — when the IP changes this record\n'
  printf '[expose-path-b]   goes stale. Re-run this script to refresh, or set up DDNS on the router.\n'
}

print_router_layer() {
  echo
  log "LAYER 2 — ROUTER (home gateway admin page):"
  printf '[expose-path-b]   port-forward 443/tcp  → the Windows host (this machine, LAN IP)\n'
  printf '[expose-path-b]   port-forward 10000/udp → the Windows host (this machine, LAN IP)\n'
  printf '[expose-path-b]   UDP 10000 is the JVB media port — this forward is what makes external\n'
  printf '[expose-path-b]   clients media-capable (the funnel path cannot carry it).\n'
}

print_windows_layer() {
  local ip="$1"
  echo
  log "LAYER 3 — WINDOWS → WSL2 relay (run in an ADMIN PowerShell on Windows):"
  printf '[expose-path-b]   current WSL2 IP (resolved at runtime — re-run after every reboot):\n'
  printf '[expose-path-b]     %s\n' "$ip"
  printf '[expose-path-b]   443/tcp relay:\n'
  printf '[expose-path-b]     netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=%s\n' "$ip"
  printf '[expose-path-b]     New-NetFirewallRule -DisplayName "RexiAI meet 443" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow\n'
  printf '[expose-path-b]   UDP 10000 relay — TRUTH, not a broken command:\n'
  printf '[expose-path-b]     netsh interface portproxy is TCP-ONLY — there is NO working UDP\n'
  printf '[expose-path-b]     portproxy line, so none is printed here. Pick one:\n'
  printf '[expose-path-b]       (a) WSL2 mirrored networking (.wslconfig: networkingMode=mirrored)\n'
  printf '[expose-path-b]           — then Windows relays UDP natively and no portproxy is needed;\n'
  printf '[expose-path-b]       (b) forward 10000/udp on the router directly to the WSL IP above\n'
  printf '[expose-path-b]           if your router can reach the WSL NAT/host address.\n'
  printf '[expose-path-b]     Either way the inbound firewall rule:\n'
  printf '[expose-path-b]     New-NetFirewallRule -DisplayName "RexiAI meet 10000 udp" -Direction Inbound -Protocol UDP -LocalPort 10000 -Action Allow\n'
}

print_cert_layer() {
  echo
  log "LAYER 4 — CERTS for the jitsi web container (docker-jitsi-meet Let's Encrypt option):"
  printf '[expose-path-b]   in ~/docker-jitsi-meet/.env set:\n'
  printf '[expose-path-b]     ENABLE_LETSENCRYPT=1\n'
  printf '[expose-path-b]     LETSENCRYPT_DOMAIN=meet.rexi-ai.com\n'
  printf '[expose-path-b]     LETSENCRYPT_EMAIL=you@example.com   (your real admin address)\n'
  printf '[expose-path-b]   the container then obtains/renews a real LE cert for the public name;\n'
  printf '[expose-path-b]   drop IGNORE_CERTIFICATE_ERRORS once TLS is valid (see docs/recording-pipeline.md).\n'
  echo
  log "path B is the customer-meeting-capable exposure — nothing above was executed; each line is owner-side work."
}

main() {
  command -v curl >/dev/null 2>&1 || die "curl missing — cannot do the read-only public IP lookup"
  local ip wip
  ip="$(lookup_public_ip)"
  wip="$(wsl_ip)"
  log "read-only truth printer — public IP and WSL IP fetched at runtime; executing nothing."
  print_dns_layer "$ip"
  print_router_layer
  print_windows_layer "$wip"
  print_cert_layer
}

main "$@"
