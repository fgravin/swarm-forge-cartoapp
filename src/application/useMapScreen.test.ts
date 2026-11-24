import { describe, expect, it } from 'vitest'

import { BASEMAPS, type BasemapId } from '../domain/basemaps'
import type { Bbox } from '../domain/bbox'
import type { DrawEvent } from '../domain/bboxCapture'
import type { Destination } from '../domain/destination'
import { INITIAL_MAP_VIEW, type LngLat, type MapView } from '../domain/mapView'
import { rasterTiles, type RasterTiles } from '../domain/rasterTiles'
import type { WmsTileLayer } from '../domain/wmsTiles'
import type { MapPort } from './mapPort'
import { useMapScreen, type MapScreenServices, type MapScreenState } from './useMapScreen'

function fakeMap() {
  const listeners = new Set<(view: MapView) => void>()
  const drawListeners = new Set<(event: DrawEvent) => void>()
  const drawn: RasterTiles[] = []
  const destinations: Destination[] = []
  let rectangles: readonly Bbox[] = []
  let layers: readonly WmsTileLayer[] = []
  let credits = ''
  let destroyCount = 0
  const port: MapPort = {
    onViewChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    showBasemap(tiles) {
      drawn.push(tiles)
    },
    setDrawingMode() {},
    onDraw(listener) {
      drawListeners.add(listener)
      return () => {
        drawListeners.delete(listener)
      }
    },
    showRectangles(shown) {
      rectangles = shown
    },
    goTo(destination) {
      destinations.push(destination)
    },
    showLayers(shown) {
      layers = shown
    },
    showCredits(shown) {
      credits = shown
    },
    destroy() {
      destroyCount += 1
    },
  }
  return {
    port,
    drawn,
    destinations,
    layers: () => layers.map((layer) => layer.id),
    credits: () => credits,
    moveTo: (view: MapView) => listeners.forEach((listener) => listener(view)),
    drag(from: LngLat, to: LngLat) {
      const events: readonly DrawEvent[] = [
        { type: 'press', pointer: { point: { x: 0, y: 0 }, position: from } },
        { type: 'release', pointer: { point: { x: 100, y: 100 }, position: to } },
      ]
      events.forEach((event) => drawListeners.forEach((listener) => listener(event)))
    },
    rectangles: () => rectangles,
    destroyCount: () => destroyCount,
  }
}

const GRENOBLE: Destination = { kind: 'view', view: { center: { lng: 5.71667, lat: 45.16667 }, zoom: 12 } }

/** A finder that finds Grenoble at once, WMS servers declaring their layers at once, and a pause the test ends. */
function placeSearch() {
  let endPause = (): void => {}
  const services: MapScreenServices = {
    finder: {
      find: async () => ({
        kind: 'found',
        suggestions: [{ name: 'Grenoble', kind: 'town', context: 'Isère, France', destination: GRENOBLE }],
      }),
    },
    wms: {
      describeLayer: async (_serverUrl, name) => ({
        kind: 'declared',
        layer: { title: name, extent: [5, 45, 6, 46], legendUrl: undefined, credit: `Crédit ${name}`, getMapUrl: undefined },
      }),
    },
    timer: {
      after(_milliseconds, action) {
        endPause = action
        return () => {}
      },
    },
  }
  return {
    services,
    async searchFor(screen: MapScreenState, text: string): Promise<void> {
      screen.placeSearch.type(text)
      endPause()
      await new Promise((resolve) => setImmediate(resolve))
    },
  }
}

function selectedIds({ basemaps }: MapScreenState): readonly BasemapId[] {
  return basemaps.groups.value
    .flatMap((group) => group.options)
    .filter((option) => option.selected)
    .map((option) => option.id)
}

