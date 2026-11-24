import type { MapPort } from '../../src/application/mapPort'
import type { Bbox } from '../../src/domain/bbox'
import type { DrawEvent, MapPointer, ScreenPoint } from '../../src/domain/bboxCapture'
import type { Destination } from '../../src/domain/destination'
import type { RasterTiles } from '../../src/domain/rasterTiles'
import type { LngLat, MapView } from '../../src/domain/mapView'
import type { WmsTileLayer } from '../../src/domain/wmsTiles'

/** A map that records what the application draws on it, moved and drawn on by the steps as a user would. */
export interface FakeMap {
  readonly port: MapPort
  /** The user moves the map to `view`. */
  moveTo(view: MapView): void
  /** Every basemap the application has drawn, in order; the last one is on the map. */
  drawnBasemaps(): readonly RasterTiles[]
  /** The credits the map shows, as the application writes them. */
  credits(): string
  /** The WMS layers the map draws over its basemap, the first one on top. */
  drawnLayers(): readonly WmsTileLayer[]
  /** Whether the application has turned the drawing mode of the map on. */
  drawingMode(): boolean
  /** The rectangles the map shows over its basemap. */
  rectangles(): readonly Bbox[]
  /** Where the pointer is when it is over `position`. */
  pointerAt(position: LngLat): MapPointer
  /** Where the pointer is when it is at `point` on the screen. */
  pointerAtPoint(point: ScreenPoint): MapPointer
  /** The user presses, moves, or releases the pointer on the map, or presses Escape, while the drawing mode is on. */
  draw(event: DrawEvent): void
  /** Every destination the application has moved the map to, in order. */
  destinations(): readonly Destination[]
}

/**
 * How many pixels a degree spans on the fake map, which does not project the
 * Earth: x grows with longitude and y with southing, from 0° E, 0° N.
 */
const PIXELS_PER_DEGREE = 1000

export function createFakeMap(): FakeMap {
  const viewListeners = new Set<(view: MapView) => void>()
  const drawListeners = new Set<(event: DrawEvent) => void>()
  const drawn: RasterTiles[] = []
  let layers: readonly WmsTileLayer[] = []
  let credits = ''
  const destinations: Destination[] = []
  let drawingMode = false
  let rectangles: readonly Bbox[] = []
  const port: MapPort = {
    onViewChange(listener) {
      viewListeners.add(listener)
      return () => {
        viewListeners.delete(listener)
      }
    },
    showBasemap(tiles) {
      drawn.push(tiles)
    },
    setDrawingMode(on) {
      drawingMode = on
    },
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
      viewListeners.clear()
      drawListeners.clear()
    },
  }
  return {
    port,
    moveTo: (view) => viewListeners.forEach((listener) => listener(view)),
    drawnBasemaps: () => drawn,
    credits: () => credits,
    drawnLayers: () => layers,
    drawingMode: () => drawingMode,
    rectangles: () => rectangles,
    pointerAt: (position) => ({
      point: { x: position.lng * PIXELS_PER_DEGREE, y: -position.lat * PIXELS_PER_DEGREE },
      position,
    }),
    pointerAtPoint: (point) => ({
      point,
      position: { lng: point.x / PIXELS_PER_DEGREE, lat: -point.y / PIXELS_PER_DEGREE },
    }),
    draw(event) {
      // The map reports what the user does with the pointer only in the drawing mode.
      if (drawingMode) drawListeners.forEach((listener) => listener(event))
    },
    destinations: () => destinations,
  }
}
