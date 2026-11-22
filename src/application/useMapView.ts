import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue'

import { describeMapView, INITIAL_MAP_VIEW, type MapView } from '../domain/mapView'
import type { ViewSource } from './mapPort'

export interface MapViewState {
  readonly view: Readonly<ShallowRef<MapView>>
  readonly description: ComputedRef<string>
  /** Follows `source` until `disconnect`, or until another source is connected. */
  connect(source: ViewSource): void
  /** Stops following the connected source. */
  disconnect(): void
}

export function useMapView(): MapViewState {
  const view = shallowRef<MapView>(INITIAL_MAP_VIEW)
  const description = computed(() => describeMapView(view.value))
  let stopFollowing: (() => void) | undefined

  function disconnect(): void {
    stopFollowing?.()
    stopFollowing = undefined
  }

  function connect(source: ViewSource): void {
    disconnect()
    stopFollowing = source.onViewChange((next) => {
      view.value = next
    })
  }

  return { view, description, connect, disconnect }
}
