#!/usr/bin/env bash
# deploy/home/switch-meeting-base-url.sh — spec 005 Task 5 (Ask E): the ONLY
# sanctioned way to change the production MEETING_BASE_URL.
#
# Guarded by three health gates that ALL pass before any Vercel mutation:
#   GATE 1  TLS validity      — curl against the URL root WITHOUT -k/--insecure;
#                               a non-zero curl exit means the certificate is
#                               untrusted/invalid (or DNS/connectivity died
#                               before TLS), and the switch refuses.
#   GATE 2  web reachability  — the root must answer HTTP 200.
#   GATE 3  probe room page   — GET <url>/rexi-probe-switch-check must return
#                               200 with an HTML body. A fixed non-persistent
#                               probe room (decision 9) proves the web app
#                               actually serves meetings at that URL; the
#                               rexi- prefix keeps even the probe inside the
#                               auto-record consent boundary.
# Any gate failure ⇒ non-zero exit, the failed gate named, ZERO vercel
# invocations, nothing printed as rollback/redeploy (refusal-before-mutation).
#
# NEVER invoked automatically: no other script in the repo executes this file
# (AC-005-39); the runbooks state the owner runs it by hand.
#
# Replacement mechanism = vercel env add's --force overwrite flag (verified
# against vercel 64.5.0 on this host: --force "Overwrite an existing variable
# for the same target", --value for non-interactive use) — so an "already
# exists" condition replaces instead of aborting (AC-005-38).
set -euo pipefail

PROBE_ROOM='rexi-probe-switch-check'

log()  { echo "[switch-meeting-base-url] $*"; }
fail() { echo "[switch-meeting-base-url] ERROR: $*" >&2; exit "$2"; }

usage() {
  echo "Usage: switch-meeting-base-url.sh <public-url>"
  echo "  Guarded prod switch: health-gates the URL, then sets Vercel production"
  echo "  MEETING_BASE_URL and redeploys. Owner-executed; never run automatically."
}

gate1_tls() {
  # TLS validity by certificate: a plain curl (NO -k, NO --insecure anywhere
  # in this script) fails on an untrusted cert. curl exit 60 ⇒ cert problem;
  # DNS/connect failures also land here — none of them are "TLS valid".
  if ! curl -sS --max-time 15 -o /dev/null "$URL/"; then
    fail "GATE 1 (TLS gate) FAILED — curl could not establish trusted HTTPS on $URL (invalid/untrusted certificate, or DNS/connectivity failed). Production is unchanged." 1
  fi
  log "GATE 1 (TLS validity) passed."
}

gate2_reachability() {
  local code
  code="$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "$URL/")" ||
    fail "GATE 2 (reachability gate) FAILED — the Jitsi web root on $URL did not answer (connection error). Production is unchanged." 1
  if [[ "$code" != "200" ]]; then
    fail "GATE 2 (reachability gate) FAILED — $URL/ answered HTTP $code, not 200. Production is unchanged." 1
  fi
  log "GATE 2 (Jitsi web reachable) passed."
}

gate3_probe_room() {
  # One GET carrying both the status code (marker suffix) and the body. The
  # marker has NO leading newline on purpose: a newline would split the call
  # log that the ordering tests read.
  local resp code body
  resp="$(curl -sS --max-time 20 -w 'HTTPCODE=%{http_code}' "$URL/$PROBE_ROOM")" ||
    fail "GATE 3 (probe-room gate) FAILED — the probe room page on $URL did not load (connection error). Production is unchanged." 1
  code="${resp##*HTTPCODE=}"
  body="${resp%HTTPCODE=*}"
  if [[ "$code" != "200" ]]; then
    fail "GATE 3 (probe-room gate) FAILED — $URL/$PROBE_ROOM answered HTTP $code, not 200. Production is unchanged." 1
  fi
  if [[ "$body" != *"<"* ]]; then
    fail "GATE 3 (probe-room gate) FAILED — $URL/$PROBE_ROOM returned no HTML body. Production is unchanged." 1
  fi
  log "GATE 3 (probe room page loads) passed."
}

main() {
  if [[ $# -lt 1 || -z "${1:-}" ]]; then
    usage
    exit 2
  fi
  case "$1" in
    https://*) URL="${1%/}" ;;
    *) usage; fail "the <public-url> must start with https:// — the TLS gate is the whole point of this script" 2 ;;
  esac

  gate1_tls
  gate2_reachability
  gate3_probe_room
  log "all three health gates passed — mutating Vercel production now."

  # Replace-in-place: --force overwrites an existing value (never aborts on
  # "already exists"), --value is the non-interactive value, -y skips prompts.
  vercel env add MEETING_BASE_URL production --force --value "$URL" -y
  vercel deploy --prod --yes

  log "MEETING_BASE_URL=$URL is now the production value and the app is redeploying."
  echo
  log "ROLLBACK (owner-executed, restores the previous state):"
  echo "  vercel env rm MEETING_BASE_URL production --yes   # or: vercel env add ... --force --value <previous-url>"
  echo "  vercel deploy --prod --yes"
}

main "$@"
