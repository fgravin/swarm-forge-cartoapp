import 'maplibre-gl/dist/maplibre-gl.css'
import {
  MapLibreMap,
  NavigationControl,
  type GeoJSONSource,
  type MapMouseEvent,
  type MapTouchEvent,
  type StyleSpecification,
  type Subscription,
} from 'maplibre-gl'

import type { MapPort } from '../application/mapPort'
import type { Bbox } from '../domain/bbox'
import type { DrawEvent, MapPointer } from '../domain/bboxCapture'
import type { RasterTiles } from '../domain/rasterTiles'
import type { MapView } from '../domain/mapView'

// One style for the life of the map: the basemap is a source and a layer swapped
// under the overlays, so changing it keeps the view and everything drawn above.
const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] }
const BASEMAP = 'basemap'
const RECTANGLES = 'rectangles'
const RECTANGLE_COLOR = '#0369a1'
// Styled in `src/style.css`: the crosshair cursor of the drawing mode.
const DRAWING_CLASS = 'map-drawing'

type GeoJsonData = Parameters<GeoJSONSource['setData']>[0]

function rectangleData(rectangles: readonly Bbox[]): GeoJsonData {
  return {
    type: 'FeatureCollection',
    features: rectangles.map(([west, south, east, north]) => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
    })),
  }
}

function pointerOf(event: MapMouseEvent | MapTouchEvent): MapPointer {
  const position = event.lngLat.wrap()
  return { point: { x: event.point.x, y: event.point.y }, position: { lng: position.lng, lat: position.lat } }
}

/**
 * Creates the MapLibre map inside `container`.
 *
 * MapLibre needs a browser with WebGL, so this module cannot run under the
 * unit tests. It stays a thin translation between MapLibre and `MapPort`.
 */
export function createMaplibreMap(container: HTMLElement, initialView: MapView): MapPort {
  const map = new MapLibreMap({
    container,
    style: EMPTY_STYLE,
    center: [initialView.center.lng, initialView.center.lat],
    zoom: initialView.zoom,
    // Credit the basemap alone: no default "MapLibre" entry beside its attribution.
    attributionControl: {},
  })
  map.addControl(new NavigationControl(), 'top-right')
  const loaded = map.once('load')
  const overlaysAdded = loaded.then(addRectangleLayers)
  // The map handlers a drag in the drawing mode would set off.
  const competingHandlers = [map.dragPan, map.boxZoom, map.doubleClickZoom]
  const drawListeners = new Set<(event: DrawEvent) => void>()
  let drawingSubscriptions: readonly Subscription[] = []

  function drawBasemap(basemap: RasterTiles): void {
    if (map.getLayer(BASEMAP)) map.removeLayer(BASEMAP)
    if (map.getSource(BASEMAP)) map.removeSource(BASEMAP)
    map.addSource(BASEMAP, {
      type: 'raster',
      tiles: [...basemap.tileUrls],
      tileSize: basemap.tileSize,
      maxzoom: basemap.maxZoom,
      attribution: basemap.attribution,
    })
    map.addLayer({ id: BASEMAP, type: 'raster', source: BASEMAP }, map.getLayersOrder()[0])
  }

  function addRectangleLayers(): void {
    map.addSource(RECTANGLES, { type: 'geojson', data: rectangleData([]) })
    map.addLayer({
      id: `${RECTANGLES}-fill`,
      type: 'fill',
      source: RECTANGLES,
      paint: { 'fill-color': RECTANGLE_COLOR, 'fill-opacity': 0.15 },
    })
    map.addLayer({
      id: `${RECTANGLES}-outline`,
      type: 'line',
      source: RECTANGLES,
      paint: { 'line-color': RECTANGLE_COLOR, 'line-width': 2 },
    })
  }

  function report(event: DrawEvent): void {
    drawListeners.forEach((listener) => listener(event))
  }

  function reportEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape') report({ type: 'cancel' })
  }

  function startDrawing(): void {
    competingHandlers.forEach((handler) => handler.disable())
    container.classList.add(DRAWING_CLASS)
    drawingSubscriptions = [
      map.on('mousedown', (event) => {
        if (event.originalEvent.button === 0) report({ type: 'press', pointer: pointerOf(event) })
      }),
      map.on('mousemove', (event) => report({ type: 'move', pointer: pointerOf(event) })),
      map.on('mouseup', (event) => report({ type: 'release', pointer: pointerOf(event) })),
      map.on('touchstart', (event) => report({ type: 'press', pointer: pointerOf(event) })),
      map.on('touchmove', (event) => report({ type: 'move', pointer: pointerOf(event) })),
      map.on('touchend', (event) => report({ type: 'release', pointer: pointerOf(event) })),
    ]
    window.addEventListener('keydown', reportEscape)
  }

  function stopDrawing(): void {
    drawingSubscriptions.forEach((subscription) => subscription.unsubscribe())
    drawingSubscriptions = []
    window.removeEventListener('keydown', reportEscape)
    container.classList.remove(DRAWING_CLASS)
    competingHandlers.forEach((handler) => handler.enable())
  }

  return {
    onViewChange(listener) {
      const notify = (): void => {
        const center = map.getCenter().wrap()
        listener({ center: { lng: center.lng, lat: center.lat }, zoom: map.getZoom() })
      }
      map.on('move', notify)
      return () => {
        map.off('move', notify)
      }
    },
    showBasemap(basemap) {
      void loaded.then(() => drawBasemap(basemap))
    },
    setDrawingMode(on) {
      stopDrawing()
      if (on) startDrawing()
    },
    onDraw(listener) {
      drawListeners.add(listener)
      return () => {
        drawListeners.delete(listener)
      }
    },
    showRectangles(rectangles) {
      void overlaysAdded.then(() => map.getSource<GeoJSONSource>(RECTANGLES)?.setData(rectangleData(rectangles)))
    },
    destroy() {
      stopDrawing()
      drawListeners.clear()
      map.remove()
    },
  }
}
