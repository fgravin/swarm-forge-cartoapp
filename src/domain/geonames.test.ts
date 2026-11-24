import { describe, expect, it } from 'vitest'

import { geonamesRequests, geonamesUsername, readSearchAnswer } from './geonames'
import type { JsonAnswer } from './jsonAnswer'
import type { Suggestion } from './suggestions'

function answered(body: unknown): JsonAnswer {
  return { kind: 'answered', body }
}

const FAILED: JsonAnswer = { kind: 'failed' }
const NO_ADDRESS = answered({})
const NO_PLACE = answered({ totalResultsCount: 0, geonames: [] })
const NO_RESULT = answered({ status: { message: 'no result found', value: 15 } })
const QUOTA_EXCEEDED = answered({ status: { message: 'the daily limit of 20000 credits has been exceeded', value: 18 } })

const GRENOBLE = {
  name: 'Grenoble',
  toponymName: 'Grenoble',
  fcl: 'P',
  fcode: 'PPLA3',
  adminName1: 'Auvergne-Rhône-Alpes',
  countryName: 'France',
  countryCode: 'FR',
  lat: '45.16667',
  lng: '5.71667',
}

const SAINT_ANDRE = {
  houseNumber: '4',
  street: 'Place Saint-André',
  locality: 'Grenoble',
  postalcode: '38000',
  adminName1: 'Auvergne-Rhône-Alpes',
  countryCode: 'FR',
  lat: '45.19290',
  lng: '5.72867',
}

function places(...found: readonly unknown[]): JsonAnswer {
  return answered({ totalResultsCount: found.length, geonames: found })
}

function names(places: JsonAnswer, address: JsonAnswer = NO_ADDRESS): readonly string[] | 'unavailable' {
  const answer = readSearchAnswer(places, address)
  return answer.kind === 'found' ? answer.suggestions.map((suggestion) => suggestion.name) : answer.kind
}

function firstSuggestion(places: JsonAnswer, address: JsonAnswer = NO_ADDRESS): Suggestion | undefined {
  const answer = readSearchAnswer(places, address)
  return answer.kind === 'found' ? answer.suggestions[0] : undefined
}

describe('geonamesUsername', () => {
  it('takes a configured username', () => {
    expect(geonamesUsername('carto-qa')).toBe('carto-qa')
  })

  it('takes an empty username or none for no username', () => {
    expect(geonamesUsername('')).toBeUndefined()
    expect(geonamesUsername(undefined)).toBeUndefined()
  })
})

describe('geonamesRequests', () => {
  const requests = geonamesRequests('4 place Saint-André', 'carto-qa')

  it('asks the places search of secure.geonames.org for the places whose name starts with the text', () => {
    const url = new URL(requests.places)
    expect(url.origin + url.pathname).toBe('https://secure.geonames.org/searchJSON')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      name_startsWith: '4 place Saint-André',
      orderby: 'relevance',
      maxRows: '8',
      lang: 'fr',
      inclBbox: 'true',
      username: 'carto-qa',
    })
  })

  it('asks the address search of secure.geonames.org for the address that matches the text', () => {
    const url = new URL(requests.address)
    expect(url.origin + url.pathname).toBe('https://secure.geonames.org/geoCodeAddressJSON')
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: '4 place Saint-André', username: 'carto-qa' })
  })
})

