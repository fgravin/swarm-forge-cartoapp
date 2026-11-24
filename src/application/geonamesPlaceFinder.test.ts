import { describe, expect, it } from 'vitest'

import type { JsonAnswer } from '../domain/jsonAnswer'
import { geonamesPlaceFinder } from './geonamesPlaceFinder'
import type { JsonSource } from './searchPorts'

interface Request {
  readonly service: string
  readonly text: string | null
  readonly username: string | null
  readonly answer: (answer: JsonAnswer) => void
}

/** GeoNames, recording the requests it receives, and answering them when the test says so. */
function fakeGeoNames() {
  const requests: Request[] = []
  const source: JsonSource = {
    getJson(url) {
      const { origin, pathname, searchParams } = new URL(url)
      const text = searchParams.get('name_startsWith') ?? searchParams.get('q')
      return new Promise((resolve) => {
        requests.push({ service: `${origin}${pathname}`, text, username: searchParams.get('username'), answer: resolve })
      })
    },
  }
  return {
    source,
    requests: () => requests.map(({ service, text, username }) => ({ service, text, username })),
    /** Answers the request to `service`. */
    answer(service: string, answer: JsonAnswer): void {
      requests.filter((request) => request.service === service).forEach((request) => request.answer(answer))
    },
  }
}

const PLACES = 'https://secure.geonames.org/searchJSON'
const ADDRESS = 'https://secure.geonames.org/geoCodeAddressJSON'

const GRENOBLE: JsonAnswer = {
  kind: 'answered',
  body: { geonames: [{ name: 'Grenoble', fcl: 'P', fcode: 'PPLA3', countryName: 'France', lat: '45.16667', lng: '5.71667' }] },
}

const SAINT_ANDRE: JsonAnswer = {
  kind: 'answered',
  body: { address: { houseNumber: '4', street: 'Place Saint-André', locality: 'Grenoble', countryCode: 'FR', lat: '45.1929', lng: '5.72867' } },
}

describe('geonamesPlaceFinder', () => {
  it.each([undefined, ''])('is none without a username (username %j)', (username) => {
    expect(geonamesPlaceFinder(username, fakeGeoNames().source)).toBeUndefined()
  })

  it('asks the places search and the address search for the text at once, with the username', () => {
    const geonames = fakeGeoNames()
    void geonamesPlaceFinder('carto-qa', geonames.source)?.find('Gre')

    expect(geonames.requests()).toEqual([
      { service: PLACES, text: 'Gre', username: 'carto-qa' },
      { service: ADDRESS, text: 'Gre', username: 'carto-qa' },
    ])
  })

  it('finds the address, then the places, once both searches have answered', async () => {
    const geonames = fakeGeoNames()
    const found = geonamesPlaceFinder('carto-qa', geonames.source)?.find('Gre')
    geonames.answer(PLACES, GRENOBLE)
    geonames.answer(ADDRESS, SAINT_ANDRE)

    const answer = await found
    const names = answer?.kind === 'found' ? answer.suggestions.map(({ name, kind }) => ({ name, kind })) : answer
    expect(names).toEqual([
      { name: '4 Place Saint-André, Grenoble', kind: 'address' },
      { name: 'Grenoble', kind: 'town' },
    ])
  })

  it('is unavailable when either search cannot answer', async () => {
    const geonames = fakeGeoNames()
    const found = geonamesPlaceFinder('carto-qa', geonames.source)?.find('Gre')
    geonames.answer(PLACES, GRENOBLE)
    geonames.answer(ADDRESS, { kind: 'failed' })

    expect(await found).toEqual({ kind: 'unavailable' })
  })
})
