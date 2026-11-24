import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { viewDestination, type Destination } from '../domain/destination'
import type { SearchAnswer, Suggestion } from '../domain/suggestions'
import type { PlaceFinder } from './searchPorts'
import type { Timer } from './timerPort'
import { usePlaceSearch, type PlaceSearchState } from './usePlaceSearch'

/** What the user, the passing of time, and the place finder do to the place search. */
type Action =
  /** The user types until the field holds `text`, then stops typing for `pause` milliseconds. */
  | { readonly kind: 'type'; readonly text: string; readonly pause: number }
  | { readonly kind: 'wait'; readonly milliseconds: number }
  /** The finder answers one of the searches it has not answered yet: 0 is the latest, 1 the one before it... */
  | { readonly kind: 'answer'; readonly search: number; readonly answer: SearchAnswer }
  | { readonly kind: 'next' }
  | { readonly kind: 'previous' }
  | { readonly kind: 'chooseActive' }
  | { readonly kind: 'choose'; readonly index: number }
  | { readonly kind: 'close' }
  | { readonly kind: 'clear' }

interface Unanswered {
  readonly text: string
  readonly answer: (answer: SearchAnswer) => void
}

/** The place search, on a timer whose time passes only when the test says so, and a finder that answers when it says so. */
function harness() {
  let now = 0
  let scheduled: { readonly due: number; readonly action: () => void }[] = []
  const timer: Timer = {
    after(milliseconds, action) {
      const entry = { due: now + milliseconds, action }
      scheduled.push(entry)
      return () => {
        scheduled = scheduled.filter((each) => each !== entry)
      }
    },
  }
  const searched: string[] = []
  const unanswered: Unanswered[] = []
  const finder: PlaceFinder = {
    find: (text) =>
      new Promise((resolve) => {
        searched.push(text)
        unanswered.push({ text, answer: resolve })
      }),
  }
  const destinations: Destination[] = []
  const search = usePlaceSearch({ finder, timer })
  search.connect({ goTo: (destination) => destinations.push(destination) })
  return {
    search,
    searched,
    unanswered,
    destinations,
    wait(milliseconds: number): void {
      now += milliseconds
      const due = scheduled.filter((entry) => entry.due <= now)
      scheduled = scheduled.filter((entry) => entry.due > now)
      due.forEach((entry) => entry.action())
    },
  }
}

type Harness = ReturnType<typeof harness>

/** What the place search should show and have done, kept by the test beside the search it drives. */
interface Model {
  text: string
  now: number
  /** When the user stopped typing a text long enough to search for, unless the search no longer waits to make it. */
  pauseFrom: number | undefined
  /** The text whose answer the search waits for, if it waits for one. */
  awaited: string | undefined
  /** The answer the search shows, if it shows one. */
  shown: SearchAnswer | undefined
  /** The index of the active suggestion, if one is. */
  active: number | undefined
  readonly searches: string[]
  readonly destinations: Destination[]
}

// Texts that follow one another as the user types, below and from 3 characters.
const texts = fc.constantFrom('', 'G', 'Gr', 'Gre', 'Gren', 'Greno', 'Grè', 'Lac')

const suggestions: fc.Arbitrary<Suggestion> = fc.record({
  name: fc.string({ maxLength: 6 }),
  kind: fc.constantFrom('country', 'region', 'town', 'place', 'address'),
  context: fc.string({ maxLength: 6 }),
  destination: fc.integer({ min: 0, max: 20 }).map((zoom) => viewDestination({ lng: 5, lat: 45 }, zoom)),
})

const answers: fc.Arbitrary<SearchAnswer> = fc.oneof(
  fc.constant({ kind: 'unavailable' } as const),
  fc.constant({ kind: 'found', suggestions: [] } as const),
  {
    arbitrary: fc.record({ kind: fc.constant('found' as const), suggestions: fc.array(suggestions, { minLength: 1, maxLength: 8 }) }),
    weight: 3,
  },
)

// Mostly long enough for the pause, so that searches are often made; also on either side of it.
const waits = fc.oneof({ arbitrary: fc.constantFrom(300, 1000), weight: 2 }, fc.constantFrom(1, 299), fc.integer({ min: 0, max: 400 }))

// Mostly the first suggestions, which every list has.
const indexes = fc.oneof(fc.constantFrom(0, 1), fc.integer({ min: 0, max: 8 }))

const actions: fc.Arbitrary<Action> = fc.oneof(
  { arbitrary: fc.record({ kind: fc.constant('type' as const), text: texts, pause: fc.oneof(fc.constant(0), waits) }), weight: 3 },
  { arbitrary: fc.record({ kind: fc.constant('wait' as const), milliseconds: waits }), weight: 6 },
  {
    arbitrary: fc.record({ kind: fc.constant('answer' as const), search: fc.oneof({ arbitrary: fc.constant(0), weight: 2 }, fc.constant(1), fc.nat({ max: 3 })), answer: answers }),
    weight: 4,
  },
  { arbitrary: fc.constant({ kind: 'next' } as const), weight: 2 },
  { arbitrary: fc.constant({ kind: 'previous' } as const), weight: 2 },
  { arbitrary: fc.constant({ kind: 'chooseActive' } as const), weight: 2 },
  { arbitrary: fc.record({ kind: fc.constant('choose' as const), index: indexes }), weight: 2 },
  fc.constant({ kind: 'close' } as const),
  fc.constant({ kind: 'clear' } as const),
)

