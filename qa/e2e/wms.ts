import { readFileSync } from 'node:fs'

import type { Page, Route } from '@playwright/test'

import { encodePng, type Colour } from './png'

// The WMS layers and their servers as the layer procedures describe them
// (layer-panel.md, "The layers and their servers" and "The recorded
// documents"). No request reaches a WMS server: each one is recorded and
// answered here.

export type Position = 1 | 2 | 3

export const BLUE: Colour = [0, 0, 255]
export const RED: Colour = [255, 0, 0]
export const GREEN: Colour = [0, 255, 0]

export interface WmsLayer {
  readonly position: Position
  /** The server's URL, as given to the application. */
  readonly serverUrl: string
  /** The domain of the server's hosts, its legends included. */
  readonly domain: string
  /** The layer's WMS name. */
  readonly name: string
  readonly title: string
  readonly credit: string
  /** The colour of its GetMap tiles. */
  readonly colour: Colour
  /** The server's recorded GetCapabilities answer. */
  readonly capabilities: string
}

function recorded(file: string): string {
  return readFileSync(new URL(`recorded/${file}`, import.meta.url), 'utf8')
}

export const LAYERS: readonly WmsLayer[] = [
  {
    position: 1,
    serverUrl: 'https://data.geopf.fr/wms-r/wms',
    domain: 'geopf.fr',
    name: 'LANDCOVER.CLC18_FR',
    title: 'CORINE Land Cover - France métropolitaine - 2018',
    credit: 'Ministère de la Transition écologique et de la Cohésion des territoires',
    colour: BLUE,
    capabilities: recorded('ign-capabilities.xml'),
  },
  {
    position: 2,
    serverUrl: 'https://geoservices.brgm.fr/geologie',
    domain: 'brgm.fr',
    name: 'LITHO_1M_SIMPLIFIEE',
    title: 'Carte lithologique simplifiée au 1/1 000 000',
    credit: 'BRGM',
    colour: RED,
    capabilities: recorded('brgm-capabilities.xml'),
  },
  {
    position: 3,
    serverUrl: 'https://wms.geo.admin.ch/?lang=fr',
    domain: 'geo.admin.ch',
    name: 'ch.bafu.schutzgebiete-paerke_nationaler_bedeutung',
    title: 'Parcs suisses (Zones)',
    credit: 'Das Geoportal des Bundes',
    colour: GREEN,
    capabilities: recorded('geoadmin-capabilities.xml'),
  },
]

export function layerAt(position: Position): WmsLayer {
  const layer = LAYERS[position - 1]
  if (layer === undefined) throw new Error(`No layer ${position}.`)
  return layer
}

// The recorded documents, and the changes the procedures make to them.

function unescapeXml(text: string): string {
  return text.replaceAll('&amp;', '&')
}

/** The legend URL `document` declares for the layer `name`, as written: the first one after the layer's name. */
export function declaredLegendUrl(document: string, name: string): string {
  const layerStart = document.indexOf(`<Name>${name}</Name>`)
  const href = /<LegendURL\b[\s\S]*?xlink:href="([^"]*)"/.exec(document.slice(layerStart))?.[1]
  if (layerStart < 0 || href === undefined) throw new Error(`The document declares no legend for ${name}.`)
  return unescapeXml(href)
}

/** `document` with the title `from` changed to `to`. */
export function retitled(document: string, from: string, to: string): string {
  return document.replace(`<Title>${from}</Title>`, `<Title>${to}</Title>`)
}

/** `document` without any element `tag`, at any level. */
export function without(document: string, tag: string): string {
  return document.replace(new RegExp(`\\s*<${tag}\\b[^>]*?(/>|>[\\s\\S]*?</${tag}>)`, 'g'), '')
}

/** `document` without the layer `name`, which has no child layer. */
export function withoutLayer(document: string, name: string): string {
  return document.replace(new RegExp(`\\s*<Layer\\b[^>]*>\\s*<Name>${name}</Name>[\\s\\S]*?</Layer>`), '')
}

export const SERVICE_EXCEPTION = `<?xml version="1.0" encoding="UTF-8"?>
<ServiceExceptionReport version="1.3.0" xmlns="http://www.opengis.net/ogc" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/ogc http://schemas.opengis.net/wms/1.3.0/exceptions_1_3_0.xsd">
<ServiceException>msWMSDispatch(): WMS server error. Incomplete WMS request: the service is unavailable.</ServiceException>
</ServiceExceptionReport>
`

// The requests.

export type WmsRequestKind = 'capabilities' | 'getMap' | 'legend' | 'other'

/** A request the application made to a WMS server, or to any server over plain HTTP. */
export interface WmsRequest {
  readonly url: URL
  /** The layer whose server was asked, if any. */
  readonly position: Position | undefined
  readonly kind: WmsRequestKind
}

/** The value of the parameter `name` of `url`, whatever the letter case of its name. */
export function parameter(url: URL, name: string): string | undefined {
  for (const [key, value] of url.searchParams) if (key.toUpperCase() === name.toUpperCase()) return value
  return undefined
}

function layerOfHost(hostname: string): WmsLayer | undefined {
  return LAYERS.find(({ domain }) => hostname === domain || hostname.endsWith(`.${domain}`))
}

/** The URL `href` would be asked at over HTTPS. */
export function overHttps(href: string): string {
  const url = new URL(href)
  url.protocol = 'https:'
  return url.href
}

function kindOf(url: URL, layer: WmsLayer | undefined): WmsRequestKind {
  const request = parameter(url, 'REQUEST')?.toUpperCase()
  if (request === 'GETCAPABILITIES') return 'capabilities'
  if (request === 'GETMAP') return 'getMap'
  const legend = layer && overHttps(declaredLegendUrl(layer.capabilities, layer.name))
  return legend !== undefined && overHttps(url.href) === legend ? 'legend' : 'other'
}

