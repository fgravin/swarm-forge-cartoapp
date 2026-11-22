/** A position in WGS84 degrees. Longitude first, as MapLibre and GeoJSON order it. */
export interface LngLat {
  readonly lng: number
  readonly lat: number
}

/** What the map shows: where it is centred and how far it is zoomed in. */
export interface MapView {
  readonly center: LngLat
  readonly zoom: number
}

export const INITIAL_MAP_VIEW: MapView = {
  center: { lng: 5.9178, lat: 45.5646 },
  zoom: 5,
}

function formatDegrees(value: number, positive: string, negative: string): string {
  const hemisphere = value < 0 ? negative : positive
  return `${Math.abs(value).toFixed(4)}° ${hemisphere}`
}

/** The text shown for a view, for example `45.5646° N, 5.9178° E · zoom 5.0`. */
export function describeMapView(view: MapView): string {
  const latitude = formatDegrees(view.center.lat, 'N', 'S')
  const longitude = formatDegrees(view.center.lng, 'E', 'W')
  return `${latitude}, ${longitude} · zoom ${view.zoom.toFixed(1)}`
}
