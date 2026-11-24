/** The layers of the "Couches" panel: whether each one can be used, is shown, how opaque it is, and its legend. */
import type { Bbox } from './bbox'
import type { DeclaredLayer, LayerDescription, WmsLayerSource } from './wmsLayers'
import { httpsUrl, WMS_TILE_SIZE, wmsTileUrl, type WmsTileLayer } from './wmsTiles'

/** Whether a layer can be used: not until its server has declared it. */
export type LayerAvailability =
  | { readonly kind: 'loading' }
  | { readonly kind: 'available'; readonly declared: DeclaredLayer; readonly tileUrl: string }
  | { readonly kind: 'unavailable' }

export interface Layer {
  readonly source: WmsLayerSource
  readonly availability: LayerAvailability
  readonly shown: boolean
  /** In percent: a multiple of 5, from 0 to 100. */
  readonly opacity: number
  readonly legendUnfolded: boolean
  /** Whether the legend image failed to load. */
  readonly legendFailed: boolean
}

/** What the legend of a layer shows. */
export type LegendView =
  | { readonly kind: 'folded' }
  | { readonly kind: 'image'; readonly url: string }
  | { readonly kind: 'unavailable' }

/** How long after the start a layer whose server has not answered becomes unavailable. */
export const LAYER_TIMEOUT_MS = 30_000
export const OPACITY_STEP = 5
export const MAX_OPACITY = 100

const LOADING = 'Chargement…'
const UNAVAILABLE = 'Couche indisponible'

export function initialLayers(sources: readonly WmsLayerSource[]): readonly Layer[] {
  return sources.map((source) => ({
    source,
    availability: { kind: 'loading' },
    shown: false,
    opacity: MAX_OPACITY,
    legendUnfolded: false,
    legendFailed: false,
  }))
}

/** `layers` with the layer at `index` changed by `change`; the same list when nothing changes. */
function changeAt(layers: readonly Layer[], index: number, change: (layer: Layer) => Layer): readonly Layer[] {
  const layer = layers[index]
  if (layer === undefined) return layers
  const changed = change(layer)
  return changed === layer ? layers : layers.map((each, at) => (at === index ? changed : each))
}

/** Changes the layer at `index` with `change`, only if it is available. */
function changeAvailableAt(layers: readonly Layer[], index: number, change: (layer: Layer) => Layer): readonly Layer[] {
  return changeAt(layers, index, (layer) => (layer.availability.kind === 'available' ? change(layer) : layer))
}

function availabilityOf(source: WmsLayerSource, description: LayerDescription): LayerAvailability {
  if (description.kind === 'unavailable') return { kind: 'unavailable' }
  const getMapUrl = description.layer.getMapUrl ?? source.serverUrl
  if (!URL.canParse(getMapUrl)) return { kind: 'unavailable' }
  return { kind: 'available', declared: description.layer, tileUrl: wmsTileUrl(getMapUrl, source.name) }
}

/** What the server of the layer at `index` answered. A layer that is no longer loading keeps what it is. */
export function receiveDescription(
  layers: readonly Layer[],
  index: number,
  description: LayerDescription,
): readonly Layer[] {
  return changeAt(layers, index, (layer) =>
    layer.availability.kind === 'loading'
      ? { ...layer, availability: availabilityOf(layer.source, description) }
      : layer,
  )
}

/** Makes every layer whose server has not answered yet unavailable. */
export function timeOut(layers: readonly Layer[]): readonly Layer[] {
  if (layers.every((layer) => layer.availability.kind !== 'loading')) return layers
  return layers.map((layer) =>
    layer.availability.kind === 'loading' ? { ...layer, availability: { kind: 'unavailable' } } : layer,
  )
}

/** The title the server declares for the layer, or its WMS name. */
export function layerTitle(layer: Layer): string {
  const title = layer.availability.kind === 'available' ? layer.availability.declared.title : ''
  return title === '' ? layer.source.name : title
}

/** What a layer that cannot be used reads under its name. */
export function layerStatus(layer: Layer): string | undefined {
  switch (layer.availability.kind) {
    case 'loading':
      return LOADING
    case 'unavailable':
      return UNAVAILABLE
    case 'available':
      return undefined
    default: {
      const unknown: never = layer.availability
      throw new Error(`unknown layer availability ${JSON.stringify(unknown)}`)
    }
  }
}

export function toggleShown(layers: readonly Layer[], index: number): readonly Layer[] {
  return changeAvailableAt(layers, index, (layer) => ({ ...layer, shown: !layer.shown }))
}

/** Sets the opacity of the layer at `index`, shown or hidden, to the nearest multiple of 5 from 0 to 100. */
export function setOpacity(layers: readonly Layer[], index: number, percent: number): readonly Layer[] {
  if (!Number.isFinite(percent)) return layers
  const opacity = Math.min(MAX_OPACITY, Math.max(0, Math.round(percent / OPACITY_STEP) * OPACITY_STEP))
  return changeAvailableAt(layers, index, (layer) => (layer.opacity === opacity ? layer : { ...layer, opacity }))
}

/** An opacity as its slider reads it, as in "35 %". */
export function describeOpacity(percent: number): string {
  return `${percent} %`
}

/** The extent the server declares for the layer, if it is available and declares one. */
export function layerExtent(layer: Layer): Bbox | undefined {
  return layer.availability.kind === 'available' ? layer.availability.declared.extent : undefined
}

export function toggleLegend(layers: readonly Layer[], index: number): readonly Layer[] {
  return changeAvailableAt(layers, index, (layer) => ({ ...layer, legendUnfolded: !layer.legendUnfolded }))
}

/** The legend image of the layer at `index` failed to load. */
export function failLegend(layers: readonly Layer[], index: number): readonly Layer[] {
  return changeAt(layers, index, (layer) => (layer.legendFailed ? layer : { ...layer, legendFailed: true }))
}

/** What the legend shows: nothing while folded; the image its server declares, asked over HTTPS; or that it is unavailable. */
export function legendView(layer: Layer): LegendView {
  if (!layer.legendUnfolded) return { kind: 'folded' }
  const url = layer.availability.kind === 'available' ? layer.availability.declared.legendUrl : undefined
  if (url === undefined || layer.legendFailed) return { kind: 'unavailable' }
  return { kind: 'image', url: httpsUrl(url) }
}

/** The shown layers as the map draws them, in the order of the list: the first one on top. */
export function drawnLayers(layers: readonly Layer[]): readonly WmsTileLayer[] {
  return layers.flatMap(({ source, availability, shown, opacity }) =>
    availability.kind === 'available' && shown
      ? [
          {
            id: source.name,
            tileUrl: availability.tileUrl,
            tileSize: WMS_TILE_SIZE,
            opacity: opacity / MAX_OPACITY,
            credit: availability.declared.credit ?? '',
          },
        ]
      : [],
  )
}

/** The credits of the shown layers, in the order of the list. */
export function layerCredits(layers: readonly Layer[]): readonly string[] {
  return drawnLayers(layers)
    .map((layer) => layer.credit)
    .filter((credit) => credit !== '')
}
