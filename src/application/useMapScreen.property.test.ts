import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { BASEMAP_PROVIDERS, BASEMAPS, INITIAL_BASEMAP, type BasemapId } from '../domain/basemaps'
import { describeMapView, INITIAL_MAP_VIEW, type MapView } from '../domain/mapView'
import { rasterTiles, type RasterTiles } from '../domain/rasterTiles'
import type { MapPort } from './mapPort'
import { useMapScreen, type MapScreenState } from './useMapScreen'

/** What the user and the component do to the map screen. */
type Action =
  | { readonly kind: 'connect' }
  | { readonly kind: 'disconnect' }
  | { readonly kind: 'select'; readonly id: BasemapId }
  | { readonly kind: 'move'; readonly view: MapView }

interface RecordingMap {
  readonly port: MapPort
  readonly drawn: readonly RasterTiles[]
  readonly destroyCount: () => number
  readonly moveTo: (view: MapView) => void
}

function recordingMap(): RecordingMap {
  const listeners = new Set<(view: MapView) => void>()
  const drawn: RasterTiles[] = []
  let destroyCount = 0
  return {
    port: {
      onViewChange(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      showBasemap: (tiles) => drawn.push(tiles),
      destroy: () => {
        destroyCount += 1
      },
    },
    drawn,
    destroyCount: () => destroyCount,
    moveTo: (view) => listeners.forEach((listener) => listener(view)),
  }
}

/** What the screen should show, kept by the test beside the screen it drives. */
interface Model {
  selected: BasemapId
  view: MapView
  live: RecordingMap | undefined
  readonly maps: RecordingMap[]
  /** Each released map, with how many basemaps it had drawn when released. */
  readonly released: Map<RecordingMap, number>
}

const BASEMAP_IDS = BASEMAP_PROVIDERS.flatMap((provider) => provider.basemaps.map((basemap) => basemap.id))

const mapViews: fc.Arbitrary<MapView> = fc.record({
  center: fc.record({
    lng: fc.double({ min: -180, max: 180, noNaN: true }),
    lat: fc.double({ min: -85, max: 85, noNaN: true }),
  }),
  zoom: fc.double({ min: 0, max: 19, noNaN: true }),
})

const actions: fc.Arbitrary<Action> = fc.oneof(
  fc.constant({ kind: 'connect' } as const),
  fc.constant({ kind: 'disconnect' } as const),
  fc.record({ kind: fc.constant('select' as const), id: fc.constantFrom(...BASEMAP_IDS) }),
  fc.record({ kind: fc.constant('move' as const), view: mapViews }),
)

function release(model: Model): void {
  if (model.live) model.released.set(model.live, model.live.drawn.length)
  model.live = undefined
}

function apply(screen: MapScreenState, model: Model, action: Action): void {
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
      screen.select(action.id)
      return
    case 'move':
      if (model.live) model.view = action.view
      model.maps.forEach((map) => map.moveTo(action.view))
      return
    default: {
      const unknown: never = action
      throw new Error(`unknown action ${JSON.stringify(unknown)}`)
    }
  }
}

function expectScreenMatches(screen: MapScreenState, model: Model): void {
  const selected = screen.groups.value.flatMap((group) => group.options).filter((option) => option.selected)
  expect(selected.map((option) => option.id)).toEqual([model.selected])
  expect(screen.view.value).toEqual(model.view)
  expect(screen.description.value).toBe(describeMapView(model.view))
  if (model.live) expect(model.live.drawn.at(-1)).toEqual(rasterTiles(BASEMAPS[model.selected]))
  for (const map of model.maps) {
    const drawnWhenReleased = model.released.get(map)
    expect(map.destroyCount()).toBe(drawnWhenReleased === undefined ? 0 : 1)
    if (drawnWhenReleased !== undefined) expect(map.drawn).toHaveLength(drawnWhenReleased)
    map.drawn.slice(1).forEach((tiles, index) => expect(tiles).not.toEqual(map.drawn[index]))
  }
}

describe('useMapScreen', () => {
  it('draws the selected basemap on the live map alone, follows only that map, and releases each map once', () => {
    fc.assert(
      fc.property(fc.array(actions, { maxLength: 40 }), (sequence) => {
        const screen = useMapScreen()
        const model: Model = {
          selected: INITIAL_BASEMAP,
          view: INITIAL_MAP_VIEW,
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
