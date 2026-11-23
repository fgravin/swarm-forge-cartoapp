import type { ComputedRef, ShallowRef } from 'vue'

import type { BasemapId } from '../domain/basemaps'
import type { MapView } from '../domain/mapView'
import type { MapPort } from './mapPort'
import { useBasemaps, type BasemapGroup } from './useBasemaps'
import { useMapView } from './useMapView'

/** The map screen: the map it draws on, the view it follows, and the basemap the user chose. */
export interface MapScreenState {
  readonly view: Readonly<ShallowRef<MapView>>
  readonly description: ComputedRef<string>
  readonly groups: ComputedRef<readonly BasemapGroup[]>
  select(id: BasemapId): void
  /**
   * Shows the selected basemap on `map` and follows its view, until `disconnect`
   * or until another map is connected; then releases it.
   */
  connect(map: MapPort): void
  /** Stops using the connected map and releases it. */
  disconnect(): void
}

export function useMapScreen(): MapScreenState {
  const mapView = useMapView()
  const basemaps = useBasemaps()
  let connected: MapPort | undefined

  function disconnect(): void {
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
  }

  return {
    view: mapView.view,
    description: mapView.description,
    groups: basemaps.groups,
    select: basemaps.select,
    connect,
    disconnect,
  }
}
