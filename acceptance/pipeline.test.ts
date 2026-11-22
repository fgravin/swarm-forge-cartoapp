import { describe, expect, it } from 'vitest'

import { mutatorArgs, planFeatureBuilds } from './pipeline'

describe('planFeatureBuilds', () => {
  it('parses each feature file into an IR file named after it, in name order', () => {
    expect(planFeatureBuilds(['saisie-bbox.feature', 'fonds-de-plan.feature'])).toEqual([
      { stem: 'fonds-de-plan', featurePath: 'features/fonds-de-plan.feature', irPath: 'build/acceptance/fonds-de-plan.json' },
      { stem: 'saisie-bbox', featurePath: 'features/saisie-bbox.feature', irPath: 'build/acceptance/saisie-bbox.json' },
    ])
  })

  it('ignores the files of the features directory that are not feature files', () => {
    expect(planFeatureBuilds(['.gitkeep', 'notes.md', 'base-map.feature.orig', 'base-map.feature'])).toEqual([
      { stem: 'base-map', featurePath: 'features/base-map.feature', irPath: 'build/acceptance/base-map.json' },
    ])
  })

  it('plans nothing when there is no feature', () => {
    expect(planFeatureBuilds(['.gitkeep'])).toEqual([])
  })
})

describe('mutatorArgs', () => {
  const build = { stem: 'base-map', featurePath: 'features/base-map.feature', irPath: 'build/acceptance/base-map.json' }

  it('mutates the feature against the generated entry points, through its own runner worker and work directory', () => {
    expect(mutatorArgs(build, [])).toEqual([
      '--feature',
      'features/base-map.feature',
      '--generated-dir',
      'acceptance/generated',
      '--work-dir',
      'build/acceptance-mutation/base-map',
      '--runner-worker',
      'tsx acceptance/mutationWorkerMain.ts base-map',
    ])
  })

  it('passes the extra arguments on after its own', () => {
    expect(mutatorArgs(build, ['--level', 'soft']).slice(-3)).toEqual([
      'tsx acceptance/mutationWorkerMain.ts base-map',
      '--level',
      'soft',
    ])
  })
})
