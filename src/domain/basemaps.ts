/** The basemaps the user can choose from, grouped by provider. */

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
