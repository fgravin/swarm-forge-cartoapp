import type { JsonSource } from '../../src/application/searchPorts'
import type { Bbox } from '../../src/domain/bbox'
import type { JsonAnswer } from '../../src/domain/geonames'
import type { LngLat } from '../../src/domain/mapView'
import { settle } from './fakeClock'

/** The two GeoNames services a search asks. */
export type GeoNamesService = 'places' | 'address'

/** A request GeoNames received, as the steps read it. */
export interface GeoNamesRequest {
  /** `unknown` for a request to another server or service. */
  readonly service: GeoNamesService | 'unknown'
  readonly text: string | null
  readonly username: string | null
}

/** What one service answers to the search for a text. */
export type ServiceAnswer = (text: string) => JsonAnswer

/** What each service answers. */
export type Answers = Readonly<Record<GeoNamesService, ServiceAnswer>>

/** A place as a GeoNames places search gives it. */
export interface PlaceRecord {
  readonly name: string
  readonly featureClass: string
  readonly featureCode: string
  readonly region: string
  readonly country: string
  readonly position: LngLat
  readonly extent?: Bbox
}

/** An address as a GeoNames address search gives it. */
export interface AddressRecord {
  readonly houseNumber: string
  readonly street: string
  readonly town: string
  readonly region: string
  readonly countryCode: string
  readonly position: LngLat
}

/** GeoNames, recording the requests it receives and answering them as the steps say. */
export interface FakeGeoNames {
  readonly source: JsonSource
  /** From now on, answers each search with `answers`. */
  answerWith(answers: Answers): void
  /** The answers given from now on. */
  answers(): Answers
  /** From now on, answers each search only when `release` says so. */
  hold(): void
  /** Answers the requests held for the search for `text`, with `answers`. */
  release(text: string, answers: Answers): Promise<void>
  requests(): readonly GeoNamesRequest[]
}

const SERVER = 'https://secure.geonames.org'

function answered(body: unknown): JsonAnswer {
  return { kind: 'answered', body }
}

export const CANNOT_ANSWER: JsonAnswer = { kind: 'failed' }
export const NO_ADDRESS: JsonAnswer = answered({})

export function statusAnswer(value: number, message: string): JsonAnswer {
  return answered({ status: { message, value } })
}

/** A places answer as GeoNames writes it: positions and extents as strings. */
export function placesAnswer(places: readonly PlaceRecord[]): JsonAnswer {
  const geonames = places.map((place) => ({
    name: place.name,
    toponymName: place.name,
    fcl: place.featureClass,
    fcode: place.featureCode,
    adminName1: place.region,
    countryName: place.country,
    lat: String(place.position.lat),
    lng: String(place.position.lng),
    ...(place.extent && {
      bbox: {
        west: String(place.extent[0]),
        south: String(place.extent[1]),
        east: String(place.extent[2]),
        north: String(place.extent[3]),
      },
    }),
  }))
  return answered({ totalResultsCount: geonames.length, geonames })
}

/** An address answer in the format of the QA procedures, which has not been checked against GeoNames. */
export function addressAnswer(address: AddressRecord): JsonAnswer {
  return answered({
    address: {
      houseNumber: address.houseNumber,
      street: address.street,
      locality: address.town,
      adminName1: address.region,
      countryCode: address.countryCode,
      lat: String(address.position.lat),
      lng: String(address.position.lng),
    },
  })
}

/**
 * What GeoNames answers unless a step says otherwise: one place, named after
 * the text searched so that the answers to two searches differ, and no address.
 */
export const USUAL_ANSWERS: Answers = {
  places: (text) =>
    placesAnswer([
      {
        name: `Lieu trouvé pour ${text}`,
        featureClass: 'P',
        featureCode: 'PPL',
        region: 'Auvergne-Rhône-Alpes',
        country: 'France',
        position: { lng: 5.71667, lat: 45.16667 },
      },
    ]),
  address: () => NO_ADDRESS,
}

function readRequest(url: string): GeoNamesRequest {
  const { origin, pathname, searchParams } = new URL(url)
  const username = searchParams.get('username')
  if (origin === SERVER && pathname === '/searchJSON') {
    return { service: 'places', text: searchParams.get('name_startsWith'), username }
  }
  if (origin === SERVER && pathname === '/geoCodeAddressJSON') {
    return { service: 'address', text: searchParams.get('q'), username }
  }
  return { service: 'unknown', text: null, username }
}

function answerTo(request: GeoNamesRequest, answers: Answers): JsonAnswer {
  if (request.service === 'unknown' || request.text === null) return CANNOT_ANSWER
  return answers[request.service](request.text)
}

interface HeldRequest {
  readonly request: GeoNamesRequest
  readonly respond: (answers: Answers) => void
}

export function createFakeGeoNames(initial: Answers): FakeGeoNames {
  const received: GeoNamesRequest[] = []
  let held: readonly HeldRequest[] = []
  let current = initial
  let holding = false
  return {
    source: {
      getJson(url) {
        const request = readRequest(url)
        received.push(request)
        return new Promise((resolve) => {
          const respond = (answers: Answers): void => resolve(answerTo(request, answers))
          if (holding) held = [...held, { request, respond }]
          else respond(current)
        })
      },
    },
    answerWith(answers) {
      current = answers
    },
    answers: () => current,
    hold() {
      holding = true
    },
    async release(text, answers) {
      const released = held.filter((each) => each.request.text === text)
      if (released.length === 0) throw new Error(`GeoNames holds no search for "${text}"`)
      held = held.filter((each) => !released.includes(each))
      released.forEach((each) => each.respond(answers))
      await settle()
    },
    requests: () => received,
  }
}
