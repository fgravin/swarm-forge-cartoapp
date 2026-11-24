import { computed, shallowRef, type ComputedRef } from 'vue'

import { BASEMAP_PROVIDERS, BASEMAPS, INITIAL_BASEMAP, type BasemapId } from '../domain/basemaps'
import { rasterTiles } from '../domain/rasterTiles'
import type { BasemapDisplay, Connectable } from './mapPort'

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

/** What the basemap panel offers and does. */
export interface BasemapsState {
  readonly groups: ComputedRef<readonly BasemapGroup[]>
  /** The credit of the selected basemap. */
  readonly credit: ComputedRef<string>
  select(id: BasemapId): void
}

/** Shows the selected basemap on the connected display, now and after each change. */
export function useBasemaps(): BasemapsState & Connectable<BasemapDisplay> {
  const selected = shallowRef<BasemapId>(INITIAL_BASEMAP)
  const groups = computed(() =>
    BASEMAP_PROVIDERS.map((provider) => ({
      provider: provider.name,
      options: provider.basemaps.map(({ id, name }) => ({ id, name, selected: id === selected.value })),
    })),
  )
  const credit = computed(() => BASEMAPS[selected.value].attribution)
  let display: BasemapDisplay | undefined

  function showSelected(): void {
    display?.showBasemap(rasterTiles(BASEMAPS[selected.value]))
  }

  function select(id: BasemapId): void {
    if (id === selected.value) return
    selected.value = id
    showSelected()
  }

  function connect(next: BasemapDisplay): void {
    display = next
    showSelected()
  }

  function disconnect(): void {
    display = undefined
  }

  return { groups, credit, select, connect, disconnect }
}
