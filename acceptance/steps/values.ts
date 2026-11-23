/** Reads the example values of a step, failing the step on a malformed one. */
import type { Bbox } from '../../src/domain/bbox'
import type { LngLat } from '../../src/domain/mapView'

export function parseNumber(text: string, what: string): number {
  const value = Number(text)
  if (text.trim() === '' || !Number.isFinite(value)) throw new Error(`${what} must be a number, not "${text}"`)
  return value
}

function parseWholeNumber(text: string, what: string, minimum: number, expected: string): number {
  const value = Number(text)
  if (text.trim() === '' || !Number.isInteger(value) || value < minimum) {
    throw new Error(`${what} must be ${expected}, not "${text}"`)
  }
  return value
}

export function parseCount(text: string, what: string): number {
  return parseWholeNumber(text, what, 0, 'a whole number')
}

/** A position in a list, counted from 1. */
export function parsePosition(text: string, what: string): number {
  return parseWholeNumber(text, what, 1, 'a whole number from 1')
}

/** `count` numbers separated by commas, or undefined when `text` is not that. */
function parseNumberList(text: string, count: number): readonly number[] | undefined {
  const parts = text.split(',')
  if (parts.length !== count || parts.some((part) => part.trim() === '')) return undefined
  const values = parts.map(Number)
  return values.every(Number.isFinite) ? values : undefined
}

/** A point on the map, written longitude, latitude. */
export function parseLngLat(text: string, what: string): LngLat {
  const [lng, lat] = parseNumberList(text, 2) ?? []
  if (lng === undefined || lat === undefined) {
    throw new Error(`${what} must be a longitude and a latitude, as in "5.71234, 45.12345", not "${text}"`)
  }
  return { lng, lat }
}

/** A rectangle on the map, written west, south, east, north. */
export function parseBbox(text: string, what: string): Bbox {
  const [west, south, east, north] = parseNumberList(text, 4) ?? []
  if (west === undefined || south === undefined || east === undefined || north === undefined) {
    throw new Error(`${what} must be west, south, east, north, as in "5.71234, 45.12345, 6.01234, 45.56789", not "${text}"`)
  }
  return [west, south, east, north]
}

/** `yes` as true and `no` as false, such as `on` and `off`. */
export function parseFlag(text: string, what: string, yes: string, no: string): boolean {
  if (text !== yes && text !== no) throw new Error(`${what} must be "${yes}" or "${no}", not "${text}"`)
  return text === yes
}
