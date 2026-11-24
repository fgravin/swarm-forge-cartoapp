import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { viewDestination } from './destination'
import {
  chooseActiveSuggestion,
  chooseSuggestion,
  clearSearch,
  closeResults,
  INITIAL_PLACE_SEARCH,
  moveActive,
  receiveAnswer,
  searchMessage,
  startSearch,
  typeText,
  type ActiveMove,
  type PlaceSearch,
} from './placeSearch'
import type { SearchAnswer, Suggestion, SuggestionKind } from './suggestions'

/** What the user and the search service do to the search. */
type Step =
  | { readonly kind: 'type'; readonly text: string }
  /** The pause after typing ended: the search asks for the text it holds. */
  | { readonly kind: 'start' }
  /** An answer comes in: to the text the search holds, or to another one. */
  | { readonly kind: 'receive'; readonly toHeldText: boolean; readonly otherText: string; readonly answer: SearchAnswer }
  | { readonly kind: 'move'; readonly move: ActiveMove }
  | { readonly kind: 'choose'; readonly index: number }
  | { readonly kind: 'chooseActive' }
  | { readonly kind: 'close' }
  | { readonly kind: 'clear' }

// Few letters, so that the same texts come back.
const texts = fc.string({ unit: fc.constantFrom('a', 'b', 'é'), maxLength: 4 })

const suggestions: fc.Arbitrary<Suggestion> = fc.record({
  name: fc.string({ maxLength: 6 }),
  kind: fc.constantFrom<SuggestionKind>('country', 'region', 'town', 'place', 'address'),
  context: fc.string({ maxLength: 6 }),
  destination: fc.constant(viewDestination({ lng: 5, lat: 45 }, 12)),
})

const answers: fc.Arbitrary<SearchAnswer> = fc.oneof(
  fc.constant({ kind: 'unavailable' } as const),
  fc.constant({ kind: 'found', suggestions: [] } as const),
  {
    arbitrary: fc.record({ kind: fc.constant('found' as const), suggestions: fc.array(suggestions, { minLength: 1, maxLength: 8 }) }),
    weight: 3,
  },
)

// Searches often start and get their answer, so that the suggestions are often shown and moved round.
const steps: fc.Arbitrary<Step> = fc.oneof(
  fc.record({ kind: fc.constant('type' as const), text: texts }),
  { arbitrary: fc.constant({ kind: 'start' } as const), weight: 2 },
  { arbitrary: fc.record({ kind: fc.constant('receive' as const), toHeldText: fc.boolean(), otherText: texts, answer: answers }), weight: 4 },
  { arbitrary: fc.record({ kind: fc.constant('move' as const), move: fc.constantFrom<ActiveMove>('next', 'previous') }), weight: 4 },
  fc.record({ kind: fc.constant('choose' as const), index: fc.integer({ min: 0, max: 8 }) }),
  fc.constant({ kind: 'chooseActive' } as const),
  fc.constant({ kind: 'close' } as const),
  fc.constant({ kind: 'clear' } as const),
)

function take(search: PlaceSearch, step: Step): PlaceSearch {
  switch (step.kind) {
    case 'type':
      return typeText(search, step.text)
    case 'start':
      return startSearch(search)
    case 'receive':
      return receiveAnswer(search, step.toHeldText ? search.text : step.otherText, step.answer)
    case 'move':
      return moveActive(search, step.move)
    case 'choose':
      return chooseSuggestion(search, step.index)?.search ?? search
    case 'chooseActive':
      return chooseActiveSuggestion(search)?.search ?? search
    case 'close':
      return closeResults(search)
    case 'clear':
      return clearSearch(search)
    default: {
      const unknown: never = step
      throw new Error(`unknown step ${JSON.stringify(unknown)}`)
    }
  }
}

/** The search waits only for the text it holds, shows at least one suggestion, and a message only for an answer that has none. */
function expectWellFormed(search: PlaceSearch): void {
  const { results } = search
  if (results.kind === 'waiting') expect(results.text).toBe(search.text)
  if (results.kind === 'suggestions') {
    expect(results.suggestions.length).toBeGreaterThan(0)
    if (results.active !== undefined) {
      expect(results.active).toBeGreaterThanOrEqual(0)
      expect(results.active).toBeLessThan(results.suggestions.length)
    }
  }
  const messages = { nothingFound: 'Aucun résultat', unavailable: 'Recherche indisponible' } as const
  const message = results.kind === 'nothingFound' || results.kind === 'unavailable' ? messages[results.kind] : undefined
  expect(searchMessage(search)).toBe(message)
}

