#!/usr/bin/env bash
# verify-jitsi.sh — health checks after deploy. Read-only. Run on the VPS.
#   bash verify-jitsi.sh --domain meet.rexi-ai.com
set -uo pipefail
DOMAIN=""; JITSI_DIR="${JITSI_DIR:-/opt/docker-jitsi-meet}"
while [[ $# -gt 0 ]]; do case $1 in --domain) DOMAIN="$2"; shift 2 ;; *) shift ;; esac; done
[ -n "$DOMAIN" ] || { echo "usage: $0 --domain HOST"; exit 1; }

ok=0; fail=0
check(){ if eval "$2" >/dev/null 2>&1; then echo "✓ $1"; ok=$((ok+1)); else echo "✗ $1"; fail=$((fail+1)); fi; }

check "web https://${DOMAIN} responds" "curl -skf -o /dev/null --max-time 15 https://$DOMAIN"
check "jitsi containers up" "[ \$(docker inspect -f '{{.State.Running}}' docker-jitsi-meet-jibri-1 2>/dev/null | wc -l) -ge 1 ]"
check "jibri joined jibribrewery" "cd $JITSI_DIR && docker compose -f docker-compose.yml -f jibri.yml logs jibri --tail 300 2>&1 | grep -q 'Joined MUC: jibribrewery'"
check "jicofo sees a JVB" "cd $JITSI_DIR && docker compose -f docker-compose.yml -f jibri.yml logs jicofo --tail 400 2>&1 | grep -q 'Added new videobridge'"
check "processor timer enabled" "systemctl is-enabled rexi-recording.timer"
check "let's encrypt cert present" "ls ~/.jitsi-meet-cfg/web/letsencrypt/live/$DOMAIN/fullchain.pem"
REC="${RECORDINGS_DIR:-$HOME/.jitsi-meet-cfg/storage/jibri/recordings}"
if [ -d "$REC" ]; then echo "· recordings dir has $(find "$REC" -name '*.mp4' | wc -l) mp4, $(find "$REC" -name .rexi-billed | wc -l) billed"; fi

echo; echo "$ok passed, $fail failed"
exit $([ "$fail" -eq 0 ] && echo 0 || echo 1)
