// scripts/recording/bot/chrome.mjs — finding and launching the browser the bot
// joins with.
//
// WHY A BROWSER AT ALL: the bot's job is to be a participant in a Jitsi call.
// Jitsi is a WebRTC application, so a participant is a browser with an audio
// stack — there is no smaller client that can join a meet.jit.si room and hear
// it. No npm package is used: a system/Playwright Chromium is driven over the
// DevTools protocol, and the capture is done by PulseAudio + ffmpeg (see
// pulse.mjs). That keeps the dependency count at zero.
//
// The binary is configurable (BOT_CHROME_PATH) and resolved from a list of known
// locations; an absent browser is a loud, actionable error, never a silent skip.

import { existsSync, readdirSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const CHROME_PATH_ENV = 'BOT_CHROME_PATH'
export const CHROME_LAUNCH_TIMEOUT_MS = 30_000

const SYSTEM_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

const PLAYWRIGHT_ROOT = path.join(os.homedir(), '.cache', 'ms-playwright')

/**
 * Chromium builds under `~/.cache/ms-playwright`, newest first. Playwright ships
 * the binary in `chrome-linux64/` or `chrome-linux/` depending on the version, so
 * both are probed rather than assuming one.
 *
 * @returns {string[]}
 */
export function playwrightChromePaths(root = PLAYWRIGHT_ROOT) {
  if (!existsSync(root)) return []
  const builds = readdirSync(root)
    .filter((d) => d.startsWith('chromium-'))
    .sort()
    .reverse()
  const found = []
  for (const build of builds) {
    for (const dir of ['chrome-linux64', 'chrome-linux']) {
      const candidate = path.join(root, build, dir, 'chrome')
      if (existsSync(candidate)) found.push(candidate)
    }
  }
  return found
}

/**
 * Candidate browser binaries, highest priority first: explicit override, then the
 * system Chrome/Chromium names, then a Playwright-managed build.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function chromeCandidates(env = {}) {
  const override = env[CHROME_PATH_ENV]
  const head = override ? [override] : []
  return [...head, ...SYSTEM_CANDIDATES, ...playwrightChromePaths()]
}

/**
 * The browser to drive. Throws with the full candidate list when none is
 * executable — an absent browser must stop the bot, not degrade it to recording
 * silence.
 *
 * @param {Record<string, string | undefined>} env
 * @param {(file: string) => boolean} isFile injectable for tests
 * @returns {string}
 */
export function resolveChromePath(env = {}, isFile = defaultIsFile) {
  const candidates = chromeCandidates(env)
  const usable = candidates.find((c) => isFile(c))
  if (usable) return usable
  throw new Error(
    [
      'no Chrome/Chromium binary found for the recording bot.',
      `Set ${CHROME_PATH_ENV}=/path/to/chrome, or install Google Chrome.`,
      `Looked for: ${candidates.length > 0 ? candidates.join(', ') : '(nothing)'}`,
    ].join('\n')
  )
}

function defaultIsFile(file) {
  return existsSync(file) && statSync(file).isFile()
}

/**
 * Chrome argv. Headless, no sandbox (it runs as an unprivileged service user in a
 * container-like host), audio output ENABLED — muting would make the capture
 * silent, which is the one thing a recorder must not do.
 *
 * `--remote-debugging-pipe` instead of `--remote-debugging-port`: CDP then rides
 * file descriptors 3/4, so the bot opens no listening socket at all (the host is
 * behind carrier NAT and must be outbound-only).
 *
 * @param {{ profileDir: string, url?: string, extra?: string[] }} input
 * @returns {string[]}
 */
export function chromeArgs({ profileDir, url = 'about:blank', extra = [] }) {
  return [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    // Audio must actually render even though nobody clicked anything: the sink
    // is how the bot hears the meeting.
    '--autoplay-policy=no-user-gesture-required',
    // No human is present to answer a permission prompt for the mic/camera.
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    // Keep timers/renderers at full speed so audio is not throttled while the
    // window is backgrounded in the headless shell.
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--remote-debugging-pipe',
    `--user-data-dir=${profileDir}`,
    ...extra,
    url,
  ]
}
