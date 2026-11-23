import { useMapScreen, type MapScreen } from '../../src/application/useMapScreen'
import { createFakeMap, type FakeMap } from './fakeMap'

/** The state one scenario execution drives: the application's map screen, and a fake map. */
export interface World {
  readonly screen: MapScreen
  readonly map: FakeMap
  /** What the bbox panel read when a Given step captured a bbox, to compare it with later. */
  notedBbox: string | undefined
}

export function createWorld(): World {
  return { screen: useMapScreen(), map: createFakeMap(), notedBbox: undefined }
}
