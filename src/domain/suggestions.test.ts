import { describe, expect, it } from 'vitest'

import {
  addressSuggestion,
  describeContext,
  placeKind,
  placeSuggestion,
  suggestionsOf,
  suggestionType,
  type FoundAddress,
  type FoundPlace,
  type Suggestion,
} from './suggestions'

const GRENOBLE: FoundPlace = {
  name: 'Grenoble',
  featureClass: 'P',
  featureCode: 'PPLA3',
  region: 'Auvergne-Rhône-Alpes',
  country: 'France',
  position: { lng: 5.71667, lat: 45.16667 },
  extent: undefined,
}

const SAINT_ANDRE: FoundAddress = {
  houseNumber: '4',
  street: 'Place Saint-André',
  town: 'Grenoble',
  region: 'Auvergne-Rhône-Alpes',
  country: 'France',
  position: { lng: 5.72867, lat: 45.1929 },
}

function namedPlace(name: string): Suggestion {
  return placeSuggestion({ ...GRENOBLE, name })
}

describe('placeKind', () => {
  it.each([
    ['A', 'PCLI', 'country'],
    ['A', 'PCLD', 'country'],
    ['A', 'PCL', 'country'],
    ['A', 'ADM1', 'region'],
    ['A', 'ADM2', 'region'],
    ['P', 'PPLA3', 'town'],
    ['P', 'PPLC', 'town'],
    ['T', 'MT', 'place'],
    ['H', 'LK', 'place'],
    ['', '', 'place'],
  ])('gives class %s and code %s the kind %s', (featureClass, featureCode, kind) => {
    expect(placeKind(featureClass, featureCode)).toBe(kind)
  })

  it('takes a code that starts with PCL for a country whatever its class', () => {
    expect(placeKind('P', 'PCLI')).toBe('country')
  })

  it('does not take a code that only contains PCL for a country', () => {
    expect(placeKind('A', 'XPCL')).toBe('region')
  })
})

describe('suggestionType', () => {
  it.each([
    ['country', 'Pays'],
    ['region', 'Région'],
    ['town', 'Ville'],
    ['place', 'Lieu'],
    ['address', 'Adresse'],
  ] as const)('reads the kind %s as %s', (kind, type) => {
    expect(suggestionType(kind)).toBe(type)
  })
})

describe('describeContext', () => {
  it('gives the region, then the country', () => {
    expect(describeContext('Grenoble', 'Auvergne-Rhône-Alpes', 'France')).toBe('Auvergne-Rhône-Alpes, France')
  })

  it('leaves out a region that is the suggestion itself', () => {
    expect(describeContext('Auvergne-Rhône-Alpes', 'Auvergne-Rhône-Alpes', 'France')).toBe('France')
  })

  it('leaves out a country that is the suggestion itself', () => {
    expect(describeContext('Grèce', '', 'Grèce')).toBe('')
  })

  it('leaves out what GeoNames does not give', () => {
    expect(describeContext('Grenoble', '', 'France')).toBe('France')
    expect(describeContext('Grenoble', 'Auvergne-Rhône-Alpes', '')).toBe('Auvergne-Rhône-Alpes')
  })
})

describe('placeSuggestion', () => {
  it('names a place, gives its kind and its context, and centres the map on it at zoom 12', () => {
    expect(placeSuggestion(GRENOBLE)).toEqual({
      name: 'Grenoble',
      kind: 'town',
      context: 'Auvergne-Rhône-Alpes, France',
      destination: { kind: 'view', view: { center: { lng: 5.71667, lat: 45.16667 }, zoom: 12 } },
    })
  })

  it('shows the extent of a place that has one', () => {
    const isere = { ...GRENOBLE, name: 'Isère', featureClass: 'A', featureCode: 'ADM2', extent: [4.74, 44.7, 6.36, 45.88] as const }
    expect(placeSuggestion(isere).destination).toEqual({ kind: 'extent', extent: [4.74, 44.7, 6.36, 45.88] })
  })

  it('shows an extent that crosses the 180° meridian across it', () => {
    const fidji = { ...GRENOBLE, extent: [177.12, -20.68, -178.42, -12.48] as const }
    expect(placeSuggestion(fidji).destination).toEqual({ kind: 'extent', extent: [177.12, -20.68, 181.58, -12.48] })
  })
})

describe('addressSuggestion', () => {
  it('names an address by its house number, street and town, and centres the map on it at zoom 17', () => {
    expect(addressSuggestion(SAINT_ANDRE)).toEqual({
      name: '4 Place Saint-André, Grenoble',
      kind: 'address',
      context: 'Auvergne-Rhône-Alpes, France',
      destination: { kind: 'view', view: { center: { lng: 5.72867, lat: 45.1929 }, zoom: 17 } },
    })
  })

  it('leaves out of the name what GeoNames does not give', () => {
    expect(addressSuggestion({ ...SAINT_ANDRE, houseNumber: '' }).name).toBe('Place Saint-André, Grenoble')
    expect(addressSuggestion({ ...SAINT_ANDRE, town: '' }).name).toBe('4 Place Saint-André')
    expect(addressSuggestion({ ...SAINT_ANDRE, street: '' }).name).toBe('4, Grenoble')
  })
})

describe('suggestionsOf', () => {
  const places = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(namedPlace)
  const address = addressSuggestion(SAINT_ANDRE)

  it('gives the places in their order', () => {
    expect(suggestionsOf([], places.slice(0, 3))).toEqual(places.slice(0, 3))
  })

  it('gives the address first, then the places', () => {
    expect(suggestionsOf([address], places.slice(0, 2))).toEqual([address, ...places.slice(0, 2)])
  })

  it('gives 8 suggestions at most', () => {
    expect(suggestionsOf([], places)).toEqual(places.slice(0, 8))
    expect(suggestionsOf([address], places)).toEqual([address, ...places.slice(0, 7)])
  })
})
