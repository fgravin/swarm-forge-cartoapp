import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { BASEMAP_PROVIDERS, BASEMAPS, INITIAL_BASEMAP, type BasemapId } from '../domain/basemaps'
import { describeBbox, type Bbox } from '../domain/bbox'
import {
  applyDrawEvent,
  clearBbox,
  INITIAL_BBOX_CAPTURE,
  isDrawingModeOn,
  shownRectangles,
  toggleDrawing,
  type BboxCapture,
  type DrawEvent,
} from '../domain/bboxCapture'
import { describeCredits } from '../domain/credits'
import { extentDestination, type Destination } from '../domain/destination'
import {
  drawnLayers,
  initialLayers,
  layerCredits,
  layerExtent,
  layerStatus,
  receiveDescription,
  setLayerOpacity,
  timeOut,
  toggleLayerShown,
  type Layer,
} from '../domain/layerList'
import { describeMapView, INITIAL_MAP_VIEW, type MapView } from '../domain/mapView'
import { rasterTiles, type RasterTiles } from '../domain/rasterTiles'
import { WMS_LAYERS, type LayerDescription } from '../domain/wmsLayers'
import type { WmsTileLayer } from '../domain/wmsTiles'
import type { MapPort } from './mapPort'
import { useMapScreen, type MapScreen, type MapScreenServices } from './useMapScreen'

/** The WMS servers, answering for a layer when the test says so, and the timer that gives up on them. */
function heldServices() {
  const answers = new Map<string, (description: LayerDescription) => void>()
  let giveUp: (() => void) | undefined
  const services: MapScreenServices = {
    // No place finder: the place search is disabled, and waits for nothing.
    finder: undefined,
    wms: { describeLayer: (_serverUrl, name) => new Promise((resolve) => answers.set(name, resolve)) },
    timer: {
      after(_milliseconds, action) {
        giveUp = action
        return () => {}
      },
    },
  }
  return {
    services,
    /** The server of the layer at `index` answers, if it was asked. */
    answer(index: number, description: LayerDescription): void {
      const name = WMS_LAYERS[index]?.name ?? ''
      answers.get(name)?.(description)
      answers.delete(name)
    },
    /** The time the servers had to answer passes, if the screen waits for them. */
    timeOut(): void {
      giveUp?.()
      giveUp = undefined
    },
  }
}

/** What the user and the component do to the map screen. */
type Action =
  | { readonly kind: 'connect' }
  | { readonly kind: 'disconnect' }
  | { readonly kind: 'select'; readonly id: BasemapId }
  | { readonly kind: 'move'; readonly view: MapView }
  | { readonly kind: 'toggleDrawing' }
  | { readonly kind: 'clearBbox' }
  | { readonly kind: 'draw'; readonly event: DrawEvent }
  | { readonly kind: 'layerAnswer'; readonly index: number; readonly description: LayerDescription }
  | { readonly kind: 'layerTimeOut' }
  | { readonly kind: 'toggleShown'; readonly index: number }
  | { readonly kind: 'setOpacity'; readonly index: number; readonly percent: number }
  | { readonly kind: 'zoomTo'; readonly index: number }

/** How many times the screen has drawn on a map, of each kind. */
interface DrawCounts {
  readonly basemaps: number
  readonly drawingModes: number
  readonly rectangles: number
  readonly layers: number
  readonly credits: number
  readonly destinations: number
}

interface RecordingMap {
  readonly port: MapPort
  readonly drawn: readonly RasterTiles[]
  readonly drawingMode: () => boolean
  readonly rectangles: () => readonly Bbox[]
  readonly layers: () => readonly WmsTileLayer[]
  readonly credits: () => string | undefined
  readonly destinations: readonly Destination[]
  readonly counts: () => DrawCounts
  readonly destroyCount: () => number
  readonly moveTo: (view: MapView) => void
  /** The user acts on this map; the map reports it only in its drawing mode. */
  readonly draw: (event: DrawEvent) => void
}

function recordingMap(): RecordingMap {
  const viewListeners = new Set<(view: MapView) => void>()
  const drawListeners = new Set<(event: DrawEvent) => void>()
  const drawn: RasterTiles[] = []
  let drawingMode = false
  let drawingModes = 0
  let rectangles: readonly Bbox[] = []
  let rectangleCount = 0
  let layers: readonly WmsTileLayer[] = []
  let layerCount = 0
  let credits: string | undefined
  let creditCount = 0
  const destinations: Destination[] = []
  let destroyCount = 0
  return {
    port: {
      onViewChange(listener) {
        viewListeners.add(listener)
        return () => {
          viewListeners.delete(listener)
        }
      },
      showBasemap: (tiles) => drawn.push(tiles),
      setDrawingMode: (on) => {
        drawingMode = on
        drawingModes += 1
      },
      onDraw(listener) {
        drawListeners.add(listener)
        return () => {
          drawListeners.delete(listener)
        }
      },
      showRectangles: (shown) => {
        rectangles = shown
        rectangleCount += 1
      },
      goTo: (destination) => destinations.push(destination),
      showLayers: (shown) => {
        layers = shown
        layerCount += 1
      },
      showCredits: (shown) => {
        credits = shown
        creditCount += 1
      },
      destroy: () => {
        destroyCount += 1
      },
    },
    drawn,
    drawingMode: () => drawingMode,
    rectangles: () => rectangles,
    layers: () => layers,
    credits: () => credits,
    destinations,
    counts: () => ({
      basemaps: drawn.length,
      drawingModes,
      rectangles: rectangleCount,
      layers: layerCount,
      credits: creditCount,
      destinations: destinations.length,
    }),
    destroyCount: () => destroyCount,
    moveTo: (view) => viewListeners.forEach((listener) => listener(view)),
    draw: (event) => {
      if (drawingMode) drawListeners.forEach((listener) => listener(event))
    },
  }
}

