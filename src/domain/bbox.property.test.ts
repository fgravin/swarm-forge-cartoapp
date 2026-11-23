import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { bboxBetween, bboxRing, describeBbox } from './bbox'
import type { LngLat } from './mapView'

const positions: fc.Arbitrary<LngLat> = fc.record({
  lng: fc.double({ min: -180, max: 180, noNaN: true }),
  lat: fc.double({ min: -85, max: 85, noNaN: true }),
})

const DESCRIPTION = /^(-?\d+\.\d{5}), (-?\d+\.\d{5}), (-?\d+\.\d{5}), (-?\d+\.\d{5})$/
const HALF_LAST_DECIMAL = 0.000005 + 1e-9

describe('bboxBetween', () => {
  it('orders west before east and south before north, whatever corners it is given', () => {
    fc.assert(
      fc.property(positions, positions, (a, b) => {
        const [west, south, east, north] = bboxBetween(a, b)

        expect(west).toBeLessThanOrEqual(east)
        expect(south).toBeLessThanOrEqual(north)
      }),
    )
  })

  it('is the same bbox from either corner', () => {
    fc.assert(
      fc.property(positions, positions, (a, b) => {
        expect(bboxBetween(a, b)).toEqual(bboxBetween(b, a))
      }),
    )
  })

  it('has its corners at the two positions it is given', () => {
    fc.assert(
      fc.property(positions, positions, (a, b) => {
        const [west, south, east, north] = bboxBetween(a, b)

        expect([west, east]).toContain(a.lng)
        expect([west, east]).toContain(b.lng)
        expect([south, north]).toContain(a.lat)
        expect([south, north]).toContain(b.lat)
      }),
    )
  })
})

/**
 * How far the path from `p` through `q` to `r` turns left: positive at a
 * counter-clockwise corner. The ring's edges run along meridians and parallels,
 * so one of the two products is exactly 0 and rounding cannot flip the sign.
 */
function turn(p: LngLat, q: LngLat | undefined, r: LngLat | undefined): number {
  if (q === undefined || r === undefined) return Number.NaN
  return (q.lng - p.lng) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lng - q.lng)
}

describe('bboxRing', () => {
  it('is a closed counter-clockwise ring through the four corners of the bbox', () => {
    fc.assert(
      fc.property(positions, positions, (a, b) => {
        const bbox = bboxBetween(a, b)
        const [west, south, east, north] = bbox
        const ring = bboxRing(bbox)

        expect(ring).toHaveLength(5)
        expect(ring.at(-1)).toEqual(ring[0])
        expect(new Set(ring.slice(0, 4).map(({ lng, lat }) => `${lng} ${lat}`))).toEqual(
          new Set([`${west} ${south}`, `${east} ${south}`, `${east} ${north}`, `${west} ${north}`]),
        )
        const corners = ring.slice(0, 4)
        corners.forEach((corner, index) => {
          expect(turn(corner, corners[(index + 1) % 4], corners[(index + 2) % 4])).toBeGreaterThanOrEqual(0)
        })
      }),
    )
  })
})

describe('describeBbox', () => {
  it('reads back as west, south, east, north, each to 5 decimals', () => {
    fc.assert(
      fc.property(positions, positions, (a, b) => {
        const bbox = bboxBetween(a, b)
        const match = DESCRIPTION.exec(describeBbox(bbox))

        expect(match).not.toBeNull()
        const shown = (match ?? []).slice(1).map(Number)
        shown.forEach((degrees, index) => {
          expect(Math.abs(degrees - (bbox[index] ?? Number.NaN))).toBeLessThanOrEqual(HALF_LAST_DECIMAL)
        })
      }),
    )
  })
})
