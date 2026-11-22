import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue'

import { describeMapView, INITIAL_MAP_VIEW, type MapView } from '../domain/mapView'
import type { MapPort } from './mapPort'

export interface MapViewState {
  readonly view: Readonly<ShallowRef<MapView>>
  readonly description: ComputedRef<string>
  /** Follows `port` until `disconnect`, or until another port is connected. */
  connect(port: MapPort): void
  /** Stops following the connected map and releases it. */
  disconnect(): void
}

export function useMapView(): MapViewState {
  const view = shallowRef<MapView>(INITIAL_MAP_VIEW)
  const description = computed(() => describeMapView(view.value))
  let release: (() => void) | undefined

  function disconnect(): void {
    release?.()
    release = undefined
  }

  function connect(port: MapPort): void {
    disconnect()
    const stopListening = port.onViewChange((next) => {
      view.value = next
    })
    release = () => {
      stopListening()
      port.destroy()
    }
  }

  return { view, description, connect, disconnect }
}
