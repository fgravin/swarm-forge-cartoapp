import type { LayerDescription } from '../domain/wmsLayers'

/** What the application needs to read the capabilities of WMS servers. */
export interface WmsCapabilities {
  /**
   * Reads what the server at `serverUrl` declares for its layer `name`. Never
   * rejects: a server that cannot be reached, answers with an error, or does
   * not declare the layer gives an `unavailable` description.
   */
  describeLayer(serverUrl: string, name: string): Promise<LayerDescription>
}
