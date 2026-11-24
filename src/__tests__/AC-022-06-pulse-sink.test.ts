// AC-022-06-01 — characterization of scripts/recording/bot/pulse.mjs loadSink
// (injected pactl runner, no PulseAudio).
import { describe, expect, it, vi } from 'vitest'

import { loadSink } from '../../scripts/recording/bot/pulse.mjs'

const listing = (moduleId: string, name: string) =>
  `Sink #5\n\tName: ${name}\n\tOwner Module: ${moduleId}\n`

function fakes(stdouts: string[]) {
  const calls: { cmd: string; args: string[] }[] = []
  const runner = vi.fn(async (cmd: string, args: string[]) => {
    calls.push({ cmd, args })
    return { stdout: stdouts[calls.length - 1] ?? '' }
  })
  const log = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
  return { calls, runner, log }
}

describe('AC-022-06-01: loadSink branches are pinned', () => {
  it('AC-022-06-01: loads the sink, reads back its owner and returns the ids', async () => {
    const f = fakes(['42\n', listing('42', 'rexi-bot-1')])
    const result = await loadSink({
      server: 'unix:/s',
      sinkName: 'rexi-bot-1',
      runner: f.runner as never,
      log: f.log as never,
    })
    expect(result).toEqual({ sinkName: 'rexi-bot-1', requested: 'rexi-bot-1', moduleId: '42' })
    expect(f.calls[0].cmd).toBe('pactl')
    expect(f.calls[0].args).toContain('load-module')
    expect(f.calls[1].args).toEqual(['--server', 'unix:/s', 'list', 'sinks'])
    expect(f.log.warn).not.toHaveBeenCalled()
    expect(f.log.log).toHaveBeenCalledWith(
      '[recording-bot] null sink rexi-bot-1 loaded (module 42)'
    )
  })

  it('AC-022-06-01: takes the last stdout line as the module id', async () => {
    const f = fakes(['warning noise\n7\n', listing('7', 'rexi-bot-1')])
    const result = await loadSink({
      server: 's',
      sinkName: 'rexi-bot-1',
      runner: f.runner as never,
      log: f.log as never,
    })
    expect(result.moduleId).toBe('7')
  })

  it('AC-022-06-01: a taken name warns and returns the sink PulseAudio actually made', async () => {
    const f = fakes(['9\n', listing('9', 'rexi-bot-1.2')])
    const result = await loadSink({
      server: 's',
      sinkName: 'rexi-bot-1',
      runner: f.runner as never,
      log: f.log as never,
    })
    expect(result).toEqual({
      sinkName: 'rexi-bot-1.2',
      requested: 'rexi-bot-1',
      moduleId: '9',
    })
    expect(f.log.warn).toHaveBeenCalledWith(
      '[recording-bot] sink rexi-bot-1 was taken; PulseAudio created rexi-bot-1.2'
    )
  })

  it('AC-022-06-01: an empty or non-numeric module id throws before listing sinks', async () => {
    for (const out of ['', '\n', 'Failure: nope\n']) {
      const f = fakes([out])
      await expect(
        loadSink({ server: 's', sinkName: 'x', runner: f.runner as never, log: f.log as never })
      ).rejects.toThrow(`pactl did not report a module id for sink x: ${out}`)
      expect(f.calls).toHaveLength(1)
    }
  })

  it('AC-022-06-01: no sink owned by the module throws', async () => {
    const f = fakes(['3\n', listing('4', 'other')])
    await expect(
      loadSink({ server: 's', sinkName: 'x', runner: f.runner as never, log: f.log as never })
    ).rejects.toThrow('loaded module 3 but no sink reports it as its owner')
  })
})
