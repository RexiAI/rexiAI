#!/usr/bin/env bash
# deploy/home/expose-funnel.sh — spec 005 Task 3 (Ask C): expose the local
# Jitsi stack through a Tailscale Funnel (exposure path A).
#
# ORCHESTRATOR RULING (open question in 10-tasks.md, option a): Tailscale
# Funnel is an HTTPS-only proxy and upstream Jitsi REMOVED colibri-websocket
# (jitsi/docker-jitsi-meet #2285). A funnel therefore carries the web page and
# XMPP signaling but NO media for external clients. This script checks the
# live web container's rendered nginx config, prints that hard limitation as
# a loud banner when no /colibri-ws proxy exists (current reality), and then
# CONTINUES to the serve/funnel configuration and the one-time owner-consent
# boundary. Media-capable external meetings require path B (see
# expose-path-b.sh); the funnel stays useful for tailnet-internal devices.
#
# Contract pinned by specs/005-home-hosted-recording/20-acceptance/
# AC-005-expose-funnel.md:
#   * pre-checks refuse BEFORE any configuration (AC-005-22)
#   * consent-pending gets its own clearly-worded stop with the URL from the
#     CLI output — exit 3, no retry loop (AC-005-23)
#   * the funnel proxies HTTPS 443 on the funnel host to http://127.0.0.1:8000
#     (AC-005-24)
#   * PUBLIC_URL guidance is PRINTED, never applied — this script writes no
#     file in ~/docker-jitsi-meet and runs no destructive compose command
#     (AC-005-26/27; decision 10)
# All external tools are invoked by bare PATH-resolved name.
set -euo pipefail

readonly WEB_CONTAINER='docker-jitsi-meet-web-1'
readonly WEB_HTTP_PORT='8000'
readonly MEDIA_CONF='/run/web/config/nginx/meet.conf'

log()  { echo "[expose-funnel] $*"; }
warn() { echo "[expose-funnel] WARNING: $*" >&2; }
die()  { echo "[expose-funnel] ERROR: $*" >&2; exit 1; }

