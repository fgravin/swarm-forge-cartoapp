import type { LngLat } from './mapView'

/** A rectangle on the Earth, in WGS84 degrees (EPSG:4326): west, south, east, north. */
export type Bbox = readonly [west: number, south: number, east: number, north: number]

const DECIMALS = 5

/** The bbox with `a` and `b` at opposite corners, whatever corner each one is. */
export function bboxBetween(a: LngLat, b: LngLat): Bbox {
  return [Math.min(a.lng, b.lng), Math.min(a.lat, b.lat), Math.max(a.lng, b.lng), Math.max(a.lat, b.lat)]
}

/** The corners of `bbox` from the south-west one, counter-clockwise, back to the first: a closed polygon ring. */
export function bboxRing([west, south, east, north]: Bbox): readonly LngLat[] {
  return [
    { lng: west, lat: south },
    { lng: east, lat: south },
    { lng: east, lat: north },
    { lng: west, lat: north },
    { lng: west, lat: south },
  ]
}

/** The text of the bbox panel, for example `5.71234, 45.12345, 6.01234, 45.56789`. */
export function describeBbox(bbox: Bbox | undefined): string {
  if (bbox === undefined) return 'Aucune emprise'
  return bbox.map((degrees) => degrees.toFixed(DECIMALS)).join(', ')
}
