import { expect } from 'vitest'

import { step, type StepHandler } from '../runtime'
import { parseNumber } from './values'
import type { World } from './world'

// The GeoNames username the application is built with, unless a step says otherwise.
const USERNAME = 'carto-test'

export const APPLICATION_STEPS: readonly StepHandler<World>[] = [
  step(/^the application has started$/, (world) => {
    world.start(USERNAME)
  }),

  step(/^the application has started without a GeoNames username$/, (world) => {
    world.start(undefined)
  }),

  step(/^the application has started with the GeoNames username (.+)$/, (world, [username]) => {
    world.start(username)
  }),

  step(/^the map has been moved to latitude (.+), longitude (.+), zoom (.+)$/, ({ map }, [lat = '', lng = '', zoom = '']) => {
    map.moveTo({
      center: { lng: parseNumber(lng, 'longitude'), lat: parseNumber(lat, 'latitude') },
      zoom: parseNumber(zoom, 'zoom'),
    })
  }),

  step(/^the view indicator reads (.+)$/, ({ screen }, [description]) => {
    expect(screen.mapView.description.value).toBe(description)
  }),
]
