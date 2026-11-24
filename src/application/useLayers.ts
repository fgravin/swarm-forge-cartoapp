import { computed, shallowRef, type ComputedRef } from 'vue'

import { extentDestination } from '../domain/destination'
import {
  describeOpacity,
  drawnLayers,
  failLegend,
  initialLayers,
  LAYER_TIMEOUT_MS,
  layerCredits,
  layerExtent,
  layerStatus,
  layerTitle,
  legendView,
  MAX_OPACITY,
  OPACITY_STEP,
  receiveDescription,
  setOpacity as withOpacity,
  timeOut,
  toggleLegend as withLegendToggled,
  toggleShown as withShownToggled,
  type Layer,
} from '../domain/layerList'
import { WMS_LAYERS } from '../domain/wmsLayers'
import type { Connectable, LayerDisplay, MapNavigation } from './mapPort'
import type { Timer } from './searchPorts'
import type { WmsCapabilities } from './wmsPort'

/** What the layers need from outside. */
export interface LayerServices {
  readonly wms: WmsCapabilities
  readonly timer: Timer
}

/** A layer as the "Couches" panel shows it. */
export interface LayerItem {
  /** The id of the layer's element in the panel. */
  readonly id: string
  /** The title its server declares, or its WMS name. */
  readonly title: string
  /** "Chargement…" or "Couche indisponible", while the layer cannot be used. */
  readonly status: string | undefined
  /** Whether every control of the layer is disabled. */
  readonly disabled: boolean
  readonly shown: boolean
  /** The name of the eye button: "Afficher <title>" or "Masquer <title>". */
  readonly eyeLabel: string
  readonly zoomLabel: string
  readonly zoomDisabled: boolean
  /** In percent. */
  readonly opacity: number
  readonly opacityLabel: string
  /** As in "35 %". */
  readonly opacityText: string
  readonly legendUnfolded: boolean
  /** The unfolded legend image, and its description. */
  readonly legendImage: { readonly url: string; readonly description: string } | undefined
  /** What the unfolded legend reads in place of an image. */
  readonly legendMessage: string | undefined
}

/** What the "Couches" panel shows and does. */
export interface LayersState {
  readonly items: ComputedRef<readonly LayerItem[]>
  /** The credits of the shown layers, in the order of the list. */
  readonly credits: ComputedRef<readonly string[]>
  /** The eye button of the layer at `index`. */
  toggleShown(index: number): void
  zoomTo(index: number): void
  /** Moves the opacity slider of the layer at `index` to `percent`. */
  setOpacity(index: number, percent: number): void
  toggleLegend(index: number): void
  /** The legend image of the layer at `index` did not load. */
  legendFailed(index: number): void
}

/** The range of the opacity sliders, in percent. */
export const OPACITY_SLIDER = { min: 0, max: MAX_OPACITY, step: OPACITY_STEP } as const

const LEGEND_UNAVAILABLE = 'Légende indisponible'

function itemOf(layer: Layer, index: number): LayerItem {
  const title = layerTitle(layer)
  const status = layerStatus(layer)
  const legend = legendView(layer)
  return {
    id: `layer-${index + 1}`,
    title,
    status,
    disabled: status !== undefined,
    shown: layer.shown,
    eyeLabel: `${layer.shown ? 'Masquer' : 'Afficher'} ${title}`,
    zoomLabel: `Zoomer sur ${title}`,
    zoomDisabled: layerExtent(layer) === undefined,
    opacity: layer.opacity,
    opacityLabel: `Opacité de ${title}`,
    opacityText: describeOpacity(layer.opacity),
    legendUnfolded: legend.kind !== 'folded',
    legendImage: legend.kind === 'image' ? { url: legend.url, description: `Légende de ${title}` } : undefined,
    legendMessage: legend.kind === 'unavailable' ? LEGEND_UNAVAILABLE : undefined,
  }
}

/**
 * Asks the servers for the layers of the panel as soon as it starts, draws
 * the shown layers on the connected map, and moves it to a layer's extent.
 */
export function useLayers(services: LayerServices): LayersState & Connectable<LayerDisplay & MapNavigation> {
  const layers = shallowRef<readonly Layer[]>(initialLayers(WMS_LAYERS))
  let map: (LayerDisplay & MapNavigation) | undefined

  function update(next: readonly Layer[]): void {
    if (next === layers.value) return
    layers.value = next
    map?.showLayers(drawnLayers(next))
  }

  WMS_LAYERS.forEach((source, index) => {
    void services.wms
      .describeLayer(source.serverUrl, source.name)
      .then((description) => update(receiveDescription(layers.value, index, description)))
  })
  services.timer.after(LAYER_TIMEOUT_MS, () => update(timeOut(layers.value)))

  function zoomTo(index: number): void {
    const layer = layers.value[index]
    const extent = layer && layerExtent(layer)
    if (extent) map?.goTo(extentDestination(extent))
  }

  return {
    items: computed(() => layers.value.map(itemOf)),
    credits: computed(() => layerCredits(layers.value)),
    toggleShown: (index) => update(withShownToggled(layers.value, index)),
    zoomTo,
    setOpacity: (index, percent) => update(withOpacity(layers.value, index, percent)),
    toggleLegend: (index) => update(withLegendToggled(layers.value, index)),
    legendFailed: (index) => update(failLegend(layers.value, index)),
    connect: (next) => {
      map = next
      next.showLayers(drawnLayers(layers.value))
    },
    disconnect: () => {
      map = undefined
    },
  }
}
