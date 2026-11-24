import type { WmsCapabilities } from '../../src/application/wmsPort'
import type { DeclaredLayer, LayerDescription } from '../../src/domain/wmsLayers'
import { settle } from './fakeClock'

/** A request for the capabilities of a server, for one of its layers. */
export interface CapabilitiesRequest {
  readonly serverUrl: string
  readonly name: string
}

/**
 * The three WMS servers. Each one holds the requests it receives until it is
 * told to answer, then answers with what it declares at that time. A step
 * can thus say what a server declares after the application has asked it.
 */
export interface FakeWmsServers {
  readonly port: WmsCapabilities
  requests(): readonly CapabilitiesRequest[]
  /** From now on, the server of `layerName` declares it with `change`. */
  declare(layerName: string, change: Partial<DeclaredLayer>): void
  /** From now on, the server of `layerName` cannot give it: unreachable, in error, or not declaring it. */
  fail(layerName: string): void
  /** The server of `layerName` answers nothing until the end of the scenario. */
  hold(layerName: string): void
  holdAll(): void
  /** Each server that is not held answers the requests it holds. */
  answer(): Promise<void>
}

interface Server {
  readonly url: string
  readonly layerName: string
  description: LayerDescription
  held: boolean
}

interface HeldRequest {
  readonly request: CapabilitiesRequest
  readonly respond: (description: LayerDescription) => void
}

const UNAVAILABLE: LayerDescription = { kind: 'unavailable' }

/** What each server declares unless a step says otherwise, from the features. */
function createServers(): readonly Server[] {
  const declares = (layer: DeclaredLayer): LayerDescription => ({ kind: 'declared', layer })
  return [
    {
      url: 'https://data.geopf.fr/wms-r/wms',
      layerName: 'LANDCOVER.CLC18_FR',
      held: false,
      description: declares({
        title: 'CORINE Land Cover - France métropolitaine - 2018',
        extent: [-9.88, 40.58, 11.68, 51.44],
        credit: 'Ministère de la Transition écologique et de la Cohésion des territoires',
        legendUrl: 'https://data.geopf.fr/annexes/ressources/legendes/LANDCOVER.CLC18_FR-legend.png',
        getMapUrl: 'https://data.geopf.fr/wms-r?',
      }),
    },
    {
      url: 'https://geoservices.brgm.fr/geologie',
      layerName: 'LITHO_1M_SIMPLIFIEE',
      held: false,
      description: declares({
        title: 'Carte lithologique simplifiée au 1/1 000 000',
        extent: [-5.5, 41.33, 10.81, 51.09],
        credit: 'BRGM',
        legendUrl:
          'http://geoservices.brgm.fr/geologie?version=1.3.0&service=WMS&request=GetLegendGraphic&sld_version=1.1.0&layer=LITHO_1M_SIMPLIFIEE&format=image/png',
        getMapUrl: 'http://geoservices.brgm.fr/geologie?',
      }),
    },
    {
      url: 'https://wms.geo.admin.ch/?lang=fr',
      layerName: 'ch.bafu.schutzgebiete-paerke_nationaler_bedeutung',
      held: false,
      description: declares({
        title: 'Parcs suisses (Zones)',
        extent: [3.33, 44.07, 14.28, 49.2],
        credit: 'Das Geoportal des Bundes',
        legendUrl: 'https://api3.geo.admin.ch/static/images/legends/ch.bafu.schutzgebiete-paerke_nationaler_bedeutung_fr.png',
        getMapUrl: 'https://wms.geo.admin.ch/?lang=fr',
      }),
    },
  ]
}

export function createFakeWmsServers(): FakeWmsServers {
  const servers = createServers()
  const received: CapabilitiesRequest[] = []
  let held: readonly HeldRequest[] = []

  function serverOf(layerName: string): Server {
    const server = servers.find((each) => each.layerName === layerName)
    if (server === undefined) throw new Error(`no server of the layer panel declares a layer named "${layerName}"`)
    return server
  }

  /** What the server at the URL of `request` answers: nothing usable from a server it does not know, or for a layer it does not declare. */
  function answerTo(request: CapabilitiesRequest): LayerDescription {
    const server = servers.find((each) => each.url === request.serverUrl)
    return server && server.layerName === request.name ? server.description : UNAVAILABLE
  }

  function isHeld({ request }: HeldRequest): boolean {
    return servers.find((each) => each.url === request.serverUrl)?.held ?? false
  }

  return {
    port: {
      describeLayer(serverUrl, name) {
        const request = { serverUrl, name }
        received.push(request)
        return new Promise((resolve) => {
          held = [...held, { request, respond: resolve }]
        })
      },
    },
    requests: () => received,
    declare(layerName, change) {
      const server = serverOf(layerName)
      if (server.description.kind !== 'declared') throw new Error(`the server of ${layerName} does not declare it`)
      server.description = { kind: 'declared', layer: { ...server.description.layer, ...change } }
    },
    fail(layerName) {
      serverOf(layerName).description = UNAVAILABLE
    },
    hold(layerName) {
      serverOf(layerName).held = true
    },
    holdAll() {
      servers.forEach((server) => {
        server.held = true
      })
    },
    async answer() {
      const answering = held.filter((each) => !isHeld(each))
      held = held.filter(isHeld)
      answering.forEach(({ request, respond }) => respond(answerTo(request)))
      await settle()
    },
  }
}
