import { computed, shallowRef, type ComputedRef } from 'vue'

import { BASEMAP_PROVIDERS, BASEMAPS, INITIAL_BASEMAP, rasterTiles, type BasemapId } from '../domain/basemaps'
import type { BasemapDisplay } from './mapPort'

/** A basemap as the panel offers it. */
export interface BasemapOption {
  readonly id: BasemapId
  readonly name: string
  readonly selected: boolean
}

/** The basemaps of one provider, as the panel groups them. */
export interface BasemapGroup {
  readonly provider: string
  readonly options: readonly BasemapOption[]
}

export interface BasemapsState {
  readonly groups: ComputedRef<readonly BasemapGroup[]>
  select(id: BasemapId): void
  /** Shows the selected basemap on `display`, now and after each change, until `disconnect`. */
  connect(display: BasemapDisplay): void
  disconnect(): void
}

export function useBasemaps(): BasemapsState {
  const selected = shallowRef<BasemapId>(INITIAL_BASEMAP)
  const groups = computed(() =>
    BASEMAP_PROVIDERS.map((provider) => ({
      provider: provider.name,
      options: provider.basemaps.map(({ id, name }) => ({ id, name, selected: id === selected.value })),
    })),
  )
  let display: BasemapDisplay | undefined

  function show(): void {
    display?.showBasemap(rasterTiles(BASEMAPS[selected.value]))
  }

  function select(id: BasemapId): void {
    if (id === selected.value) return
    selected.value = id
    show()
  }

  function connect(next: BasemapDisplay): void {
    display = next
    show()
  }

  function disconnect(): void {
    display = undefined
  }

  return { groups, select, connect, disconnect }
}
