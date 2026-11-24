import { describe, expect, it } from 'vitest'

import {
  describeOpacity,
  drawnLayers,
  failLegend,
  initialLayers,
  layerCredits,
  layerExtent,
  layerStatus,
  layerTitle,
  legendView,
  receiveDescription,
  setLayerOpacity,
  timeOut,
  toggleLayerLegend,
  toggleLayerShown,
  type Layer,
} from './layerList'
import type { DeclaredLayer, LayerDescription, WmsLayerSource } from './wmsLayers'

const SOURCES: readonly WmsLayerSource[] = [
  { serverUrl: 'https://one.example/wms', name: 'one' },
  { serverUrl: 'http://two.example/wms', name: 'two' },
  { serverUrl: 'https://three.example/?lang=fr', name: 'three' },
]

function declared(title: string, details: Partial<DeclaredLayer> = {}): LayerDescription {
  return {
    kind: 'declared',
    layer: {
      title,
      extent: [1, 2, 3, 4],
      legendUrl: `http://legends.example/${title}.png`,
      credit: `Crédit ${title}`,
      getMapUrl: `https://${title || 'untitled'}.example/wms?`,
      ...details,
    },
  }
}

const UNAVAILABLE: LayerDescription = { kind: 'unavailable' }

/** The three layers, each declared by its server under the title "One", "Two" or "Three". */
function answered(): readonly Layer[] {
  return ['One', 'Two', 'Three'].reduce(
    (layers, title, index) => receiveDescription(layers, index, declared(title)),
    initialLayers(SOURCES),
  )
}

function at(layers: readonly Layer[], index: number): Layer {
  const layer = layers[index]
  if (layer === undefined) throw new Error(`no layer ${index}`)
  return layer
}

function shown(layers: readonly Layer[], ...indexes: readonly number[]): readonly Layer[] {
  return indexes.reduce((each, index) => toggleLayerShown(each, index), layers)
}

describe('initialLayers', () => {
  it('lists the layers loading, hidden, fully opaque, with their legend folded', () => {
    expect(initialLayers(SOURCES)).toEqual(
      SOURCES.map((source) => ({
        source,
        availability: { kind: 'loading' },
        shown: false,
        opacity: 100,
        legendUnfolded: false,
        legendFailed: false,
      })),
    )
  })
})

describe('receiveDescription', () => {
  it('makes the layer available, with the tiles of the GetMap service its server announces', () => {
    const layer = at(receiveDescription(initialLayers(SOURCES), 1, declared('Two')), 1)
    expect(layer.availability).toEqual({
      kind: 'available',
      declared: expect.objectContaining({ title: 'Two', credit: 'Crédit Two' }),
      tileUrl: expect.stringMatching(/^https:\/\/Two\.example\/wms\?.*LAYERS=two/i),
    })
  })

  it('asks the server URL for tiles when the server announces no GetMap service', () => {
    const layer = at(receiveDescription(initialLayers(SOURCES), 1, declared('Two', { getMapUrl: undefined })), 1)
    expect(layer.availability.kind === 'available' && layer.availability.tileUrl).toMatch(/^https:\/\/two\.example\/wms\?/)
  })

  it('makes the layer unavailable when its server cannot give it', () => {
    expect(at(receiveDescription(initialLayers(SOURCES), 0, UNAVAILABLE), 0).availability).toEqual({ kind: 'unavailable' })
  })

  it('makes the layer unavailable when its server announces a GetMap URL that is not one', () => {
    const layer = at(receiveDescription(initialLayers(SOURCES), 0, declared('One', { getMapUrl: 'not a url' })), 0)
    expect(layer.availability).toEqual({ kind: 'unavailable' })
  })

  it('changes no other layer', () => {
    const layers = receiveDescription(initialLayers(SOURCES), 0, declared('One'))
    expect(layers.slice(1)).toEqual(initialLayers(SOURCES).slice(1))
  })

  it('keeps a layer unavailable once it is, and ignores a second answer', () => {
    const timedOut = timeOut(initialLayers(SOURCES))
    expect(receiveDescription(timedOut, 0, declared('One'))).toBe(timedOut)
    const layers = answered()
    expect(receiveDescription(layers, 0, UNAVAILABLE)).toBe(layers)
  })
})

