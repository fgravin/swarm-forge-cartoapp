import type { Destination } from './destination'
import type { SearchAnswer, Suggestion } from './suggestions'

/**
 * What the search shows under its field: nothing, while it may be waiting for
 * the answer to the text it holds; the suggestions of that answer; or a message.
 */
export type SearchResults =
  | { readonly kind: 'none' }
  | { readonly kind: 'waiting'; readonly text: string }
  | {
      readonly kind: 'suggestions'
      /** At least one. */
      readonly suggestions: readonly Suggestion[]
      /** The index of the active suggestion, if one is. */
      readonly active: number | undefined
    }
  | { readonly kind: 'nothingFound' }
  | { readonly kind: 'unavailable' }

/** The place search: the text of its field, and what it shows under it. */
export interface PlaceSearch {
  readonly text: string
  readonly results: SearchResults
}

/** What choosing a suggestion leads to: the search afterwards, and where the map goes. */
export interface Choice {
  readonly search: PlaceSearch
  readonly destination: Destination
}

export type ActiveMove = 'next' | 'previous'

export const MIN_SEARCH_LENGTH = 3
/** How long the user stops typing before the search is made. */
export const SEARCH_PAUSE_MS = 300

const NONE: SearchResults = { kind: 'none' }
const NOTHING_FOUND = 'Aucun résultat'
const UNAVAILABLE = 'Recherche indisponible'

export const INITIAL_PLACE_SEARCH: PlaceSearch = { text: '', results: NONE }

/**
 * The search holding `text`. The answer to the text it held is no longer shown,
 * nor awaited: only the answer to the text the field holds is shown.
 */
export function typeText(search: PlaceSearch, text: string): PlaceSearch {
  return text === search.text ? search : { text, results: NONE }
}

/** Whether the text is long enough to search for. */
export function isSearchable(search: PlaceSearch): boolean {
  return [...search.text].length >= MIN_SEARCH_LENGTH
}

/** The search has asked for the text it holds, and waits for the answer. */
export function startSearch(search: PlaceSearch): PlaceSearch {
  return { ...search, results: { kind: 'waiting', text: search.text } }
}

function resultsOf(answer: SearchAnswer): SearchResults {
  if (answer.kind === 'unavailable') return { kind: 'unavailable' }
  if (answer.suggestions.length === 0) return { kind: 'nothingFound' }
  return { kind: 'suggestions', suggestions: answer.suggestions, active: undefined }
}

/** Shows `answer` to the search for `text`, if it is the answer the search waits for. */
export function receiveAnswer(search: PlaceSearch, text: string, answer: SearchAnswer): PlaceSearch {
  const { results } = search
  if (results.kind !== 'waiting' || results.text !== text) return search
  return { ...search, results: resultsOf(answer) }
}

/** The message shown in place of the suggestions, if any. */
export function searchMessage(search: PlaceSearch): string | undefined {
  const { results } = search
  switch (results.kind) {
    case 'nothingFound':
      return NOTHING_FOUND
    case 'unavailable':
      return UNAVAILABLE
    case 'none':
    case 'waiting':
    case 'suggestions':
      return undefined
    default: {
      const unknown: never = results
      throw new Error(`unknown search results ${JSON.stringify(unknown)}`)
    }
  }
}

function movedIndex(active: number | undefined, count: number, move: ActiveMove): number {
  if (move === 'next') return active === undefined ? 0 : (active + 1) % count
  return active === undefined || active === 0 ? count - 1 : active - 1
}

/**
 * Makes the next suggestion active, or the first one when the last one or none
 * is; or the previous one, or the last one when the first one or none is.
 */
export function moveActive(search: PlaceSearch, move: ActiveMove): PlaceSearch {
  const { results } = search
  if (results.kind !== 'suggestions') return search
  return { ...search, results: { ...results, active: movedIndex(results.active, results.suggestions.length, move) } }
}

/** Chooses the suggestion at `index`: the field holds its name, and the list closes. */
export function chooseSuggestion(search: PlaceSearch, index: number): Choice | undefined {
  const chosen = search.results.kind === 'suggestions' ? search.results.suggestions[index] : undefined
  if (chosen === undefined) return undefined
  return { search: { text: chosen.name, results: NONE }, destination: chosen.destination }
}

export function chooseActive(search: PlaceSearch): Choice | undefined {
  const { results } = search
  if (results.kind !== 'suggestions' || results.active === undefined) return undefined
  return chooseSuggestion(search, results.active)
}

/** Closes the list or the message, keeping the text, and stops waiting for an answer. */
export function closeResults(search: PlaceSearch): PlaceSearch {
  return search.results.kind === 'none' ? search : { ...search, results: NONE }
}

/** Empties the field, closes the list, and stops waiting for an answer. */
export function clearSearch(search: PlaceSearch): PlaceSearch {
  return search.text === '' && search.results.kind === 'none' ? search : INITIAL_PLACE_SEARCH
}
