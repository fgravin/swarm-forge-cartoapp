import type { RasterTiles } from '../domain/basemaps'
import type { MapView } from '../domain/mapView'

/** What the application needs from a map to show a basemap. */
export interface BasemapDisplay {
  /** Draws `tiles` as the basemap, in place of the one drawn before, keeping the view. */
  showBasemap(tiles: RasterTiles): void
}

/**
 * What the application needs from a map. The MapLibre adapter implements it;
 * unit and acceptance tests replace it with a fake.
 */
export interface MapPort extends BasemapDisplay {
  /** Calls `listener` each time the visible view changes. Returns the function that stops it. */
  onViewChange(listener: (view: MapView) => void): () => void
  /** Releases the map and everything it holds. */
  destroy(): void
}
