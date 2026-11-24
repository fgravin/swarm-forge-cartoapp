import type { Bbox } from './bbox'
import { extentDestination, viewDestination, type Destination } from './destination'
import type { LngLat } from './mapView'

/** What a suggestion is: a place of one of four kinds, or an address. */
export type SuggestionKind = 'country' | 'region' | 'town' | 'place' | 'address'

/** The kinds of places. */
export type PlaceKind = Exclude<SuggestionKind, 'address'>

/** One suggestion of the search: where the map goes when the user chooses it. */
export interface Suggestion {
  readonly name: string
  readonly kind: SuggestionKind
  /** The region, then the country, as in "Auvergne-Rhône-Alpes, France". */
  readonly context: string
  readonly destination: Destination
}

/** A place GeoNames found, named in French. */
export interface FoundPlace {
  readonly name: string
  readonly kind: PlaceKind
  readonly region: string
  readonly country: string
  readonly position: LngLat
  /** The extent of the place, when GeoNames gives one. */
  readonly extent: Bbox | undefined
}

/** An address GeoNames found. */
export interface FoundAddress {
  readonly houseNumber: string
  readonly street: string
  readonly town: string
  readonly region: string
  readonly country: string
  readonly position: LngLat
}

/** What a search found, or that GeoNames could not answer it or refused it. */
export type SearchAnswer =
  | { readonly kind: 'found'; readonly suggestions: readonly Suggestion[] }
  | { readonly kind: 'unavailable' }

export const MAX_SUGGESTIONS = 8
const PLACE_ZOOM = 12
const ADDRESS_ZOOM = 17

const SUGGESTION_TYPES: Readonly<Record<SuggestionKind, string>> = {
  country: 'Pays',
  region: 'Région',
  town: 'Ville',
  place: 'Lieu',
  address: 'Adresse',
}

/** The type a suggestion reads, such as "Ville". */
export function suggestionType(kind: SuggestionKind): string {
  return SUGGESTION_TYPES[kind]
}

function joinGiven(parts: readonly string[], separator: string): string {
  return parts.filter((part) => part !== '').join(separator)
}

/** The region, then the country, leaving out what is not given and what is the suggestion itself. */
export function describeContext(name: string, region: string, country: string): string {
  return joinGiven(
    [region, country].filter((part) => part !== name),
    ', ',
  )
}

export function placeSuggestion(place: FoundPlace): Suggestion {
  return {
    name: place.name,
    kind: place.kind,
    context: describeContext(place.name, place.region, place.country),
    destination: place.extent ? extentDestination(place.extent) : viewDestination(place.position, PLACE_ZOOM),
  }
}

/** Names an address by its house number, its street and its town, as in "4 Place Saint-André, Grenoble". */
export function addressSuggestion(address: FoundAddress): Suggestion {
  const name = joinGiven([joinGiven([address.houseNumber, address.street], ' '), address.town], ', ')
  return {
    name,
    kind: 'address',
    context: describeContext(name, address.region, address.country),
    destination: viewDestination(address.position, ADDRESS_ZOOM),
  }
}

/** The addresses first, then the places in their order, 8 suggestions at most. */
export function suggestionsOf(addresses: readonly Suggestion[], places: readonly Suggestion[]): readonly Suggestion[] {
  return [...addresses, ...places].slice(0, MAX_SUGGESTIONS)
}
