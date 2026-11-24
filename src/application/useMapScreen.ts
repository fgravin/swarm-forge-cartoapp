import type { Connectable, MapPort } from './mapPort'
import { useBasemaps, type BasemapsState } from './useBasemaps'
import { useBboxCapture, type BboxCaptureState } from './useBboxCapture'
import { useCredits } from './useCredits'
import { useLayers, type LayerServices, type LayersState } from './useLayers'
import { useMapView, type MapViewState } from './useMapView'
import { usePlaceSearch, type PlaceSearchServices, type PlaceSearchState } from './usePlaceSearch'

/**
 * The map screen: the view it follows, the basemap the user chose, the bbox
 * the user drew, the place search that moves the map, and the WMS layers
 * drawn over the basemap.
 */
export interface MapScreenState {
  readonly mapView: MapViewState
  readonly basemaps: BasemapsState
  readonly bboxCapture: BboxCaptureState
  readonly placeSearch: PlaceSearchState
  readonly layers: LayersState
}

/** What the map screen needs from outside. */
export type MapScreenServices = PlaceSearchServices & LayerServices

/** The map screen, and the map it draws on. */
export type MapScreen = MapScreenState & Connectable<MapPort>

/**
 * Shows the selected basemap, the shown layers, their credits and the bbox on
 * the connected map, follows its view and what the user draws on it, and moves
 * it to the place or the layer the user chooses. Asks the WMS servers for the
 * layers as soon as it starts. Releases the map on `disconnect`, or when
 * another map is connected.
 */
export function useMapScreen(services: MapScreenServices): MapScreen {
  const mapView = useMapView()
  const basemaps = useBasemaps()
  const bboxCapture = useBboxCapture()
  const placeSearch = usePlaceSearch(services)
  const layers = useLayers(services)
  const credits = useCredits(basemaps.credit, layers.credits)
  const parts: readonly Connectable<MapPort>[] = [mapView, basemaps, layers, credits, bboxCapture, placeSearch]
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

  return { mapView, basemaps, bboxCapture, placeSearch, layers, connect, disconnect }
}
