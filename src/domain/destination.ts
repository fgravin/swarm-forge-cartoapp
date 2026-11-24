import type { Bbox } from './bbox'
import type { LngLat, MapView } from './mapView'

/** Where the application moves the map: to show an extent, or to a view. */
export type Destination =
  | { readonly kind: 'extent'; readonly extent: Bbox }
  | { readonly kind: 'view'; readonly view: MapView }

const FULL_TURN = 360

/**
 * Shows `extent`. An extent whose west is greater than its east crosses the
 * 180° meridian: its east is moved beyond 180 so that the map shows it across
 * that meridian, not round the rest of the world.
 */
export function extentDestination([west, south, east, north]: Bbox): Destination {
  const shownEast = west > east ? east + FULL_TURN : east
  return { kind: 'extent', extent: [west, south, shownEast, north] }
}

/** Centres the map on `center` at `zoom`. */
export function viewDestination(center: LngLat, zoom: number): Destination {
  return { kind: 'view', view: { center, zoom } }
}
