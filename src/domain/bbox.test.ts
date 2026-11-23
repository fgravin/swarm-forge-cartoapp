import { describe, expect, it } from 'vitest'

import { bboxBetween, bboxRing, describeBbox, type Bbox } from './bbox'

describe('bboxBetween', () => {
  const southWest = { lng: 5.7, lat: 45.1 }
  const northEast = { lng: 6, lat: 45.5 }
  const northWest = { lng: 5.7, lat: 45.5 }
  const southEast = { lng: 6, lat: 45.1 }
  const expected: Bbox = [5.7, 45.1, 6, 45.5]

  it.each([
    ['north-east', southWest, northEast],
    ['south-west', northEast, southWest],
    ['south-east', northWest, southEast],
    ['north-west', southEast, northWest],
  ])('orders west, south, east, north whatever the direction (%s)', (_direction, from, to) => {
    expect(bboxBetween(from, to)).toEqual(expected)
  })

  it('works across the equator and the Greenwich meridian', () => {
    expect(bboxBetween({ lng: 0.5, lat: 1 }, { lng: -0.5, lat: -1 })).toEqual([-0.5, -1, 0.5, 1])
  })
})

describe('bboxRing', () => {
  it('goes round the corners from the south-west one, counter-clockwise, and closes on it', () => {
    expect(bboxRing([5.7, 45.1, 6, 45.5])).toEqual([
      { lng: 5.7, lat: 45.1 },
      { lng: 6, lat: 45.1 },
      { lng: 6, lat: 45.5 },
      { lng: 5.7, lat: 45.5 },
      { lng: 5.7, lat: 45.1 },
    ])
  })
})

describe('describeBbox', () => {
  it('reads west, south, east, north with 5 decimals', () => {
    expect(describeBbox([5.71234, 45.12345, 6.01234, 45.56789])).toBe('5.71234, 45.12345, 6.01234, 45.56789')
  })

  it('rounds to 5 decimals and pads to 5 decimals', () => {
    expect(describeBbox([-0.1234549, 51.4, 0.1234551, 51.5000049])).toBe('-0.12345, 51.40000, 0.12346, 51.50000')
  })

  it('says there is no bbox when there is none', () => {
    expect(describeBbox(undefined)).toBe('Aucune emprise')
  })
})
