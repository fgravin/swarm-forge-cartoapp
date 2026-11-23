import { computed, shallowRef, type ComputedRef, type ShallowRef } from 'vue'

import { describeMapView, INITIAL_MAP_VIEW, type MapView } from '../domain/mapView'
import type { Connectable, ViewSource } from './mapPort'

/** What the map shows, and the text of the view indicator. */
export interface MapViewState {
  readonly view: Readonly<ShallowRef<MapView>>
  readonly description: ComputedRef<string>
}

/** Follows the view of the connected source. */
export function useMapView(): MapViewState & Connectable<ViewSource> {
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
