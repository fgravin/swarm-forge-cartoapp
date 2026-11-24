import { describe, expect, it } from 'vitest'

import type { Destination } from '../domain/destination'
import type { JsonAnswer } from '../domain/geonames'
import type { MapNavigation } from './mapPort'
import type { JsonSource, Timer } from './searchPorts'
import { usePlaceSearch, type PlaceSearchState } from './usePlaceSearch'

interface Scheduled {
  readonly due: number
  readonly action: () => void
  done: boolean
}

/** A timer whose time passes only when the test says so. */
function fakeClock() {
  let now = 0
  const scheduled: Scheduled[] = []
  const timer: Timer = {
    after(milliseconds, action) {
      const entry: Scheduled = { due: now + milliseconds, action, done: false }
      scheduled.push(entry)
      return () => {
        entry.done = true
      }
    },
  }
  return {
    timer,
    /** Lets `milliseconds` pass, running what falls due, then lets the answers that came in through. */
    async advance(milliseconds: number): Promise<void> {
      const until = now + milliseconds
      for (;;) {
        const next = scheduled.filter((entry) => !entry.done && entry.due <= until).sort((a, b) => a.due - b.due)[0]
        if (next === undefined) break
        now = next.due
        next.done = true
        next.action()
      }
      now = until
      await settle()
    },
    pending: () => scheduled.filter((entry) => !entry.done).length,
  }
}

function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

interface Request {
  readonly service: string
  readonly text: string | null
  readonly username: string | null
  readonly answer: (answer: JsonAnswer) => void
}

const NO_ADDRESS: JsonAnswer = { kind: 'answered', body: {} }

function placesFound(...names: readonly string[]): JsonAnswer {
  const geonames = names.map((name) => ({ name, fcl: 'P', fcode: 'PPL', adminName1: 'Isère', countryName: 'France', lat: '45', lng: '5' }))
  return { kind: 'answered', body: { totalResultsCount: geonames.length, geonames } }
}

/** GeoNames, answering each request when the test says so, or at once with `answers`. */
function fakeGeoNames(answers?: Answers) {
  const requests: Request[] = []
  const geonames: JsonSource = {
    getJson(url) {
      const { pathname, searchParams } = new URL(url)
      const service = pathname === '/searchJSON' ? 'places' : 'address'
      const text = service === 'places' ? searchParams.get('name_startsWith') : searchParams.get('q')
      return new Promise((resolve) => {
        requests.push({ service, text, username: searchParams.get('username'), answer: resolve })
        if (answers) resolve(answers(service, text))
      })
    },
  }
  return {
    geonames,
    requests,
    searchedTexts: () => requests.filter((request) => request.service === 'places').map((request) => request.text),
    /** Answers the requests of the search for `text`. */
    async answer(text: string, places: JsonAnswer, address: JsonAnswer = NO_ADDRESS): Promise<void> {
      for (const request of requests.filter((each) => each.text === text)) {
        request.answer(request.service === 'places' ? places : address)
      }
      await settle()
    },
  }
}

function recordingNavigation() {
  const destinations: Destination[] = []
  const navigation: MapNavigation = { goTo: (destination) => destinations.push(destination) }
  return { navigation, destinations }
}

type Answers = (service: string, text: string | null) => JsonAnswer

const atOnce: Answers = (_service, text) => placesFound(`${text} 1`, `${text} 2`, `${text} 3`)

/** `held`: GeoNames answers only when the test says so. */
function setUp(answers: Answers | 'held' = atOnce) {
  const clock = fakeClock()
  const server = fakeGeoNames(answers === 'held' ? undefined : answers)
  const map = recordingNavigation()
  const search = usePlaceSearch({ username: 'carto-qa', geonames: server.geonames, timer: clock.timer })
  search.connect(map.navigation)
  return { clock, server, map, search }
}

function names(search: PlaceSearchState): readonly string[] {
  return search.options.value.map((option) => option.name)
}

async function searchFor(clock: ReturnType<typeof fakeClock>, search: PlaceSearchState, text: string): Promise<void> {
  search.type(text)
  await clock.advance(1000)
}

