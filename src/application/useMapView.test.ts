import { describe, expect, it } from 'vitest'

import { INITIAL_MAP_VIEW, type MapView } from '../domain/mapView'
import type { ViewSource } from './mapPort'
import { useMapView } from './useMapView'

function fakeSource() {
  const listeners = new Set<(view: MapView) => void>()
  const source: ViewSource = {
    onViewChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
  return {
    source,
    moveTo: (view: MapView) => listeners.forEach((listener) => listener(view)),
    listenerCount: () => listeners.size,
  }
}

const BUENOS_AIRES: MapView = { center: { lng: -58.3816, lat: -34.6037 }, zoom: 11 }

describe('useMapView', () => {
  it('starts at the initial view', () => {
    const { view, description } = useMapView()

    expect(view.value).toEqual(INITIAL_MAP_VIEW)
    expect(description.value).toBe('45.5646° N, 5.9178° E · zoom 5.0')
  })

  it('follows the connected source', () => {
    const map = fakeSource()
    const { view, description, connect } = useMapView()

    connect(map.source)
    map.moveTo(BUENOS_AIRES)

    expect(view.value).toEqual(BUENOS_AIRES)
    expect(description.value).toBe('34.6037° S, 58.3816° W · zoom 11.0')
  })

  it('stops following the source when disconnected', () => {
    const map = fakeSource()
    const { view, connect, disconnect } = useMapView()
    connect(map.source)

    disconnect()
    map.moveTo(BUENOS_AIRES)

    expect(view.value).toEqual(INITIAL_MAP_VIEW)
    expect(map.listenerCount()).toBe(0)
  })

  it('stops following the previous source when another one is connected', () => {
    const first = fakeSource()
    const second = fakeSource()
    const { view, connect } = useMapView()
    connect(first.source)

    connect(second.source)
    first.moveTo(BUENOS_AIRES)

    expect(first.listenerCount()).toBe(0)
    expect(second.listenerCount()).toBe(1)
    expect(view.value).toEqual(INITIAL_MAP_VIEW)
  })

  it('does nothing when disconnected without a source', () => {
    const { view, disconnect } = useMapView()

    expect(() => disconnect()).not.toThrow()
    expect(view.value).toEqual(INITIAL_MAP_VIEW)
  })

  it('stops following a source only once', () => {
    let stopCount = 0
    const source: ViewSource = {
      onViewChange: () => () => {
        stopCount += 1
      },
    }
    const { connect, disconnect } = useMapView()
    connect(source)

    disconnect()
    disconnect()

    expect(stopCount).toBe(1)
  })
})
