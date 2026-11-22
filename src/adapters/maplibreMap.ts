import 'maplibre-gl/dist/maplibre-gl.css'
import { MapLibreMap, NavigationControl, type StyleSpecification } from 'maplibre-gl'

import type { MapPort } from '../application/mapPort'
import type { RasterTiles } from '../domain/basemaps'
import type { MapView } from '../domain/mapView'

// One style for the life of the map: the basemap is a source and a layer swapped
// under the overlays, so changing it keeps the view and everything drawn above.
const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] }
const BASEMAP = 'basemap'

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
  })
  map.addControl(new NavigationControl(), 'top-right')
  const loaded = map.once('load')

  function drawBasemap(basemap: RasterTiles): void {
    if (map.getLayer(BASEMAP)) map.removeLayer(BASEMAP)
    if (map.getSource(BASEMAP)) map.removeSource(BASEMAP)
    map.addSource(BASEMAP, {
      type: 'raster',
      tiles: [...basemap.tiles],
      tileSize: basemap.tileSize,
      maxzoom: basemap.maxZoom,
      attribution: basemap.attribution,
    })
    map.addLayer({ id: BASEMAP, type: 'raster', source: BASEMAP }, map.getLayersOrder()[0])
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
    destroy() {
      map.remove()
    },
  }
}
