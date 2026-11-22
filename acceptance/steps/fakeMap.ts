import type { MapPort } from '../../src/application/mapPort'
import type { RasterTiles } from '../../src/domain/basemaps'
import type { MapView } from '../../src/domain/mapView'

/** A map that records what the application draws on it, moved by the steps as a user would. */
export interface FakeMap {
  readonly port: MapPort
  /** The user moves the map to `view`. */
  moveTo(view: MapView): void
  /** Every basemap the application has drawn, in order; the last one is on the map. */
  drawnBasemaps(): readonly RasterTiles[]
  /** The credits the map shows: those of the basemap it draws. */
  credits(): readonly string[]
}

export function createFakeMap(): FakeMap {
  const listeners = new Set<(view: MapView) => void>()
  const drawn: RasterTiles[] = []
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
      listeners.clear()
    },
  }
  return {
    port,
    moveTo: (view) => listeners.forEach((listener) => listener(view)),
    drawnBasemaps: () => drawn,
    credits: () => drawn.slice(-1).map((tiles) => tiles.attribution),
  }
}