describe('timeOut', () => {
  it('makes the layers still loading unavailable, and leaves the others', () => {
    const layers = timeOut(receiveDescription(initialLayers(SOURCES), 1, declared('Two')))
    expect(layers.map((layer) => layer.availability.kind)).toEqual(['unavailable', 'available', 'unavailable'])
  })

  it('changes nothing when no layer is loading', () => {
    const layers = answered()
    expect(timeOut(layers)).toBe(layers)
  })
})

describe('layerTitle and layerStatus', () => {
  it('names a loading layer by its WMS name, and says it is loading', () => {
    const layer = at(initialLayers(SOURCES), 0)
    expect(layerTitle(layer)).toBe('one')
    expect(layerStatus(layer)).toBe('Chargement…')
  })

  it('names an unavailable layer by its WMS name, and says it is unavailable', () => {
    const layer = at(timeOut(initialLayers(SOURCES)), 0)
    expect(layerTitle(layer)).toBe('one')
    expect(layerStatus(layer)).toBe('Couche indisponible')
  })

  it('names an available layer by the title its server declares, with no status', () => {
    const layer = at(answered(), 2)
    expect(layerTitle(layer)).toBe('Three')
    expect(layerStatus(layer)).toBeUndefined()
  })

  it('names an available layer by its WMS name when its server declares no title', () => {
    expect(layerTitle(at(receiveDescription(initialLayers(SOURCES), 0, declared('')), 0))).toBe('one')
  })
})

describe('toggleLayerShown', () => {
  it('shows a hidden layer, and hides it again', () => {
    const once = toggleLayerShown(answered(), 1)
    expect(once.map((layer) => layer.shown)).toEqual([false, true, false])
    expect(toggleLayerShown(once, 1).map((layer) => layer.shown)).toEqual([false, false, false])
  })

  it('does nothing to a layer that is loading or unavailable', () => {
    const loading = initialLayers(SOURCES)
    expect(toggleLayerShown(loading, 0)).toBe(loading)
    const unavailable = timeOut(loading)
    expect(toggleLayerShown(unavailable, 0)).toBe(unavailable)
  })

  it('does nothing for a layer that is not listed', () => {
    const layers = answered()
    expect(toggleLayerShown(layers, 3)).toBe(layers)
  })
})

describe('setLayerOpacity', () => {
  it.each([
    [35, 35],
    [0, 0],
    [100, 100],
    [37, 35],
    [38, 40],
    [-5, 0],
    [105, 100],
  ])('sets an opacity of %s as %s %%: a multiple of 5 from 0 to 100', (percent, kept) => {
    expect(at(setLayerOpacity(answered(), 0, percent), 0).opacity).toBe(kept)
  })

  it('sets the opacity of a hidden layer', () => {
    const layer = at(setLayerOpacity(answered(), 1, 50), 1)
    expect(layer).toMatchObject({ shown: false, opacity: 50 })
  })

  it('keeps the opacity when the layer is hidden and shown again', () => {
    const layers = toggleLayerShown(toggleLayerShown(setLayerOpacity(shown(answered(), 2), 2, 40), 2), 2)
    expect(at(layers, 2)).toMatchObject({ shown: true, opacity: 40 })
  })

  it('does nothing to a layer that is not available, or with an opacity that is not a number', () => {
    const loading = initialLayers(SOURCES)
    expect(setLayerOpacity(loading, 0, 50)).toBe(loading)
    const layers = answered()
    expect(setLayerOpacity(layers, 0, Number.NaN)).toBe(layers)
    expect(setLayerOpacity(layers, 0, 100)).toBe(layers)
  })
})

describe('describeOpacity', () => {
  it('reads an opacity in percent', () => {
    expect(describeOpacity(35)).toBe('35 %')
    expect(describeOpacity(100)).toBe('100 %')
  })
})

