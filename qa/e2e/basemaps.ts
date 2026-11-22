// The basemaps as the procedures describe them (qa/procedures/basemap-*.md).

export const BASEMAP_NAMES = ['Positron', 'Dark Matter', 'World Imagery', 'World Topographic Map'] as const

export type BasemapName = (typeof BASEMAP_NAMES)[number]

export interface BasemapTiles {
  /** The tile URL, as the procedures write it. */
  readonly tileUrl: string
  /** How the URL of the tile that holds the initial centre ends, at zoom 6. */
  readonly centreTile: string
}

export const BASEMAP_TILES: Readonly<Record<BasemapName, BasemapTiles>> = {
  Positron: {
    tileUrl: 'https://{a,b,c,d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    centreTile: '/light_all/6/33/22.png',
  },
  'Dark Matter': {
    tileUrl: 'https://{a,b,c,d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    centreTile: '/dark_all/6/33/22.png',
  },
  'World Imagery': {
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    centreTile: '/World_Imagery/MapServer/tile/6/22/33',
  },
  'World Topographic Map': {
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    centreTile: '/World_Topo_Map/MapServer/tile/6/22/33',
  },
}

export const CARTO_CREDITS = '© OpenStreetMap contributors © CARTO'
export const ESRI_CREDITS = 'Powered by Esri'
