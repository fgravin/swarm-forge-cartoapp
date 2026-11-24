/** The WMS layers the "Couches" panel offers, and what their servers declare for them. */
import type { Bbox } from './bbox'

/** A layer of a WMS server. */
export interface WmsLayerSource {
  /** The URL the server is asked its capabilities at. */
  readonly serverUrl: string
  /** The layer's WMS name. */
  readonly name: string
}

/** What a server declares for a layer in its capabilities. */
export interface DeclaredLayer {
  /** Empty when the server declares none. */
  readonly title: string
  /** In geographic coordinates (EPSG:4326). */
  readonly extent: Bbox | undefined
  /** The legend image of the layer's default style. */
  readonly legendUrl: string | undefined
  readonly credit: string | undefined
  /** The URL of the server's GetMap service, as it announces it. */
  readonly getMapUrl: string | undefined
}

/** What a server answered for a layer: its declaration, or nothing usable. */
export type LayerDescription =
  | { readonly kind: 'declared'; readonly layer: DeclaredLayer }
  | { readonly kind: 'unavailable' }

/** The layers of the panel, in its order: the first one is drawn on top. */
export const WMS_LAYERS: readonly WmsLayerSource[] = [
  { serverUrl: 'https://data.geopf.fr/wms-r/wms', name: 'LANDCOVER.CLC18_FR' },
  { serverUrl: 'https://geoservices.brgm.fr/geologie', name: 'LITHO_1M_SIMPLIFIEE' },
  { serverUrl: 'https://wms.geo.admin.ch/?lang=fr', name: 'ch.bafu.schutzgebiete-paerke_nationaler_bedeutung' },
]
