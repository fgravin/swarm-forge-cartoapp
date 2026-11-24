import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import type { Bbox } from './bbox'
import {
  drawnLayers,
  failLegend,
  initialLayers,
  layerCredits,
  legendView,
  MAX_OPACITY,
  OPACITY_STEP,
  receiveDescription,
  setLayerOpacity,
  timeOut,
  toggleLayerLegend,
  toggleLayerShown,
  type Layer,
} from './layerList'
import type { LayerDescription, WmsLayerSource } from './wmsLayers'

const SOURCES: readonly WmsLayerSource[] = [
  { serverUrl: 'https://one.example/wms', name: 'one' },
  { serverUrl: 'http://two.example/wms', name: 'two' },
  { serverUrl: 'https://three.example/?lang=fr', name: 'three' },
]

/** What the servers and the user do to the layers. Index 3 is a layer the list does not have. */
type Step =
  | { readonly kind: 'receive'; readonly index: number; readonly description: LayerDescription }
  | { readonly kind: 'timeOut' }
  | { readonly kind: 'toggleShown'; readonly index: number }
  | { readonly kind: 'setOpacity'; readonly index: number; readonly percent: number }
  | { readonly kind: 'toggleLegend'; readonly index: number }
  | { readonly kind: 'failLegend'; readonly index: number }

const indexes = fc.integer({ min: 0, max: 3 })

const extents: fc.Arbitrary<Bbox> = fc.tuple(
  fc.double({ min: -180, max: 180, noNaN: true }),
  fc.double({ min: -90, max: 90, noNaN: true }),
  fc.double({ min: -180, max: 180, noNaN: true }),
  fc.double({ min: -90, max: 90, noNaN: true }),
)

const urls = fc.oneof(fc.webUrl(), fc.constantFrom('http://legends.example/a.png', 'not a URL', ''))

const descriptions: fc.Arbitrary<LayerDescription> = fc.oneof(
  fc.constant({ kind: 'unavailable' } as const),
  {
    arbitrary: fc.record({
      kind: fc.constant('declared' as const),
      layer: fc.record({
        title: fc.string({ maxLength: 8 }),
        extent: fc.option(extents, { nil: undefined }),
        legendUrl: fc.option(urls, { nil: undefined }),
        credit: fc.option(fc.string({ maxLength: 8 }), { nil: undefined }),
        getMapUrl: fc.option(urls, { nil: undefined }),
      }),
    }),
    weight: 3,
  },
)

