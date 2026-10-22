# AC-005 Task 6 — Home runbook (`deploy/home/README.md`)

Content assertions on the runbook file (repo precedent: `AC-004-runbook.test.ts`).

## AC-005-40 — Install runbook
Given the file `deploy/home/README.md` in the repo
When its content is inspected
Then it documents the prerequisites: WSL2 with systemd, `Linger=yes` for dbueno (live-verified), passwordless sudo, a running docker-jitsi-meet stack, and the tool set node/bl/ffmpeg/ffprobe/gh
And it documents running `install-recording-host.sh` and what it installs: adapted systemd units (`rexi-recording.{service,timer}` in `/etc/systemd/system/`), the 0600 env file `/etc/rexi-recording.env`, and the 5-minute timer with `Persistent=true`
And it states the always-on caveat or points to `docs/recording-pipeline.md` for it

## AC-005-41 — Exposure runbook and the owner-executed switch
Given `deploy/home/README.md`
When its exposure content is inspected
Then it documents path A (`expose-funnel.sh`) including the one-time Tailscale Funnel owner consent as an explicit manual browser step
And it documents path B as the three owner-side layers (GoDaddy DNS A record → router port-forwards 443/tcp + 10000/udp → Windows netsh/firewall relay), referencing `expose-path-b.sh` output
And it states explicitly that `switch-meeting-base-url.sh` is executed manually by the owner and is never run automatically by any script
And it points to the A-vs-B decision matrix in `docs/recording-pipeline.md`

## AC-005-42 — Jibri finalize-placeholder SEVERE documented
Given `deploy/home/README.md`
When its troubleshooting content is inspected
Then it documents the jibri SEVERE log line `Failed to run finalize script` / `Cannot run program "/path/to/finalize"` (live-verified in `docker-jitsi-meet-jibri-1` logs, 2026-10-22)
And it states the SEVERE is harmless because recording processing is driven by the timer scan, not the finalize hook
And it gives the silencing procedure: unset `JIBRI_FINALIZE_RECORDING_SCRIPT_PATH` in the local stack env and recreate the jibri container
And it marks that procedure as a host-side change, not a repo change
