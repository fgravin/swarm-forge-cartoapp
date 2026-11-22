import { useMapView, type MapViewState } from '../../src/application/useMapView'

/** The state one scenario execution drives: the application's composables, given fake ports. */
export interface World {
  readonly mapView: MapViewState
}

export function createWorld(): World {
  return { mapView: useMapView() }
}
