#!/usr/bin/env bash
# deploy-jitsi.sh — Deploy / update the RexiAI Jitsi + Jibri + recording-processor
# stack on the VPS. Idempotent: safe to re-run; updates images and config in place.
#
#   bash deploy/production/deploy-jitsi.sh --domain meet.rexi-ai.com \
#        --public-ip 203.0.113.10 --email you@rexi-ai.com
#        [--app-base-url https://rexi-ai.com] [--no-timer]
#
# Prereqs: setup-jitsi-host.sh has run (docker, node, ffmpeg, repos present).
# The app's Stripe/Resend secrets for the PROCESSOR live in /etc/rexi-recording.env
# (mode 0600, created from rexi-recording.env.example — this script will not
# overwrite it once it exists).
set -euo pipefail

DOMAIN=""; PUBLIC_IP=""; EMAIL=""; APP_BASE_URL="https://rexi-ai.com"
APP_DIR="${APP_DIR:-/opt/rexiAI}"; JITSI_DIR="${JITSI_DIR:-/opt/docker-jitsi-meet}"
PROC_ENV="/etc/rexi-recording.env"; INSTALL_TIMER=1

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift 2 ;;
    --public-ip) PUBLIC_IP="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --app-base-url) APP_BASE_URL="$2"; shift 2 ;;
    --no-timer) INSTALL_TIMER=0; shift ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done
[ -n "$DOMAIN" ] || { echo "ERROR: --domain required"; exit 1; }
[ -f "$JITSI_DIR/docker-compose.yml" ] || { echo "ERROR: docker-jitsi-meet not at $JITSI_DIR (run setup-jitsi-host.sh)"; exit 1; }
if [ -z "$PUBLIC_IP" ]; then
  echo "PUBLIC_IP not given; detecting via curl… (pass --public-ip to override)"
  PUBLIC_IP=$(curl -fsS https://api.ipify.org || true)
fi
[ -n "$PUBLIC_IP" ] || { echo "ERROR: could not determine the public IP"; exit 1; }

# ── 1. Jitsi .env (render from the template; preserve an existing one) ────────
cd "$JITSI_DIR"
if [ ! -f .env ]; then
  echo "[env] rendering .env from template (domain=$DOMAIN ip=$PUBLIC_IP)"
  sed -e "s#__DOMAIN__#$DOMAIN#g" -e "s#__PUBLIC_IP__#$PUBLIC_IP#g" -e "s#__EMAIL__#${EMAIL:-admin@$DOMAIN}#g" \
    "$APP_DIR/deploy/production/jitsi.env.example" > .env
  # gen-passwords.sh is LF on Linux → runs fine here (the Windows CRLF trap does not apply).
  chmod +x ./gen-passwords.sh; ./gen-passwords.sh
  mkdir -p ~/.jitsi-meet-cfg/{web,prosody,config,jibri,jvb,jicofo,storage/jibri/recordings}
  # Match the uid the containers run as (1000) so config writes aren't denied.
  chown -R 1000:1000 ~/.jitsi-meet-cfg || true
else
  echo "[env] .env exists — leaving it. To change domain/IP re-run with it removed or edit by hand."
fi
# Ensure the recording dir is writable by jibri (uid 1000).
chown -R 1000:1000 ~/.jitsi-meet-cfg/storage 2>/dev/null || true

# ── 2. Pull latest images + start stack + Jibri ──────────────────────────────
echo "[pull] updating jitsi images…"
docker compose -f docker-compose.yml -f jibri.yml pull || true
echo "[up] starting web/prosody/jicofo/jvb/jibri…"
docker compose -f docker-compose.yml -f jibri.yml up -d

# ── 3. Recording processor (host systemd timer) ──────────────────────────────
RECORDINGS_DIR="$HOME/.jitsi-meet-cfg/storage/jibri/recordings"
if [ "$INSTALL_TIMER" = 1 ]; then
  if [ ! -f "$PROC_ENV" ]; then
    echo "[processor] creating $PROC_ENV from example — EDIT IT (Stripe live key, billing token), then re-run."
    cp "$APP_DIR/deploy/production/rexi-recording.env.example" "$PROC_ENV"
    chmod 600 "$PROC_ENV"
  fi
  # Seed the processor's required vars if still placeholdered.
  sed -i -e "s#^APP_BASE_URL=.*#APP_BASE_URL=$APP_BASE_URL#" -e "s#^RECORDINGS_DIR=.*#RECORDINGS_DIR=$RECORDINGS_DIR#" -e "s#^MEETING_BASE_URL=.*#MEETING_BASE_URL=https://$DOMAIN#" "$PROC_ENV" 2>/dev/null || true

  echo "[processor] installing systemd unit + timer…"
  install -m 644 "$APP_DIR/deploy/production/rexi-recording.service" /etc/systemd/system/rexi-recording.service
  install -m 644 "$APP_DIR/deploy/production/rexi-recording.timer"   /etc/systemd/system/rexi-recording.timer
  chmod +x "$APP_DIR/scripts/recording-cron.sh" "$APP_DIR/scripts/process-recording.mjs"
  systemctl daemon-reload
  systemctl enable --now rexi-recording.timer
  systemctl restart rexi-recording.service  # run one scan immediately
fi

# ── 4. Verify ────────────────────────────────────────────────────────────────
echo "[verify] web…"
code=$(curl -sk -o /dev/null -w '%{http_code}' "https://$DOMAIN" || echo 000)
echo "  https://$DOMAIN → $code   (000/3xx right after DNS/cert; expect 200 once LE issues)"
echo "[verify] jibri in brewery…"
docker compose -f docker-compose.yml -f jibri.yml logs jibri --tail 200 2>&1 | grep -q "Joined MUC: jibribrewery" \
  && echo "  Jibri joined jibribrewery ✓" || echo "  (jibri not yet joined — check: docker compose -f jibri.yml logs jibri)"
[ "$INSTALL_TIMER" = 1 ] && { echo "[verify] processor timer:"; systemctl list-timers rexi-recording.timer --no-pager | head -3; }

cat <<EOF

=== Deployed. Next ===
1. DNS: A record $DOMAIN → $PUBLIC_IP (must resolve before Let's Encrypt).
2. Let's Encrypt staging is ON — once the cert works, set LETSENCRYPT_USE_STAGING=0 and re-run.
3. Edit $PROC_ENV: STRIPE_SECRET_KEY (live), RECORDED_BILLING_TOKEN, then: systemctl restart rexi-recording.service
4. Record a real booking's room; the timer bills it. Watch: journalctl -u rexi-recording.service -f
EOF
