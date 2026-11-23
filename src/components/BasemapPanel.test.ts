// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { BasemapGroup } from '../application/useBasemaps'
import BasemapPanel from './BasemapPanel.vue'

const GROUPS: readonly BasemapGroup[] = [
  {
    provider: 'CARTO',
    options: [
      { id: 'positron', name: 'Positron', selected: false },
      { id: 'dark-matter', name: 'Dark Matter', selected: true },
    ],
  },
  { provider: 'Esri', options: [{ id: 'world-imagery', name: 'World Imagery', selected: false }] },
]

describe('BasemapPanel', () => {
  it('shows each provider as a titled group of radio buttons, checking the selected basemap', () => {
    const panel = mount(BasemapPanel, { props: { groups: GROUPS } })

    const legends = panel.findAll('legend').map((legend) => legend.text())
    const radios = panel.findAll('input').map((radio) => [
      radio.element.closest('label')?.textContent?.trim(),
      radio.attributes('type'),
      radio.attributes('name'),
      radio.element.checked,
    ])
    expect(legends).toEqual(['Fonds de plan', 'CARTO', 'Esri'])
    expect(radios).toEqual([
      ['Positron', 'radio', 'basemap', false],
      ['Dark Matter', 'radio', 'basemap', true],
      ['World Imagery', 'radio', 'basemap', false],
    ])
  })

  it('asks to select the basemap the user picks', async () => {
    const panel = mount(BasemapPanel, { props: { groups: GROUPS } })

    await panel.findAll('input')[2]?.setValue(true)

    expect(panel.emitted('select')).toEqual([['world-imagery']])
  })
})
