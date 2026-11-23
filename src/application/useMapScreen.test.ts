import { describe, expect, it } from 'vitest'

import { BASEMAPS, type BasemapId } from '../domain/basemaps'
import type { Bbox } from '../domain/bbox'
import type { DrawEvent } from '../domain/bboxCapture'
import { INITIAL_MAP_VIEW, type LngLat, type MapView } from '../domain/mapView'
import { rasterTiles, type RasterTiles } from '../domain/rasterTiles'
import type { MapPort } from './mapPort'
import { useMapScreen, type MapScreenState } from './useMapScreen'

function fakeMap() {
  const listeners = new Set<(view: MapView) => void>()
  const drawListeners = new Set<(event: DrawEvent) => void>()
  const drawn: RasterTiles[] = []
  let rectangles: readonly Bbox[] = []
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
    destroy() {
      destroyCount += 1
    },
  }
  return {
    port,
    drawn,
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

  it('captures the bbox the user draws on the connected map', () => {
    const map = fakeMap()
    const screen = useMapScreen()
    screen.connect(map.port)

    screen.toggleDrawing()
    map.drag({ lng: 2.4, lat: 48.9 }, { lng: 2.3, lat: 48.8 })

    expect(screen.bboxText.value).toBe('2.30000, 48.80000, 2.40000, 48.90000')
    expect(screen.drawingMode.value).toBe(false)
    expect(screen.canClear.value).toBe(true)
    expect(map.rectangles()).toEqual([[2.3, 48.8, 2.4, 48.9]])
  })

  it('keeps the bbox when the user moves the map or chooses another basemap', () => {
    const map = fakeMap()
    const screen = useMapScreen()
    screen.connect(map.port)
    screen.toggleDrawing()
    map.drag({ lng: 2.4, lat: 48.9 }, { lng: 2.3, lat: 48.8 })

    map.moveTo(BUENOS_AIRES)
    screen.select('world-imagery')

    expect(screen.bboxText.value).toBe('2.30000, 48.80000, 2.40000, 48.90000')
    expect(map.rectangles()).toEqual([[2.3, 48.8, 2.4, 48.9]])
  })

  it('clears the bbox', () => {
    const map = fakeMap()
    const screen = useMapScreen()
    screen.connect(map.port)
    screen.toggleDrawing()
    map.drag({ lng: 2.4, lat: 48.9 }, { lng: 2.3, lat: 48.8 })

    screen.clearBbox()

    expect(screen.bboxText.value).toBe('Aucune emprise')
    expect(map.rectangles()).toEqual([])
  })

  it('releases the map when disconnected, and stops drawing on it and following it', () => {
    const map = fakeMap()
    const screen = useMapScreen()
    screen.connect(map.port)

    screen.disconnect()
    screen.select('dark-matter')
    map.moveTo(BUENOS_AIRES)
    screen.toggleDrawing()
    map.drag({ lng: 2.4, lat: 48.9 }, { lng: 2.3, lat: 48.8 })

    expect(map.destroyCount()).toBe(1)
    expect(map.drawn).toEqual([rasterTiles(BASEMAPS.positron)])
    expect(screen.view.value).toEqual(INITIAL_MAP_VIEW)
    expect(screen.bboxText.value).toBe('Aucune emprise')
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
