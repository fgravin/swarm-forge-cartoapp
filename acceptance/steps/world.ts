import { useBasemaps, type BasemapsState } from '../../src/application/useBasemaps'
import { useMapView, type MapViewState } from '../../src/application/useMapView'
import { createFakeMap, type FakeMap } from './fakeMap'

/** The state one scenario execution drives: the application's composables, and a fake map. */
export interface World {
  readonly mapView: MapViewState
  readonly basemaps: BasemapsState
  readonly map: FakeMap
}

export function createWorld(): World {
  return { mapView: useMapView(), basemaps: useBasemaps(), map: createFakeMap() }
}
