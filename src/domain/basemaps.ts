/** The basemaps the user can choose from, and what the map needs to draw one. */

export type BasemapId = 'positron' | 'dark-matter' | 'world-imagery' | 'world-topographic-map'

export interface Basemap {
  readonly id: BasemapId
  /** The provider's own name for the basemap. */
  readonly name: string
  /** `{a,b,c,d}` stands for four tile servers, one per letter. */
  readonly tileUrl: string
  readonly attribution: string
}

export interface BasemapProvider {
  readonly name: string
  readonly basemaps: readonly Basemap[]
}

const CARTO_ATTRIBUTION = '© OpenStreetMap contributors © CARTO'
const ESRI_ATTRIBUTION = 'Powered by Esri'
const ESRI_SERVICES = 'https://server.arcgisonline.com/ArcGIS/rest/services'

export const BASEMAPS: Readonly<Record<BasemapId, Basemap>> = {
  positron: {
    id: 'positron',
    name: 'Positron',
    tileUrl: 'https://{a,b,c,d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: CARTO_ATTRIBUTION,
  },
  'dark-matter': {
    id: 'dark-matter',
    name: 'Dark Matter',
    tileUrl: 'https://{a,b,c,d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: CARTO_ATTRIBUTION,
  },
  'world-imagery': {
    id: 'world-imagery',
    name: 'World Imagery',
    tileUrl: `${ESRI_SERVICES}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: ESRI_ATTRIBUTION,
  },
  'world-topographic-map': {
    id: 'world-topographic-map',
    name: 'World Topographic Map',
    tileUrl: `${ESRI_SERVICES}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: ESRI_ATTRIBUTION,
  },
}

export const BASEMAP_PROVIDERS: readonly BasemapProvider[] = [
  { name: 'CARTO', basemaps: [BASEMAPS.positron, BASEMAPS['dark-matter']] },
  { name: 'Esri', basemaps: [BASEMAPS['world-imagery'], BASEMAPS['world-topographic-map']] },
]

export const INITIAL_BASEMAP: BasemapId = 'positron'

/** What the map needs to draw a basemap: its tile URLs, one per server, and its credits. */
export interface RasterTiles {
  readonly tiles: readonly string[]
  readonly tileSize: number
  readonly maxZoom: number
  readonly attribution: string
}

const TILE_SIZE = 256
const MAX_ZOOM = 19
const SERVER_LIST = /\{([^{}]*,[^{}]*)\}/

/** `https://{a,b}.example.com/...` -> `https://a.example.com/...`, `https://b.example.com/...`. */
export function tileServerUrls(tileUrl: string): readonly string[] {
  const match = SERVER_LIST.exec(tileUrl)
  if (!match?.[1]) return [tileUrl]
  return match[1].split(',').map((server) => tileUrl.replace(match[0], server))
}

export function rasterTiles(basemap: Basemap): RasterTiles {
  return {
    tiles: tileServerUrls(basemap.tileUrl),
    tileSize: TILE_SIZE,
    maxZoom: MAX_ZOOM,
    attribution: basemap.attribution,
  }
}
