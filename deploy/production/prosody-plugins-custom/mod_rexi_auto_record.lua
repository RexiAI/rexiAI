-- mod_rexi_auto_record — auto-start Jibri file recording for first-party (rexi-) rooms.
--
-- WHY: RexiAI meetings must be recorded for the recording→transcription→
-- insight pipeline (spec 004). Requiring a human to click "Start recording"
-- is unreliable; the room NAME prefix is the consent boundary instead: only
-- rooms starting with the configured prefix are auto-recorded, and RexiAI
-- bookings always mint rooms as rexi-<hex>. Non-prefixed rooms never reach
-- the recording-start path (AC-004-21) — that is the privacy guarantee.
--
-- HOW: on the FIRST human occupant joining a matching room, send the same
-- `<jibri action="start" recording_mode="file"/>` set-IQ the moderator UI's
-- recording button sends, addressed to the room's MUC jid, from the joining
-- occupant's own MUC occupant jid (the exact shape mod_muc delivers to jicofo
-- when a real client clicks the button). Being an internal, module-originated
-- stanza it bypasses mod_filter_iq_jibri, whose job is guarding the CLIENT
-- entry point — deliberate here because the trigger is the trusted server
-- side of the consent boundary.
--
-- IDEMPOTENCY: one session per meeting — the flag lives on room._data, so
-- repeated occupant-joined events (second participant, reconnects) never
-- start a second Jibri session (live-proven by AC-004-50).
--
-- Knobs (every knob the module reads is documented + defaulted — no silent
-- half-wiring):
--   REXI_AUTO_RECORD_PREFIX  env var, default "rexi-". Room-name prefix that
--                            opts a room into auto-recording. Documented in
--                            deploy/production/jitsi.env.example; read from
--                            the prosody CONTAINER env (forward it into the
--                            container per docs/local-e2e-testing.md).
--
-- Enabled via the stack's GLOBAL_MODULES mechanism (deploy-jitsi.sh
-- provisions it); /prosody-plugins-custom is first on plugin_paths.

local st = require "util.stanza";
local jid = require "util.jid";
local util = module:require "util";
local is_focus = util.is_focus;
local is_jibri = util.is_jibri;
local is_transcriber = util.is_transcriber;
local is_healthcheck_room = util.is_healthcheck_room;

local room_prefix = os.getenv("REXI_AUTO_RECORD_PREFIX") or "rexi-";

module:log("info", "rexi_auto_record: loaded, recording rooms starting with '%s'", room_prefix);

local function is_backend_or_owner(occupant_jid)
    if occupant_jid == nil then return true end
    if is_focus(occupant_jid) then return true end
    if is_jibri(occupant_jid) then return true end
    if is_transcriber(occupant_jid) then return true end
    return false
end

local function human_occupants(room)
    local n = 0;
    for _, occupant in room:each_occupant() do
        if not is_backend_or_owner(occupant.jid) then n = n + 1 end
    end
    return n
end

local function starts_with_prefix(name)
    return name ~= nil and #room_prefix > 0 and name:sub(1, #room_prefix) == room_prefix
end

local function start_file_recording(room, occupant)
    local iq = st.stanza("iq", { from = occupant.jid, to = room.jid, type = "set" })
        :tag("jibri", {
            xmlns = "http://jitsi.org/protocol/jibri",
            action = "start",
            recording_mode = "file",
            streaming_mode = "disabled",
        }):up();
    module:send(iq);
    room._data.rexi_auto_record_started = true;
    module:log("info", "rexi_auto_record: started file recording for %s (first human %s)",
        room.jid, occupant.jid);
end

module:hook("muc-occupant-joined", function(event)
    local room, occupant = event.room, event.occupant;

    -- Consent boundary FIRST: rooms outside the prefix never reach any
    -- recording-start logic, and the per-room flag short-circuits repeats.
    if room._data.rexi_auto_record_started then return end
    if is_healthcheck_room(room.jid) then return end

    local node = jid.split(room.jid);
    if not starts_with_prefix(node) then return end
    if is_backend_or_owner(occupant.jid) then return end

    -- Only the FIRST human counts as the trigger; the joining occupant is
    -- already present, so exactly one human means "this join started it".
    if human_occupants(room) ~= 1 then return end

    start_file_recording(room, occupant);
end);