function activeAfter(search: PlaceSearch, moves: readonly ActiveMove[]): number | undefined {
  const moved = moves.reduce(moveActive, search)
  return moved.results.kind === 'suggestions' ? moved.results.active : undefined
}

/** The arrow keys go round the list: from none to the first or the last, and back where they started. */
function expectMovesGoRound(before: PlaceSearch, after: PlaceSearch): void {
  const { results } = before
  if (results.kind !== 'suggestions') {
    expect(after).toBe(before)
    return
  }
  const count = results.suggestions.length
  expect(after.text).toBe(before.text)
  expect(after.results.kind === 'suggestions' && after.results.suggestions).toBe(results.suggestions)
  if (results.active === undefined) {
    expect(activeAfter(before, ['next'])).toBe(0)
    expect(activeAfter(before, ['previous'])).toBe(count - 1)
    return
  }
  expect(activeAfter(before, ['next', 'previous'])).toBe(results.active)
  expect(activeAfter(before, ['previous', 'next'])).toBe(results.active)
  expect(activeAfter(before, Array.from({ length: count }, () => 'next'))).toBe(results.active)
}

function expectChoice(before: PlaceSearch, index: number | undefined, after: PlaceSearch): void {
  const chosen = before.results.kind === 'suggestions' && index !== undefined ? before.results.suggestions[index] : undefined
  if (chosen === undefined) {
    expect(after).toBe(before)
    return
  }
  expect(after).toEqual({ text: chosen.name, results: { kind: 'none' } })
  expect(chooseSuggestion(before, index ?? -1)?.destination).toBe(chosen.destination)
}

function expectReceived(before: PlaceSearch, text: string, answer: SearchAnswer, after: PlaceSearch): void {
  const awaited = before.results.kind === 'waiting' && before.results.text === text
  if (!awaited) {
    expect(after).toBe(before)
    return
  }
  expect(after.text).toBe(before.text)
  if (answer.kind === 'unavailable') expect(after.results).toEqual({ kind: 'unavailable' })
  else if (answer.suggestions.length === 0) expect(after.results).toEqual({ kind: 'nothingFound' })
  else expect(after.results).toEqual({ kind: 'suggestions', suggestions: answer.suggestions, active: undefined })
}

function expectStepFollowsTheRules(before: PlaceSearch, step: Step, after: PlaceSearch): void {
  switch (step.kind) {
    case 'type':
      if (step.text === before.text) expect(after).toBe(before)
      else expect(after).toEqual({ text: step.text, results: { kind: 'none' } })
      return
    case 'start':
      expect(after).toEqual({ text: before.text, results: { kind: 'waiting', text: before.text } })
      return
    case 'receive':
      expectReceived(before, step.toHeldText ? before.text : step.otherText, step.answer, after)
      return
    case 'move':
      expectMovesGoRound(before, after)
      return
    case 'choose':
      expectChoice(before, step.index, after)
      return
    case 'chooseActive':
      expectChoice(before, before.results.kind === 'suggestions' ? before.results.active : undefined, after)
      return
    case 'close':
      expect(after).toEqual({ text: before.text, results: { kind: 'none' } })
      return
    case 'clear':
      expect(after).toEqual(INITIAL_PLACE_SEARCH)
      return
    default: {
      const unknown: never = step
      throw new Error(`unknown step ${JSON.stringify(unknown)}`)
    }
  }
}

describe('place search', () => {
  it('shows only the answer to the text it holds, goes round its suggestions, and chooses one it shows', () => {
    fc.assert(
      fc.property(fc.array(steps, { maxLength: 40, size: 'max' }), (sequence) => {
        sequence.reduce((before, step) => {
          const after = take(before, step)
          expectStepFollowsTheRules(before, step, after)
          expectWellFormed(after)
          return after
        }, INITIAL_PLACE_SEARCH)
      }),
    )
  })
})
