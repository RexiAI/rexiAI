#!/usr/bin/env bash
# Cron / systemd-timer entry point for the recording→billing pipeline.
#
# Runs `process-recording.mjs --scan`, which sweeps the Jibri recordings dir for
# finished, not-yet-billed recordings and bills each one. Idempotent: the
# processor writes a `.rexi-billed` marker beside each recording it bills and
# skips marked ones, so overlapping or repeated runs never double-charge.
#
# This is the host-side trigger (the Jitsi host, where the recordings + ffprobe +
# node + .env live). It cannot be a serverless function or a Jibri finalize-hook:
# see docs/recording-pipeline.md §Trigger.
#
# Install (crontab -e), every 5 minutes — cron's PATH is minimal, so pin NODE_BIN:
#   */5 * * * * NODE_BIN=$(command -v node) /home/dbueno/projects/rexiAI/scripts/recording-cron.sh >> /home/dbueno/rexi-recording.log 2>&1
#
# Env: NODE_BIN (optional; auto-detected), RECORDINGS_DIR / STRIPE_SECRET_KEY /
# RECORDED_BILLING_TOKEN / APP_BASE_URL / MEETING_BASE_URL are read from .env by
# the processor.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

# Resolve node: explicit NODE_BIN, else PATH, else common install locations
# (cron runs with a minimal PATH, so `command -v node` often fails there).
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
if [ -z "$NODE_BIN" ]; then
  for candidate in "$HOME"/.nvm/versions/node/*/bin/node /usr/local/bin/node /usr/bin/node; do
    if [ -x "$candidate" ]; then NODE_BIN="$candidate"; break; fi
  done
fi
if [ -z "$NODE_BIN" ]; then
  echo "[recording-cron] node not found — set NODE_BIN=/path/to/node" >&2
  exit 1
fi

echo "[recording-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ) scan via $NODE_BIN"
exec "$NODE_BIN" scripts/process-recording.mjs --scan
