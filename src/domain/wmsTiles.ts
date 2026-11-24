/** The tiles a WMS layer is drawn from. */

/** A WMS layer as the map draws it. */
export interface WmsTileLayer {
  /** The layer's WMS name. */
  readonly id: string
  /** The URL of its tiles, with `{bbox-epsg-3857}` for the map to fill in. */
  readonly tileUrl: string
  readonly tileSize: number
  /** From 0, transparent, to 1, opaque. */
  readonly opacity: number
  /** The credit its server declares for it, or an empty text. */
  readonly credit: string
}

export const WMS_TILE_SIZE = 256

const GETMAP_PARAMETERS: Readonly<Record<string, string>> = {
  SERVICE: 'WMS',
  REQUEST: 'GetMap',
  VERSION: '1.3.0',
  // Empty: the default style.
  STYLES: '',
  CRS: 'EPSG:3857',
  WIDTH: String(WMS_TILE_SIZE),
  HEIGHT: String(WMS_TILE_SIZE),
  FORMAT: 'image/png',
  TRANSPARENT: 'TRUE',
}
// The map replaces it with the bounds of each tile; written as is, never encoded.
const TILE_BOUNDS = 'BBOX={bbox-epsg-3857}'

/** `url` over HTTPS: a server announcing an http URL answers it over HTTPS too. */
export function httpsUrl(url: string): string {
  return url.replace(/^http:\/\//i, 'https://')
}

/**
 * The URL of the tiles of `layerName` from the GetMap service announced at
 * `getMapUrl`, asked over HTTPS. It keeps the parameters of the announced URL,
 * but for those of a GetMap request, which it sets.
 */
export function wmsTileUrl(getMapUrl: string, layerName: string): string {
  const url = new URL(httpsUrl(getMapUrl))
  const parameters = { ...GETMAP_PARAMETERS, LAYERS: layerName }
  const replaced = new Set([...Object.keys(parameters), 'BBOX'])
  for (const name of [...url.searchParams.keys()]) {
    if (replaced.has(name.toUpperCase())) url.searchParams.delete(name)
  }
  for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value)
  return `${url.href}&${TILE_BOUNDS}`
}
