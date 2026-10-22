# Recording-processor sidecar image — the ALTERNATIVE to the host systemd timer,
# for keeping the whole stack inside Docker. The processor is dependency-free
# (bare node + system ffprobe + fetch), so this image is tiny.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Entry + the scripts/recording/ units it imports (spec 004 rewire). The image
# still lacks bl + gh, so only billing completes in container mode — the
# insight stages fail per-directory, contained (docs/recording-pipeline.md
# §Trigger); host-timer mode is the supported full-chain deployment.
COPY scripts/process-recording.mjs /app/process-recording.mjs
COPY scripts/recording/ /app/recording/
# Loop: scan every 5 min (cron-alike, no cron daemon). Override with `command`.
RUN printf '#!/bin/sh\nwhile true; do node /app/process-recording.mjs --scan; sleep ${SCAN_INTERVAL_SEC:-300}; done\n' > /app/loop.sh && chmod +x /app/loop.sh
CMD ["/app/loop.sh"]
