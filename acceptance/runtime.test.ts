import { describe, expect, it } from 'vitest'

import type { Feature } from './ir'
import { expandFeature, runExecution, step, type Execution, type StepHandler } from './runtime'

const FEATURE: Feature = {
  name: 'Base map',
  background: [{ keyword: 'Given', text: 'the application is open' }],
  scenarios: [
    {
      name: 'Initial view',
      steps: [{ keyword: 'Then', text: 'the zoom is 5' }],
      examples: [],
    },
    {
      name: 'Zooming',
      steps: [
        { keyword: 'When', text: 'the user zooms to <zoom>' },
        { keyword: 'Then', text: 'the zoom is <zoom>' },
      ],
      examples: [{ zoom: '6' }, { zoom: '7' }],
    },
  ],
}

describe('expandFeature', () => {
  it('runs a scenario without examples once, with an empty example', () => {
    const [initialView] = expandFeature(FEATURE)

    expect(initialView?.name).toBe('Initial view/example_1')
    expect(initialView?.example).toEqual({})
  })

  it('runs a scenario with examples once per row, in row order', () => {
    const zooming = expandFeature(FEATURE).slice(1)

    expect(zooming.map((execution) => execution.name)).toEqual(['Zooming/example_1', 'Zooming/example_2'])
    expect(zooming.map((execution) => execution.example)).toEqual([{ zoom: '6' }, { zoom: '7' }])
  })

  it('puts the background steps before the steps of every execution', () => {
    const steps = expandFeature(FEATURE).map((execution) => execution.steps.map((each) => each.text))

    expect(steps).toEqual([
      ['the application is open', 'the zoom is 5'],
      ['the application is open', 'the user zooms to <zoom>', 'the zoom is <zoom>'],
      ['the application is open', 'the user zooms to <zoom>', 'the zoom is <zoom>'],
    ])
  })
})

interface Journal {
  readonly entries: string[]
}

const newJournal = (): Journal => ({ entries: [] })

function execution(example: Readonly<Record<string, string>>, ...texts: string[]): Execution {
  return {
    name: 'Zooming/example_1',
    example,
    steps: texts.map((text) => ({ keyword: 'When', text })),
  }
}

const RECORD_ZOOM: StepHandler<Journal> = step(/^the user zooms to (.+)$/, (journal, [zoom]) => {
  journal.entries.push(`zoom ${zoom}`)
})

const RECORD_MOVE: StepHandler<Journal> = step(/^the user moves to (.+), (.+)$/, (journal, [lng, lat]) => {
  journal.entries.push(`move ${lng} ${lat}`)
})

describe('runExecution', () => {
  it('runs the steps in order against one world', async () => {
    const journal = newJournal()

    await runExecution(
      execution({}, 'the user zooms to 6', 'the user moves to 2, 48', 'the user zooms to 7'),
      () => journal,
      [RECORD_ZOOM, RECORD_MOVE],
    )

    expect(journal.entries).toEqual(['zoom 6', 'move 2 48', 'zoom 7'])
  })

  it('creates a fresh world for each execution', async () => {
    const journals: Journal[] = []
    const createWorld = (): Journal => {
      const journal = newJournal()
      journals.push(journal)
      return journal
    }

    await runExecution(execution({}, 'the user zooms to 6', 'the user zooms to 7'), createWorld, [RECORD_ZOOM])
    await runExecution(execution({}, 'the user zooms to 8'), createWorld, [RECORD_ZOOM])

    expect(journals.map((journal) => journal.entries)).toEqual([['zoom 6', 'zoom 7'], ['zoom 8']])
  })

  it('replaces each placeholder with the value of the current example', async () => {
    const journal = newJournal()

    await runExecution(
      execution({ lng: '-58.3816', lat: '-34.6037' }, 'the user moves to <lng>, <lat>'),
      () => journal,
      [RECORD_MOVE],
    )

    expect(journal.entries).toEqual(['move -58.3816 -34.6037'])
  })

  it('waits for an asynchronous step before running the next one', async () => {
    const journal = newJournal()
    const slowZoom = step<Journal>(/^the user slowly zooms to (.+)$/, async (world, [zoom]) => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      world.entries.push(`slow zoom ${zoom}`)
    })

    await runExecution(
      execution({}, 'the user slowly zooms to 6', 'the user zooms to 7'),
      () => journal,
      [slowZoom, RECORD_ZOOM],
    )

    expect(journal.entries).toEqual(['slow zoom 6', 'zoom 7'])
  })

  it('fails on a step no handler supports', async () => {
    const run = runExecution(execution({}, 'the user dances'), newJournal, [RECORD_ZOOM, RECORD_MOVE])

    await expect(run).rejects.toThrow('Zooming/example_1: unsupported step "When the user dances"')
  })

  it('fails on a step more than one handler supports', async () => {
    const zoomAgain = step<Journal>(/^the user zooms to \d+$/, () => {})

    const run = runExecution(execution({}, 'the user zooms to 6'), newJournal, [RECORD_ZOOM, zoomAgain])

    await expect(run).rejects.toThrow('Zooming/example_1: ambiguous step "When the user zooms to 6"')
  })

  it('fails on a placeholder the example has no value for', async () => {
    const run = runExecution(execution({ lng: '2' }, 'the user moves to <lng>, <lat>'), newJournal, [RECORD_MOVE])

    await expect(run).rejects.toThrow(
      'Zooming/example_1: no example value for <lat> in "When the user moves to <lng>, <lat>"',
    )
  })

  it('fails with the diagnostic of the step that failed, and runs no further step', async () => {
    const journal = newJournal()
    const refuse = step<Journal>(/^the zoom is (.+)$/, (_world, [zoom]) => {
      throw new Error(`expected zoom ${zoom} but the map is at zoom 5`)
    })

    const run = runExecution(
      execution({ zoom: '6' }, 'the zoom is <zoom>', 'the user zooms to 7'),
      () => journal,
      [RECORD_ZOOM, refuse],
    )

    await expect(run).rejects.toThrow('expected zoom 6 but the map is at zoom 5')
    expect(journal.entries).toEqual([])
  })
})
