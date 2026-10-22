#!/usr/bin/env node
// Recording processor — the host-side half of the recording→insights pipeline.
//
// WHY THIS IS A SCRIPT AND NOT AN api/ FUNCTION: the booking app's backend is
// Vercel serverless functions (api/*.ts) — request-driven, ephemeral, with no
// access to the Jitsi host's filesystem and no ffprobe. A finished Jibri
// recording is a file on the Jitsi host that appears on Jibri's schedule, not on
// an HTTP request. So this processor runs ON the Jitsi host (co-located with
// Jibri + the recordings + ffprobe) and calls the existing serverless endpoint
// POST /api/bookings/recorded-billing over HTTP. It is the only non-serverless
// component the recording feature needs. See docs/recording-pipeline.md.
//
// Chain (spec 004): Jibri MP4(s) → billing (optional, fail-closed without
// credentials) → audio extraction of ALL session mp4s in chronological order →
// local whisper (faster-whisper) → transcript.json → local ollama chat →
// customer-brief.md → idempotent GitHub issue delivery. Three INDEPENDENT stage markers:
// .rexi-billed, .rexi-transcribed, .rexi-analyzed. Billing is unchanged;
// transcription/insight need no Stripe at all.
//
// Trigger options (pick one):
//   1. Jibri finalize-script (automatic, once per recording) — set
//      JIBRI_FINALIZE_RECORDING_SCRIPT_PATH to a wrapper that calls:
//        node /path/to/rexiAI/scripts/process-recording.mjs --jibri-dir "$1"
//   2. Cron / systemd timer / manual scan of the recordings directory:
//        node scripts/process-recording.mjs --scan
//   3. Explicit one-off (most reliable for testing):
//        node scripts/process-recording.mjs --room rexi-<hex> --recording <mp4|dir>
//
// Env (loaded from .env): STRIPE_SECRET_KEY, RECORDED_BILLING_TOKEN,
//   APP_BASE_URL (where the api runs: `vercel dev` → http://localhost:3000, or
//   the deployed URL), RECORDINGS_DIR (default ~/.jitsi-meet-cfg/storage/jibri/
//   recordings), DASHSCOPE_API_KEY (bl auth — env, never argv), GH_TOKEN /
//   GITHUB_TOKEN (gh auth — env, never argv), REXI_ASR_LANGUAGE (default es).
//   Billing now OPTIONAL: without credentials the billing stage skips fail-closed
//   and the transcription/insight stages still run (spec 004 Task 6).
//
// Add --dry-run to probe + plan without mutating anything (no POST, no bl/gh
// calls, no files, no markers).
//
// The real CLI behavior lives in the injectable units under scripts/recording/;
// this file only wires process env/argv to the real execFile/fetch and exits.

import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

import { runCli } from './recording/cli.mjs'

const execFileAsync = promisify(execFile)
// bl/gh/ffmpeg output can be large (chat completions, ASR results); 64 MB cap.
const MAX_BUFFER = 64 * 1024 * 1024

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (process.env['STRIPE_SECRET_KEY'] || !existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

async function main() {
  loadEnv()
  const runner = async (cmd, args) => {
    const { stdout } = await execFileAsync(cmd, args, { maxBuffer: MAX_BUFFER })
    return { stdout }
  }
  const { exitCode } = await runCli({
    argv: process.argv.slice(2),
    env: process.env,
    deps: { runner, fetch },
  })
  process.exit(exitCode)
}

main().catch((e) => {
  console.error(`processor error: ${e instanceof Error ? e.stack : String(e)}`)
  process.exit(1)
})
