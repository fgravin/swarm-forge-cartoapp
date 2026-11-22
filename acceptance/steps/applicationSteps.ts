import { expect } from 'vitest'

import { step, type StepHandler } from '../runtime'
import { parseNumber } from './values'
import type { World } from './world'

export const APPLICATION_STEPS: readonly StepHandler<World>[] = [
  step(/^the application has started$/, ({ mapView, basemaps, map }) => {
    mapView.connect(map.port)
    basemaps.connect(map.port)
  }),

  step(/^the map has been moved to latitude (.+), longitude (.+), zoom (.+)$/, ({ map }, [lat = '', lng = '', zoom = '']) => {
    map.moveTo({
      center: { lng: parseNumber(lng, 'longitude'), lat: parseNumber(lat, 'latitude') },
      zoom: parseNumber(zoom, 'zoom'),
    })
  }),

  step(/^the view indicator reads (.+)$/, ({ mapView }, [description]) => {
    expect(mapView.description.value).toBe(description)
  }),
]
