import { describe, expect, it } from 'vitest'

import type { Destination } from '../domain/destination'
import type { DeclaredLayer, LayerDescription } from '../domain/wmsLayers'
import type { WmsTileLayer } from '../domain/wmsTiles'
import type { LayerDisplay, MapNavigation } from './mapPort'
import type { Timer } from './timerPort'
import { useLayers, type LayerItem, type LayersState } from './useLayers'

const SERVERS = ['https://data.geopf.fr/wms-r/wms', 'https://geoservices.brgm.fr/geologie', 'https://wms.geo.admin.ch/?lang=fr']
const NAMES = ['LANDCOVER.CLC18_FR', 'LITHO_1M_SIMPLIFIEE', 'ch.bafu.schutzgebiete-paerke_nationaler_bedeutung']
const TITLES = ['CORINE Land Cover', 'Carte lithologique', 'Parcs suisses']

function declaration(title: string, details: Partial<DeclaredLayer> = {}): LayerDescription {
  return {
    kind: 'declared',
    layer: {
      title,
      extent: [5, 45, 6, 46],
      legendUrl: 'http://legends.example/legend.png',
      credit: `Crédit ${title}`,
      getMapUrl: 'https://wms.example/wms?',
      ...details,
    },
  }
}

interface Request {
  readonly serverUrl: string
  readonly name: string
  readonly answer: (description: LayerDescription) => void
}

/** WMS servers that answer when the test says so, and a timer whose time passes when the test says so. */
function setUp() {
  const requests: Request[] = []
  let timeout: { readonly milliseconds: number; readonly action: () => void } | undefined
  const timer: Timer = {
    after(milliseconds, action) {
      timeout = { milliseconds, action }
      return () => {}
    },
  }
  const layers = useLayers({
    wms: {
      describeLayer: (serverUrl, name) => new Promise((resolve) => requests.push({ serverUrl, name, answer: resolve })),
    },
    timer,
  })
  const drawn: (readonly WmsTileLayer[])[] = []
  const destinations: Destination[] = []
  const map: LayerDisplay & MapNavigation = {
    showLayers: (shown) => drawn.push(shown),
    goTo: (destination) => destinations.push(destination),
  }
  layers.connect(map)
  /** The server of the layer at `index` answers `description`. */
  async function answer(index: number, description: LayerDescription): Promise<void> {
    requests[index]?.answer(description)
    await new Promise((resolve) => setImmediate(resolve))
  }
  return {
    layers,
    requests,
    drawn,
    destinations,
    timeout: () => timeout,
    answer,
    async answerAll(): Promise<void> {
      for (const [index, title] of TITLES.entries()) await answer(index, declaration(title))
    },
  }
}

function item(layers: LayersState, index: number): LayerItem {
  const found = layers.items.value[index]
  if (found === undefined) throw new Error(`no layer ${index}`)
  return found
}

function lastDrawn(drawn: readonly (readonly WmsTileLayer[])[]): readonly string[] | undefined {
  return drawn.at(-1)?.map((layer) => layer.id)
}

