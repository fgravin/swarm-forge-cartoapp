import type { ComputedRef, ShallowRef } from 'vue'

import type { BasemapId } from '../domain/basemaps'
import type { MapView } from '../domain/mapView'
import type { MapPort } from './mapPort'
import { useBasemaps, type BasemapGroup } from './useBasemaps'
import { useBboxCapture } from './useBboxCapture'
import { useMapView } from './useMapView'

/** The map screen: the map it draws on, the view it follows, the basemap the user chose, and the bbox the user drew. */
export interface MapScreenState {
  readonly view: Readonly<ShallowRef<MapView>>
  readonly description: ComputedRef<string>
  readonly groups: ComputedRef<readonly BasemapGroup[]>
  select(id: BasemapId): void
  /** The text of the bbox panel. */
  readonly bboxText: ComputedRef<string>
  readonly canClear: ComputedRef<boolean>
  readonly drawingMode: ComputedRef<boolean>
  /** What the drawing button does. */
  toggleDrawing(): void
  clearBbox(): void
  /**
   * Shows the selected basemap and the bbox on `map`, follows its view and what
   * the user draws on it, until `disconnect` or until another map is connected;
   * then releases it.
   */
  connect(map: MapPort): void
  /** Stops using the connected map and releases it. */
  disconnect(): void
}

export function useMapScreen(): MapScreenState {
  const mapView = useMapView()
  const basemaps = useBasemaps()
  const bboxCapture = useBboxCapture()
  let connected: MapPort | undefined

  function disconnect(): void {
    bboxCapture.disconnect()
    basemaps.disconnect()
    mapView.disconnect()
    connected?.destroy()
    connected = undefined
  }

  function connect(map: MapPort): void {
    disconnect()
    connected = map
    mapView.connect(map)
    basemaps.connect(map)
    bboxCapture.connect(map)
  }

  return {
    view: mapView.view,
    description: mapView.description,
    groups: basemaps.groups,
    select: basemaps.select,
    bboxText: bboxCapture.bboxText,
    canClear: bboxCapture.canClear,
    drawingMode: bboxCapture.drawingMode,
    toggleDrawing: bboxCapture.toggleDrawing,
    clearBbox: bboxCapture.clearBbox,
    connect,
    disconnect,
  }
}