describe('usePlaceSearch without a GeoNames username', () => {
  it.each([undefined, ''])('is disabled and says it is not configured (username %j)', (username) => {
    const clock = fakeClock()
    const search = usePlaceSearch({ username, geonames: fakeGeoNames().geonames, timer: clock.timer })
    expect(search.disabled).toBe(true)
    expect(search.hint).toBe('Recherche non configurée')
  })

  it('ignores what is typed, and searches nothing', async () => {
    const clock = fakeClock()
    const server = fakeGeoNames()
    const search = usePlaceSearch({ username: undefined, geonames: server.geonames, timer: clock.timer })
    await searchFor(clock, search, 'Gre')
    expect(search.text.value).toBe('')
    expect(clock.pending()).toBe(0)
    expect(server.requests).toEqual([])
  })
})

describe('usePlaceSearch', () => {
  it('is enabled, asks for a place or an address, and shows nothing', () => {
    const { search } = setUp()
    expect(search.disabled).toBe(false)
    expect(search.hint).toBe('Rechercher un lieu ou une adresse')
    expect(search.text.value).toBe('')
    expect(search.expanded.value).toBe(false)
    expect(search.options.value).toEqual([])
    expect(search.message.value).toBeUndefined()
  })

  it('holds what is typed', () => {
    const { search } = setUp()
    search.type('Gr')
    expect(search.text.value).toBe('Gr')
  })

  it('searches GeoNames for the text once the user has stopped typing for 300 ms', async () => {
    const { clock, server, search } = setUp()
    search.type('Gre')
    await clock.advance(299)
    expect(server.requests).toEqual([])
    await clock.advance(1)
    expect(server.requests.map(({ service, text, username }) => ({ service, text, username }))).toEqual([
      { service: 'places', text: 'Gre', username: 'carto-qa' },
      { service: 'address', text: 'Gre', username: 'carto-qa' },
    ])
  })

  it('makes one search for what is typed without a pause, at the end', async () => {
    const { clock, server, search } = setUp()
    for (const text of ['Gre', 'Gren', 'Greno']) {
      search.type(text)
      await clock.advance(299)
    }
    await clock.advance(1)
    expect(server.searchedTexts()).toEqual(['Greno'])
  })

  it('searches nothing below 3 characters', async () => {
    const { clock, server, search } = setUp()
    await searchFor(clock, search, 'Gr')
    expect(server.requests).toEqual([])
    expect(clock.pending()).toBe(0)
  })

  it('does not search again for a text it holds already', async () => {
    const { clock, server, search } = setUp()
    await searchFor(clock, search, 'Gre')
    await searchFor(clock, search, 'Gre')
    expect(server.searchedTexts()).toEqual(['Gre'])
  })

  it('shows the suggestions found, none active, with their type and context', async () => {
    const { clock, search } = setUp()
    await searchFor(clock, search, 'Gre')
    expect(search.expanded.value).toBe(true)
    expect(search.options.value).toEqual([
      { id: 'place-suggestions-1', name: 'Gre 1', type: 'Ville', context: 'Isère, France', active: false },
      { id: 'place-suggestions-2', name: 'Gre 2', type: 'Ville', context: 'Isère, France', active: false },
      { id: 'place-suggestions-3', name: 'Gre 3', type: 'Ville', context: 'Isère, France', active: false },
    ])
    expect(search.activeOptionId.value).toBeUndefined()
    expect(search.message.value).toBeUndefined()
  })

  it('shows only the answer to the text it holds, ignoring a late answer to an earlier text', async () => {
    const { clock, server, search } = setUp('held')
    await searchFor(clock, search, 'Gre')
    await searchFor(clock, search, 'Gren')
    await server.answer('Gren', placesFound('Grenoble'))
    await server.answer('Gre', placesFound('Grèce'))
    expect(names(search)).toEqual(['Grenoble'])
  })

  it('stops showing the suggestions of the text it held when the text changes', async () => {
    const { clock, search } = setUp()
    await searchFor(clock, search, 'Gre')
    search.type('Gren')
    expect(search.expanded.value).toBe(false)
    expect(search.options.value).toEqual([])
  })

  it('closes the list and searches nothing when the text falls below 3 characters', async () => {
    const { clock, server, search } = setUp()
    await searchFor(clock, search, 'Gre')
    await searchFor(clock, search, 'Gr')
    expect(search.expanded.value).toBe(false)
    expect(server.searchedTexts()).toEqual(['Gre'])
  })

  it('ignores the answer to a text it no longer holds, below 3 characters', async () => {
    const { clock, server, search } = setUp('held')
    await searchFor(clock, search, 'Gre')
    await searchFor(clock, search, 'Gr')
    await server.answer('Gre', placesFound('Grèce'))
    expect(search.expanded.value).toBe(false)
  })

  it.each([
    ['GeoNames found nothing', placesFound(), 'Aucun résultat'],
    ['GeoNames cannot answer', { kind: 'failed' } as const, 'Recherche indisponible'],
  ])('says so when %s', async (_case, places, message) => {
    const { clock, search } = setUp(() => places)
    await searchFor(clock, search, 'Gre')
    expect(search.message.value).toBe(message)
    expect(search.expanded.value).toBe(false)
    expect(search.options.value).toEqual([])
  })

  it('moves the active suggestion with the arrow keys and names it as the active option', async () => {
    const { clock, search } = setUp()
    await searchFor(clock, search, 'Gre')
    search.next()
    search.next()
    expect(search.options.value.map((option) => option.active)).toEqual([false, true, false])
    expect(search.activeOptionId.value).toBe('place-suggestions-2')
    search.previous()
    search.previous()
    expect(search.activeOptionId.value).toBe('place-suggestions-3')
  })

  it('chooses the active suggestion: fills the field, closes the list, moves the map, and searches nothing more', async () => {
    const { clock, server, map, search } = setUp()
    await searchFor(clock, search, 'Gre')
    search.next()
    search.next()
    search.chooseActive()
    await clock.advance(1000)
    expect(search.text.value).toBe('Gre 2')
    expect(search.expanded.value).toBe(false)
    expect(map.destinations).toEqual([{ kind: 'view', view: { center: { lng: 5, lat: 45 }, zoom: 12 } }])
    expect(server.searchedTexts()).toEqual(['Gre'])
  })

  it('chooses the suggestion clicked', async () => {
    const { clock, map, search } = setUp()
    await searchFor(clock, search, 'Gre')
    search.choose(2)
    expect(search.text.value).toBe('Gre 3')
    expect(map.destinations).toHaveLength(1)
  })

  it('chooses nothing while no suggestion is active', async () => {
    const { clock, map, search } = setUp()
    await searchFor(clock, search, 'Gre')
    search.chooseActive()
    expect(search.text.value).toBe('Gre')
    expect(names(search)).toEqual(['Gre 1', 'Gre 2', 'Gre 3'])
    expect(map.destinations).toEqual([])
  })

  it('closes the list, keeping the text and the map, and makes no search still to come', async () => {
    const { clock, server, map, search } = setUp()
    await searchFor(clock, search, 'Gre')
    search.next()
    search.close()
    expect(search.expanded.value).toBe(false)
    expect(search.text.value).toBe('Gre')
    expect(map.destinations).toEqual([])
    search.type('Gren')
    search.close()
    await clock.advance(1000)
    expect(server.searchedTexts()).toEqual(['Gre'])
  })

  it('offers to clear the search only while the field holds text', () => {
    const { search } = setUp()
    expect(search.canClear.value).toBe(false)
    search.type('G')
    expect(search.canClear.value).toBe(true)
  })

  it('clears the search: empties the field and closes the list, without moving the map', async () => {
    const { clock, map, search } = setUp()
    await searchFor(clock, search, 'Gre')
    search.clear()
    expect(search.text.value).toBe('')
    expect(search.expanded.value).toBe(false)
    expect(search.canClear.value).toBe(false)
    expect(map.destinations).toEqual([])
  })

  it('makes no search for a text cleared before the pause', async () => {
    const { clock, server, search } = setUp()
    search.type('Gre')
    search.clear()
    await clock.advance(1000)
    expect(server.requests).toEqual([])
  })

  it('ignores the answer to a search cleared while it was under way', async () => {
    const { clock, server, search } = setUp('held')
    await searchFor(clock, search, 'Gre')
    search.clear()
    await server.answer('Gre', placesFound('Grèce'))
    expect(search.expanded.value).toBe(false)
    expect(search.message.value).toBeUndefined()
  })

  it('moves no map once disconnected, nor before it is connected', async () => {
    const clock = fakeClock()
    const search = usePlaceSearch({ username: 'carto-qa', geonames: fakeGeoNames(atOnce).geonames, timer: clock.timer })
    const map = recordingNavigation()
    await searchFor(clock, search, 'Gre')
    search.choose(0)
    search.connect(map.navigation)
    search.disconnect()
    await searchFor(clock, search, 'Gren')
    search.choose(0)
    expect(map.destinations).toEqual([])
    expect(search.text.value).toBe('Gren 1')
  })
})