/** What the screen should show, kept by the test beside the screen it drives. */
interface Model {
  selected: BasemapId
  view: MapView
  capture: BboxCapture
  layers: readonly Layer[]
  /** The layers whose server has answered. Each server answers once. */
  readonly answered: Set<number>
  /** Whether the time the servers had to answer has passed. It passes once. */
  timedOut: boolean
  /** Where the screen has moved each map. */
  readonly destinations: Map<RecordingMap, Destination[]>
  live: RecordingMap | undefined
  readonly maps: RecordingMap[]
  /** Each released map, with what the screen had drawn on it when it was released. */
  readonly released: Map<RecordingMap, DrawCounts>
}

const BASEMAP_IDS = BASEMAP_PROVIDERS.flatMap((provider) => provider.basemaps.map((basemap) => basemap.id))

const mapViews: fc.Arbitrary<MapView> = fc.record({
  center: fc.record({
    lng: fc.double({ min: -180, max: 180, noNaN: true }),
    lat: fc.double({ min: -85, max: 85, noNaN: true }),
  }),
  zoom: fc.double({ min: 0, max: 19, noNaN: true }),
})

const pointers = fc.record({
  point: fc.record({ x: fc.integer({ min: 0, max: 6 }), y: fc.integer({ min: 0, max: 6 }) }),
  position: mapViews.map((view) => view.center),
})

const drawEvents: fc.Arbitrary<DrawEvent> = fc.oneof(
  fc.record({ type: fc.constantFrom('press' as const, 'move' as const, 'release' as const), pointer: pointers }),
  fc.constant({ type: 'cancel' } as const),
)

const layerIndexes = fc.integer({ min: 0, max: WMS_LAYERS.length })

const descriptions: fc.Arbitrary<LayerDescription> = fc.oneof(
  fc.constant({ kind: 'unavailable' } as const),
  {
    arbitrary: fc.record({
      kind: fc.constant('declared' as const),
      layer: fc.record({
        title: fc.string({ maxLength: 6 }),
        extent: fc.option(
          fc.tuple(
            fc.integer({ min: -180, max: 180 }),
            fc.integer({ min: -90, max: 0 }),
            fc.integer({ min: -180, max: 180 }),
            fc.integer({ min: 0, max: 90 }),
          ),
          { nil: undefined },
        ),
        legendUrl: fc.constant(undefined),
        credit: fc.option(fc.constantFrom('BRGM', 'IGN', ''), { nil: undefined }),
        getMapUrl: fc.option(fc.constantFrom('https://wms.example/wms?', 'http://other.example/geologie'), { nil: undefined }),
      }),
    }),
    weight: 3,
  },
)

const actions: fc.Arbitrary<Action> = fc.oneof(
  { arbitrary: fc.record({ kind: fc.constant('layerAnswer' as const), index: layerIndexes, description: descriptions }), weight: 2 },
  fc.constant({ kind: 'layerTimeOut' } as const),
  { arbitrary: fc.record({ kind: fc.constant('toggleShown' as const), index: layerIndexes }), weight: 3 },
  {
    arbitrary: fc.record({
      kind: fc.constant('setOpacity' as const),
      index: layerIndexes,
      percent: fc.integer({ min: -20, max: 120 }),
    }),
    weight: 2,
  },
  { arbitrary: fc.record({ kind: fc.constant('zoomTo' as const), index: layerIndexes }), weight: 2 },
  fc.constant({ kind: 'connect' } as const),
  fc.constant({ kind: 'disconnect' } as const),
  fc.record({ kind: fc.constant('select' as const), id: fc.constantFrom(...BASEMAP_IDS) }),
  fc.record({ kind: fc.constant('move' as const), view: mapViews }),
  fc.constant({ kind: 'toggleDrawing' } as const),
  fc.constant({ kind: 'clearBbox' } as const),
  { arbitrary: fc.record({ kind: fc.constant('draw' as const), event: drawEvents }), weight: 3 },
)

function release(model: Model): void {
  if (model.live) model.released.set(model.live, model.live.counts())
  model.live = undefined
}

function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

