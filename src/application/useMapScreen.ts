import type { Connectable, MapPort } from './mapPort'
import { useBasemaps, type BasemapsState } from './useBasemaps'
import { useBboxCapture, type BboxCaptureState } from './useBboxCapture'
import { useMapView, type MapViewState } from './useMapView'

/** The map screen: the view it follows, the basemap the user chose, and the bbox the user drew. */
export interface MapScreenState {
  readonly mapView: MapViewState
  readonly basemaps: BasemapsState
  readonly bboxCapture: BboxCaptureState
}

/** The map screen, and the map it draws on. */
export type MapScreen = MapScreenState & Connectable<MapPort>

/**
 * Shows the selected basemap and the bbox on the connected map, and follows
 * its view and what the user draws on it. Releases the map on `disconnect`,
 * or when another map is connected.
 */
export function useMapScreen(): MapScreen {
  const mapView = useMapView()
  const basemaps = useBasemaps()
  const bboxCapture = useBboxCapture()
  const parts: readonly Connectable<MapPort>[] = [mapView, basemaps, bboxCapture]
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

  return { mapView, basemaps, bboxCapture, connect, disconnect }
}