const BUENOS_AIRES: MapView = { center: { lng: -58.3816, lat: -34.6037 }, zoom: 11 }
// A bbox over Paris, dragged from its north-east corner to its south-west corner.
const PARIS_NORTH_EAST: LngLat = { lng: 2.4, lat: 48.9 }
const PARIS_SOUTH_WEST: LngLat = { lng: 2.3, lat: 48.8 }
const PARIS_BBOX: Bbox = [2.3, 48.8, 2.4, 48.9]

describe('useMapScreen', () => {
  it('starts at the initial view, with Positron selected', () => {
    const screen = useMapScreen(placeSearch().services)

    expect(screen.mapView.view.value).toEqual(INITIAL_MAP_VIEW)
    expect(screen.mapView.description.value).toBe('45.5646° N, 5.9178° E · zoom 5.0')
    expect(selectedIds(screen)).toEqual(['positron'])
  })

  it('shows the selected basemap on the connected map and follows its view', () => {
    const map = fakeMap()
    const screen = useMapScreen(placeSearch().services)

    screen.connect(map.port)
    map.moveTo(BUENOS_AIRES)

    expect(map.drawn).toEqual([rasterTiles(BASEMAPS.positron)])
    expect(screen.mapView.description.value).toBe('34.6037° S, 58.3816° W · zoom 11.0')
  })

  it('shows the basemap the user chooses on the connected map, keeping the view', () => {
    const map = fakeMap()
    const screen = useMapScreen(placeSearch().services)
    screen.connect(map.port)
    map.moveTo(BUENOS_AIRES)

    screen.basemaps.select('world-imagery')

    expect(selectedIds(screen)).toEqual(['world-imagery'])
    expect(map.drawn.at(-1)).toEqual(rasterTiles(BASEMAPS['world-imagery']))
    expect(screen.mapView.view.value).toEqual(BUENOS_AIRES)
  })

  it('captures the bbox the user draws on the connected map', () => {
    const map = fakeMap()
    const screen = useMapScreen(placeSearch().services)
    screen.connect(map.port)

    screen.bboxCapture.toggleDrawing()
    map.drag(PARIS_NORTH_EAST, PARIS_SOUTH_WEST)

    expect(screen.bboxCapture.bboxText.value).toBe('2.30000, 48.80000, 2.40000, 48.90000')
    expect(screen.bboxCapture.drawingMode.value).toBe(false)
    expect(screen.bboxCapture.canClear.value).toBe(true)
    expect(map.rectangles()).toEqual([PARIS_BBOX])
  })

  it('keeps the bbox when the user moves the map or chooses another basemap', () => {
    const map = fakeMap()
    const screen = useMapScreen(placeSearch().services)
    screen.connect(map.port)
    screen.bboxCapture.toggleDrawing()
    map.drag(PARIS_NORTH_EAST, PARIS_SOUTH_WEST)

    map.moveTo(BUENOS_AIRES)
    screen.basemaps.select('world-imagery')

    expect(screen.bboxCapture.bboxText.value).toBe('2.30000, 48.80000, 2.40000, 48.90000')
    expect(map.rectangles()).toEqual([PARIS_BBOX])
  })

  it('clears the bbox', () => {
    const map = fakeMap()
    const screen = useMapScreen(placeSearch().services)
    screen.connect(map.port)
    screen.bboxCapture.toggleDrawing()
    map.drag(PARIS_NORTH_EAST, PARIS_SOUTH_WEST)

    screen.bboxCapture.clearBbox()

    expect(screen.bboxCapture.bboxText.value).toBe('Aucune emprise')
    expect(map.rectangles()).toEqual([])
  })

  it('moves the connected map to the place the user chooses, keeping the basemap and the bbox', async () => {
    const map = fakeMap()
    const search = placeSearch()
    const screen = useMapScreen(search.services)
    screen.connect(map.port)
    screen.basemaps.select('world-imagery')
    screen.bboxCapture.toggleDrawing()
    map.drag(PARIS_NORTH_EAST, PARIS_SOUTH_WEST)

    await search.searchFor(screen, 'Gre')
    screen.placeSearch.choose(0)

    expect(screen.placeSearch.text.value).toBe('Grenoble')
    expect(map.destinations).toEqual([GRENOBLE])
    expect(selectedIds(screen)).toEqual(['world-imagery'])
    expect(map.rectangles()).toEqual([PARIS_BBOX])
  })

  it('draws the shown layers on the connected map, and credits them after the basemap', async () => {
    const map = fakeMap()
    const screen = useMapScreen(placeSearch().services)
    screen.connect(map.port)
    await new Promise((resolve) => setImmediate(resolve))

    screen.layers.toggleShown(2)
    screen.layers.toggleShown(1)

    expect(map.layers()).toEqual(['LITHO_1M_SIMPLIFIEE', 'ch.bafu.schutzgebiete-paerke_nationaler_bedeutung'])
    expect(map.credits()).toBe(
      '© OpenStreetMap contributors © CARTO, Crédit LITHO_1M_SIMPLIFIEE, Crédit ch.bafu.schutzgebiete-paerke_nationaler_bedeutung',
    )
  })

  it('keeps the shown layers when the user chooses another basemap, and credits the new one', async () => {
    const map = fakeMap()
    const screen = useMapScreen(placeSearch().services)
    screen.connect(map.port)
    await new Promise((resolve) => setImmediate(resolve))
    screen.layers.toggleShown(1)

    screen.basemaps.select('world-imagery')

    expect(map.layers()).toEqual(['LITHO_1M_SIMPLIFIEE'])
    expect(map.credits()).toBe('Powered by Esri, Crédit LITHO_1M_SIMPLIFIEE')
  })

  it('releases the map when disconnected, and stops drawing on it, following it, and moving it', async () => {
    const map = fakeMap()
    const search = placeSearch()
    const screen = useMapScreen(search.services)
    screen.connect(map.port)

    screen.disconnect()
    screen.basemaps.select('dark-matter')
    map.moveTo(BUENOS_AIRES)
    screen.bboxCapture.toggleDrawing()
    map.drag(PARIS_NORTH_EAST, PARIS_SOUTH_WEST)
    await search.searchFor(screen, 'Gre')
    screen.placeSearch.choose(0)
    screen.layers.toggleShown(0)
    screen.layers.zoomTo(0)

    expect(map.destroyCount()).toBe(1)
    expect(map.drawn).toEqual([rasterTiles(BASEMAPS.positron)])
    expect(screen.mapView.view.value).toEqual(INITIAL_MAP_VIEW)
    expect(screen.bboxCapture.bboxText.value).toBe('Aucune emprise')
    expect(map.destinations).toEqual([])
    expect(map.layers()).toEqual([])
    expect(map.credits()).toBe('© OpenStreetMap contributors © CARTO')
  })

  it('releases the previous map when another one is connected, and draws the selected basemap on the new one', () => {
    const first = fakeMap()
    const second = fakeMap()
    const screen = useMapScreen(placeSearch().services)
    screen.connect(first.port)
    screen.basemaps.select('dark-matter')

    screen.connect(second.port)
    first.moveTo(BUENOS_AIRES)

    expect(first.destroyCount()).toBe(1)
    expect(second.destroyCount()).toBe(0)
    expect(second.drawn).toEqual([rasterTiles(BASEMAPS['dark-matter'])])
    expect(screen.mapView.view.value).toEqual(INITIAL_MAP_VIEW)
  })

  it('releases a map only once', () => {
    const map = fakeMap()
    const screen = useMapScreen(placeSearch().services)
    screen.connect(map.port)

    screen.disconnect()
    screen.disconnect()

    expect(map.destroyCount()).toBe(1)
  })

  it('does nothing when disconnected without a map', () => {
    const screen = useMapScreen(placeSearch().services)

    expect(() => screen.disconnect()).not.toThrow()
    expect(screen.mapView.view.value).toEqual(INITIAL_MAP_VIEW)
  })
})
