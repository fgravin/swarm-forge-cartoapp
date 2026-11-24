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
import { describeMapView, INITIAL_MAP_VIEW, type MapView } from '../domain/mapView'
import { rasterTiles, type RasterTiles } from '../domain/rasterTiles'
import type { MapPort } from './mapPort'
import { useMapScreen, type MapScreen } from './useMapScreen'
import type { PlaceSearchServices } from './usePlaceSearch'

// No place finder: the place search is disabled, and waits for nothing.
const NO_PLACE_SEARCH: PlaceSearchServices = {
  finder: undefined,
  timer: { after: () => () => {} },
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

/** How many times the screen has drawn on a map, of each kind. */
interface DrawCounts {
  readonly basemaps: number
  readonly drawingModes: number
  readonly rectangles: number
}

interface RecordingMap {
  readonly port: MapPort
  readonly drawn: readonly RasterTiles[]
  readonly drawingMode: () => boolean
  readonly rectangles: () => readonly Bbox[]
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
      goTo: () => {},
      destroy: () => {
        destroyCount += 1
      },
    },
    drawn,
    drawingMode: () => drawingMode,
    rectangles: () => rectangles,
    counts: () => ({ basemaps: drawn.length, drawingModes, rectangles: rectangleCount }),
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

const actions: fc.Arbitrary<Action> = fc.oneof(
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

function apply(screen: MapScreen, model: Model, action: Action): void {
  switch (action.kind) {
    case 'connect': {
      const map = recordingMap()
      release(model)
      model.maps.push(map)
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
  }
  for (const map of model.maps) {
    const countsWhenReleased = model.released.get(map)
    expect(map.destroyCount()).toBe(countsWhenReleased === undefined ? 0 : 1)
    if (countsWhenReleased !== undefined) expect(map.counts()).toEqual(countsWhenReleased)
    map.drawn.slice(1).forEach((tiles, index) => expect(tiles).not.toEqual(map.drawn[index]))
  }
}

describe('useMapScreen', () => {
  it('draws the selected basemap and the bbox on the live map alone, follows only that map, and releases each map once', () => {
    fc.assert(
      fc.property(fc.array(actions, { maxLength: 60, size: 'max' }), (sequence) => {
        const screen = useMapScreen(NO_PLACE_SEARCH)
        const model: Model = {
          selected: INITIAL_BASEMAP,
          view: INITIAL_MAP_VIEW,
          capture: INITIAL_BBOX_CAPTURE,
          live: undefined,
          maps: [],
          released: new Map(),
        }

        for (const action of sequence) {
          apply(screen, model, action)
          expectScreenMatches(screen, model)
        }
      }),
    )
  })
})
