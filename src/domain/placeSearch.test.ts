import { describe, expect, it } from 'vitest'

import {
  chooseActive,
  chooseSuggestion,
  clearSearch,
  closeResults,
  INITIAL_PLACE_SEARCH,
  isSearchable,
  moveActive,
  receiveAnswer,
  searchMessage,
  startSearch,
  typeText,
  type PlaceSearch,
} from './placeSearch'
import type { SearchAnswer, Suggestion } from './suggestions'

function suggestion(name: string): Suggestion {
  return { name, kind: 'town', context: '', destination: { kind: 'view', view: { center: { lng: 5, lat: 45 }, zoom: 12 } } }
}

const GRENOBLE = suggestion('Grenoble')
const GRESY = suggestion('Grésy-sur-Aix')
const GRECE = suggestion('Grèce')
const FOUND: SearchAnswer = { kind: 'found', suggestions: [GRENOBLE, GRESY, GRECE] }

function searched(text: string, answer: SearchAnswer = FOUND): PlaceSearch {
  return receiveAnswer(startSearch(typeText(INITIAL_PLACE_SEARCH, text)), text, answer)
}

function withActive(active: number | undefined): PlaceSearch {
  return { text: 'Gre', results: { kind: 'suggestions', suggestions: [GRENOBLE, GRESY, GRECE], active } }
}

describe('typeText', () => {
  it('holds the text typed, with nothing shown', () => {
    expect(typeText(INITIAL_PLACE_SEARCH, 'Gr')).toEqual({ text: 'Gr', results: { kind: 'none' } })
  })

  it('stops showing the answer to the text it held', () => {
    expect(typeText(searched('Gre'), 'Gren')).toEqual({ text: 'Gren', results: { kind: 'none' } })
    expect(typeText(searched('Gren'), 'Gre')).toEqual({ text: 'Gre', results: { kind: 'none' } })
  })

  it('stops waiting for the answer to the text it held', () => {
    expect(typeText(startSearch(typeText(INITIAL_PLACE_SEARCH, 'Gre')), 'Gren').results).toEqual({ kind: 'none' })
  })

  it('changes nothing when the text is the same', () => {
    const search = searched('Gre')
    expect(typeText(search, 'Gre')).toBe(search)
  })
})

describe('isSearchable', () => {
  it.each([
    ['', false],
    ['Gr', false],
    ['Gre', true],
    ['Grenoble', true],
    ['Grè', true],
  ])('takes "%s" for searchable: %s', (text, searchable) => {
    expect(isSearchable(typeText(INITIAL_PLACE_SEARCH, text))).toBe(searchable)
  })

  it('counts characters, not UTF-16 code units', () => {
    expect(isSearchable(typeText(INITIAL_PLACE_SEARCH, '𝔾r'))).toBe(false)
  })
})

describe('startSearch and receiveAnswer', () => {
  it('waits for the answer to the text it holds', () => {
    expect(startSearch(typeText(INITIAL_PLACE_SEARCH, 'Gre')).results).toEqual({ kind: 'waiting', text: 'Gre' })
  })

  it('shows the suggestions of the answer, none of them active', () => {
    expect(searched('Gre').results).toEqual({ kind: 'suggestions', suggestions: [GRENOBLE, GRESY, GRECE], active: undefined })
  })

  it('says that nothing was found', () => {
    expect(searched('Gre', { kind: 'found', suggestions: [] }).results).toEqual({ kind: 'nothingFound' })
  })

  it('says that the search is unavailable', () => {
    expect(searched('Gre', { kind: 'unavailable' }).results).toEqual({ kind: 'unavailable' })
  })

  it('ignores the answer to another text', () => {
    const waiting = startSearch(typeText(INITIAL_PLACE_SEARCH, 'Gren'))
    expect(receiveAnswer(waiting, 'Gre', FOUND)).toBe(waiting)
  })

  it('ignores an answer it is not waiting for', () => {
    const typed = typeText(INITIAL_PLACE_SEARCH, 'Gre')
    expect(receiveAnswer(typed, 'Gre', FOUND)).toBe(typed)
    const answered = searched('Gre')
    expect(receiveAnswer(answered, 'Gre', { kind: 'unavailable' })).toBe(answered)
  })
})

