// Task 1 (Ask A): auto-record prosody module + provisioning.
// Acceptance tests per specs/004-auto-record-transcribe-insights/20-acceptance/AC-004-auto-record-module.md
// Content-assertion pattern (repo precedent: AC-013-deployment-config.test.ts);
// the live behavioral proof (first-occupant trigger, one session) runs in the
// post-PR e2e stage (AC-004-50). The GLOBAL_MODULES upsert is additionally
// behavior-tested by extracting its bash function and running it on a temp .env.
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { describe, it, expect } from 'vitest'

const execFileAsync = promisify(execFile)

const REPO = process.cwd()
const MODULE_REPO_PATH = 'deploy/production/prosody-plugins-custom/mod_rexi_auto_record.lua'
const DEPLOY_PATH = 'deploy/production/deploy-jitsi.sh'
const JITSI_ENV_EXAMPLE = 'deploy/production/jitsi.env.example'

function repoFile(rel: string): string {
  return fs.readFileSync(path.join(REPO, rel), 'utf8')
}

async function runBash(script: string): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('bash', ['-c', script])
    return { code: 0, stdout, stderr }
  } catch (err) {
    const e = err as Error & { code?: number; stdout?: string; stderr?: string }
    return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' }
  }
}

function extractShellFunction(source: string, name: string): string {
  const lines = source.split('\n')
  const start = lines.findIndex((l) => l.startsWith(`${name}()`))
  expect(start).toBeGreaterThanOrEqual(0)
  const end = lines.findIndex((l, i) => i > start && l === '}')
  return lines.slice(start, end + 1).join('\n')
}

