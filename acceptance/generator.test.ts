import { describe, expect, it } from 'vitest'

import { metadataFileName, planEntryPoints } from './generator'
import type { Feature } from './ir'

const FEATURE: Feature = {
  name: 'Base map',
  background: [],
  scenarios: [
    { name: 'Initial view', steps: [{ keyword: 'Then', text: 'the zoom is 5' }], examples: [] },
    { name: 'Zooming', steps: [{ keyword: 'When', text: 'the user zooms to <zoom>' }], examples: [{ zoom: '6' }] },
  ],
}

const plan = (feature: Feature = FEATURE) =>
  planEntryPoints(feature, 'build/acceptance/base-map.json', 'acceptance/generated')

describe('metadataFileName', () => {
  it.each([
    ['features/Hunt The Wumpus.feature', 'features-hunt-the-wumpus-feature.json'],
    ['features/orders/Cancel Order.feature', 'features-orders-cancel-order-feature.json'],
    ['Features/API v2/Happy Path.feature', 'features-api-v2-happy-path-feature.json'],
    ['./features/base-map.feature', 'features-base-map-feature.json'],
  ])('names the metadata of %s %s', (featurePath, fileName) => {
    expect(metadataFileName(featurePath)).toBe(fileName)
  })
})

describe('planEntryPoints', () => {
  it('writes one entry point per feature, named after the IR file', () => {
    expect(plan().entryPoint.path).toBe('acceptance/generated/base-map.acceptance.test.ts')
  })

  it('makes the entry point run the feature from its IR through the runtime', () => {
    const { content } = plan().entryPoint

    expect(content).toContain(`import { describeFeature } from '../vitestEntry'`)
    expect(content).toContain(`feature: "Base map"`)
    expect(content).toContain(`irPath: "build/acceptance/base-map.json"`)
    expect(content).toContain(`scenarios: ["Initial view", "Zooming"]`)
  })

  it('reaches the runtime from wherever the entry points are written', () => {
    const { content } = planEntryPoints(FEATURE, 'build/acceptance/base-map.json', 'build/acceptance-mutation/generated')
      .entryPoint

    expect(content).toContain(`import { describeFeature } from '../../../acceptance/vitestEntry'`)
  })

  it('keeps a name with quotes a valid string', () => {
    const quoted: Feature = { ...FEATURE, name: `The "base" map's view` }

    expect(plan(quoted).entryPoint.content).toContain(`feature: "The \\"base\\" map's view"`)
  })

  it('is the same for the same IR', () => {
    expect(plan()).toEqual(plan())
  })

  it('describes what it generated in a metadata file per feature', () => {
    const { metadata } = plan()

    expect(metadata.path).toBe('acceptance/generated/metadata/features-base-map-feature.json')
    expect(JSON.parse(metadata.content)).toEqual({
      schema_version: 1,
      feature_path: 'features/base-map.feature',
      ir_path: 'build/acceptance/base-map.json',
      implementation_hash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      hash_scope: 'generated_files',
      generated_files: ['acceptance/generated/base-map.acceptance.test.ts'],
    })
  })

  it('changes the implementation hash when the entry point changes', () => {
    const renamed: Feature = { ...FEATURE, scenarios: FEATURE.scenarios.slice(0, 1) }

    expect(JSON.parse(plan(renamed).metadata.content).implementation_hash).not.toBe(
      JSON.parse(plan().metadata.content).implementation_hash,
    )
  })

  it('keeps the entry point when only example values change', () => {
    const mutated: Feature = {
      ...FEATURE,
      scenarios: FEATURE.scenarios.map((scenario) => ({ ...scenario, examples: [{ zoom: '9' }] })),
    }

    expect(plan(mutated)).toEqual(plan())
  })
})
