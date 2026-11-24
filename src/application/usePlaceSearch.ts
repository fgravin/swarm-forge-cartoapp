import { computed, shallowRef, type ComputedRef } from 'vue'

import {
  chooseActiveSuggestion,
  chooseSuggestion,
  clearSearch,
  closeResults,
  INITIAL_PLACE_SEARCH,
  isSearchable,
  moveActive,
  receiveAnswer,
  SEARCH_PAUSE_MS,
  searchMessage,
  startSearch,
  typeText,
  type Choice,
  type PlaceSearch,
} from '../domain/placeSearch'
import { suggestionType } from '../domain/suggestions'
import type { Connectable, MapNavigation } from './mapPort'
import type { PlaceFinder, Timer } from './searchPorts'

/** What the place search needs from outside. */
export interface PlaceSearchServices {
  /** What finds the places a text names. Without one, the search is not configured, and is disabled. */
  readonly finder: PlaceFinder | undefined
  readonly timer: Timer
}

/** A suggestion as the list shows it. */
export interface SuggestionOption {
  /** The id of the option element, which the search field names while the option is active. */
  readonly id: string
  readonly name: string
  /** Such as "Ville". */
  readonly type: string
  readonly context: string
  readonly active: boolean
}

/** What the search field, its suggestion list, and its "Effacer" button show and do. */
export interface PlaceSearchState {
  readonly text: ComputedRef<string>
  /** Whether the field refuses input: without a place finder. */
  readonly disabled: boolean
  /** What the empty field shows. */
  readonly hint: string
  /** Whether the suggestion list is open. */
  readonly expanded: ComputedRef<boolean>
  readonly options: ComputedRef<readonly SuggestionOption[]>
  readonly activeOptionId: ComputedRef<string | undefined>
  /** The message shown in place of the list, if any. */
  readonly message: ComputedRef<string | undefined>
  readonly canClear: ComputedRef<boolean>
  type(text: string): void
  /** The down arrow. */
  next(): void
  /** The up arrow. */
  previous(): void
  /** Enter. */
  chooseActive(): void
  /** A click on the suggestion at `index`. */
  choose(index: number): void
  /** Escape. */
  close(): void
  clear(): void
}

/** The id of the suggestion list element; option ids are made from it. */
export const SUGGESTION_LIST_ID = 'place-suggestions'
const SEARCH_HINT = 'Rechercher un lieu ou une adresse'
const UNCONFIGURED_HINT = 'Recherche non configurée'

/** The suggestions the list shows, none while it is closed. */
function suggestionOptions({ results }: PlaceSearch): readonly SuggestionOption[] {
  if (results.kind !== 'suggestions') return []
  return results.suggestions.map(({ name, kind, context }, index) => ({
    id: `${SUGGESTION_LIST_ID}-${index + 1}`,
    name,
    type: suggestionType(kind),
    context,
    active: index === results.active,
  }))
}

/**
 * Searches for what the user types, once the user stops typing, and moves the
 * connected map to the suggestion the user chooses.
 */
export function usePlaceSearch({ finder, timer }: PlaceSearchServices): PlaceSearchState & Connectable<MapNavigation> {
  const search = shallowRef<PlaceSearch>(INITIAL_PLACE_SEARCH)
  const options = computed(() => suggestionOptions(search.value))
  let navigation: MapNavigation | undefined
  let cancelPause: (() => void) | undefined

  function stopPause(): void {
    cancelPause?.()
    cancelPause = undefined
  }

  async function searchFor(text: string, places: PlaceFinder): Promise<void> {
    search.value = startSearch(search.value)
    const answer = await places.find(text)
    search.value = receiveAnswer(search.value, text, answer)
  }

  function type(text: string): void {
    if (finder === undefined) return
    const next = typeText(search.value, text)
    if (next === search.value) return
    search.value = next
    stopPause()
    if (!isSearchable(next)) return
    cancelPause = timer.after(SEARCH_PAUSE_MS, () => {
      cancelPause = undefined
      void searchFor(text, finder)
    })
  }

  function choose(choice: Choice | undefined): void {
    if (choice === undefined) return
    search.value = choice.search
    navigation?.goTo(choice.destination)
  }

  return {
    text: computed(() => search.value.text),
    disabled: finder === undefined,
    hint: finder === undefined ? UNCONFIGURED_HINT : SEARCH_HINT,
    expanded: computed(() => options.value.length > 0),
    options,
    activeOptionId: computed(() => options.value.find((option) => option.active)?.id),
    message: computed(() => searchMessage(search.value)),
    canClear: computed(() => search.value.text !== ''),
    type,
    next: () => {
      search.value = moveActive(search.value, 'next')
    },
    previous: () => {
      search.value = moveActive(search.value, 'previous')
    },
    chooseActive: () => choose(chooseActiveSuggestion(search.value)),
    choose: (index) => choose(chooseSuggestion(search.value, index)),
    close: () => {
      stopPause()
      search.value = closeResults(search.value)
    },
    clear: () => {
      stopPause()
      search.value = clearSearch(search.value)
    },
    connect: (next) => {
      navigation = next
    },
    disconnect: () => {
      navigation = undefined
    },
  }
}
