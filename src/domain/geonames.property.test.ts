import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { geonamesRequests, readSearchAnswer } from './geonames'
import type { JsonAnswer } from './jsonAnswer'
import { MAX_SUGGESTIONS, type SearchAnswer } from './suggestions'

const FAILED: JsonAnswer = { kind: 'failed' }
const NO_RESULT_STATUS = 15

function answered(body: unknown): JsonAnswer {
  return { kind: 'answered', body }
}

// A finite number, never -0, which GeoNames does not write.
const coordinates = fc.double({ min: -180, max: 180, noNaN: true }).map((degrees) => degrees + 0)

/** What GeoNames may write for a number: mostly a number or the same as a string, sometimes something else. */
const numberish = fc.oneof(
  { arbitrary: coordinates, weight: 2 },
  { arbitrary: coordinates.map(String), weight: 2 },
  // Beyond the world's coordinates, and on its edges.
  fc.oneof(fc.double({ min: -400, max: 400, noNaN: true }), fc.constantFrom(-180, 180, -90, 90, -360, 360)),
  fc.string({ maxLength: 4 }),
  fc.jsonValue({ maxDepth: 1 }),
)

// Mostly numbers, some beyond the world's coordinates or on its edges.
const extentEdges = fc.oneof(
  { arbitrary: coordinates, weight: 2 },
  coordinates.map(String),
  fc.double({ min: -400, max: 400, noNaN: true }),
  fc.constantFrom(-180, 180, -90, 90, -360, 360),
)

const extents = fc.oneof(
  { arbitrary: fc.record({ west: extentEdges, south: extentEdges, east: extentEdges, north: extentEdges }), weight: 3 },
  fc.record({ west: numberish, south: numberish, east: numberish, north: numberish }, { requiredKeys: [] }),
  fc.jsonValue({ maxDepth: 1 }),
)

const placeLike = fc.record(
  {
    name: fc.oneof({ arbitrary: fc.string({ maxLength: 8 }), weight: 3 }, fc.jsonValue({ maxDepth: 1 })),
    fcl: fc.constantFrom('A', 'P', 'T', 'H', ''),
    fcode: fc.constantFrom('PCLI', 'ADM1', 'PPL', 'MT', ''),
    adminName1: fc.string({ maxLength: 8 }),
    countryName: fc.string({ maxLength: 8 }),
    countryCode: fc.oneof(fc.constantFrom('FR', 'CH', 'ZZ', 'fr', ''), fc.jsonValue({ maxDepth: 1 })),
    lat: numberish,
    lng: numberish,
    bbox: extents,
  },
  { requiredKeys: ['name', 'lat', 'lng'] },
)

// Often empty, so that some addresses name nothing.
const addressParts = fc.oneof(fc.constant(''), fc.string({ maxLength: 8 }))

const addressLike = fc.record(
  {
    houseNumber: addressParts,
    street: addressParts,
    locality: addressParts,
    adminName1: fc.string({ maxLength: 8 }),
    countryCode: fc.constantFrom('FR', 'CH', 'ZZ', ''),
    lat: numberish,
    lng: numberish,
  },
  { requiredKeys: ['lat', 'lng'] },
)

const statuses = fc.record({ message: fc.string({ maxLength: 8 }), value: fc.oneof(fc.constantFrom(10, 15, 18, 19, 20), fc.jsonValue({ maxDepth: 0 })) })

/** What a GeoNames service may answer: mostly what it finds, else a status, any JSON at all, or nothing usable. */
function serviceAnswers(found: fc.Arbitrary<unknown>): fc.Arbitrary<JsonAnswer> {
  return fc.oneof(
    { arbitrary: found.map(answered), weight: 4 },
    fc.constant(FAILED),
    fc.record({ status: statuses }).map(answered),
    fc.jsonValue({ maxDepth: 2 }).map(answered),
  )
}

const placesAnswers = serviceAnswers(fc.record({ geonames: fc.array(placeLike, { maxLength: 12 }) }))
const addressAnswers = serviceAnswers(fc.oneof({ arbitrary: fc.record({ address: addressLike }), weight: 3 }, fc.constant({})))

function expectWithinItsPromises(answer: SearchAnswer): void {
  if (answer.kind === 'unavailable') return
  expect(answer.kind).toBe('found')
  expect(answer.suggestions.length).toBeLessThanOrEqual(MAX_SUGGESTIONS)
  expect(answer.suggestions.filter((suggestion) => suggestion.kind === 'address').length).toBeLessThanOrEqual(1)
  answer.suggestions.forEach((suggestion, index) => {
    expect(suggestion.name).not.toBe('')
    if (suggestion.kind === 'address') expect(index).toBe(0)
    const { destination } = suggestion
    if (destination.kind === 'view') {
      expect(Number.isFinite(destination.view.center.lng) && Number.isFinite(destination.view.center.lat)).toBe(true)
      expect(destination.view.zoom).toBe(suggestion.kind === 'address' ? 17 : 12)
    } else {
      // An extent the map can show: in the world's coordinates, its east at most a full turn east of its west.
      const [west, south, east, north] = destination.extent
      expect(west).toBeGreaterThanOrEqual(-180)
      expect(west).toBeLessThanOrEqual(180)
      expect(east).toBeGreaterThanOrEqual(west)
      expect(east).toBeLessThanOrEqual(west + 360)
      expect(south).toBeGreaterThanOrEqual(-90)
      expect(north).toBeLessThanOrEqual(90)
    }
  })
}

