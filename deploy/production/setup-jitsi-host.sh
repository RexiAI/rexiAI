#!/usr/bin/env bash
# setup-jitsi-host.sh — One-time VPS bootstrap for the RexiAI Jitsi + Jibri +
# recording-processor host. Run ON the VPS as root (not in CI).
#
#   ssh root@<VPS_IP>
#   bash setup-jitsi-host.sh --domain meet.rexi-ai.com --email you@rexi-ai.com \
#        --repo git@github.com:RexiAI/<app>.git
#
# Idempotent: re-runnable, skips installed components. Jitsi needs ≥4 GB RAM; a
# 4 GB swapfile is added if RAM is low (Jibri records on an in-container Chrome).
set -euo pipefail

DOMAIN=""; EMAIL=""; REPO="${REPO:-}"; APP_DIR="/opt/rexiAI"; JITSI_DIR="/opt/docker-jitsi-meet"
JITSI_REPO="${JITSI_REPO:-https://github.com/jitsi/docker-jitsi-meet.git}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email)  EMAIL="$2";  shift 2 ;;
    --repo)   REPO="$2";   shift 2 ;;
    *) echo "Unknown flag: $1"; echo "Usage: $0 --domain HOST --email EMAIL [--repo GIT_URL]"; exit 1 ;;
  esac
done
[ "$(id -u)" = 0 ] || { echo "Run as root."; exit 1; }
[ -n "$DOMAIN" ] || { echo "ERROR: --domain required"; exit 1; }
[ -n "$REPO" ]   || { echo "ERROR: --repo <git url of the RexiAI app> required (the processor lives there)"; exit 1; }

if [ -f /etc/os-release ]; then . /etc/os-release; else ID="unknown"; fi
[ "$ID" = "debian" ] || [ "$ID" = "ubuntu" ] || { echo "Unsupported OS: $ID"; exit 1; }

# ── Docker + Compose plugin ──────────────────────────────────────────────────
if command -v docker >/dev/null 2>&1; then echo "[skip] docker present"
else
  echo "[docker] installing…"
  apt-get update -y; apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/$ID/gpg" | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$ID ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y; apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
fi
docker compose version >/dev/null 2>&1 || { echo "docker compose plugin missing"; exit 1; }

# ── node + ffmpeg (host-side recording processor) ────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "[node] installing NodeSource LTS…"
  apt-get install -y curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v ffprobe >/dev/null 2>&1 || { echo "[ffmpeg] installing…"; apt-get install -y ffmpeg; }
echo "[deps] node $(node -v), $(command -v ffprobe)"

# ── Swap for Jibri (Chrome wants 4 GB) ───────────────────────────────────────
RAM_GB=$(awk '/MemTotal/{printf "%d", $2/1048576}' /proc/meminfo)
if [ "$RAM_GB" -lt 6 ] && [ ! -f /swapfile ]; then
  echo "[swap] RAM=${RAM_GB}G < 6G → creating 4G swapfile…"
  fallocate -l 4G /swapfile; chmod 600 /swapfile; mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── Firewall ─────────────────────────────────────────────────────────────────
# 80/443 web+ACME, 4443/tcp ICE-TCP fallback, 10000/udp JVB media. (Add 3478 +
# the TURN relay range if you enable coturn.) Cloud security groups must match.
if command -v ufw >/dev/null 2>&1; then
  echo "[ufw] allowing Jitsi ports…"
  ufw allow OpenSSH || true
  ufw allow 80/tcp  || true
  ufw allow 443/tcp || true
  ufw allow 4443/tcp || true
  ufw allow 10000/udp || true
  ufw --force enable || true
  ufw status || true
else
  echo "[ufw] not installed — open 80,443,4443/tcp + 10000/udp in your cloud firewall."
fi

# ── Repos ────────────────────────────────────────────────────────────────────
command -v git >/dev/null 2>&1 || apt-get install -y git
[ -d "$JITSI_DIR/.git" ] && { echo "[git] updating docker-jitsi-meet"; git -C "$JITSI_DIR" pull --ff-only || true; } \
  || { echo "[git] cloning docker-jitsi-meet"; git clone "$JITSI_REPO" "$JITSI_DIR"; }
# App repo provides scripts/process-recording.mjs + the deploy files.
[ -d "$APP_DIR/.git" ] && { echo "[git] updating RexiAI app"; git -C "$APP_DIR" pull --ff-only || true; } \
  || { echo "[git] cloning RexiAI app"; git clone "$REPO" "$APP_DIR"; }

echo ""
echo "=== Host ready for $DOMAIN ==="
echo "  docker-jitsi-meet : $JITSI_DIR"
echo "  RexiAI (scripts)  : $APP_DIR"
echo "Next (as the deploy user): bash $APP_DIR/deploy/production/deploy-jitsi.sh --domain $DOMAIN --email $EMAIL"
