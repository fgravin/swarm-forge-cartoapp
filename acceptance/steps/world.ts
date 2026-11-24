import { geonamesPlaceFinder } from '../../src/application/geonamesPlaceFinder'
import { useMapScreen, type MapScreen } from '../../src/application/useMapScreen'
import { createFakeClock, type FakeClock } from './fakeClock'
import { createFakeGeoNames, USUAL_ANSWERS, type FakeGeoNames } from './fakeGeoNames'
import { createFakeMap, type FakeMap } from './fakeMap'
import { createFakeWmsServers, type FakeWmsServers } from './fakeWms'

/**
 * The state one scenario execution drives: the application's map screen, and
 * fakes of the map, of GeoNames, of the WMS servers, and of the passing of time.
 */
export interface World {
  readonly map: FakeMap
  readonly geonames: FakeGeoNames
  readonly wms: FakeWmsServers
  readonly clock: FakeClock
  /** The application's map screen, once a step has started the application. */
  readonly screen: MapScreen
  /** Starts the application, built with `username` as its GeoNames username, on the fake map. */
  start(username: string | undefined): void
  /** What the bbox panel read when a Given step captured a bbox, to compare it with later. */
  notedBbox: string | undefined
  /** The text the user types character by character, over several steps. */
  typingGoal: string | undefined
  /** The position, from 1, of the suggestion a step named last. */
  notedSuggestion: number | undefined
  /** The names of the places GeoNames finds, as a step gave them. */
  foundPlaces: readonly string[]
  /** The position, from 1, of the layer of the panel a step named last. */
  notedLayer: number | undefined
}

export function createWorld(): World {
  const map = createFakeMap()
  const geonames = createFakeGeoNames(USUAL_ANSWERS)
  const wms = createFakeWmsServers()
  const clock = createFakeClock()
  let started: MapScreen | undefined
  return {
    map,
    geonames,
    wms,
    clock,
    get screen() {
      if (started === undefined) throw new Error('the application has not started: start it in an earlier step')
      return started
    },
    start(username) {
      started = useMapScreen({ finder: geonamesPlaceFinder(username, geonames.source), wms: wms.port, timer: clock.timer })
      started.connect(map.port)
    },
    notedBbox: undefined,
    typingGoal: undefined,
    notedSuggestion: undefined,
    foundPlaces: [],
    notedLayer: undefined,
  }
}