const SEARCH_PAUSE_MS = 300
const MIN_SEARCH_LENGTH = 3

function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

/** The search no longer shows an answer, nor waits for one, nor waits to make one. */
function forget(model: Model): void {
  model.pauseFrom = undefined
  model.awaited = undefined
  model.shown = undefined
  model.active = undefined
}

function shownSuggestions(model: Model): readonly Suggestion[] {
  return model.shown?.kind === 'found' ? model.shown.suggestions : []
}

function chooseIn(model: Model, index: number | undefined): void {
  const chosen = index === undefined ? undefined : shownSuggestions(model)[index]
  if (chosen === undefined) return
  model.text = chosen.name
  model.shown = undefined
  model.active = undefined
  model.destinations.push(chosen.destination)
}

/** The arrow keys go round the list: from none to the first or the last one. */
function moveIn(model: Model, step: 1 | -1): void {
  const count = shownSuggestions(model).length
  if (count === 0) return
  const from = model.active ?? (step === 1 ? -1 : count)
  model.active = (from + step + count) % count
}

async function answer(model: Model, { unanswered }: Harness, which: number, given: SearchAnswer): Promise<void> {
  const [answered] = unanswered.splice(unanswered.length - 1 - (which % Math.max(unanswered.length, 1)), 1)
  if (answered === undefined) return
  if (model.awaited === answered.text) {
    model.awaited = undefined
    model.shown = given
    model.active = undefined
  }
  answered.answer(given)
  await settle()
}

function type(model: Model, search: PlaceSearchState, text: string): void {
  if (text !== model.text) {
    forget(model)
    model.text = text
    if ([...text].length >= MIN_SEARCH_LENGTH) model.pauseFrom = model.now
  }
  search.type(text)
}

function wait(model: Model, harnessed: Harness, milliseconds: number): void {
  model.now += milliseconds
  if (model.pauseFrom !== undefined && model.now >= model.pauseFrom + SEARCH_PAUSE_MS) {
    model.pauseFrom = undefined
    model.awaited = model.text
    model.searches.push(model.text)
  }
  harnessed.wait(milliseconds)
}

async function apply(model: Model, harnessed: Harness, action: Action): Promise<void> {
  const { search } = harnessed
  switch (action.kind) {
    case 'type':
      type(model, search, action.text)
      return wait(model, harnessed, action.pause)
    case 'wait':
      return wait(model, harnessed, action.milliseconds)
    case 'answer':
      return answer(model, harnessed, action.search, action.answer)
    case 'next':
      moveIn(model, 1)
      return search.next()
    case 'previous':
      moveIn(model, -1)
      return search.previous()
    case 'chooseActive':
      chooseIn(model, model.active)
      return search.chooseActive()
    case 'choose':
      chooseIn(model, action.index)
      return search.choose(action.index)
    case 'close':
      forget(model)
      return search.close()
    case 'clear':
      forget(model)
      model.text = ''
      return search.clear()
    default: {
      const unknown: never = action
      throw new Error(`unknown action ${JSON.stringify(unknown)}`)
    }
  }
}

function expectSearchMatches(model: Model, { search, searched, destinations }: Harness): void {
  expect(search.text.value).toBe(model.text)
  expect(searched).toEqual(model.searches)
  expect(destinations).toEqual(model.destinations)
  const shown = shownSuggestions(model)
  expect(search.options.value.map((option) => option.name)).toEqual(shown.map((suggestion) => suggestion.name))
  expect(search.expanded.value).toBe(shown.length > 0)
  const message = { unavailable: 'Recherche indisponible', found: shown.length === 0 ? 'Aucun résultat' : undefined }
  expect(search.message.value).toBe(model.shown === undefined ? undefined : message[model.shown.kind])
  const active = search.options.value.map((option, index) => (option.active ? index : undefined)).filter((index) => index !== undefined)
  expect(active).toEqual(model.active === undefined ? [] : [model.active])
  expect(search.activeOptionId.value).toBe(model.active === undefined ? undefined : search.options.value[model.active]?.id)
}

describe('usePlaceSearch', () => {
  it('makes one search once the user stops typing, shows only the answer to the text it holds, and moves the map to what is chosen', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(actions, { minLength: 20, maxLength: 60, size: 'max' }), async (sequence) => {
        const harnessed = harness()
        const model: Model = {
          text: '',
          now: 0,
          pauseFrom: undefined,
          awaited: undefined,
          shown: undefined,
          active: undefined,
          searches: [],
          destinations: [],
        }

        for (const action of sequence) {
          await apply(model, harnessed, action)
          expectSearchMatches(model, harnessed)
        }
      }),
      { numRuns: 200 },
    )
  })
})
