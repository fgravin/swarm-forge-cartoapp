import { WmsEndpoint, type WmsLayerFull } from '@camptocamp/ogc-client'

import type { WmsCapabilities } from '../application/wmsPort'
import type { Bbox } from '../domain/bbox'
import type { LayerDescription } from '../domain/wmsLayers'

const UNAVAILABLE: LayerDescription = { kind: 'unavailable' }

/** The extent in EPSG:4326, which ogc-client already orders west, south, east, north. */
function extentOf(layer: WmsLayerFull): Bbox | undefined {
  const box = layer.boundingBoxes['EPSG:4326']
  if (box === undefined || !box.every(Number.isFinite)) return undefined
  const [west, south, east, north] = box
  return [west, south, east, north]
}

/**
 * Reads WMS capabilities with ogc-client, which parses them in a Web Worker:
 * this module cannot run under the unit tests. A server that cannot be
 * reached, answers with an error, or does not declare the layer gives an
 * unavailable description.
 */
export const ogcWmsCapabilities: WmsCapabilities = {
  async describeLayer(serverUrl, name) {
    try {
      const endpoint = await new WmsEndpoint(serverUrl).isReady()
      // ogc-client answers null for a layer the server does not declare, and for an operation it does not announce.
      const layer: WmsLayerFull | null = endpoint.getLayerByName(name)
      if (layer === null) return UNAVAILABLE
      const getMapUrl: string | null | undefined = endpoint.getOperationUrl('GetMap')
      return {
        kind: 'declared',
        layer: {
          title: layer.title,
          extent: extentOf(layer),
          legendUrl: layer.styles[0]?.legendUrl,
          credit: layer.attribution?.title,
          getMapUrl: getMapUrl ?? undefined,
        },
      }
    } catch {
      return UNAVAILABLE
    }
  },
}
