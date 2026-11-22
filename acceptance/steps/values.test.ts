import { describe, expect, it } from 'vitest'

import { parseCount, parseNumber, parsePosition } from './values'

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
