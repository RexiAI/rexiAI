#!/usr/bin/env bash
# Optional ALTERNATIVE trigger (instead of the systemd timer): run by Jibri as
# its finalize-script, once per finished recording. This script runs INSIDE the
# jibri container, which has NO node/repo — so it must call out to the HOST.
#
# Enable by setting in the jitsi .env:
#   JIBRI_FINALIZE_RECORDING_SCRIPT_PATH=/config/finalize.sh
# and bind-mounting this file into the container at /config/finalize.sh.
#
# $1 = the recording dir (host-mapped /storage/recordings/<session>). The processor
# resolves room→reservation from metadata.json + ffprobes the MP4. We hand it to
# the host processor via SSH over the docker host gateway (host.docker.internal)
# is not available in a plain-Linux VPS bridge; on a VPS the simpler pattern is
# the systemd timer (deploy default). This file exists for parity/documenting the
# option; for it to work, point it at a host-side HTTP receiver you run.
set -euo pipefail
REC_DIR="${1:?usage: finalize.sh <recording_dir>}"
# Default deployment uses the timer; the finalize path is left as a documented
# stub so enabling it is an explicit, reviewed choice (not silently half-wired).
echo "[jibri finalize] recording done at $REC_DIR — timer will pick it up (no host receiver configured)" >&2
exit 0