// Opacities on and between the steps, out of range, and not numbers at all. Quarters of a
// percent, drawn evenly: fc.double would mostly draw numbers close to 0.
const percents = fc.oneof(
  fc.integer({ min: 0, max: 20 }).map((step) => step * OPACITY_STEP),
  { arbitrary: fc.integer({ min: -200, max: 600 }).map((quarters) => quarters / 4), weight: 2 },
  fc.constantFrom(2.5, 97.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
)

const steps: fc.Arbitrary<Step> = fc.oneof(
  { arbitrary: fc.record({ kind: fc.constant('receive' as const), index: indexes, description: descriptions }), weight: 3 },
  fc.constant({ kind: 'timeOut' } as const),
  { arbitrary: fc.record({ kind: fc.constant('toggleShown' as const), index: indexes }), weight: 2 },
  { arbitrary: fc.record({ kind: fc.constant('setOpacity' as const), index: indexes, percent: percents }), weight: 2 },
  { arbitrary: fc.record({ kind: fc.constant('toggleLegend' as const), index: indexes }), weight: 2 },
  fc.record({ kind: fc.constant('failLegend' as const), index: indexes }),
)

function take(layers: readonly Layer[], step: Step): readonly Layer[] {
  switch (step.kind) {
    case 'receive':
      return receiveDescription(layers, step.index, step.description)
    case 'timeOut':
      return timeOut(layers)
    case 'toggleShown':
      return toggleLayerShown(layers, step.index)
    case 'setOpacity':
      return setLayerOpacity(layers, step.index, step.percent)
    case 'toggleLegend':
      return toggleLayerLegend(layers, step.index)
    case 'failLegend':
      return failLegend(layers, step.index)
    default: {
      const unknown: never = step
      throw new Error(`unknown step ${JSON.stringify(unknown)}`)
    }
  }
}

/** The fields of a layer a step may change, beside the layer before it. */
function changedFields(before: Layer, after: Layer): readonly string[] {
  const fields = ['source', 'availability', 'shown', 'opacity', 'legendUnfolded', 'legendFailed'] as const
  return fields.filter((field) => before[field] !== after[field])
}

/** What a step may change in the layer it acts on: its own field, and only for a layer that can be used. */
function expectOnlyChange(before: readonly Layer[], step: Step, after: readonly Layer[]): void {
  before.forEach((layer, index) => {
    const changed = changedFields(layer, after[index] ?? layer)
    const acted = 'index' in step && step.index === index
    switch (step.kind) {
      case 'receive':
        expect(changed).toEqual(acted && layer.availability.kind === 'loading' ? ['availability'] : [])
        return
      case 'timeOut':
        expect(changed).toEqual(layer.availability.kind === 'loading' ? ['availability'] : [])
        return
      case 'toggleShown':
        expect(changed).toEqual(acted && layer.availability.kind === 'available' ? ['shown'] : [])
        return
      case 'setOpacity':
        expect(changed.filter((field) => field !== 'opacity')).toEqual([])
        if (!acted || layer.availability.kind !== 'available' || !Number.isFinite(step.percent)) expect(changed).toEqual([])
        return
      case 'toggleLegend':
        expect(changed).toEqual(acted && layer.availability.kind === 'available' ? ['legendUnfolded'] : [])
        return
      case 'failLegend':
        expect(changed).toEqual(acted && !layer.legendFailed ? ['legendFailed'] : [])
        return
      default: {
        const unknown: never = step
        throw new Error(`unknown step ${JSON.stringify(unknown)}`)
      }
    }
  })
}

function expectOpacityNearest(before: readonly Layer[], step: Step, after: readonly Layer[]): void {
  if (step.kind !== 'setOpacity' || before[step.index]?.availability.kind !== 'available' || !Number.isFinite(step.percent)) return
  const wanted = Math.min(MAX_OPACITY, Math.max(0, step.percent))
  expect(Math.abs((after[step.index]?.opacity ?? Number.NaN) - wanted)).toBeLessThanOrEqual(OPACITY_STEP / 2)
}

/** Only an available layer is shown or has its legend unfolded; every opacity is a step from 0 to 100. */
function expectWellFormed(layers: readonly Layer[]): void {
  expect(layers.map((layer) => layer.source)).toEqual(SOURCES)
  for (const layer of layers) {
    if (layer.shown || layer.legendUnfolded) expect(layer.availability.kind).toBe('available')
    expect(layer.opacity % OPACITY_STEP).toBe(0)
    expect(layer.opacity).toBeGreaterThanOrEqual(0)
    expect(layer.opacity).toBeLessThanOrEqual(MAX_OPACITY)
    const legend = legendView(layer)
    expect(legend.kind === 'folded').toBe(!layer.legendUnfolded)
    // A legend announced over http is asked over HTTPS.
    if (legend.kind === 'image') expect(legend.url.toLowerCase().startsWith('http://')).toBe(false)
  }
}

/** The map draws the shown layers, in the order of the list, at their opacity, and credits those that have a credit. */
function expectDrawn(layers: readonly Layer[]): void {
  const shown = layers.filter((layer) => layer.shown)
  const drawn = drawnLayers(layers)
  expect(drawn.map((layer) => layer.id)).toEqual(shown.map((layer) => layer.source.name))
  expect(drawn.map((layer) => layer.opacity)).toEqual(shown.map((layer) => layer.opacity / MAX_OPACITY))
  for (const layer of drawn) {
    expect(layer.tileUrl.startsWith('https://')).toBe(true)
    expect(layer.tileUrl.endsWith('BBOX={bbox-epsg-3857}')).toBe(true)
  }
  expect(layerCredits(layers)).toEqual(drawn.map((layer) => layer.credit).filter((credit) => credit !== ''))
}

describe('layer list', () => {
  it('changes only a layer that can be used, keeps its order, and draws what is shown at its opacity', () => {
    fc.assert(
      fc.property(fc.array(steps, { maxLength: 40, size: 'max' }), (sequence) => {
        sequence.reduce((before, step) => {
          const after = take(before, step)
          expectOnlyChange(before, step, after)
          expectOpacityNearest(before, step, after)
          expectWellFormed(after)
          expectDrawn(after)
          return after
        }, initialLayers(SOURCES))
      }),
      { numRuns: 200 },
    )
  })
})