describe('AC-004 auto-record prosody module + provisioning', () => {
  it('AC-004-20: deploy-jitsi.sh provisions the auto-record module idempotently', async () => {
    const deploy = repoFile(DEPLOY_PATH)

    // The module ships at the pinned repo path…
    expect(fs.existsSync(path.join(REPO, MODULE_REPO_PATH))).toBe(true)
    // …and the script COPIES it into $CONFIG/prosody/prosody-plugins-custom/
    // (a byte-for-byte cp — re-running never rewrites content).
    expect(deploy).toMatch(
      /cp\s+"?\$\{?AUTO_RECORD_REPO_MODULE\}?[^"]*[^"]*"\s*"?\$\{?CUSTOM_PLUGIN_DIR\}?/
    )
    expect(deploy).toContain('prosody/prosody-plugins-custom')
    expect(deploy).toContain('mod_rexi_auto_record.lua')

    // Module enabling goes through the shared idempotent env-list helper,
    // invoked for the vhost hook (GLOBAL_MODULES — required by the scenario)
    // AND the MUC component hook (XMPP_MUC_MODULES — where occupant-joined
    // fires; live-verified: GLOBAL_MODULES alone does not reach the component).
    expect(deploy).toContain('rex_upsert_env_list GLOBAL_MODULES "$AUTO_RECORD_MODULE"')
    expect(deploy).toContain('rex_upsert_env_list XMPP_MUC_MODULES "$AUTO_RECORD_MODULE"')

    // Behavior proof of the idempotent upsert on a temp .env:
    const tmpEnv = fs.mkdtempSync(path.join(os.tmpdir(), 'rexi-upsert-')) + '/.env'
    fs.writeFileSync(tmpEnv, 'CONFIG=~/.jitsi-meet-cfg\n')
    const fn = extractShellFunction(deploy, 'rex_upsert_env_list')

    const r = await runBash(
      `${fn}\nrex_upsert_env_list GLOBAL_MODULES rexi_auto_record '${tmpEnv}'`
    )
    expect(r.code).toBe(0)
    let envText = fs.readFileSync(tmpEnv, 'utf8')
    expect(envText).toMatch(/^GLOBAL_MODULES=.*rexi_auto_record/m)

    await runBash(`${fn}\nrex_upsert_env_list GLOBAL_MODULES rexi_auto_record '${tmpEnv}'`)
    envText = fs.readFileSync(tmpEnv, 'utf8')
    const occurrences = (envText.match(/rexi_auto_record/g) || []).length
    expect(occurrences).toBe(1) // still exactly once after a second run

    // Pre-existing env-list line: appended, once, without clobbering peers.
    fs.writeFileSync(tmpEnv, 'GLOBAL_MODULES=foo,bar\n')
    await runBash(`${fn}\nrex_upsert_env_list GLOBAL_MODULES rexi_auto_record '${tmpEnv}'`)
    envText = fs.readFileSync(tmpEnv, 'utf8')
    expect(envText).toContain('GLOBAL_MODULES=foo,bar,rexi_auto_record')
  })

  it('AC-004-21: room-prefix gating is configured and defaults to rexi-', () => {
    const envExample = repoFile(JITSI_ENV_EXAMPLE)
    expect(envExample).toMatch(/REXI_AUTO_RECORD_PREFIX/)
    expect(envExample).toMatch(/rexi-/)
    expect(envExample).toMatch(/^GLOBAL_MODULES=.*rexi_auto_record/m)

    const lua = repoFile(MODULE_REPO_PATH)
    // reads the knob from the prosody container env with the literal default…
    expect(lua).toMatch(/os\.getenv\("REXI_AUTO_RECORD_PREFIX"\)\s+or\s+"rexi-"/)
    // …and the recording-start path is gated so only prefixed rooms can reach it.
    expect(lua).toContain('starts_with_prefix')
    const gate = lua.indexOf('starts_with_prefix(node)')
    // the CALL (last occurrence) must sit after the gate — the definition line
    // `local function start_file_recording(...)` naturally precedes the hook.
    const start = lua.lastIndexOf('start_file_recording(room, occupant)')
    expect(gate).toBeGreaterThan(-1)
    expect(start).toBeGreaterThan(gate)
  })

  it('AC-004-21: every knob the module reads is documented and defaulted', () => {
    const lua = repoFile(MODULE_REPO_PATH)
    const getEnvs = [...lua.matchAll(/os\.getenv\("([A-Z0-9_]+)"\)/g)].map((m) => m[1])
    expect(getEnvs).toContain('REXI_AUTO_RECORD_PREFIX')
    for (const knob of getEnvs) {
      // each os.getenv read carries an `or "<default>"` fallback — no silent half-wiring
      const line = lua.split('\n').find((l) => l.includes(`os.getenv("${knob}")`))
      expect(line).toMatch(/or\s+"/)
      expect(repoFile(JITSI_ENV_EXAMPLE)).toContain(knob)
    }
  })

  it('AC-004-22: deploy-jitsi.sh runs the luac syntax gate after the copy and aborts on failure', async () => {
    const deploy = repoFile(DEPLOY_PATH)
    // gate command, exactly per the scenario (docker exec <prosody> luac -p …)
    expect(deploy).toMatch(
      /docker exec "\$PROSODY_CID" luac -p \/prosody-plugins-custom\/mod_rexi_auto_record\.lua/
    )
    // copy happens BEFORE the stack starts (so the module exists at first boot),
    // and the gate after `up -d` (so a prosody container exists to exec into).
    const cpIdx = deploy.indexOf('cp "$AUTO_RECORD_REPO_MODULE"')
    const upIdx = deploy.indexOf('$COMPOSE up -d')
    const gateIdx = deploy.indexOf('luac -p')
    expect(cpIdx).toBeGreaterThan(-1)
    expect(cpIdx).toBeLessThan(upIdx)
    expect(upIdx).toBeLessThan(gateIdx)
    // failure path: module copy removed + .env restored + non-zero abort —
    // "leaving no half-provisioned auto-record stack".
    const failBlock = deploy.slice(gateIdx, deploy.indexOf('\nfi', gateIdx))
    expect(failBlock).toMatch(/rm -f "\$CUSTOM_PLUGIN_DIR\/mod_rexi_auto_record\.lua"/)
    expect(failBlock).toMatch(/cp "\$ENV_BACKUP" \.env/)
    expect(failBlock).toMatch(/exit 1/)
    expect(deploy).toMatch(/set -euo pipefail/) // script-level abort contract intact
  })

  it('unit: the module hooks first-occupant joins and sends the jibri start IQ once per room', () => {
    const lua = repoFile(MODULE_REPO_PATH)
    expect(lua).toMatch(/module:hook\("muc-occupant-joined"/)
    // the start stanza is the jibri file-recording IQ (same action the UI sends)
    expect(lua).toMatch(/action\s*=\s*"start"/)
    expect(lua).toMatch(/recording_mode\s*=\s*"file"/)
    expect(lua).toMatch(/xmlns\s*=\s*"http:\/\/jitsi\.org\/protocol\/jibri"/)
    // session-level idempotency guard: repeated joins never start a second session
    expect(lua).toContain('rexi_auto_record_started')
    expect(lua).toMatch(/human_occupants\(room\) ~= 1 then return/)
  })
})