function readRequest(url: URL): WmsRequest {
  const layer = layerOfHost(url.hostname)
  return { url, position: layer?.position, kind: kindOf(url, layer) }
}

/** The requests that leave the application for a WMS server, or for any server over plain HTTP. */
const isWmsOrHttp = (url: URL): boolean =>
  layerOfHost(url.hostname) !== undefined || (url.protocol === 'http:' && url.hostname !== '127.0.0.1')

// The answers.

export type WmsAnswer =
  | { readonly kind: 'document'; readonly body: string }
  | { readonly kind: 'image'; readonly body: Buffer }
  | { readonly kind: 'empty'; readonly status: number }
  | { readonly kind: 'aborted' }

export const LEGEND_SIZE = { width: 40, height: 60 } as const
const TILE_SIZE = 256
const LEGEND_IMAGE = encodePng(LEGEND_SIZE.width, LEGEND_SIZE.height, [90, 90, 90])
const TILES = new Map(LAYERS.map((layer) => [layer.position, encodePng(TILE_SIZE, TILE_SIZE, layer.colour)]))
const NOT_FOUND: WmsAnswer = { kind: 'empty', status: 404 }

/** What the server of a layer answers. */
export type LayerAnswer = (layer: WmsLayer) => WmsAnswer

/** What the servers answer, by layer. Unless a procedure says otherwise, they give their recorded answers. */
export interface WmsAnswers {
  readonly capabilities?: LayerAnswer
  readonly legend?: LayerAnswer
  /** The layers whose servers hold their GetCapabilities answers until `letThrough`. */
  readonly held?: readonly Position[]
}

type Answering = Required<Pick<WmsAnswers, 'capabilities' | 'legend'>>

const RECORDED: Answering = {
  capabilities: (layer) => ({ kind: 'document', body: layer.capabilities }),
  legend: () => ({ kind: 'image', body: LEGEND_IMAGE }),
}

/** The recorded GetCapabilities answers, but for the server of `changed`, which answers `answer`. */
export function capabilitiesBut(changed: Position, answer: LayerAnswer): LayerAnswer {
  return (layer) => (layer.position === changed ? answer(layer) : RECORDED.capabilities(layer))
}

/** The recorded legend images, but for the layer at `changed`, whose legend gets `answer`. */
export function legendBut(changed: Position, answer: WmsAnswer): LayerAnswer {
  return (layer) => (layer.position === changed ? answer : RECORDED.legend(layer))
}

/** The recorded GetCapabilities answers, but for the server of `changed`, whose document is changed by `change`. */
export function documentBut(changed: Position, change: (document: string) => string): LayerAnswer {
  return capabilitiesBut(changed, (layer) => ({ kind: 'document', body: change(layer.capabilities) }))
}

function answerOf(request: WmsRequest, answers: Answering): WmsAnswer {
  const layer = request.position && layerAt(request.position)
  if (layer === undefined) return NOT_FOUND
  switch (request.kind) {
    case 'capabilities':
      return answers.capabilities(layer)
    case 'getMap': {
      const tile = TILES.get(layer.position)
      return tile === undefined ? NOT_FOUND : { kind: 'image', body: tile }
    }
    case 'legend':
      return answers.legend(layer)
    case 'other':
      return NOT_FOUND
    default: {
      const unknown: never = request.kind
      throw new Error(`unknown request kind ${JSON.stringify(unknown)}`)
    }
  }
}

async function send(route: Route, answer: WmsAnswer): Promise<void> {
  switch (answer.kind) {
    case 'document':
      return route.fulfill({ status: 200, contentType: 'text/xml', body: answer.body })
    case 'image':
      return route.fulfill({ status: 200, contentType: 'image/png', body: answer.body })
    case 'empty':
      return route.fulfill({ status: answer.status, body: '' })
    case 'aborted':
      return route.abort('connectionaborted')
    default: {
      const unknown: never = answer
      throw new Error(`unknown answer ${JSON.stringify(unknown)}`)
    }
  }
}

/** The WMS servers answering, as the procedure sets them up. */
export interface WmsServers {
  /** The requests made to the servers, in the order they were made. */
  readonly requests: readonly WmsRequest[]
  /** Lets the held GetCapabilities answers of the servers of `positions` through. */
  letThrough(...positions: readonly Position[]): void
}

/** A gate that holds what waits on it until it opens. */
function gate(): { readonly passed: Promise<void>; readonly open: () => void } {
  let open = (): void => {}
  const passed = new Promise<void>((resolve) => (open = resolve))
  return { passed, open }
}

/** Has every request to a WMS server, and any request over plain HTTP, recorded and answered by `answers`. */
export async function answerWms(page: Page, answers: WmsAnswers = {}): Promise<WmsServers> {
  const given: Answering = { ...RECORDED, ...answers }
  const requests: WmsRequest[] = []
  const held = new Map((answers.held ?? []).map((position) => [position, gate()]))
  await page.route(isWmsOrHttp, async (route) => {
    const request = readRequest(new URL(route.request().url()))
    requests.push(request)
    if (request.kind === 'capabilities' && request.position !== undefined) await held.get(request.position)?.passed
    await send(route, answerOf(request, given))
  })
  return {
    requests,
    letThrough: (...positions) => positions.forEach((position) => held.get(position)?.open()),
  }
}

/** The requests of `kind` to the server of the layer at `position`. */
export function requestsOf(
  requests: readonly WmsRequest[],
  kind: WmsRequestKind,
  position?: Position,
): readonly WmsRequest[] {
  return requests.filter((request) => request.kind === kind && (position === undefined || request.position === position))
}