describe('readSearchAnswer', () => {
  it('reads a place: its French name, kind, context, and position', () => {
    expect(readSearchAnswer(places(GRENOBLE), NO_ADDRESS)).toEqual({
      kind: 'found',
      suggestions: [
        {
          name: 'Grenoble',
          kind: 'town',
          context: 'Auvergne-Rhône-Alpes, France',
          destination: { kind: 'view', view: { center: { lng: 5.71667, lat: 45.16667 }, zoom: 12 } },
        },
      ],
    })
  })

  it('names a place by its French name, not its main name', () => {
    expect(names(places({ ...GRENOBLE, name: 'Londres', toponymName: 'London' }))).toEqual(['Londres'])
  })

  it('reads positions written as numbers too', () => {
    expect(firstSuggestion(places({ ...GRENOBLE, lat: 45.16667, lng: 5.71667 }))?.destination).toEqual({
      kind: 'view',
      view: { center: { lng: 5.71667, lat: 45.16667 }, zoom: 12 },
    })
  })

  it.each([
    ['numbers', { west: 4.74, south: 44.7, east: 6.36, north: 45.88, accuracyLevel: 0 }],
    ['strings', { west: '4.74', south: '44.70', east: '6.36', north: '45.88' }],
  ])('reads the extent of a place, written as %s', (_written, bbox) => {
    expect(firstSuggestion(places({ ...GRENOBLE, bbox }))?.destination).toEqual({
      kind: 'extent',
      extent: [4.74, 44.7, 6.36, 45.88],
    })
  })

  it('centres the map on a place whose extent cannot be read', () => {
    expect(firstSuggestion(places({ ...GRENOBLE, bbox: { west: 4.74, south: 44.7, east: 6.36 } }))?.destination.kind).toBe('view')
  })

  it('reads a place with no class, code, region or country', () => {
    const found = places({ name: 'Somewhere', lat: '1', lng: '2' })
    expect(firstSuggestion(found)).toMatchObject({ name: 'Somewhere', kind: 'place', context: '' })
  })

  it('leaves out a place it cannot name or put on the map', () => {
    const unnamed = { ...GRENOBLE, name: '' }
    const nameless = { ...GRENOBLE, name: 12 }
    const withoutLatitude = { ...GRENOBLE, name: 'No latitude', lat: undefined }
    const withBadLongitude = { ...GRENOBLE, name: 'Bad longitude', lng: 'east' }
    const withEmptyLongitude = { ...GRENOBLE, name: 'Empty longitude', lng: '' }
    const found = places(unnamed, nameless, withoutLatitude, withBadLongitude, withEmptyLongitude, 'Paris', GRENOBLE)
    expect(names(found)).toEqual(['Grenoble'])
  })

  it('reads an address, naming its country in French from its country code', () => {
    expect(readSearchAnswer(NO_PLACE, answered({ address: SAINT_ANDRE }))).toEqual({
      kind: 'found',
      suggestions: [
        {
          name: '4 Place Saint-André, Grenoble',
          kind: 'address',
          context: 'Auvergne-Rhône-Alpes, France',
          destination: { kind: 'view', view: { center: { lng: 5.72867, lat: 45.1929 }, zoom: 17 } },
        },
      ],
    })
  })

  it.each([
    ['CH', 'Suisse'],
    ['US', 'États-Unis'],
    ['NL', 'Pays-Bas'],
  ])('names the country %s in French: %s', (countryCode, country) => {
    const found = answered({ address: { ...SAINT_ANDRE, countryCode } })
    expect(firstSuggestion(NO_PLACE, found)?.context).toBe(`Auvergne-Rhône-Alpes, ${country}`)
  })

  it('prefers the country name GeoNames gives to the one of its country code', () => {
    const found = places({ ...GRENOBLE, countryName: 'Royaume-Uni', countryCode: 'GB' })
    expect(firstSuggestion(found)?.context).toBe('Auvergne-Rhône-Alpes, Royaume-Uni')
  })

  it('names the country of a place from its country code when GeoNames gives no country name', () => {
    expect(firstSuggestion(places({ ...GRENOBLE, countryName: '' }))?.context).toBe('Auvergne-Rhône-Alpes, France')
  })

  it.each([
    ['not a country code', 'France'],
    ['the code of no country', 'QQ'],
  ])('leaves out a country code it cannot name: %s', (_case, countryCode) => {
    expect(firstSuggestion(places({ ...GRENOBLE, countryName: '', countryCode }))?.context).toBe('Auvergne-Rhône-Alpes')
  })

  it('gives the address first, then the places', () => {
    expect(names(places(GRENOBLE), answered({ address: SAINT_ANDRE }))).toEqual(['4 Place Saint-André, Grenoble', 'Grenoble'])
  })

  it('gives 8 suggestions at most', () => {
    const nine = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((name) => ({ ...GRENOBLE, name }))
    expect(names(places(...nine))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
  })

  it('finds no address in an empty answer, or one it cannot put on the map', () => {
    expect(names(places(GRENOBLE), NO_ADDRESS)).toEqual(['Grenoble'])
    expect(names(places(GRENOBLE), answered({ address: { ...SAINT_ANDRE, lat: 'north' } }))).toEqual(['Grenoble'])
    expect(names(places(GRENOBLE), answered({ address: 'Grenoble' }))).toEqual(['Grenoble'])
  })

  it('finds nothing in the status 15, no result found, from either search', () => {
    expect(names(NO_RESULT, NO_RESULT)).toEqual([])
    expect(names(places(GRENOBLE), NO_RESULT)).toEqual(['Grenoble'])
  })

  it.each([
    ['the places search refuses it', QUOTA_EXCEEDED, NO_ADDRESS],
    ['the address search refuses it', places(GRENOBLE), QUOTA_EXCEEDED],
    ['the places search cannot answer', FAILED, NO_ADDRESS],
    ['the address search cannot answer', places(GRENOBLE), FAILED],
    ['the places answer has a status without a value', answered({ status: { message: 'error' } }), NO_ADDRESS],
    ['the places answer holds no place list', answered({ totalResultsCount: 0 }), NO_ADDRESS],
    ['the places answer is not an object', answered('Grenoble'), NO_ADDRESS],
    ['the places answer is null', answered(null), NO_ADDRESS],
    ['the address answer is not an object', places(GRENOBLE), answered([])],
  ])('is unavailable when %s', (_case, placesAnswer, addressAnswer) => {
    expect(readSearchAnswer(placesAnswer, addressAnswer)).toEqual({ kind: 'unavailable' })
  })

  it('reads a status value written as a string', () => {
    expect(names(answered({ status: { value: '15' } }), NO_ADDRESS)).toEqual([])
  })
})
