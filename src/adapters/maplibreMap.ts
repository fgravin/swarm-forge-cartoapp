import 'maplibre-gl/dist/maplibre-gl.css'
import { MapLibreMap, NavigationControl, type StyleSpecification } from 'maplibre-gl'

import type { MapPort } from '../application/mapPort'
import type { MapView } from '../domain/mapView'

const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
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
    style: BASE_STYLE,
    center: [initialView.center.lng, initialView.center.lat],
    zoom: initialView.zoom,
  })
  map.addControl(new NavigationControl(), 'top-right')

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
    destroy() {
      map.remove()
    },
  }
}