describe('useLayers', () => {
  it('asks the three servers for their layers at once, as soon as it starts', () => {
    const { requests } = setUp()
    expect(requests.map(({ serverUrl, name }) => ({ serverUrl, name }))).toEqual(
      SERVERS.map((serverUrl, index) => ({ serverUrl, name: NAMES[index] })),
    )
  })

  it('makes the layers still loading unavailable 30 seconds after it starts', async () => {
    const { layers, timeout, answer } = setUp()
    await answer(0, declaration('CORINE Land Cover'))
    expect(timeout()?.milliseconds).toBe(30_000)
    timeout()?.action()
    expect(layers.items.value.map((each) => each.status)).toEqual([undefined, 'Couche indisponible', 'Couche indisponible'])
  })

  it('lists loading layers under their WMS names, with their controls disabled', () => {
    const { layers } = setUp()
    expect(layers.items.value.map((each) => [each.title, each.status, each.disabled, each.zoomDisabled])).toEqual(
      NAMES.map((name) => [name, 'Chargement…', true, true]),
    )
  })

  it('lists an available layer under its title, with its controls named after it', async () => {
    const { layers, answer } = setUp()
    await answer(1, declaration('Carte lithologique'))
    expect(item(layers, 1)).toEqual({
      id: 'layer-2',
      title: 'Carte lithologique',
      status: undefined,
      disabled: false,
      shown: false,
      eyeLabel: 'Afficher Carte lithologique',
      zoomLabel: 'Zoomer sur Carte lithologique',
      zoomDisabled: false,
      opacity: 100,
      opacityLabel: 'Opacité de Carte lithologique',
      opacityText: '100 %',
      legendUnfolded: false,
      legendImage: undefined,
      legendMessage: undefined,
    })
  })

  it('lists a layer its server cannot give as unavailable, and leaves the others usable', async () => {
    const { layers, answer } = setUp()
    await answer(0, { kind: 'unavailable' })
    await answer(2, declaration('Parcs suisses'))
    expect(item(layers, 0)).toMatchObject({ title: NAMES[0], status: 'Couche indisponible', disabled: true })
    expect(item(layers, 2)).toMatchObject({ status: undefined, disabled: false })
  })

  it('shows and hides a layer with its eye button, drawing it on the map', async () => {
    const { layers, drawn, answerAll } = setUp()
    await answerAll()
    layers.toggleShown(1)
    expect(item(layers, 1)).toMatchObject({ shown: true, eyeLabel: 'Masquer Carte lithologique' })
    expect(lastDrawn(drawn)).toEqual([NAMES[1]])
    layers.toggleShown(1)
    expect(item(layers, 1)).toMatchObject({ shown: false, eyeLabel: 'Afficher Carte lithologique' })
    expect(lastDrawn(drawn)).toEqual([])
  })

  it('draws the shown layers in the order of the list, the first on top', async () => {
    const { layers, drawn, answerAll } = setUp()
    await answerAll()
    layers.toggleShown(2)
    layers.toggleShown(0)
    expect(lastDrawn(drawn)).toEqual([NAMES[0], NAMES[2]])
  })

  it('draws nothing for a layer still loading', () => {
    const { layers, drawn } = setUp()
    layers.toggleShown(0)
    expect(item(layers, 0).shown).toBe(false)
    expect(drawn).toEqual([[]])
  })

  it('sets the opacity of a layer, and draws it at that opacity', async () => {
    const { layers, drawn, answerAll } = setUp()
    await answerAll()
    layers.setOpacity(0, 35)
    layers.toggleShown(0)
    expect(item(layers, 0)).toMatchObject({ opacity: 35, opacityText: '35 %' })
    expect(drawn.at(-1)?.[0]?.opacity).toBe(0.35)
  })

  it('makes the map show the extent its server declares for a layer, without showing the layer', async () => {
    const { layers, destinations, answerAll } = setUp()
    await answerAll()
    layers.zoomTo(1)
    expect(destinations).toEqual([{ kind: 'extent', extent: [5, 45, 6, 46] }])
    expect(item(layers, 1).shown).toBe(false)
  })

  it('disables the zoom button of a layer whose server declares no extent, and zooms nowhere', async () => {
    const { layers, destinations, answer } = setUp()
    await answer(1, declaration('Carte lithologique', { extent: undefined }))
    expect(item(layers, 1)).toMatchObject({ disabled: false, zoomDisabled: true })
    layers.zoomTo(1)
    layers.zoomTo(0)
    expect(destinations).toEqual([])
  })

  it('unfolds the legend image, asked over HTTPS and described after the layer, and folds it again', async () => {
    const { layers, answerAll } = setUp()
    await answerAll()
    layers.toggleLegend(2)
    expect(item(layers, 2)).toMatchObject({
      legendUnfolded: true,
      legendImage: { url: 'https://legends.example/legend.png', description: 'Légende de Parcs suisses' },
      legendMessage: undefined,
    })
    layers.toggleLegend(2)
    expect(item(layers, 2)).toMatchObject({ legendUnfolded: false, legendImage: undefined, legendMessage: undefined })
  })

  it('says the legend is unavailable when its image fails to load', async () => {
    const { layers, answerAll } = setUp()
    await answerAll()
    layers.toggleLegend(0)
    layers.legendFailed(0)
    expect(item(layers, 0)).toMatchObject({ legendImage: undefined, legendMessage: 'Légende indisponible' })
  })

  it('credits the shown layers, in the order of the list', async () => {
    const { layers, answerAll } = setUp()
    await answerAll()
    expect(layers.credits.value).toEqual([])
    layers.toggleShown(2)
    layers.toggleShown(0)
    expect(layers.credits.value).toEqual(['Crédit CORINE Land Cover', 'Crédit Parcs suisses'])
  })

  it('draws the shown layers on a map connected later, and stops drawing on a map once disconnected', async () => {
    const { layers, drawn, destinations, answerAll } = setUp()
    await answerAll()
    layers.toggleShown(0)
    layers.disconnect()
    layers.toggleShown(1)
    layers.zoomTo(0)
    const drawnBefore = drawn.length
    const later: (readonly WmsTileLayer[])[] = []
    layers.connect({ showLayers: (shown) => later.push(shown), goTo: () => {} })
    expect(drawn).toHaveLength(drawnBefore)
    expect(destinations).toEqual([])
    expect(lastDrawn(later)).toEqual([NAMES[0], NAMES[1]])
  })
})
