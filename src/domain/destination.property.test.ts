import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import type { Bbox } from './bbox'
import { extentDestination } from './destination'

const longitudes = fc.double({ min: -180, max: 180, noNaN: true })
const latitudes = fc.double({ min: -85, max: 85, noNaN: true })

// Some extents span a single meridian: their west is their east.
const extents: fc.Arbitrary<Bbox> = fc
  .tuple(longitudes, latitudes, fc.oneof(longitudes, fc.constant(undefined)), latitudes)
  .map(([west, south, east, north]) => [west, Math.min(south, north), east ?? west, Math.max(south, north)])

describe('extentDestination', () => {
  it('shows an extent from its west eastward to its east, across the 180° meridian when its west is greater', () => {
    fc.assert(
      fc.property(extents, (extent) => {
        const [west, south, east, north] = extent
        const destination = extentDestination(extent)

        expect(destination.kind).toBe('extent')
        const [shownWest, shownSouth, shownEast, shownNorth] = destination.kind === 'extent' ? destination.extent : extent
        expect([shownWest, shownSouth, shownNorth]).toEqual([west, south, north])
        expect(shownEast).toBeGreaterThanOrEqual(shownWest)
        expect(shownEast - shownWest).toBeLessThanOrEqual(360)
        // The same meridian, moved a full turn east only when it must be.
        expect([east, east + 360]).toContain(shownEast)
        if (west <= east) expect(shownEast).toBe(east)
      }),
    )
  })
})
