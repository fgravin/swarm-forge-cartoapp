import { describe, expect, it } from 'vitest'

import { parseBbox, parseCount, parseFlag, parseLngLat, parseNumber, parsePosition } from './values'

describe('parseNumber', () => {
  it.each([
    ['-58.3816', -58.3816],
    ['0', 0],
    ['11', 11],
  ])('reads %s as %d', (text, value) => {
    expect(parseNumber(text, 'zoom')).toBe(value)
  })

  it.each(['', ' ', 'eleven', '1e', 'NaN', 'Infinity'])('refuses %j', (text) => {
    expect(() => parseNumber(text, 'zoom')).toThrow(`zoom must be a number, not "${text}"`)
  })
})

describe('parsePosition', () => {
  it('reads a position counted from 1', () => {
    expect(parsePosition('2', 'group position')).toBe(2)
  })

  it.each(['0', '-1', '1.5', 'first'])('refuses %j', (text) => {
    expect(() => parsePosition(text, 'group position')).toThrow(
      `group position must be a whole number from 1, not "${text}"`,
    )
  })
})

describe('parseCount', () => {
  it.each([
    ['0', 0],
    ['4', 4],
  ])('reads %s as %d', (text, value) => {
    expect(parseCount(text, 'basemap count')).toBe(value)
  })

  it.each(['-1', '2.5', 'four'])('refuses %j', (text) => {
    expect(() => parseCount(text, 'basemap count')).toThrow(`basemap count must be a whole number, not "${text}"`)
  })
})

describe('parseLngLat', () => {
  it('reads a longitude, then a latitude', () => {
    expect(parseLngLat('-58.5, -34.70000', 'start corner')).toEqual({ lng: -58.5, lat: -34.7 })
  })

  it.each(['5.7', '5.7, 45.1, 6', '5.7 45.1', '5.7, north'])('refuses %j', (text) => {
    expect(() => parseLngLat(text, 'start corner')).toThrow(
      `start corner must be a longitude and a latitude, as in "5.71234, 45.12345", not "${text}"`,
    )
  })
})

describe('parseBbox', () => {
  it('reads west, south, east, north', () => {
    expect(parseBbox('-0.12345, 51.40000, 0.12346, 51.5', 'rectangle')).toEqual([-0.12345, 51.4, 0.12346, 51.5])
  })

  it.each(['Aucune emprise', '1, 2, 3', '1, 2, 3, 4, 5'])('refuses %j', (text) => {
    expect(() => parseBbox(text, 'rectangle')).toThrow(
      `rectangle must be west, south, east, north, as in "5.71234, 45.12345, 6.01234, 45.56789", not "${text}"`,
    )
  })
})

describe('parseFlag', () => {
  it('reads the word for yes as true and the word for no as false', () => {
    expect(parseFlag('on', 'drawing mode', 'on', 'off')).toBe(true)
    expect(parseFlag('not offered', 'clear offer', 'offered', 'not offered')).toBe(false)
  })

  it.each(['On', 'of', ''])('refuses %j', (text) => {
    expect(() => parseFlag(text, 'drawing mode', 'on', 'off')).toThrow(`drawing mode must be "on" or "off", not "${text}"`)
  })
})
