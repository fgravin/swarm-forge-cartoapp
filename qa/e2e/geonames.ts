import type { Page, Route } from '@playwright/test'

// GeoNames as the place search procedures describe it (place-search-query.md,
// "How GeoNames is asked" and "The recorded answers"). No request reaches
// GeoNames: each one is recorded and answered here.

/** The two searches GeoNames is asked for a text. */
export type GeoNamesService = 'places' | 'address'

/** A request the application made to GeoNames. */
export interface GeoNamesRequest {
  readonly url: URL
  /** The service the request asks, if it is one of the two the procedures name. */
  readonly service: GeoNamesService | undefined
  /** The text searched for: `name_startsWith` of the places search, `q` of the address search. */
  readonly text: string
  /** When the request was made, in milliseconds since the epoch. */
  readonly at: number
}

/** How GeoNames answers a request. */
export type GeoNamesAnswer =
  | { readonly kind: 'json'; readonly body: unknown }
  | { readonly kind: 'empty'; readonly status: number }
  | { readonly kind: 'aborted' }

/** What GeoNames answers a request, by its service and text. */
export type GeoNamesAnswers = (service: GeoNamesService | undefined, text: string) => GeoNamesAnswer

/** GeoNames answering, as the procedure sets it up. */
export interface GeoNamesServer {
  /** The requests made to GeoNames, in the order they were made. */
  readonly requests: readonly GeoNamesRequest[]
  /** Holds the answers to the searches for `text` until the returned function lets them through. */
  hold(text: string): () => void
}

const SERVICES: Readonly<Record<string, readonly [GeoNamesService, string]>> = {
  '/searchJSON': ['places', 'name_startsWith'],
  '/geoCodeAddressJSON': ['address', 'q'],
}

function readRequest(url: URL): GeoNamesRequest {
  const [service, textParameter] = SERVICES[url.pathname] ?? [undefined, '']
  return { url, service, text: url.searchParams.get(textParameter) ?? '', at: Date.now() }
}

const isGeoNames = (url: URL): boolean => url.hostname === 'geonames.org' || url.hostname.endsWith('.geonames.org')

async function answer(route: Route, given: GeoNamesAnswer): Promise<void> {
  switch (given.kind) {
    case 'json':
      return route.fulfill({ status: 200, json: given.body })
    case 'empty':
      return route.fulfill({ status: given.status, body: '' })
    case 'aborted':
      return route.abort('connectionaborted')
    default: {
      const unknown: never = given
      throw new Error(`unknown answer ${JSON.stringify(unknown)}`)
    }
  }
}

/** Has every request to GeoNames, on any of its hosts, recorded and answered by `answers`. */
export async function answerGeoNames(page: Page, answers: GeoNamesAnswers): Promise<GeoNamesServer> {
  const requests: GeoNamesRequest[] = []
  const held = new Map<string, Promise<void>>()
  await page.route(isGeoNames, async (route) => {
    const request = readRequest(new URL(route.request().url()))
    requests.push(request)
    await held.get(request.text)
    await answer(route, answers(request.service, request.text))
  })
  return {
    requests,
    hold(text) {
      let letThrough = (): void => {}
      held.set(text, new Promise((resolve) => (letThrough = resolve)))
      return () => {
        held.delete(text)
        letThrough()
      }
    },
  }
}

/** The texts the application searched `service` for, in order. */
export function searchedTexts(requests: readonly GeoNamesRequest[], service: GeoNamesService): readonly string[] {
  return requests.filter((request) => request.service === service).map((request) => request.text)
}

// The recorded answers.

/** A place as GeoNames finds it. Latitudes, longitudes and extents are numbers written as strings. */
export interface Place {
  readonly name: string
  readonly toponymName?: string
  readonly fcl: string
  readonly fcode: string
  readonly adminName1: string
  readonly countryName: string
  readonly lat: string
  readonly lng: string
  /** West, south, east, north. */
  readonly bbox?: readonly [string, string, string, string]
}

function placeJson({ toponymName, bbox, ...place }: Place): unknown {
  const extent = bbox && { west: bbox[0], south: bbox[1], east: bbox[2], north: bbox[3], accuracyLevel: 0 }
  return { ...place, toponymName: toponymName ?? place.name, ...(extent && { bbox: extent }) }
}

/** The places search finds `places`, in this order. */
export function placesFound(places: readonly Place[]): GeoNamesAnswer {
  return { kind: 'json', body: { totalResultsCount: places.length, geonames: places.map(placeJson) } }
}

/** A refusal or "no result found": HTTP 200 with a `status` object. */
export function statusAnswer(value: number, message: string): GeoNamesAnswer {
  return { kind: 'json', body: { status: { message, value } } }
}

export const NO_ADDRESS: GeoNamesAnswer = { kind: 'json', body: {} }
export const NO_PLACE = placesFound([])

export const GRENOBLE: Place = {
  name: 'Grenoble',
  fcl: 'P',
  fcode: 'PPLA3',
  adminName1: 'Auvergne-Rhône-Alpes',
  countryName: 'France',
  lat: '45.16667',
  lng: '5.71667',
}

/** The address search finds 4 Place Saint-André, Grenoble. */
export const SAINT_ANDRE: GeoNamesAnswer = {
  kind: 'json',
  body: {
    address: {
      houseNumber: '4',
      street: 'Place Saint-André',
      locality: 'Grenoble',
      postalcode: '38000',
      adminName1: 'Auvergne-Rhône-Alpes',
      countryCode: 'FR',
      lat: '45.19290',
      lng: '5.72867',
    },
  },
}

/** "Unless the procedure says otherwise": every places search finds Grenoble, and no address search finds an address. */
export const USUAL_ANSWERS: GeoNamesAnswers = (service) => (service === 'places' ? placesFound([GRENOBLE]) : NO_ADDRESS)

/** The usual answers, except for the searches of `text`, which get `answers`. */
export function answersFor(text: string, answers: GeoNamesAnswers): GeoNamesAnswers {
  return (service, searched) => (searched === text ? answers : USUAL_ANSWERS)(service, searched)
}

/** The places search finds `places`, and the address search gets `address`. */
export function finding(places: readonly Place[], address: GeoNamesAnswer = NO_ADDRESS): GeoNamesAnswers {
  return (service) => (service === 'places' ? placesFound(places) : address)
}

/** A town of class P and code PPL, wherever the procedure does not say. */
export function town(name: string, lat = '45', lng = '5'): Place {
  return { name, fcl: 'P', fcode: 'PPL', adminName1: 'Auvergne-Rhône-Alpes', countryName: 'France', lat, lng }
}

/** The places the search for "Gre" finds in place-search-choice 4. */
export const GRE_PLACES: readonly Place[] = [town('Grenoble'), town('Grésy-sur-Aix', '45.72060', '5.92830'), town('Grèce')]
