import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { describeMapView, type MapView } from './mapView'

const DESCRIPTION = /^(\d+\.\d{4})° ([NS]), (\d+\.\d{4})° ([EW]) · zoom (\d+\.\d)$/

const mapViews: fc.Arbitrary<MapView> = fc.record({
  center: fc.record({
    lng: fc.double({ min: -180, max: 180, noNaN: true }),
    lat: fc.double({ min: -90, max: 90, noNaN: true }),
  }),
  zoom: fc.double({ min: 0, max: 24, noNaN: true }),
})

/** `12.3456`, `S` -> -12.3456. */
function signed(degrees: string, hemisphere: string, negative: string): number {
  return (hemisphere === negative ? -1 : 1) * Number(degrees)
}

describe('describeMapView', () => {
  it('reads back as the view it describes, to the precision it shows', () => {
    fc.assert(
      fc.property(mapViews, (view) => {
        const match = DESCRIPTION.exec(describeMapView(view))

        expect(match).not.toBeNull()
        const [, lat = '', northSouth = '', lng = '', eastWest = '', zoom = ''] = match ?? []
        expect(Math.abs(signed(lat, northSouth, 'S') - view.center.lat)).toBeLessThanOrEqual(0.00005 + 1e-9)
        expect(Math.abs(signed(lng, eastWest, 'W') - view.center.lng)).toBeLessThanOrEqual(0.00005 + 1e-9)
        expect(Math.abs(Number(zoom) - view.zoom)).toBeLessThanOrEqual(0.05 + 1e-9)
      }),
    )
  })

  it('names the hemisphere by the sign of each coordinate', () => {
    fc.assert(
      fc.property(mapViews, (view) => {
        const [, , northSouth, , eastWest] = DESCRIPTION.exec(describeMapView(view)) ?? []

        if (view.center.lat > 0) expect(northSouth).toBe('N')
        if (view.center.lat < 0) expect(northSouth).toBe('S')
        if (view.center.lng > 0) expect(eastWest).toBe('E')
        if (view.center.lng < 0) expect(eastWest).toBe('W')
      }),
    )
  })
})