/** Whether the answer is a refusal: a status other than "no result found". */
function refused(answer: JsonAnswer): boolean {
  if (answer.kind !== 'answered' || typeof answer.body !== 'object' || answer.body === null || !('status' in answer.body)) return false
  const { status } = answer.body
  return !(typeof status === 'object' && status !== null && 'value' in status && Number(status.value) === NO_RESULT_STATUS)
}

describe('readSearchAnswer', () => {
  it('reads any answer GeoNames may give without failing, into at most 8 suggestions, the address first, each with a name and a place to go', () => {
    fc.assert(
      fc.property(placesAnswers, addressAnswers, (places, address) => {
        expectWithinItsPromises(readSearchAnswer(places, address))
      }),
      { numRuns: 300 },
    )
  })

  it('is unavailable when either service cannot answer or refuses', () => {
    fc.assert(
      fc.property(placesAnswers, addressAnswers, (places, address) => {
        fc.pre(places.kind === 'failed' || address.kind === 'failed' || refused(places) || refused(address))
        expect(readSearchAnswer(places, address)).toEqual({ kind: 'unavailable' })
      }),
      { numRuns: 300 },
    )
  })

  it('suggests the address it finds, then the places in their order, 8 at most', () => {
    const places = fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 8 }), lat: coordinates, lng: coordinates }), {
      maxLength: 12,
      size: 'max',
    })
    const addresses = fc.option(fc.record({ street: fc.string({ minLength: 1, maxLength: 8 }), lat: coordinates, lng: coordinates }))
    fc.assert(
      fc.property(places, addresses, (found, address) => {
        const answer = readSearchAnswer(answered({ geonames: found }), answered(address === null ? {} : { address }))

        const names = answer.kind === 'found' ? answer.suggestions.map((suggestion) => suggestion.name) : []
        const expected = [...(address === null ? [] : [address.street]), ...found.map((place) => place.name)]
        expect(names).toEqual(expected.slice(0, MAX_SUGGESTIONS))
      }),
    )
  })

  it('reads a number GeoNames writes as a string as that number', () => {
    const places = fc.array(
      fc.record({ name: fc.string({ minLength: 1, maxLength: 8 }), fcl: fc.constantFrom('A', 'P', 'T'), lat: coordinates, lng: coordinates }),
      { maxLength: 8 },
    )
    const addresses = fc.record({ street: fc.string({ minLength: 1, maxLength: 8 }), lat: coordinates, lng: coordinates })
    fc.assert(
      fc.property(places, addresses, (found, address) => {
        const written = found.map((place) => ({ ...place, lat: String(place.lat), lng: String(place.lng) }))
        const addressWritten = { ...address, lat: String(address.lat), lng: String(address.lng) }

        expect(readSearchAnswer(answered({ geonames: written }), answered({ address: addressWritten }))).toEqual(
          readSearchAnswer(answered({ geonames: found }), answered({ address })),
        )
      }),
    )
  })
})

describe('geonamesRequests', () => {
  // Any text, with the characters a URL gives a meaning to.
  const texts = fc.string({ unit: fc.oneof(fc.constantFrom('&', '=', '+', '#', '%', '?', '/', ' ', 'é'), fc.string({ unit: 'grapheme', minLength: 1, maxLength: 1 })) })

  it('asks the places search and the address search of secure.geonames.org for the text, with the username, whatever they hold', () => {
    fc.assert(
      fc.property(texts, texts, (text, username) => {
        const requests = geonamesRequests(text, username)
        const places = new URL(requests.places)
        const address = new URL(requests.address)

        expect(`${places.origin}${places.pathname}`).toBe('https://secure.geonames.org/searchJSON')
        expect(Object.fromEntries(places.searchParams)).toEqual({
          name_startsWith: text,
          orderby: 'relevance',
          maxRows: String(MAX_SUGGESTIONS),
          lang: 'fr',
          inclBbox: 'true',
          username,
        })
        expect(`${address.origin}${address.pathname}`).toBe('https://secure.geonames.org/geoCodeAddressJSON')
        expect(Object.fromEntries(address.searchParams)).toEqual({ q: text, username })
      }),
    )
  })
})
