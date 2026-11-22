import { describe, expect, it } from 'vitest'

import { INITIAL_MAP_VIEW, type MapView } from '../domain/mapView'
import type { MapPort } from './mapPort'
import { useMapView } from './useMapView'

function fakeMap() {
  const listeners = new Set<(view: MapView) => void>()
  let destroyed = false
  const port: MapPort = {
    onViewChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    showBasemap() {},
    destroy() {
      destroyed = true
    },
  }
  return {
    port,
    moveTo: (view: MapView) => listeners.forEach((listener) => listener(view)),
    isDestroyed: () => destroyed,
  }
}

const BUENOS_AIRES: MapView = { center: { lng: -58.3816, lat: -34.6037 }, zoom: 11 }

describe('useMapView', () => {
  it('starts at the initial view', () => {
    const { view, description } = useMapView()

    expect(view.value).toEqual(INITIAL_MAP_VIEW)
    expect(description.value).toBe('45.5646° N, 5.9178° E · zoom 5.0')
  })

  it('follows the connected map', () => {
    const map = fakeMap()
    const { view, description, connect } = useMapView()

    connect(map.port)
    map.moveTo(BUENOS_AIRES)

    expect(view.value).toEqual(BUENOS_AIRES)
    expect(description.value).toBe('34.6037° S, 58.3816° W · zoom 11.0')
  })

  it('stops following and releases the map when disconnected', () => {
    const map = fakeMap()
    const { view, connect, disconnect } = useMapView()
    connect(map.port)

    disconnect()
    map.moveTo(BUENOS_AIRES)

    expect(view.value).toEqual(INITIAL_MAP_VIEW)
    expect(map.isDestroyed()).toBe(true)
  })

  it('releases the previous map when another one is connected', () => {
    const first = fakeMap()
    const second = fakeMap()
    const { view, connect } = useMapView()
    connect(first.port)

    connect(second.port)
    first.moveTo(BUENOS_AIRES)

    expect(first.isDestroyed()).toBe(true)
    expect(second.isDestroyed()).toBe(false)
    expect(view.value).toEqual(INITIAL_MAP_VIEW)
  })

  it('does nothing when disconnected without a map', () => {
    const { view, disconnect } = useMapView()

    expect(() => disconnect()).not.toThrow()
    expect(view.value).toEqual(INITIAL_MAP_VIEW)
  })

  it('releases a map only once', () => {
    let destroyCount = 0
    const port: MapPort = {
      onViewChange: () => () => {},
      showBasemap: () => {},
      destroy: () => {
        destroyCount += 1
      },
    }
    const { connect, disconnect } = useMapView()
    connect(port)

    disconnect()
    disconnect()

    expect(destroyCount).toBe(1)
  })
})
