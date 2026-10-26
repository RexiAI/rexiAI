#!/usr/bin/env bash
# scripts/recording-bot-cron.sh — node-path-resolving entry point for the bot's
# systemd units (spec 006).
#
# WHY A WRAPPER: systemd starts with a minimal PATH, and this host's node lives under
# nvm. Pinning a node version inside a unit file would rot at the next upgrade, so the
# unit calls this script and the script resolves node the same way the processor's
# `recording-cron.sh` already does. Arguments are forwarded verbatim:
#
#   scripts/recording-bot-cron.sh --missed ~/.rexi-recording-bot/schedule.json
#   scripts/recording-bot-cron.sh --watch
#   scripts/recording-bot-cron.sh --run --room rexi-0123456789abcdef
#
# Env: NODE_BIN (optional override), plus everything the bot reads (RECORDINGS_DIR,
# BOT_SCHEDULE_FILE, BOT_CHROME_PATH, BOT_JITSI_BASE_URL). No secret is printed.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
if [ -z "$NODE_BIN" ]; then
  for candidate in "$HOME"/.nvm/versions/node/*/bin/node /usr/local/bin/node /usr/bin/node; do
    if [ -x "$candidate" ]; then NODE_BIN="$candidate"; break; fi
  done
fi
if [ -z "$NODE_BIN" ]; then
  echo "[recording-bot-cron] node not found — set NODE_BIN=/path/to/node" >&2
  exit 1
fi

echo "[recording-bot-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ) $* via $NODE_BIN"
exec "$NODE_BIN" scripts/recording-bot.mjs "$@"
