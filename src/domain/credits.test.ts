import { describe, expect, it } from 'vitest'

import { describeCredits } from './credits'

describe('describeCredits', () => {
  it('credits the basemap alone while no layer is credited', () => {
    expect(describeCredits('© OpenStreetMap contributors © CARTO', [])).toBe('© OpenStreetMap contributors © CARTO')
  })

  it('credits the basemap, then each layer in order, separated by a comma and a space', () => {
    expect(describeCredits('Powered by Esri', ['BRGM', 'Das Geoportal des Bundes'])).toBe(
      'Powered by Esri, BRGM, Das Geoportal des Bundes',
    )
  })
})
