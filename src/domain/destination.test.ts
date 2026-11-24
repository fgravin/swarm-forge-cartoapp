import { describe, expect, it } from 'vitest'

import { extentDestination, viewDestination } from './destination'

describe('extentDestination', () => {
  it('shows an extent as GeoNames gives it when its west is less than its east', () => {
    expect(extentDestination([4.74, 44.7, 6.36, 45.88])).toEqual({ kind: 'extent', extent: [4.74, 44.7, 6.36, 45.88] })
  })

  it('shows an extent whose west is greater than its east across the 180° meridian, its east beyond 180', () => {
    expect(extentDestination([177.12, -20.68, -178.42, -12.48])).toEqual({
      kind: 'extent',
      extent: [177.12, -20.68, 181.58, -12.48],
    })
  })

  it('keeps an extent whose west equals its east', () => {
    expect(extentDestination([5, 45, 5, 46])).toEqual({ kind: 'extent', extent: [5, 45, 5, 46] })
  })
})

describe('viewDestination', () => {
  it('centres the map on a position at a zoom', () => {
    expect(viewDestination({ lng: 5.71667, lat: 45.16667 }, 12)).toEqual({
      kind: 'view',
      view: { center: { lng: 5.71667, lat: 45.16667 }, zoom: 12 },
    })
  })
})
