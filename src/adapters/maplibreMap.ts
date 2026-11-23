import 'maplibre-gl/dist/maplibre-gl.css'
import {
  MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapTouchEvent,
  type StyleSpecification,
  type Subscription,
} from 'maplibre-gl'
// MapLibre looks for its worker beside its own module, which the build bundles
// away: without this URL the worker fails to load and no GeoJSON overlay is drawn.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

import type { MapPort } from '../application/mapPort'
import { bboxRing, type Bbox } from '../domain/bbox'
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
    features: rectangles.map((bbox) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [bboxRing(bbox).map(({ lng, lat }) => [lng, lat])] },
    })),
  }
}

function pointerOfTouch(event: MapTouchEvent): MapPointer {
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
  setWorkerUrl(maplibreWorkerUrl)
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

  /** Where the mouse is on the map, also when it is outside the map or over a panel above it. */
  function pointerOfMouse(event: MouseEvent): MapPointer {
    const box = map.getCanvasContainer().getBoundingClientRect()
    const point = { x: event.clientX - box.left, y: event.clientY - box.top }
    const position = map.unproject([point.x, point.y]).wrap()
    return { point, position: { lng: position.lng, lat: position.lat } }
  }

  function reportEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape') report({ type: 'cancel' })
  }

  function reportMouseMove(event: MouseEvent): void {
    report({ type: 'move', pointer: pointerOfMouse(event) })
  }

  function reportMouseRelease(event: MouseEvent): void {
    if (event.button === 0) report({ type: 'release', pointer: pointerOfMouse(event) })
  }

  function startDrawing(): void {
    competingHandlers.forEach((handler) => handler.disable())
    container.classList.add(DRAWING_CLASS)
    drawingSubscriptions = [
      map.on('mousedown', (event) => {
        if (event.originalEvent.button === 0) report({ type: 'press', pointer: pointerOfMouse(event.originalEvent) })
      }),
      map.on('touchstart', (event) => report({ type: 'press', pointer: pointerOfTouch(event) })),
      map.on('touchmove', (event) => report({ type: 'move', pointer: pointerOfTouch(event) })),
      map.on('touchend', (event) => report({ type: 'release', pointer: pointerOfTouch(event) })),
    ]
    // A drag that starts on the map may end outside it, or over a panel above it,
    // where the map hears nothing: follow the mouse over the whole window.
    window.addEventListener('mousemove', reportMouseMove)
    window.addEventListener('mouseup', reportMouseRelease)
    window.addEventListener('keydown', reportEscape)
  }

  function stopDrawing(): void {
    drawingSubscriptions.forEach((subscription) => subscription.unsubscribe())
    drawingSubscriptions = []
    window.removeEventListener('mousemove', reportMouseMove)
    window.removeEventListener('mouseup', reportMouseRelease)
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
