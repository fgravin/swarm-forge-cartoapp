import type { Connectable, MapPort } from './mapPort'
import { useBasemaps, type BasemapsState } from './useBasemaps'
import { useBboxCapture, type BboxCaptureState } from './useBboxCapture'
import { useMapView, type MapViewState } from './useMapView'
import { usePlaceSearch, type PlaceSearchServices, type PlaceSearchState } from './usePlaceSearch'

/**
 * The map screen: the view it follows, the basemap the user chose, the bbox
 * the user drew, and the place search that moves the map.
 */
export interface MapScreenState {
  readonly mapView: MapViewState
  readonly basemaps: BasemapsState
  readonly bboxCapture: BboxCaptureState
  readonly placeSearch: PlaceSearchState
}

/** The map screen, and the map it draws on. */
export type MapScreen = MapScreenState & Connectable<MapPort>

/**
 * Shows the selected basemap and the bbox on the connected map, follows its
 * view and what the user draws on it, and moves it to the place the user
 * chooses. Releases the map on `disconnect`, or when another map is connected.
 */
export function useMapScreen(placeSearchServices: PlaceSearchServices): MapScreen {
  const mapView = useMapView()
  const basemaps = useBasemaps()
  const bboxCapture = useBboxCapture()
  const placeSearch = usePlaceSearch(placeSearchServices)
  const parts: readonly Connectable<MapPort>[] = [mapView, basemaps, bboxCapture, placeSearch]
  let connected: MapPort | undefined

  function disconnect(): void {
    parts.forEach((part) => part.disconnect())
    connected?.destroy()
    connected = undefined
  }

  function connect(map: MapPort): void {
    disconnect()
    connected = map
    parts.forEach((part) => part.connect(map))
  }

  return { mapView, basemaps, bboxCapture, placeSearch, connect, disconnect }
}
