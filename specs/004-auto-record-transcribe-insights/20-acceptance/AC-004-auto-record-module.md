# AC-004: Auto-record prosody module + provisioning (Task 1, Ask A)

Live behavioral proof of the module (first-occupant trigger, single session,
non-matching rooms untouched) runs in the e2e stage — see
`AC-004-e2e-chain.md` (AC-004-50, AC-004-51). The scenarios here are the
in-suite-verifiable provisioning, configuration, and syntax-gate criteria
(repo pattern: content-assertion tests, cf. `AC-013-deployment-config.test.ts`).

## AC-004-20 — deploy-jitsi.sh provisions the auto-record module idempotently
Given a Jitsi host checkout whose Jitsi compose dir has a rendered .env
When deploy/production/deploy-jitsi.sh runs to completion
Then the file mod_rexi_auto_record.lua exists in $CONFIG/prosody/prosody-plugins-custom/ with the same content as the repo copy deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua
And the Jitsi .env sets GLOBAL_MODULES to a value that includes rexi_auto_record
When deploy-jitsi.sh is run a second time
Then GLOBAL_MODULES still contains rexi_auto_record exactly once (no duplicated entry)
And the provisioned module file content is unchanged

## AC-004-21 — Room-prefix gating is configured and defaults to rexi-
Given deploy/production/jitsi.env.example
Then it documents the REXI_AUTO_RECORD_PREFIX knob with default value rexi-
And the module source deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua reads the room prefix from that env knob and falls back to rexi- when it is unset
And the module's recording-start path is gated so that only rooms whose name starts with the configured prefix can trigger a Jibri session (non-matching rooms get no recording-start logic)

## AC-004-22 — Provisioned module passes the luac syntax gate; deploy aborts on failure
Given the module file has been copied into the prosody container at /prosody-plugins-custom/mod_rexi_auto_record.lua
When docker exec <prosody-container> luac -p /prosody-plugins-custom/mod_rexi_auto_record.lua runs
Then it exits 0 for the module shipped in this repo
And deploy-jitsi.sh performs this syntax gate after the copy step and aborts with a non-zero exit when the gate fails, leaving no half-provisioned auto-record stack
