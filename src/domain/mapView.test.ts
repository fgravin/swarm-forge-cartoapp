import { describe, expect, it } from 'vitest'

import { describeMapView } from './mapView'

describe('describeMapView', () => {
  it('names the northern and eastern hemispheres for positive coordinates', () => {
    const view = { center: { lng: 5.9178, lat: 45.5646 }, zoom: 5 }

    expect(describeMapView(view)).toBe('45.5646° N, 5.9178° E · zoom 5.0')
  })

  it('names the southern and western hemispheres for negative coordinates', () => {
    const view = { center: { lng: -58.3816, lat: -34.6037 }, zoom: 11.26 }

    expect(describeMapView(view)).toBe('34.6037° S, 58.3816° W · zoom 11.3')
  })

  it('puts the equator and the prime meridian in the northern and eastern hemispheres', () => {
    const view = { center: { lng: 0, lat: 0 }, zoom: 0 }

    expect(describeMapView(view)).toBe('0.0000° N, 0.0000° E · zoom 0.0')
  })
})
