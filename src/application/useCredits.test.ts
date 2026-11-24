import { describe, expect, it } from 'vitest'
import { shallowRef } from 'vue'

import type { CreditDisplay } from './mapPort'
import { useCredits } from './useCredits'

function recordingDisplay() {
  const shown: string[] = []
  const display: CreditDisplay = { showCredits: (credits) => shown.push(credits) }
  return { display, shown }
}

function setUp() {
  const basemapCredit = shallowRef('© OpenStreetMap contributors © CARTO')
  const layerCredits = shallowRef<readonly string[]>([])
  const credits = useCredits(basemapCredit, layerCredits)
  return { basemapCredit, layerCredits, credits }
}

describe('useCredits', () => {
  it('shows the credits on the display it is connected to', () => {
    const { credits } = setUp()
    const { display, shown } = recordingDisplay()

    credits.connect(display)

    expect(shown).toEqual(['© OpenStreetMap contributors © CARTO'])
  })

  it('shows the credits again each time the basemap or the shown layers change, at once', () => {
    const { basemapCredit, layerCredits, credits } = setUp()
    const { display, shown } = recordingDisplay()
    credits.connect(display)

    layerCredits.value = ['BRGM']
    basemapCredit.value = 'Powered by Esri'

    expect(shown).toEqual([
      '© OpenStreetMap contributors © CARTO',
      '© OpenStreetMap contributors © CARTO, BRGM',
      'Powered by Esri, BRGM',
    ])
  })

  it('does not show the same credits twice', () => {
    const { layerCredits, credits } = setUp()
    const { display, shown } = recordingDisplay()
    credits.connect(display)

    layerCredits.value = []

    expect(shown).toHaveLength(1)
  })

  it('stops showing credits on a display once disconnected', () => {
    const { layerCredits, credits } = setUp()
    const { display, shown } = recordingDisplay()
    credits.connect(display)

    credits.disconnect()
    layerCredits.value = ['BRGM']

    expect(shown).toEqual(['© OpenStreetMap contributors © CARTO'])
  })
})
