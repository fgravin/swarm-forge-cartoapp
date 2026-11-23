import type { Basemap } from './basemaps'

/** What the map needs to draw a basemap: its tile URLs, one per server, and its credits. */
export interface RasterTiles {
  readonly tileUrls: readonly string[]
  readonly tileSize: number
  readonly maxZoom: number
  readonly attribution: string
}

const TILE_SIZE = 256
const MAX_ZOOM = 19
const SERVER_LIST = /\{([^{}]*,[^{}]*)\}/

/** `https://{a,b}.example.com/...` -> `https://a.example.com/...`, `https://b.example.com/...`. */
export function tileServerUrls(tileUrl: string): readonly string[] {
  const servers = SERVER_LIST.exec(tileUrl)?.[1]
  if (servers === undefined) return [tileUrl]
  return servers.split(',').map((server) => tileUrl.replace(SERVER_LIST, server))
}

export function rasterTiles(basemap: Basemap): RasterTiles {
  return {
    tileUrls: tileServerUrls(basemap.tileUrl),
    tileSize: TILE_SIZE,
    maxZoom: MAX_ZOOM,
    attribution: basemap.attribution,
  }
}