precheck_tailscale() {
  # Refuse before ANY configuration if tailscale is not installed / not up.
  command -v tailscale >/dev/null 2>&1 || die "pre-check failed: tailscale is not installed"
  if ! tailscale status >/dev/null 2>&1; then
    die "pre-check failed: tailscale status — tailscale is not up on this machine"
  fi
  # tailscale v1.102 emits no standalone "Hostname"/"TailName" fields: the node
  # name is Self.HostName (capital N) and the tailnet domain is embedded in
  # Self.DNSName (e.g. pcdanimoudo-1.tail343219.ts.net.). The funnel serves on
  # the MagicDNS name — derive the host from DNSName, never reconstruct it.
  local self_json dnsname
  self_json="$(tailscale status --self --json 2>/dev/null)" || die "pre-check failed: could not read the tailscale self status"
  NODE="$(printf '%s\n' "$self_json" | grep -oE '"HostName": *"[^"]+"' | head -1 | cut -d'"' -f4)"
  dnsname="$(printf '%s\n' "$self_json" | grep -oE '"DNSName": *"[^"]+"' | head -1 | cut -d'"' -f4)"
  [[ -n "$NODE" ]] || die "pre-check failed: could not read the tailscale node name"
  FUNNEL_HOST="${dnsname%.}"          # MagicDNS name, trailing dot stripped
  TAILNET="${FUNNEL_HOST#*.}"         # domain after the machine prefix
  [[ -n "$FUNNEL_HOST" ]] || die "pre-check failed: could not read the tailscale MagicDNS name"
  log "tailscale node: ${NODE} (tailnet ${TAILNET}) — funnel host will be https://${FUNNEL_HOST}"
}

precheck_backend() {
  # Read-only probe of the local Jitsi web backend the funnel will target.
  local code
  code="$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${WEB_HTTP_PORT}/" 2>/dev/null || true)"
  if [[ "$code" != "200" ]]; then
    warn "backend probe: http://127.0.0.1:${WEB_HTTP_PORT}/ answered '${code}' — the funnel will expose whatever the web container serves once it is up; continuing."
  fi
}

check_media_transport() {
  # Inspect the live rendered nginx config for a /colibri-ws proxy location.
  # The check is read-only (grep inside the container); a missing container or
  # a missing config file lands in the same "cannot carry media" branch —
  # honest default, never a false all-clear.
  if docker exec "$WEB_CONTAINER" grep -c -E 'colibri-ws' "$MEDIA_CONF" >/dev/null 2>&1; then
    log "media transport: /colibri-ws proxy present in the rendered nginx config — media CAN ride the funnel's TLS connection."
    return 0
  fi
  cat <<'BANNER'
[expose-funnel] ##############################################################
[expose-funnel] PATH A HARD LIMITATION — READ BEFORE BOOKING ANY MEETING
[expose-funnel]
[expose-funnel] Tailscale Funnel is an HTTPS-only proxy. It carries the Jitsi
[expose-funnel] web app and the XMPP signaling (a client can load the page and
[expose-funnel] join), but WebRTC media and the SCTP bridge channel CANNOT
[expose-funnel] traverse it: external clients get NO MEDIA through the funnel.
[expose-funnel] Upstream removed the old colibri-websocket TCP fallback
[expose-funnel] entirely (jitsi/docker-jitsi-meet #2285), so no upgrade or
[expose-funnel] setting puts media back on this path. Media-capable external
[expose-funnel] meetings require path B — the router UDP 10000 port-forward;
[expose-funnel] run deploy/home/expose-path-b.sh for the exact steps.
[expose-funnel] The funnel remains useful for tailnet-internal / LAN devices
[expose-funnel] (your own machines) and page+signaling access. Continuing —
[expose-funnel] the funnel itself will still be configured below.
[expose-funnel] ##############################################################
BANNER
}

configure_funnel() {
  # Current tailscale CLI (checked against `tailscale funnel --help` on this
  # host): one call exposes https://<node>.<tailnet>.ts.net:443 in the
  # background proxied to the local target. This is the configuration step —
  # only reached after every pre-check passed.
  local out rc=0
  # `tailscale funnel --bg` prints the consent URL then BLOCKS polling when
  # funnel is not yet enabled on the tailnet (unlike the older exit-non-zero
  # behavior). Bound it so the consent-pending state reaches the consent
  # boundary instead of hanging; timeout's exit 124 routes there like any
  # other non-zero.
  out="$(timeout 15 tailscale funnel --bg "http://127.0.0.1:${WEB_HTTP_PORT}" 2>&1)" || rc=$?
  if [[ "$rc" -ne 0 ]]; then
    handle_consent_boundary "$out"
  fi
  log "funnel active: https://${FUNNEL_HOST}:443 => http://127.0.0.1:${WEB_HTTP_PORT}"
  log "the funnel's TLS termination (Let's Encrypt) is automatic on the ts.net hostname."
}

handle_consent_boundary() {
  local out="$1"
  local url
  url="$(printf '%s\n' "$out" | grep -oE 'https?://[^[:space:]]+' | head -1 || true)"
  warn "tailscale rejected the funnel configuration (output above)."
  echo
  echo "[expose-funnel] OWNER CONSENT / ENABLEMENT STEP REQUIRED — this is expected on first use."
  echo "[expose-funnel] Tailscale Funnel is opt-in per tailnet: the tailnet owner (${TAILNET}) must"
  echo "[expose-funnel] complete a one-time consent step in a browser before any funnel can exist."
  if [[ -n "$url" ]]; then
    echo "[expose-funnel] Open this URL from the tailscale output in a browser and follow the enable flow:"
    echo "[expose-funnel]   ${url}"
  else
    echo "[expose-funnel] See the tailscale output above for the enable/consent URL."
  fi
  echo "[expose-funnel] After consenting, re-run: deploy/home/expose-funnel.sh"
  echo "[expose-funnel] Exit status 3 = stopped at the owner-consent boundary (not a failure of the checks)."
  exit 3
}

print_env_guidance() {
  # PRINTED ONLY (decision 10): applying PUBLIC_URL changes to the stack .env
  # automatically would risk the frozen local-:8443 contract. This script
  # never writes to the stack directory.
  echo
  log "next (manual, host-side) — point Jitsi at the funnel hostname:"
  printf '[expose-funnel]   edit ~/docker-jitsi-meet/.env and set:\n'
  printf '[expose-funnel]     PUBLIC_URL=https://%s\n' "$FUNNEL_HOST"
  printf '[expose-funnel]   then restart the web container:\n'
  printf '[expose-funnel]     cd ~/docker-jitsi-meet && docker compose up -d web\n'
}

main() {
  NODE=''; TAILNET=''; FUNNEL_HOST=''
  precheck_tailscale
  tailscale funnel status >/dev/null 2>&1 || log "note: tailscale funnel status reported an issue — proceeding to the configuration attempt, which will explain any consent requirement."
  precheck_backend
  check_media_transport
  print_env_guidance
  configure_funnel
  log "done — local endpoints (host.docker.internal:8443 / :8000) were not touched."
}

main "$@"
