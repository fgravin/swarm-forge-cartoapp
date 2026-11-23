import { describe, expect, it } from 'vitest'

import { planFeatureBuilds } from './pipeline'

describe('planFeatureBuilds', () => {
  it('parses each feature file into an IR file named after it, in name order', () => {
    expect(planFeatureBuilds(['saisie-bbox.feature', 'fonds-de-plan.feature'])).toEqual([
      { featurePath: 'features/fonds-de-plan.feature', irPath: 'build/acceptance/fonds-de-plan.json' },
      { featurePath: 'features/saisie-bbox.feature', irPath: 'build/acceptance/saisie-bbox.json' },
    ])
  })

  it('ignores the files of the features directory that are not feature files', () => {
    expect(planFeatureBuilds(['.gitkeep', 'notes.md', 'base-map.feature.orig', 'base-map.feature'])).toEqual([
      { featurePath: 'features/base-map.feature', irPath: 'build/acceptance/base-map.json' },
    ])
  })

  it('plans nothing when there is no feature', () => {
    expect(planFeatureBuilds(['.gitkeep'])).toEqual([])
  })
})