describe('layerExtent', () => {
  it('gives the extent the server declares for an available layer', () => {
    expect(layerExtent(at(answered(), 0))).toEqual([1, 2, 3, 4])
  })

  it('gives no extent when the server declares none, or the layer is not available', () => {
    expect(layerExtent(at(receiveDescription(initialLayers(SOURCES), 0, declared('One', { extent: undefined })), 0))).toBeUndefined()
    expect(layerExtent(at(initialLayers(SOURCES), 0))).toBeUndefined()
  })
})

describe('toggleLayerLegend, failLegend and legendView', () => {
  it('folds every legend at first', () => {
    expect(answered().map(legendView)).toEqual([{ kind: 'folded' }, { kind: 'folded' }, { kind: 'folded' }])
  })

  it('unfolds the legend image the server declares, asked over HTTPS', () => {
    expect(legendView(at(toggleLayerLegend(answered(), 1), 1))).toEqual({ kind: 'image', url: 'https://legends.example/Two.png' })
  })

  it('folds the legend again', () => {
    expect(legendView(at(toggleLayerLegend(toggleLayerLegend(answered(), 1), 1), 1))).toEqual({ kind: 'folded' })
  })

  it('says the legend is unavailable once its image failed to load, folded and unfolded again', () => {
    const failed = failLegend(toggleLayerLegend(answered(), 0), 0)
    expect(legendView(at(failed, 0))).toEqual({ kind: 'unavailable' })
    expect(legendView(at(toggleLayerLegend(toggleLayerLegend(failed, 0), 0), 0))).toEqual({ kind: 'unavailable' })
  })

  it('says the legend is unavailable when the server declares none', () => {
    const layers = receiveDescription(initialLayers(SOURCES), 1, declared('Two', { legendUrl: undefined }))
    expect(legendView(at(toggleLayerLegend(layers, 1), 1))).toEqual({ kind: 'unavailable' })
  })

  it('does not unfold the legend of a layer that is not available', () => {
    const loading = initialLayers(SOURCES)
    expect(toggleLayerLegend(loading, 0)).toBe(loading)
  })

  it('says the unfolded legend of a layer that is not available is unavailable', () => {
    expect(legendView({ ...at(initialLayers(SOURCES), 0), legendUnfolded: true })).toEqual({ kind: 'unavailable' })
  })

  it('changes nothing when a legend that failed fails again', () => {
    const failed = failLegend(answered(), 0)
    expect(failLegend(failed, 0)).toBe(failed)
  })
})

describe('drawnLayers', () => {
  it('draws no layer while none is shown', () => {
    expect(drawnLayers(answered())).toEqual([])
  })

  it('draws the shown layers in the order of the list, the first on top, at their opacity', () => {
    const layers = setLayerOpacity(shown(answered(), 2, 0), 2, 35)
    expect(drawnLayers(layers)).toEqual([
      { id: 'one', tileUrl: expect.stringContaining('LAYERS=one'), tileSize: 256, opacity: 1, credit: 'Crédit One' },
      { id: 'three', tileUrl: expect.stringContaining('LAYERS=three'), tileSize: 256, opacity: 0.35, credit: 'Crédit Three' },
    ])
  })

  it('draws a layer whose server declares no credit with an empty credit', () => {
    const layers = toggleLayerShown(receiveDescription(initialLayers(SOURCES), 0, declared('One', { credit: undefined })), 0)
    expect(drawnLayers(layers)[0]?.credit).toBe('')
  })
})

describe('layerCredits', () => {
  it('credits the shown layers in the order of the list', () => {
    expect(layerCredits(shown(answered(), 2, 0))).toEqual(['Crédit One', 'Crédit Three'])
  })

  it('credits no hidden layer, and no layer whose server declares no credit', () => {
    const noCredit = receiveDescription(initialLayers(SOURCES), 0, declared('One', { credit: '' }))
    const layers = shown(receiveDescription(noCredit, 1, declared('Two', { credit: undefined })), 0, 1)
    expect(layerCredits(layers)).toEqual([])
    expect(layerCredits(answered())).toEqual([])
  })
})
