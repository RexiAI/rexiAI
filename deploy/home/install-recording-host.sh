#!/usr/bin/env bash
# deploy/home/install-recording-host.sh — spec 005 Task 1 (Ask A): install the
# recording processor's systemd timer on THIS home machine (WSL2 + systemd),
# adapted from the shipped VPS units WITHOUT touching them.
#
# What it does, in order (this file is the flow contract pinned by
# specs/005-home-hosted-recording/20-acceptance/AC-005-home-install.md):
#   1. df pre-flight on the recordings filesystem (refuse before mutating)
#   2. write /etc/rexi-recording.env (mode 0600, exactly three keys — decision 5)
#   3. write adapted copies of the units to /etc/systemd/system/ (same names —
#      decision 4; the shipped VPS unit files under deploy/ are NEVER written)
#   4. daemon-reload + enable --now the timer
#   5. trigger ONE immediate service run and verify a scan cycle appeared in
#      the journal — scan-cycle evidence, not stage success (decision 11: the
#      ASR 401 containment until spec 006 must not fail verification)
# Idempotent: every step overwrites its own target; a second run exits 0.
# Secrets policy: this script never prints env-file contents or values, and
# the env file carries no credential keys — billing runs in standing-disabled
# mode and gh/bl use the dbueno user's existing host auth (decision 5).
set -euo pipefail

# Repo root resolved at runtime from this script's own location — the same
# BASH_SOURCE pattern scripts/recording-cron.sh:21 uses. No /opt-style
# absolute checkout path is ever assumed.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

ENV_FILE="/etc/rexi-recording.env"
SERVICE_UNIT="/etc/systemd/system/rexi-recording.service"
TIMER_UNIT="/etc/systemd/system/rexi-recording.timer"
RECORDINGS_DIR="${RECORDINGS_DIR:-/home/dbueno/rexi-recordings}"
MIN_FREE_GB="${REXI_MIN_FREE_GB:-20}"   # decision 2: reuse the guard's knob

log() { echo "[install-recording-host] $*"; }
die() { echo "[install-recording-host] ERROR: $*" >&2; exit 1; }

preflight_disk_space() {
  # Refusal-before-mutation (decision 2): free space on the recordings
  # filesystem must be provably at/above the threshold BEFORE any write or
  # systemctl call. Unlike the processor's scan guard (which fails open,
  # decision 3), the installer fails CLOSED on an unknown value: it is a
  # deliberate operator action, and "df could not answer" must abort, not
  # install onto a possibly-full disk.
  [[ -d "$RECORDINGS_DIR" ]] || die "recordings directory does not exist — refusing to install"
  local free_kb free_gb
  free_kb="$(df -kP "$RECORDINGS_DIR" | awk 'NR==2 {print $4}')"
  [[ "$free_kb" =~ ^[0-9]+$ ]] || die "cannot determine free space on the recordings filesystem (df output unparseable) — refusing before any change"
  free_gb=$((free_kb / 1024 / 1024))
  if [ "$free_gb" -lt "${MIN_FREE_GB}" ]; then
    die "only ${free_gb} GB free on the recordings filesystem, below REXI_MIN_FREE_GB=${MIN_FREE_GB} GB — refusing before any change"
  fi
  log "disk pre-flight OK: ${free_gb} GB free (threshold ${MIN_FREE_GB} GB)"
}

write_env_file() {
  # Exactly the three non-secret home values (decision 5) — no credential
  # keys; bl/gh authenticate through the dbueno user's host-level auth.
  # install -m 600 creates-or-replaces atomically with the right mode.
  local tmp
  tmp="$(mktemp)"
  cat >"$tmp" <<EOF
RECORDINGS_DIR=/home/dbueno/rexi-recordings
APP_BASE_URL=https://rexi-ai.com
MEETING_BASE_URL=https://meet.jit.si
EOF
  sudo install -m 600 -o root -g root "$tmp" "$ENV_FILE"
  rm -f "$tmp"
  log "wrote $ENV_FILE (mode 0600, three keys, no secret values)"
}

write_unit_files() {
  # Tool PATH assembled at install time from wherever node resolves for THIS
  # user (covers the whole nvm bin directory — node, the bl CLI and the deploy
  # CLI live there on this host), plus the system dirs (ffmpeg, ffprobe, gh,
  # tailscale). No interpreter version is baked in.
  local node_dir path_value
  node_dir="$(dirname "$(command -v node)")" || die "node not found on PATH — install the tool chain first"
  path_value="${node_dir}:/usr/local/bin:/usr/bin:/bin"

  sudo tee "$SERVICE_UNIT" >/dev/null <<EOF
# Home-adapted copy of the shipped VPS unit (spec 005 Task 1). The shipped VPS
# unit files stay untouched — this install only writes under /etc/systemd/system/.
[Unit]
Description=RexiAI recording→billing processor (home WSL)
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
WorkingDirectory=${REPO}
EnvironmentFile=/etc/rexi-recording.env
ExecStart=${REPO}/scripts/recording-cron.sh
Environment=PATH=${path_value}
User=dbueno
# Never let one bad recording block the next; log and move on.
TimeoutStartSec=300
Nice=10
EOF

  sudo tee "$TIMER_UNIT" >/dev/null <<EOF
# Home-adapted copy of the shipped VPS timer — semantics preserved exactly:
# Persistent=true catches up a missed run after the machine was down.
[Unit]
Description=RexiAI recording→billing processor (every 5m)

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true
RandomizedDelaySec=30

[Install]
WantedBy=timers.target
EOF
  log "wrote $SERVICE_UNIT and $TIMER_UNIT (repo: $REPO)"
}

enable_timer() {
  sudo systemctl daemon-reload
  sudo systemctl enable --now rexi-recording.timer
  log "timer enabled"
}

verify_first_run() {
  # One immediate run…
  log "triggering the first scan run…"
  sudo systemctl start rexi-recording.service
  # …wait for the oneshot to leave the active state…
  for _ in $(seq 1 90); do
    if systemctl is-active --quiet rexi-recording.service; then
      sleep 2
    else
      break
    fi
  done
  # …then declare success ONLY on scan-cycle evidence (decision 11): the
  # cron entry line or the pipeline's Scanning line. Processor stage
  # failures inside that cycle (the ASR upload-policy 401 expected until
  # spec 006 lands) are contained by design and must NOT flip this verdict —
  # the criterion is that the scan ran, not that every stage succeeded.
  if journalctl -u rexi-recording.service --no-pager -n 300 | grep -qE '\[recording-cron\]|Scanning'; then
    log "scan-cycle evidence found in the journal — install verified."
    return 0
  fi
  log "no scan-cycle evidence in the journal — last lines (tail):"
  journalctl -u rexi-recording.service --no-pager -n 30 || true
  die "install verification failed: the timer fired but no scan cycle was observed"
}

main() {
  preflight_disk_space
  write_env_file
  write_unit_files
  enable_timer
  verify_first_run
  log "home recording host installed; MEETING_BASE_URL stays the meet.jit.si"
  log "placeholder until the owner runs the guarded prod switch by hand."
}

main "$@"
