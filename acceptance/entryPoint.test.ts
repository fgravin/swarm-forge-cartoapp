import { describe, expect, it } from 'vitest'

import { irToLoad, MUTATED_IR_VARIABLE, selectExecutions, type EntryPoint } from './entryPoint'
import type { Feature } from './ir'
import { expandFeature } from './runtime'

const FEATURE: Feature = {
  name: 'Base map',
  background: [],
  scenarios: [
    { name: 'Initial view', steps: [{ keyword: 'Then', text: 'the zoom is 5' }], examples: [] },
    { name: 'Zooming', steps: [{ keyword: 'When', text: 'the user zooms to <zoom>' }], examples: [{ zoom: '6' }] },
  ],
}

const ENTRY: EntryPoint = {
  feature: 'Base map',
  irPath: 'build/acceptance/base-map.json',
  scenarios: ['Initial view', 'Zooming'],
}

describe('selectExecutions', () => {
  it('runs every execution of an IR that has the structure the entry point was generated for', () => {
    expect(selectExecutions(ENTRY, FEATURE)).toEqual(expandFeature(FEATURE))
  })

  it('follows the example values of the IR it is given', () => {
    const mutated: Feature = {
      ...FEATURE,
      scenarios: FEATURE.scenarios.map((scenario) => ({ ...scenario, examples: [{ zoom: '9' }, { zoom: '10' }] })),
    }

    expect(selectExecutions(ENTRY, mutated).map((execution) => execution.example)).toEqual([
      { zoom: '9' },
      { zoom: '10' },
      { zoom: '9' },
      { zoom: '10' },
    ])
  })

  it.each([
    ['another feature', { ...FEATURE, name: 'Drawing' }],
    ['a renamed scenario', { ...FEATURE, scenarios: FEATURE.scenarios.map((s) => ({ ...s, name: `${s.name}!` })) }],
    ['a removed scenario', { ...FEATURE, scenarios: FEATURE.scenarios.slice(1) }],
    ['reordered scenarios', { ...FEATURE, scenarios: [...FEATURE.scenarios].reverse() }],
  ])('refuses %s, so a stale entry point fails', (_case, feature: Feature) => {
    expect(() => selectExecutions(ENTRY, feature)).toThrow(
      'Stale entry point for build/acceptance/base-map.json: regenerate it with `npm run acceptance`',
    )
  })
})

describe('irToLoad', () => {
  it('loads the IR the entry point was generated from', () => {
    expect(irToLoad(ENTRY, {})).toBe('build/acceptance/base-map.json')
  })

  it('loads the mutated IR a Gherkin mutation run names instead', () => {
    expect(MUTATED_IR_VARIABLE).toBe('ACCEPTANCE_MUTATED_IR')
    expect(irToLoad(ENTRY, { ACCEPTANCE_MUTATED_IR: 'build/acceptance-mutation/base-map/mutations/m3/feature.json' })).toBe(
      'build/acceptance-mutation/base-map/mutations/m3/feature.json',
    )
  })
})