function zoomTo(screen: MapScreen, model: Model, index: number): void {
  const layer = model.layers[index]
  const extent = layer === undefined ? undefined : layerExtent(layer)
  if (model.live && extent) model.destinations.get(model.live)?.push(extentDestination(extent))
  screen.layers.zoomTo(index)
}

async function apply(screen: MapScreen, model: Model, held: ReturnType<typeof heldServices>, action: Action): Promise<void> {
  switch (action.kind) {
    case 'layerAnswer':
      if (!model.answered.has(action.index)) {
        model.answered.add(action.index)
        model.layers = receiveDescription(model.layers, action.index, action.description)
        held.answer(action.index, action.description)
      }
      return settle()
    case 'layerTimeOut':
      if (!model.timedOut) {
        model.timedOut = true
        model.layers = timeOut(model.layers)
        held.timeOut()
      }
      return
    case 'toggleShown':
      model.layers = toggleLayerShown(model.layers, action.index)
      return screen.layers.toggleShown(action.index)
    case 'setOpacity':
      model.layers = setLayerOpacity(model.layers, action.index, action.percent)
      return screen.layers.setOpacity(action.index, action.percent)
    case 'zoomTo':
      return zoomTo(screen, model, action.index)
    case 'connect': {
      const map = recordingMap()
      release(model)
      model.maps.push(map)
      model.destinations.set(map, [])
      model.live = map
      screen.connect(map.port)
      return
    }
    case 'disconnect':
      release(model)
      screen.disconnect()
      return
    case 'select':
      model.selected = action.id
      screen.basemaps.select(action.id)
      return
    case 'move':
      if (model.live) model.view = action.view
      model.maps.forEach((map) => map.moveTo(action.view))
      return
    case 'toggleDrawing':
      model.capture = toggleDrawing(model.capture)
      screen.bboxCapture.toggleDrawing()
      return
    case 'clearBbox':
      model.capture = clearBbox(model.capture)
      screen.bboxCapture.clearBbox()
      return
    case 'draw':
      if (model.live?.drawingMode()) model.capture = applyDrawEvent(model.capture, action.event)
      model.maps.forEach((map) => map.draw(action.event))
      return
    default: {
      const unknown: never = action
      throw new Error(`unknown action ${JSON.stringify(unknown)}`)
    }
  }
}

function expectScreenMatches(screen: MapScreen, model: Model): void {
  const selected = screen.basemaps.groups.value.flatMap((group) => group.options).filter((option) => option.selected)
  expect(selected.map((option) => option.id)).toEqual([model.selected])
  expect(screen.mapView.view.value).toEqual(model.view)
  expect(screen.mapView.description.value).toBe(describeMapView(model.view))
  expect(screen.bboxCapture.bboxText.value).toBe(describeBbox(model.capture.bbox))
  expect(screen.bboxCapture.canClear.value).toBe(model.capture.bbox !== undefined)
  expect(screen.bboxCapture.drawingMode.value).toBe(isDrawingModeOn(model.capture))
  if (model.live) {
    expect(model.live.drawn.at(-1)).toEqual(rasterTiles(BASEMAPS[model.selected]))
    expect(model.live.drawingMode()).toBe(isDrawingModeOn(model.capture))
    expect(model.live.rectangles()).toEqual(shownRectangles(model.capture))
    // Over whichever basemap: choosing one changes neither the layers nor how they are drawn.
    expect(model.live.layers()).toEqual(drawnLayers(model.layers))
    expect(model.live.credits()).toBe(describeCredits(BASEMAPS[model.selected].attribution, layerCredits(model.layers)))
  }
  expect(screen.layers.items.value.map(({ status, shown, opacity }) => ({ status, shown, opacity }))).toEqual(
    model.layers.map((layer) => ({ status: layerStatus(layer), shown: layer.shown, opacity: layer.opacity })),
  )
  for (const map of model.maps) {
    const countsWhenReleased = model.released.get(map)
    expect(map.destroyCount()).toBe(countsWhenReleased === undefined ? 0 : 1)
    if (countsWhenReleased !== undefined) expect(map.counts()).toEqual(countsWhenReleased)
    expect(map.destinations).toEqual(model.destinations.get(map))
    map.drawn.slice(1).forEach((tiles, index) => expect(tiles).not.toEqual(map.drawn[index]))
  }
}

describe('useMapScreen', () => {
  it('draws the selected basemap, the shown layers with their credits, and the bbox on the live map alone, follows only that map, and releases each map once', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(actions, { maxLength: 60, size: 'max' }), async (sequence) => {
        const held = heldServices()
        const screen = useMapScreen(held.services)
        const model: Model = {
          selected: INITIAL_BASEMAP,
          view: INITIAL_MAP_VIEW,
          capture: INITIAL_BBOX_CAPTURE,
          layers: initialLayers(WMS_LAYERS),
          answered: new Set(),
          timedOut: false,
          destinations: new Map(),
          live: undefined,
          maps: [],
          released: new Map(),
        }

        for (const action of sequence) {
          await apply(screen, model, held, action)
          expectScreenMatches(screen, model)
        }
      }),
    )
  })
})
