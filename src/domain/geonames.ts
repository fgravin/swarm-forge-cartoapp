/**
 * The GeoNames web services the place search asks: the requests for a text,
 * and what their JSON answers mean. The adapter hands their bodies on as
 * unknown JSON; they are narrowed here, and nowhere else.
 */
import type { Bbox } from './bbox'
import type { JsonAnswer } from './jsonAnswer'
import type { LngLat } from './mapView'
import {
  addressSuggestion,
  MAX_SUGGESTIONS,
  placeSuggestion,
  suggestionsOf,
  type SearchAnswer,
  type Suggestion,
} from './suggestions'

/** The two requests of a search: the places search and the address search. */
export interface GeoNamesRequests {
  readonly places: string
  readonly address: string
}

const SERVER = 'https://secure.geonames.org'
// GeoNames found nothing: not a refusal.
const NO_RESULT_STATUS = 15
const FRENCH_COUNTRY_NAMES = new Intl.DisplayNames(['fr'], { type: 'region', fallback: 'none' })
const COUNTRY_CODE = /^[A-Z]{2}$/

/** The username to search GeoNames with: an empty one is none. */
export function geonamesUsername(configured: string | undefined): string | undefined {
  return configured === '' ? undefined : configured
}

/** The requests that search GeoNames for `text`, with the account `username`. */
export function geonamesRequests(text: string, username: string): GeoNamesRequests {
  const places = new URLSearchParams({
    name_startsWith: text,
    orderby: 'relevance',
    maxRows: String(MAX_SUGGESTIONS),
    lang: 'fr',
    inclBbox: 'true',
    username,
  })
  const address = new URLSearchParams({ q: text, username })
  return { places: `${SERVER}/searchJSON?${places}`, address: `${SERVER}/geoCodeAddressJSON?${address}` }
}

type JsonObject = Readonly<Record<string, unknown>>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(object: JsonObject, key: string): string {
  const value = object[key]
  return typeof value === 'string' ? value : ''
}

/** A number, which GeoNames often writes as a string. */
function numberField(object: JsonObject, key: string): number | undefined {
  const value = object[key]
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : undefined
}

function positionOf(object: JsonObject): LngLat | undefined {
  const lng = numberField(object, 'lng')
  const lat = numberField(object, 'lat')
  return lng === undefined || lat === undefined ? undefined : { lng, lat }
}

function extentOf(object: JsonObject): Bbox | undefined {
  const bbox = object['bbox']
  if (!isObject(bbox)) return undefined
  const [west, south, east, north] = ['west', 'south', 'east', 'north'].map((key) => numberField(bbox, key))
  if (west === undefined || south === undefined || east === undefined || north === undefined) return undefined
  return [west, south, east, north]
}

/** The country in French: the name GeoNames gives, or else the name of its country code. */
function countryOf(object: JsonObject): string {
  const name = stringField(object, 'countryName')
  if (name !== '') return name
  const code = stringField(object, 'countryCode')
  if (!COUNTRY_CODE.test(code)) return ''
  return FRENCH_COUNTRY_NAMES.of(code) ?? ''
}

function readPlace(found: unknown): Suggestion | undefined {
  if (!isObject(found)) return undefined
  const name = stringField(found, 'name')
  const at = positionOf(found)
  if (name === '' || at === undefined) return undefined
  return placeSuggestion({
    name,
    featureClass: stringField(found, 'fcl'),
    featureCode: stringField(found, 'fcode'),
    region: stringField(found, 'adminName1'),
    country: countryOf(found),
    position: at,
    extent: extentOf(found),
  })
}

function readAddress(found: unknown): Suggestion | undefined {
  if (!isObject(found)) return undefined
  const at = positionOf(found)
  if (at === undefined) return undefined
  return addressSuggestion({
    houseNumber: stringField(found, 'houseNumber'),
    street: stringField(found, 'street'),
    town: stringField(found, 'locality'),
    region: stringField(found, 'adminName1'),
    country: countryOf(found),
    position: at,
  })
}

function present<T>(value: T | undefined): value is T {
  return value !== undefined
}

/**
 * What one service found, or undefined when it could not answer or refused.
 * A refusal is an answer with a status other than 15, no result found.
 */
function readService(
  answer: JsonAnswer,
  readFound: (body: JsonObject) => readonly Suggestion[] | undefined,
): readonly Suggestion[] | undefined {
  if (answer.kind === 'failed' || !isObject(answer.body)) return undefined
  const status = answer.body['status']
  if (status === undefined) return readFound(answer.body)
  return isObject(status) && numberField(status, 'value') === NO_RESULT_STATUS ? [] : undefined
}

function foundPlaces(body: JsonObject): readonly Suggestion[] | undefined {
  const found = body['geonames']
  return Array.isArray(found) ? found.map(readPlace).filter(present) : undefined
}

function foundAddresses(body: JsonObject): readonly Suggestion[] {
  return [readAddress(body['address'])].filter(present)
}

/** What a search found, from the answers of its places search and its address search. */
export function readSearchAnswer(places: JsonAnswer, address: JsonAnswer): SearchAnswer {
  const placesFound = readService(places, foundPlaces)
  const addressesFound = readService(address, foundAddresses)
  if (placesFound === undefined || addressesFound === undefined) return { kind: 'unavailable' }
  return { kind: 'found', suggestions: suggestionsOf(addressesFound, placesFound) }
}