describe('searchMessage', () => {
  it.each([
    ['nothing was found', searched('Gre', { kind: 'found', suggestions: [] }), 'Aucun résultat'],
    ['the search is unavailable', searched('Gre', { kind: 'unavailable' }), 'Recherche indisponible'],
  ])('says so when %s', (_case, search, message) => {
    expect(searchMessage(search)).toBe(message)
  })

  it.each([
    ['nothing is shown', INITIAL_PLACE_SEARCH],
    ['the search waits for its answer', startSearch(typeText(INITIAL_PLACE_SEARCH, 'Gre'))],
    ['suggestions are shown', searched('Gre')],
  ])('says nothing when %s', (_case, search) => {
    expect(searchMessage(search)).toBeUndefined()
  })
})

describe('moveActive', () => {
  it.each([
    ['next', undefined, 0],
    ['next', 0, 1],
    ['next', 1, 2],
    ['next', 2, 0],
    ['previous', undefined, 2],
    ['previous', 2, 1],
    ['previous', 1, 0],
    ['previous', 0, 2],
  ] as const)('makes the %s suggestion active from %s: %s', (direction, from, to) => {
    expect(moveActive(withActive(from), direction)).toEqual(withActive(to))
  })

  it('changes nothing while no suggestion is shown', () => {
    const unavailable = searched('Gre', { kind: 'unavailable' })
    expect(moveActive(unavailable, 'next')).toBe(unavailable)
    expect(moveActive(INITIAL_PLACE_SEARCH, 'previous')).toBe(INITIAL_PLACE_SEARCH)
  })
})

describe('chooseSuggestion', () => {
  it('fills the text with the name of the suggestion, closes the list, and goes to the suggestion', () => {
    expect(chooseSuggestion(searched('Gre'), 1)).toEqual({
      search: { text: 'Grésy-sur-Aix', results: { kind: 'none' } },
      destination: GRESY.destination,
    })
  })

  it('chooses nothing that is not shown', () => {
    expect(chooseSuggestion(searched('Gre'), 3)).toBeUndefined()
    expect(chooseSuggestion(searched('Gre'), -1)).toBeUndefined()
    expect(chooseSuggestion(searched('Gre', { kind: 'unavailable' }), 0)).toBeUndefined()
  })
})

describe('chooseActive', () => {
  it('chooses the active suggestion', () => {
    expect(chooseActive(withActive(2))).toEqual(chooseSuggestion(withActive(2), 2))
  })

  it('chooses nothing while no suggestion is active', () => {
    expect(chooseActive(withActive(undefined))).toBeUndefined()
    expect(chooseActive(INITIAL_PLACE_SEARCH)).toBeUndefined()
  })
})

describe('closeResults', () => {
  it('closes the list and keeps the text', () => {
    expect(closeResults(withActive(1))).toEqual({ text: 'Gre', results: { kind: 'none' } })
  })

  it('closes a message', () => {
    expect(closeResults(searched('Gre', { kind: 'unavailable' }))).toEqual({ text: 'Gre', results: { kind: 'none' } })
  })

  it('stops waiting for an answer', () => {
    const waiting = startSearch(typeText(INITIAL_PLACE_SEARCH, 'Gre'))
    expect(receiveAnswer(closeResults(waiting), 'Gre', FOUND).results).toEqual({ kind: 'none' })
  })

  it('changes nothing when nothing is shown', () => {
    const typed = typeText(INITIAL_PLACE_SEARCH, 'Gre')
    expect(closeResults(typed)).toBe(typed)
  })
})

describe('clearSearch', () => {
  it('empties the text and closes the list', () => {
    expect(clearSearch(searched('Gre'))).toEqual(INITIAL_PLACE_SEARCH)
  })

  it('stops waiting for an answer', () => {
    const waiting = startSearch(typeText(INITIAL_PLACE_SEARCH, 'Gre'))
    expect(receiveAnswer(clearSearch(waiting), 'Gre', FOUND)).toEqual(INITIAL_PLACE_SEARCH)
  })

  it('changes nothing when there is nothing to clear', () => {
    expect(clearSearch(INITIAL_PLACE_SEARCH)).toBe(INITIAL_PLACE_SEARCH)
  })
})
