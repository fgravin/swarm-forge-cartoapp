import { describe, expect, it } from 'vitest'

import { BASEMAPS, type BasemapId } from '../domain/basemaps'
import { INITIAL_MAP_VIEW, type MapView } from '../domain/mapView'
import { rasterTiles, type RasterTiles } from '../domain/rasterTiles'
import type { MapPort } from './mapPort'
import { useMapScreen, type MapScreenState } from './useMapScreen'

function fakeMap() {
  const listeners = new Set<(view: MapView) => void>()
  const drawn: RasterTiles[] = []
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
    destroy() {
      destroyCount += 1
    },
  }
  return {
    port,
    drawn,
    moveTo: (view: MapView) => listeners.forEach((listener) => listener(view)),
    destroyCount: () => destroyCount,
  }
}

function selectedIds(screen: MapScreenState): readonly BasemapId[] {
  return screen.groups.value
    .flatMap((group) => group.options)
    .filter((option) => option.selected)
    .map((option) => option.id)
}

const BUENOS_AIRES: MapView = { center: { lng: -58.3816, lat: -34.6037 }, zoom: 11 }

describe('useMapScreen', () => {
  it('starts at the initial view, with Positron selected', () => {
    const screen = useMapScreen()

    expect(screen.view.value).toEqual(INITIAL_MAP_VIEW)
    expect(screen.description.value).toBe('45.5646° N, 5.9178° E · zoom 5.0')
    expect(selectedIds(screen)).toEqual(['positron'])
  })

  it('shows the selected basemap on the connected map and follows its view', () => {
    const map = fakeMap()
    const screen = useMapScreen()

    screen.connect(map.port)
    map.moveTo(BUENOS_AIRES)

    expect(map.drawn).toEqual([rasterTiles(BASEMAPS.positron)])
    expect(screen.description.value).toBe('34.6037° S, 58.3816° W · zoom 11.0')
  })

  it('shows the basemap the user chooses on the connected map, keeping the view', () => {
    const map = fakeMap()
    const screen = useMapScreen()
    screen.connect(map.port)
    map.moveTo(BUENOS_AIRES)

    screen.select('world-imagery')

    expect(selectedIds(screen)).toEqual(['world-imagery'])
    expect(map.drawn.at(-1)).toEqual(rasterTiles(BASEMAPS['world-imagery']))
    expect(screen.view.value).toEqual(BUENOS_AIRES)
  })

  it('releases the map when disconnected, and stops drawing on it and following it', () => {
    const map = fakeMap()
    const screen = useMapScreen()
    screen.connect(map.port)

    screen.disconnect()
    screen.select('dark-matter')
    map.moveTo(BUENOS_AIRES)

    expect(map.destroyCount()).toBe(1)
    expect(map.drawn).toEqual([rasterTiles(BASEMAPS.positron)])
    expect(screen.view.value).toEqual(INITIAL_MAP_VIEW)
  })

  it('releases the previous map when another one is connected, and draws the selected basemap on the new one', () => {
    const first = fakeMap()
    const second = fakeMap()
    const screen = useMapScreen()
    screen.connect(first.port)
    screen.select('dark-matter')

    screen.connect(second.port)
    first.moveTo(BUENOS_AIRES)

    expect(first.destroyCount()).toBe(1)
    expect(second.destroyCount()).toBe(0)
    expect(second.drawn).toEqual([rasterTiles(BASEMAPS['dark-matter'])])
    expect(screen.view.value).toEqual(INITIAL_MAP_VIEW)
  })

  it('releases a map only once', () => {
    const map = fakeMap()
    const screen = useMapScreen()
    screen.connect(map.port)

    screen.disconnect()
    screen.disconnect()

    expect(map.destroyCount()).toBe(1)
  })

  it('does nothing when disconnected without a map', () => {
    const screen = useMapScreen()

    expect(() => screen.disconnect()).not.toThrow()
    expect(screen.view.value).toEqual(INITIAL_MAP_VIEW)
  })
})
